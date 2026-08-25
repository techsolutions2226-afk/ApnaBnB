const prisma = require('../db/prisma');
const { parsePagination, paginated } = require('../utils/pagination');
const { effectiveRole, MEMBER_ROLES } = require('../utils/subscription');
const { notifyUserInBackground, TYPES } = require('../utils/notifier');

const BILLING_CYCLES = ['monthly', 'yearly'];

// Roles that must hold an active plan.
// Buyers (and admins) are free.
// Every member role can hold a plan — the paid feature (owner contact reveal)
// is billed to buyers as well. Mirrors roleRequiresPlan on the client.
const requiresPlan = (role) =>
  role === 'seller' || role === 'dealer' || role === 'buyer';

// POST /api/payments — submit a manual EasyPaisa payment (multipart form:
// planId, billingCycle + proof image). Instant activation: the row is stored
// as `approved` so the user's messaging unlocks immediately. Admins can later
// reject it from the admin panel, which locks messaging again on next check.

/* A user may only buy the tier for the role they are ACTING AS. A dealer who
   switches to the buyer view buys the buyer tier; switching back lets them buy
   the dealer tier. Enforced here and not just in the UI, since the plan id is
   client-supplied. Returns an error string, or null when the purchase is OK. */
const rejectRoleMismatch = (user, plan) => {
  const acting = effectiveRole(user);
  if (!MEMBER_ROLES.includes(acting)) {
    return "Your account type doesn't use subscription plans.";
  }
  if (plan.role !== acting) {
    return `That is a ${plan.role} plan. You are currently acting as a ${acting}, so you can only subscribe to ${acting} plans — switch your role in the dashboard to buy a ${plan.role} plan.`;
  }
  return null;
};

const createPayment = async (req, res, next) => {
  const { planId, billingCycle } = req.body;

  if (!BILLING_CYCLES.includes(billingCycle)) {
    return res.status(400).json({ message: 'Billing cycle must be monthly or yearly.' });
  }
  if (!req.file || !req.file.path) {
    return res.status(400).json({ message: 'Payment screenshot is required.' });
  }

  try {
    // Plans live in the DB now (admin-managed). The AMOUNT always comes from
    // the plan row, never from the client, so a tampered request can never
    // record "Premium for PKR 1".
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      return res.status(400).json({ message: 'Unknown or inactive plan selected.' });
    }

    const mismatch = rejectRoleMismatch(req.user, plan);
    if (mismatch) {
      return res.status(403).json({ code: 'ROLE_MISMATCH', message: mismatch });
    }

    const amount =
      billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        planId: plan.id,
        planName: plan.name,
        billingCycle,
        amount,
        currency: plan.currency || 'PKR',
        method: 'easypaisa',
        status: 'approved',
        proofUrl: req.file.path,
      },
    });
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/status — the subscription gate + dashboard banner data.
// Returns whether the caller NEEDS a plan (every member role does; admins do
// not) and whether their LATEST payment is approved. The check keys off the
// role the user is ACTING AS, so switching hats switches which tier applies.
const getPaymentStatus = async (req, res, next) => {
  try {
    // Acting role, not account role: a dealer viewing as a buyer is
    // subject to the buyer tier's gate.
    const needed = requiresPlan(effectiveRole(req.user));

    const latest = await prisma.payment.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    const hasApproved = !!latest && latest.status === 'approved';

    res.status(200).json({
      requiresPlan: needed,
      active: needed ? hasApproved : true,
      subscription: hasApproved
        ? {
            planId: latest.planId,
            planName: latest.planName,
            billingCycle: latest.billingCycle,
            amount: latest.amount,
            currency: latest.currency,
            activatedAt: latest.createdAt,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/free — one-click activation of a FREE plan (admin sets
// both prices to 0). No QR, no screenshot: records an approved Payment with
// method 'free' so dashboards and the messaging gate treat it like any plan.
const createFreeSubscription = async (req, res, next) => {
  const { planId } = req.body;

  try {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      return res.status(400).json({ message: 'Unknown or inactive plan selected.' });
    }
    const isFree =
      Number(plan.monthlyPrice) === 0 && Number(plan.yearlyPrice) === 0;
    if (!isFree) {
      return res.status(400).json({
        message: 'This plan is not free — payment is required.',
      });
    }

    const mismatch = rejectRoleMismatch(req.user, plan);
    if (mismatch) {
      return res.status(403).json({ code: 'ROLE_MISMATCH', message: mismatch });
    }

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        planId: plan.id,
        planName: plan.name,
        billingCycle: 'free',
        amount: 0,
        currency: plan.currency || 'PKR',
        method: 'free',
        status: 'approved',
        proofUrl: '', // no screenshot for free activations
      },
    });
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/mine — the caller's own payment history (newest first).
const getMyPayments = async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.status(200).json(payments);
  } catch (error) {
    next(error);
  }
};

// GET /api/payments — admin list (?page=&limit=&status=approved|pending|rejected)
const getAllPayments = async (req, res, next) => {
  const { enabled, page, limit, skip, take } = parsePagination(req);
  const { status } = req.query;

  const where = {};
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    where.status = status;
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);
    // Flat array when no ?page/?limit was sent — same convention as the other
    // list endpoints (see utils/pagination.js).
    res.status(200).json(enabled ? paginated(rows, total, page, limit) : rows);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/payments/:id/status — admin approve/reject. Rejecting the user's
// LATEST payment locks their messaging on their next gate check.
const updatePaymentStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be pending, approved or rejected.' });
  }

  try {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Payment not found.' });
    }
    const payment = await prisma.payment.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      },
    });
    /* A rejected payment silently re-locks the user's paid features, so telling
       them is the difference between "it stopped working" and knowing why. */
    const approved = status === 'approved';
    notifyUserInBackground({
      recipientId: payment.userId,
      type: approved ? TYPES.PAYMENT_APPROVED : TYPES.PAYMENT_REJECTED,
      title: approved ? 'Payment approved' : 'Payment rejected',
      body: approved
        ? `Your ${payment.planName} plan is now active.`
        : `Your payment for ${payment.planName} was rejected. Please submit a clearer proof of payment.`,
      link: '/plans',
      entityType: 'payment',
      entityId: payment.id,
    });

    res.status(200).json(payment);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  createFreeSubscription,
  getMyPayments,
  getPaymentStatus,
  getAllPayments,
  updatePaymentStatus,
};
