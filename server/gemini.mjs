const MAX_BODY_BYTES = 60_000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const MAX_HISTORY = 8;
const DAILY_AI_LIMIT = 12;
const PROJECT_DAILY_LIMIT = Number(process.env.GEMINI_DAILY_PROJECT_LIMIT || 120);
const dailyUsage = new Map();
const GUARDRAILS = `You are Budgital's optional AI budgeting companion. You give calm, concrete, non-judgmental help about a personal budget. Never give financial, tax, legal, investment, credit, or debt advice, and never recommend products, lenders, or securities. Never invent numbers. Only use the aggregate snapshot and the conversation so far. Say plainly when the data is too sparse to answer well. Keep every reply under 120 words, in plain English, specific and practical.`;

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

function usageKey(req) {
  return req.socket?.remoteAddress || 'local';
}
function consumeDailyUsage(req) {
  const day = new Date().toISOString().slice(0, 10);
  const clientKey = `${usageKey(req)}:${day}`;
  const projectKey = `project:${day}`;
  const clientCount = dailyUsage.get(clientKey) || 0;
  const projectCount = dailyUsage.get(projectKey) || 0;
  if (clientCount >= DAILY_AI_LIMIT || projectCount >= PROJECT_DAILY_LIMIT) return false;
  dailyUsage.set(clientKey, clientCount + 1);
  dailyUsage.set(projectKey, projectCount + 1);
  if (dailyUsage.size > 5000) {
    for (const [entry] of dailyUsage) if (!entry.endsWith(`:${day}`)) dailyUsage.delete(entry);
  }
  return true;
}
function validateCurrency(value) {
  const code = cleanText(value, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error('A valid 3-letter currency code is required.');
  return code;
}
function fxPrompt(from, to) {
  return `Return only JSON matching {"rate":number,"confidence":"high|medium|low","note":"string"}. Estimate the current conversion rate from 1 ${from} to ${to} using your latest reliable knowledge. Never invent a precise live quote: if uncertain, use confidence low and explain that the user should verify the rate. Keep the rate positive, below 100000, and the note under 120 characters.`;
}

function upstreamError(status, responseBody) {
  const detail = cleanText(responseBody?.error?.message, 180);
  if (status === 400) return { status: 502, code: 'validation', retryable: false, error: detail ? `Gemini rejected the request: ${detail}` : 'Gemini rejected the request. Check the Netlify model and API-key settings.' };
  if (status === 401 || status === 403) return { status: 502, code: 'invalid_key', retryable: false, error: 'The Gemini API key is missing or invalid in Netlify.' };
  if (status === 429) return { status: 429, code: 'rate_limit', retryable: true, error: 'Gemini free-tier limit reached. Try again later.' };
  if (status === 503) return { status: 503, code: 'busy', retryable: true, error: 'Gemini is busy right now. Try again in a moment.' };
  return { status: 502, code: 'service', retryable: true, error: detail ? `Gemini could not complete this request: ${detail}` : 'Gemini could not complete this request. Check the Netlify function configuration.' };
}

export async function handleGeminiRequest(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { code: 'method_not_allowed', retryable: false, error: 'Method not allowed.' });
  if (!process.env.GEMINI_API_KEY) return sendJson(res, 503, { code: 'not_configured', retryable: false, error: 'Gemini is not configured yet. Add GEMINI_API_KEY to the Netlify function environment.' });
  let payload;
  try {
    payload = await readJson(req);
  } catch (error) {
    return sendJson(res, 400, { code: 'validation', retryable: false, error: error instanceof Error ? error.message : 'Invalid request.' });
  }
  try {
    const mode = payload?.mode === 'chat' ? 'chat' : payload?.mode === 'fx' ? 'fx' : 'insight';
    if (!consumeDailyUsage(req)) return sendJson(res, 429, { code: 'daily_limit', retryable: false, error: `Daily AI limit reached (${DAILY_AI_LIMIT} requests). Try again tomorrow.` });
    if (mode === 'fx') {
      const from = validateCurrency(payload?.from);
      const to = validateCurrency(payload?.to);
      if (from === to) return sendJson(res, 200, { rate: 1, confidence: 'high', note: 'Same currency.' });
      const { ok, status, responseBody } = await callGemini({
        systemInstruction: { parts: [{ text: 'You provide cautious currency conversion estimates. Never present an estimate as a guaranteed live market quote.' }] },
        contents: [{ role: 'user', parts: [{ text: fxPrompt(from, to) }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 160, responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { rate: { type: 'NUMBER' }, confidence: { type: 'STRING' }, note: { type: 'STRING' } }, required: ['rate', 'confidence', 'note'] } },
      });
      if (!ok) { const failure = upstreamError(status, responseBody); return sendJson(res, failure.status, { code: failure.code, retryable: failure.retryable, error: failure.error }); }
      let parsed;
      try { parsed = JSON.parse(responseBody?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'); } catch { throw new Error('Gemini returned an unreadable exchange rate.'); }
      const rate = Number(parsed.rate);
      if (!Number.isFinite(rate) || rate <= 0 || rate >= 100000) throw new Error('Gemini returned an invalid exchange rate.');
      return sendJson(res, 200, { rate: round(rate), confidence: cleanText(parsed.confidence, 10) || 'low', note: cleanText(parsed.note, 120) || 'Verify this estimate before relying on it.' });
    }

    const input = validateSnapshot(payload?.snapshot);
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
      if (!ok) { const failure = upstreamError(status, responseBody); return sendJson(res, failure.status, { code: failure.code, retryable: failure.retryable, error: failure.error }); }
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
    if (!ok) { const failure = upstreamError(status, responseBody); return sendJson(res, failure.status, { code: failure.code, retryable: failure.retryable, error: failure.error }); }
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
    const message = error instanceof Error ? error.message : 'Unable to analyze this snapshot.';
    const responseInvalid = message.startsWith('Gemini returned');
    const upstreamUnavailable = error instanceof TypeError || /fetch failed|network/i.test(message);
    const code = upstreamUnavailable ? 'service' : responseInvalid ? 'response_invalid' : 'validation';
    return sendJson(res, upstreamUnavailable || responseInvalid ? 502 : 400, { code, retryable: upstreamUnavailable || responseInvalid, error: upstreamUnavailable ? 'The Gemini service could not be reached. Try again shortly.' : message });
  }
}
