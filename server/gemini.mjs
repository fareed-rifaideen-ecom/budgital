const MAX_BODY_BYTES = 60_000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const MAX_HISTORY = 8;
const GUARDRAILS = `You are Budgetly's optional AI budgeting companion. You give calm, concrete, non-judgmental help about a personal budget. Never give financial, tax, legal, investment, credit, or debt advice, and never recommend products, lenders, or securities. Never invent numbers. Only use the aggregate snapshot and the conversation so far. Say plainly when the data is too sparse to answer well. Keep every reply under 120 words, in plain English, specific and practical.`;

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

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

// Validates the aggregate-only snapshot: no transaction rows, dates, or descriptions are accepted.
function validateSnapshot(snapshot) {
  const totals = snapshot?.totals;
  if (!totals || !['income', 'expenses', 'budget', 'left'].every((key) => Number.isFinite(Number(totals[key])))) throw new Error('Valid totals are required.');
  const categorySpend = snapshot?.categorySpend;
  if (!Array.isArray(categorySpend) || categorySpend.length > 40) throw new Error('Valid category totals are required.');
  return {
    period: cleanText(snapshot?.period, 60) || 'the selected period',
    totals: Object.fromEntries(['income', 'expenses', 'budget', 'left'].map((key) => [key, round(totals[key])])),
    categorySpend: categorySpend
      .map((item) => ({ category: cleanText(item?.category, 60), amount: round(item?.amount || 0) }))
      .filter((item) => item.category && item.amount >= 0),
    localInsights: Array.isArray(snapshot?.localInsights)
      ? snapshot.localInsights.slice(0, 5).map((item) => cleanText(item, 140)).filter(Boolean)
      : [],
  };
}

function validateHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-MAX_HISTORY)
    .map((entry) => ({
      role: entry?.role === 'assistant' ? 'model' : 'user',
      text: cleanText(entry?.text, 600),
    }))
    .filter((entry) => entry.text);
}

// Keeps whole turns only, guarantees a user-first conversation, and drops a duplicated question.
function normalizeHistory(history, question) {
  const cleaned = validateHistory(history);
  const firstUser = cleaned.findIndex((entry) => entry.role === 'user');
  const turns = firstUser === -1 ? [] : cleaned.slice(firstUser);
  while (turns.length && turns[turns.length - 1].text === question) turns.pop();
  return turns.slice(-MAX_HISTORY);
}

function insightPrompt(input) {
  return `Give a calm, concrete read of this budget period.

Return only valid JSON matching this shape: {"headline":"short sentence","bullets":["2 to 3 specific observations"],"nextStep":"one small practical action"}.

Rules: use plain English; mention exact category names and amounts only when present; keep the headline under 90 characters; keep each bullet under 170 characters; keep nextStep under 170 characters. The user sent only this aggregate snapshot (no individual transactions or descriptions):
${JSON.stringify(input)}`;
}

function chatPrompt(input, question) {
  return `Aggregate snapshot for ${input.period} (no individual transactions were shared):
${JSON.stringify(input)}

Answer this follow-up question about that snapshot: ${question}`;
}

async function callGemini(body) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const responseBody = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, responseBody };
}

function upstreamError(status) {
  if (status === 429) return { status: 429, error: 'Gemini free-tier limit reached. Try again later.' };
  if (status === 503) return { status: 503, error: 'Gemini is busy right now. Try again in a moment.' };
  return { status: 502, error: 'Gemini could not complete this request.' };
}

export async function handleGeminiRequest(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });
  if (!process.env.GEMINI_API_KEY) return sendJson(res, 503, { error: 'Gemini is not configured yet.' });
  let payload;
  try {
    payload = await readJson(req);
  } catch (error) {
    return sendJson(res, 400, { error: error instanceof Error ? error.message : 'Invalid request.' });
  }
  try {
    const input = validateSnapshot(payload?.snapshot);
    const mode = payload?.mode === 'chat' ? 'chat' : 'insight';

    if (mode === 'chat') {
      const question = cleanText(payload?.question, 400);
      if (!question) throw new Error('Ask a question to continue.');
      const history = normalizeHistory(payload?.history, question);
      const { ok, status, responseBody } = await callGemini({
        systemInstruction: { parts: [{ text: GUARDRAILS }] },
        contents: [
          ...history.map((entry) => ({ role: entry.role, parts: [{ text: entry.text }] })),
          { role: 'user', parts: [{ text: chatPrompt(input, question) }] },
        ],
        generationConfig: { temperature: 0.4, maxOutputTokens: 420 },
      });
      if (!ok) { const failure = upstreamError(status); return sendJson(res, failure.status, { error: failure.error }); }
      const answer = cleanText(
        (responseBody?.candidates?.[0]?.content?.parts || []).map((part) => part?.text || '').join(' ').trim(),
        900,
      );
      if (!answer) throw new Error('Gemini returned an empty answer.');
      return sendJson(res, 200, { answer });
    }

    const { ok, status, responseBody } = await callGemini({
      systemInstruction: { parts: [{ text: GUARDRAILS }] },
      contents: [{ role: 'user', parts: [{ text: insightPrompt(input) }] }],
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
    });
    if (!ok) { const failure = upstreamError(status); return sendJson(res, failure.status, { error: failure.error }); }
    const text = responseBody?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Gemini returned an unreadable response.');
    }
    return sendJson(res, 200, {
      headline: cleanText(parsed.headline, 90) || 'This period has a story worth noticing.',
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 3).map((item) => cleanText(item, 170)).filter(Boolean) : [],
      nextStep: cleanText(parsed.nextStep, 170) || 'Keep logging consistently so the next read has a stronger baseline.',
    });
  } catch (error) {
    return sendJson(res, 400, { error: error instanceof Error ? error.message : 'Unable to analyze this snapshot.' });
  }
}