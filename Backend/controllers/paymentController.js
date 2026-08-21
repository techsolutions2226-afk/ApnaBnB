const prisma = require('../db/prisma');
const { parsePagination, paginated } = require('../utils/pagination');

const BILLING_CYCLES = ['monthly', 'yearly'];

// Roles that must hold an active plan to use messaging / the Deal Room.
// Buyers (and admins) are free.
const requiresPlan = (role) => role === 'seller' || role === 'dealer';

// POST /api/payments — submit a manual EasyPaisa payment (multipart form:
// planId, billingCycle + proof image). Instant activation: the row is stored
// as `approved` so the user's messaging unlocks immediately. Admins can later
// reject it from the admin panel, which locks messaging again on next check.
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
// Returns whether the caller NEEDS a plan (sellers/dealers do; buyers/admins
// are free) and whether their LATEST payment is approved. Every role gets its
// approved plan echoed back so dashboards can show it; `active` stays true
// for non-paying roles so the messaging gate never blocks them.
const getPaymentStatus = async (req, res, next) => {
  try {
    const needed = requiresPlan(req.user.role);

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
