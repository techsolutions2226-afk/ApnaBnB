const { generateDescription } = require('../utils/aiDescription');

/* POST /api/ai/description
   Body: { kind: 'listing' | 'requirement', ...form fields }

   Writes the free-text description/notes for a half-filled Create Listing or
   Post Requirement form. Auth-gated (see aiRoutes) because it spends quota.

   Never 500s on a provider problem — an AI failure is not a server fault from
   the user's point of view, and the form still works without it. */
const writeDescription = async (req, res, next) => {
  try {
    const kind = req.body?.kind === 'requirement' ? 'requirement' : 'listing';
    const text = await generateDescription(kind, req.body || {});
    res.status(200).json({ description: text, generatedBy: 'ai' });
  } catch (error) {
    // 503 (not configured) and 422 (not enough detail yet) are deliberate and
    // carry a message the UI shows as-is.
    if (error.status === 503 || error.status === 422) {
      return res.status(error.status).json({ message: error.message });
    }
    // Anything else is the provider being unavailable — say so plainly rather
    // than leaking Gemini internals to the client.
    if (/gemini|timeout|abort|fetch/i.test(String(error.message))) {
      return res.status(502).json({
        message: 'Could not reach the AI service just now. Please write your description manually.',
      });
    }
    next(error);
  }
};

module.exports = { writeDescription };
