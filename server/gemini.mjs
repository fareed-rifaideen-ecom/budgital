const MAX_BODY_BYTES = 50_000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error('Request is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function cleanText(value, max = 180) {
  return typeof value === 'string' ? value.replace(/[<>]/g, '').slice(0, max) : '';
}

function validatePayload(payload) {
  const totals = payload?.totals;
  const categorySpend = payload?.categorySpend;
  if (!/^\d{4}-\d{2}$/.test(payload?.month || '')) throw new Error('A valid month is required.');
  if (!totals || !['income', 'expenses', 'budget', 'left'].every((key) => Number.isFinite(Number(totals[key])))) throw new Error('Valid totals are required.');
  if (!Array.isArray(categorySpend) || categorySpend.length > 40) throw new Error('Valid category totals are required.');
  return {
    month: payload.month,
    totals: Object.fromEntries(['income', 'expenses', 'budget', 'left'].map((key) => [key, Math.round(Number(totals[key]) * 100) / 100])),
    categorySpend: categorySpend.map((item) => ({ category: cleanText(item?.category, 60), amount: Math.round(Number(item?.amount || 0) * 100) / 100 })).filter((item) => item.category && item.amount >= 0),
    localInsights: Array.isArray(payload.localInsights) ? payload.localInsights.slice(0, 5).map((item) => cleanText(item?.title, 140)).filter(Boolean) : [],
  };
}

function buildPrompt(input) {
  return `You are Budgetly's optional AI budgeting companion. Give a calm, concrete, non-judgmental read of one month's aggregate budget data. Do not provide financial, tax, legal, or investment advice. Do not invent facts. Respect the local insights supplied by the app and call out uncertainty when data is sparse.

Return only valid JSON matching this shape: {"headline":"short sentence","bullets":["2 to 3 specific observations"],"nextStep":"one small practical action"}.

Rules: use plain English; mention exact category names and amounts only when present; do not recommend products or debt; keep the headline under 90 characters; keep each bullet under 170 characters; keep nextStep under 170 characters. The user has not sent individual transactions or descriptions—only the following aggregate snapshot:
${JSON.stringify(input)}`;
}

export async function handleGeminiRequest(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  if (!process.env.GEMINI_API_KEY) return sendJson(res, 503, { error: 'Gemini is not configured yet.' });
  try {
    const payload = validatePayload(await readJson(req));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(payload) }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 380,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: { headline: { type: 'STRING' }, bullets: { type: 'ARRAY', items: { type: 'STRING' } }, nextStep: { type: 'STRING' } },
            required: ['headline', 'bullets', 'nextStep'],
          },
        },
      }),
    });
    const responseBody = await response.json();
    if (!response.ok) {
      const status = response.status === 429 ? 429 : response.status === 503 ? 503 : 502;
      return sendJson(res, status, { error: response.status === 429 ? 'Gemini free-tier limit reached. Try again later.' : response.status === 503 ? 'Gemini is busy right now. Try again in a moment.' : 'Gemini could not complete this read.' });
    }
    const text = responseBody?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw new Error('Gemini returned an unreadable response.'); }
    const result = {
      headline: cleanText(parsed.headline, 90) || 'Your month has a story worth noticing.',
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 3).map((item) => cleanText(item, 170)).filter(Boolean) : [],
      nextStep: cleanText(parsed.nextStep, 170) || 'Keep logging consistently so the next read has a stronger baseline.',
    };
    return sendJson(res, 200, result);
  } catch (error) {
    return sendJson(res, 400, { error: error instanceof Error ? error.message : 'Unable to analyze this snapshot.' });
  }
}
