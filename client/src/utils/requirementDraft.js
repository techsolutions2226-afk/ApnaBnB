/* Auto-save helpers for the Post Requirement form (buyer flow).
   Drafts live in localStorage keyed per user so concurrent accounts don't collide.
   Bump DRAFT_VERSION whenever the form's saved shape changes — older drafts
   are then ignored on load instead of crashing the form. */

const DRAFT_VERSION = 1;
const PREFIX = "requirement-draft";

const keyFor = (userId) => `${PREFIX}:${userId || "anon"}`;

export const saveRequirementDraft = (userId, form) => {
  if (!userId) return;
  try {
    const payload = {
      version: DRAFT_VERSION,
      savedAt: Date.now(),
      form,
    };
    localStorage.setItem(keyFor(userId), JSON.stringify(payload));
  } catch {
    // localStorage may throw under quota / private-browsing — drafts are nice-to-have.
  }
};

export const loadRequirementDraft = (userId) => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== DRAFT_VERSION || !parsed.form) return null;
    return { form: parsed.form, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
};

export const clearRequirementDraft = (userId) => {
  if (!userId) return;
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    // Same nice-to-have caveat.
  }
};
