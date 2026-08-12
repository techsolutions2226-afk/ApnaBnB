require('dotenv').config();
const prisma = require('./db/prisma');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-flash-lite-latest';

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

(async () => {
  const match = await prisma.match.findFirst({
    where: { aiStatus: { not: 'scored' } },
    include: { property: true, requirement: true },
  });
  const prompt = buildPrompt(match.property, match.requirement);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 350,
      responseMimeType: 'application/json',
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.log('HTTP', res.status);
  const data = await res.json();
  if (!res.ok) {
    console.log('ERROR BODY:', JSON.stringify(data, null, 2));
    process.exit(0);
  }
  console.log('finishReason:', data?.candidates?.[0]?.finishReason);
  console.log('usage:', JSON.stringify(data?.usageMetadata));
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('RAW RESPONSE >>>');
  console.log(text);
  console.log('<<< END');
  process.exit(0);
})().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});
