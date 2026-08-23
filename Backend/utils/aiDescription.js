// AI description writer via Google Gemini — same provider, model and failure
// posture as aiMatch.js, but synchronous: the client is waiting on the result,
// so this one returns rather than fire-and-forget.
//
// Given the structured fields a user has already filled on the Create Listing
// or Post Requirement form, it writes the free-text description for them.
// Degrades honestly: if GEMINI_API_KEY is missing or the call fails, the
// caller gets a clear error and the user simply types their own description.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 1;
const MAX_LEN = 900;

const isConfigured = () => Boolean(GEMINI_API_KEY);

/* ── Field normalisation ──
   Only pass through what the user actually filled; empty fields would
   otherwise invite the model to invent details. */
const clean = (v) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') {
    const t = v.trim();
    return t ? t.slice(0, 300) : undefined;
  }
  if (Array.isArray(v)) {
    const items = v.map((x) => String(x).trim()).filter(Boolean).slice(0, 25);
    return items.length ? items : undefined;
  }
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  return undefined;
};

const pruned = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, clean(v)]).filter(([, v]) => v !== undefined));

const listingFacts = (b) =>
  pruned({
    title: b.title,
    purpose: b.purpose,
    category: b.category,
    propertyType: b.propertyType,
    city: b.city,
    area: b.area,
    price: b.price,
    size: b.size,
    sizeUnit: b.sizeUnit,
    bedrooms: b.bedrooms,
    bathrooms: b.bathrooms,
    amenities: b.amenities,
    furnished: b.furnished,
    securityDeposit: b.securityDeposit,
    leaseTerm: b.leaseTerm,
  });

const requirementFacts = (b) =>
  pruned({
    title: b.title,
    purpose: b.purpose,
    category: b.category,
    propertyType: b.propertyType,
    city: b.city,
    area: b.area,
    budgetMin: b.budgetMin,
    budgetMax: b.budgetMax,
    size: b.size,
    bedrooms: b.bedrooms,
    bathrooms: b.bathrooms,
    urgency: b.urgency,
  });

/* Enough signal to be worth a generation — otherwise the model is guessing. */
const MIN_FACTS = 3;

const SHARED_RULES = [
  'Write in plain, natural English for a Pakistani property marketplace.',
  'Use ONLY the facts supplied. Never invent details — no made-up landmarks,',
  'schools, distances, measurements, prices, or nearby facilities.',
  'Do not repeat the price or budget figures; they are shown separately on the page.',
  'No markdown, no headings, no bullet points, no emoji, no quotes around the text.',
  'Do not begin with "This property" or "This requirement" every time — vary naturally.',
  'Prices are in PKR; Marla and Kanal are normal local units — use them as given.',
];

const buildListingPrompt = (facts) =>
  [
    'You are writing the description field of a property listing on ApnaBnB.',
    '',
    ...SHARED_RULES,
    'Write 2 short paragraphs, 45-90 words in total.',
    'Lead with what the property is and where it is, then its notable features.',
    'Sound like an informed owner or agent — factual and confident, not a hard sell.',
    '',
    `LISTING FACTS (JSON): ${JSON.stringify(facts)}`,
    '',
    'Respond with ONLY the description text.',
  ].join('\n');

const buildRequirementPrompt = (facts) =>
  [
    'You are writing the notes field of a buyer requirement on ApnaBnB —',
    'a short brief telling sellers and agents what this buyer is looking for.',
    '',
    ...SHARED_RULES,
    'Write ONE paragraph, 35-70 words.',
    'Write from the buyer\'s perspective ("I am looking for...", "We need...").',
    'State what they want and where, then any preferences that follow from the facts.',
    '',
    `REQUIREMENT FACTS (JSON): ${JSON.stringify(facts)}`,
    '',
    'Respond with ONLY the brief text.',
  ].join('\n');

/* Strip anything the model wrapped around the prose despite the instructions. */
const tidy = (raw) => {
  let t = String(raw || '')
    .replace(/```[a-z]*|```/gi, '')
    .replace(/^\s*(description|brief|notes)\s*:\s*/i, '')
    .trim();
  // Unwrap a fully-quoted response.
  if (t.length > 1 && /^["'"]/.test(t) && /["'"]$/.test(t)) t = t.slice(1, -1).trim();
  // Drop stray markdown bullets / headings at line starts.
  t = t.replace(/^[\s>#*-]+/gm, '').trim();
  // Collapse 3+ newlines to a paragraph break.
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.slice(0, MAX_LEN);
};

const callGemini = async (prompt) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      // A little warmth so every listing doesn't read identically, but low
      // enough that the model stays anchored to the supplied facts.
      temperature: 0.55,
      maxOutputTokens: 400,
    },
  };

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!res.ok) {
        lastError = new Error(`Gemini HTTP ${res.status}`);
        if (res.status === 429 || res.status >= 500) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }

      const data = await res.json();
      const text = tidy(data?.candidates?.[0]?.content?.parts?.[0]?.text);
      if (!text) throw new Error('Empty AI response');
      return text;
    } catch (error) {
      lastError = error;
      const retriable = error.name === 'TimeoutError' || error.name === 'AbortError';
      if (retriable && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error('Gemini call failed');
};

/* kind: 'listing' | 'requirement'. Returns the generated text. */
const generateDescription = async (kind, payload = {}) => {
  if (!isConfigured()) {
    const err = new Error('AI description is not configured on this server.');
    err.status = 503;
    throw err;
  }

  const facts = kind === 'requirement' ? requirementFacts(payload) : listingFacts(payload);
  if (Object.keys(facts).length < MIN_FACTS) {
    const err = new Error('Fill in a few more details first — then I can write this for you.');
    err.status = 422;
    throw err;
  }

  const prompt =
    kind === 'requirement' ? buildRequirementPrompt(facts) : buildListingPrompt(facts);
  return callGemini(prompt);
};

module.exports = { generateDescription, isConfigured, tidy, listingFacts, requirementFacts, MIN_FACTS };
