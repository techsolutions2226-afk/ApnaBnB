/* ─── Subscription helpers ───
   Single source of truth for "may this user see another member's contact
   details?" — the one thing a paid plan buys.

   Extracted so the gate in propertyController and userController agrees with
   the page that sells the plan; a gate that disagrees with the checkout is
   worse than no gate at all.

   NOTE the difference from paymentController's `requiresPlan(role)`: that asks
   whether a role is billed at all (admins are not). This asks whether the user
   has actually bought something that grants the reveal.
   ─────────────────────────────────────────────── */

const prisma = require('../db/prisma');

const MEMBER_ROLES = ['seller', 'buyer', 'dealer'];

/* The role a user is ACTING AS — the dashboard "viewing as" hat, falling back
   to the account role. Mirrors getEffectiveRole() on the client.

   This is what plan purchases key off: a dealer who switches to the buyer view
   is shopping as a buyer and must be able to buy the buyer tier. Keying off the
   account role instead locked them out of every tier but their own. */
const effectiveRole = (user) => {
  const view = user?.viewRole;
  if (view && MEMBER_ROLES.includes(view)) return view;
  return user?.role || null;
};

/* True only when the user's latest payment is approved AND the plan behind it
   actually grants the contact reveal.

   The `status === 'approved'` check alone is not enough: activating a FREE tier
   writes an approved PKR 0 payment, so checking status by itself handed the
   paid feature to anyone who clicked "Activate Free".

   The plan's own `limits.contactReveal` is the authority, so an admin editing
   tiers in the panel changes who gets access without a code change. If the plan
   row has since been deleted, fall back to "did they actually pay" rather than
   failing open. */
const hasContactAccess = async (userId) => {
  if (!userId) return false;

  const latest = await prisma.payment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest || latest.status !== 'approved') return false;

  const plan = latest.planId
    ? await prisma.plan.findUnique({
        where: { id: latest.planId },
        select: { limits: true },
      })
    : null;

  if (plan && plan.limits && typeof plan.limits === 'object') {
    return plan.limits.contactReveal === true;
  }

  // Orphaned payment (plan deleted): a free tier never unlocks.
  return Number(latest.amount) > 0;
};

module.exports = { hasContactAccess, effectiveRole, MEMBER_ROLES };
