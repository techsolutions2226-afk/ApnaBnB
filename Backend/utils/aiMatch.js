// AI matchmaking via Google Gemini (free tier). The synchronous rule scorer in
// matchScore.js stays the baseline; this adds a 0-100 semantic score plus a
// one-line reason derived from the free-text fields (title/description/notes).
//
// Runs async, fire-and-forget, after match creation so saves are never slowed
// down. Gracefully degrades: if GEMINI_API_KEY is missing or the API call
// fails, the match keeps its pure rule score with aiStatus 'failed'.

const prisma = require('../db/prisma');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// gemini-flash-latest is a thinking model that burns its token budget on
// hidden reasoning and truncates the visible JSON — so default to the lite
// flash (no thinking, returns clean structured JSON).
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 1;
const RULE_WEIGHT = 0.6;
const AI_WEIGHT = 0.4;
const MAX_REASON_LEN = 240;
const CONCURRENCY = 2;

// In-memory cache keyed `${propertyId}:${requirementId}` so an unchanged pair
// is never re-scored twice within a process.
const cache = new Map();

// Tiny FIFO queue with bounded concurrency so free-tier rate limits aren't hit.
let active = 0;
const queue = [];

const enqueue = (task) =>
  new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    pump();
  });

const pump = () => {
  if (active >= CONCURRENCY || queue.length === 0) return;
  active += 1;
  const { task, resolve, reject } = queue.shift();
  task()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      active -= 1;
      pump();
    });
};

// Compact structured snapshot of a property/requirement for the prompt.
const snapshot = (obj) => {
  if (!obj) return {};
  const pick = {
    title: obj.title,
    description: obj.description,
    price: obj.price,
    propertyType: obj.propertyType,
    purpose: obj.purpose,
    size: obj.size,
    bedrooms: obj.bedrooms,
    bathrooms: obj.bathrooms,
    amenities: Array.isArray(obj.amenities) ? obj.amenities : undefined,
    furnished: obj.furnished,
    location: obj.location,
    notes: obj.notes,
    budget: obj.budget,
    urgency: obj.urgency,
  };
  return JSON.stringify(pick);
};

const buildPrompt = (property, requirement) =>
  [
    'You are a senior real-estate matchmaker for ApnaBnB, a Pakistani property marketplace.',
    'Score how well the PROPERTY fits the REQUIREMENT, from the perspective of the person who posted the requirement.',
    'Use BOTH the structured fields and the free text (title, description, notes).',
    'Consider budget fit, area/locality, property type, size, bedrooms, bathrooms, and softer signals in the text (e.g. "near park", "family home", "corner plot").',
    'Be realistic — a mismatch in budget, city or type should score low even if the text is enthusiastic.',
    '',
    `PROPERTY: ${snapshot(property)}`,
    '',
    `REQUIREMENT: ${snapshot(requirement)}`,
    '',
    'Respond with ONLY a JSON object, no markdown: {"score": <0-100 integer>, "reason": "<one short sentence, max 30 words>"}',
  ].join('\n');

const parseJson = (text) => {
  const cleaned = String(text || '').replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // Fallback: grab the first {...} block if the model wrapped the JSON.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw error;
    return JSON.parse(match[0]);
  }
};

const callGemini = async (property, requirement) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: buildPrompt(property, requirement) }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 350,
      responseMimeType: 'application/json',
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
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseJson(text);
      const aiScore = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
      const aiReason = String(parsed.reason || '').trim().slice(0, MAX_REASON_LEN);
      if (aiScore === 0 && !aiReason) throw new Error('Empty AI response');
      return { aiScore, aiReason };
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

const persistResult = async (matchId, ruleScore, aiScore, aiReason) => {
  const blended = Math.round(ruleScore * RULE_WEIGHT + aiScore * AI_WEIGHT);
  await prisma.match.update({
    where: { id: matchId },
    data: { score: blended, aiScore, aiReason, aiStatus: 'scored', aiError: null },
  });
};

// Async fire-and-forget enrichment. entries = [{ matchId, ruleScore }].
// Returns immediately; failures are swallowed and recorded on the match.
const enrichMatchesWithAI = (entries) => {
  if (!GEMINI_API_KEY || !Array.isArray(entries) || entries.length === 0) return;

  for (const { matchId, ruleScore } of entries) {
    enqueue(async () => {
      try {
        const match = await prisma.match.findUnique({
          where: { id: matchId },
          include: { property: true, requirement: true },
        });
        if (!match || match.aiStatus === 'scored') return;

        const cacheKey = `${match.propertyId}:${match.requirementId}`;
        if (cache.has(cacheKey)) {
          const { aiScore, aiReason } = cache.get(cacheKey);
          await persistResult(matchId, ruleScore, aiScore, aiReason);
          return;
        }

        const { aiScore, aiReason } = await callGemini(match.property, match.requirement);
        cache.set(cacheKey, { aiScore, aiReason });
        await persistResult(matchId, ruleScore, aiScore, aiReason);
      } catch (error) {
        await prisma.match
          .update({
            where: { id: matchId },
            data: { aiStatus: 'failed', aiError: String(error.message || error).slice(0, 200) },
          })
          .catch(() => {});
      }
    }).catch(() => {});
  }
};

module.exports = { enrichMatchesWithAI };
