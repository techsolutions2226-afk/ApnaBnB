/* ─── Subscription helpers ───
   Single source of truth for "does this user hold an active paid plan?".

   Extracted so the contact-reveal gate in propertyController and the status
   endpoint in paymentController agree — a gate that disagrees with the page
   that sells the plan is worse than no gate at all.

   NOTE the difference from paymentController's `requiresPlan(role)`: that asks
   whether a role is *billed* (sellers/dealers are, buyers historically weren't).
   This asks whether the user has actually *paid*, which is what unlocking a
   seller's contact details turns on — for every role, including buyers.
   ─────────────────────────────────────────────── */

const prisma = require('../db/prisma');

// True when the user's most recent payment is approved. Mirrors the rule in
// paymentController.getPaymentStatus: latest row wins, so an admin rejecting a
// payment revokes access on the next check.
const hasApprovedPayment = async (userId) => {
  if (!userId) return false;
  const latest = await prisma.payment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return !!latest && latest.status === 'approved';
};

module.exports = { hasApprovedPayment };
