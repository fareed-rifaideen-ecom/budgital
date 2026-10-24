const MAX_BODY_BYTES = 60_000;
const DAILY_AI_LIMIT = 12;
const PROJECT_DAILY_LIMIT = 120;
const dailyUsage = new Map();

const GUARDRAILS = `You are Budgital's optional AI budgeting companion. You give calm, concrete, non-judgmental help about a personal budget. Never give financial, tax, legal, investment, credit, or debt advice, and never recommend products, lenders, or securities. Never invent numbers. Only use the aggregate snapshot and the conversation so far. Say plainly when the data is too sparse to answer well. Keep every reply under 120 words, in plain English, specific and practical.`;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function cleanText(value, max = 180) {
  return typeof value === 'string' ? value.replace(/[<>]/g, '').slice(0, max) : '';
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

function validateCurrency(value) {
  const code = cleanText(value, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error('A valid 3-letter currency code is required.');
  return code;
}

function validateSnapshot(snapshot) {
  const totals = snapshot?.totals;
  if (!totals || !['income', 'expenses', 'budget', 'left'].every((key) => Number.isFinite(Number(totals[key])))) {
    throw new Error('Valid totals are required.');
  }
  const categorySpend = snapshot?.categorySpend;
  if (!Array.isArray(categorySpend) || categorySpend.length > 40) throw new Error('Valid category totals are required.');
  const currency = validateCurrency(snapshot?.currency || 'USD');
  return {
    period: cleanText(snapshot?.period, 60) || 'the selected period',
    currency,
    totals: Object.fromEntries(['income', 'expenses', 'budget', 'left'].map((key) => [key, round(totals[key])])),
    categorySpend: categorySpend
      .map((item) => ({ category: cleanText(item?.category, 60), amount: round(item?.amount || 0) }))
      .filter((item) => item.category && item.amount >= 0),
    localInsights: Array.isArray(snapshot?.localInsights)
      ? snapshot.localInsights.slice(0, 5).map((item) => cleanText(item, 140)).filter(Boolean)
      : [],
  };
}

function normalizeHistory(history, question) {
  if (!Array.isArray(history)) return [];
  const cleaned = history
    .slice(-8)
    .map((entry) => ({ role: entry?.role === 'assistant' ? 'model' : 'user', text: cleanText(entry?.text, 600) }))
    .filter((entry) => entry.text);
  const firstUser = cleaned.findIndex((entry) => entry.role === 'user');
  const turns = firstUser === -1 ? [] : cleaned.slice(firstUser);
  while (turns.length && turns[turns.length - 1].text === question) turns.pop();
  return turns.slice(-8);
}

function insightPrompt(input) {
  return `Give a calm, concrete read of this budget period. Every amount in the snapshot is denominated in ${input.currency}; preserve that currency and never convert or reinterpret the amounts.

Return only valid JSON matching this shape: {"headline":"short sentence","bullets":["2 to 3 specific observations"],"nextStep":"one small practical action"}.

Rules: use plain English; mention exact category names and amounts only when present; keep the headline under 90 characters; keep each bullet under 170 characters; keep nextStep under 170 characters. The user sent only this aggregate snapshot (no individual transactions or descriptions):
${JSON.stringify(input)}`;
}

function chatPrompt(input, question) {
  return `Aggregate snapshot for ${input.period}, with every amount in ${input.currency} (no individual transactions were shared):
${JSON.stringify(input)}

Answer this follow-up question about that snapshot: ${question}`;
}

function fxPrompt(from, to) {
  return `Return only JSON matching {"rate":number,"confidence":"high|medium|low","note":"string"}. Estimate the current conversion rate from 1 ${from} to ${to} using your latest reliable knowledge. Never present an estimate as a guaranteed live market quote: if uncertain, use confidence low and explain that the user should verify the rate. Keep the rate positive, below 100000, and the note under 120 characters.`;
}

function upstreamError(status, responseBody) {
  const detail = cleanText(responseBody?.error?.message, 180);
  if (status === 400) return { status: 502, code: 'validation', retryable: false, error: detail ? `Gemini rejected the request: ${detail}` : 'Gemini rejected the request. Check the model and API-key settings.' };
  if (status === 401 || status === 403) return { status: 502, code: 'invalid_key', retryable: false, error: 'The Gemini API key is missing or invalid in Cloudflare.' };
  if (status === 429) return { status: 429, code: 'rate_limit', retryable: true, error: 'Gemini free-tier limit reached. Try again later.' };
  if (status === 503) return { status: 503, code: 'busy', retryable: true, error: 'Gemini is busy right now. Try again in a moment.' };
  return { status: 502, code: 'service', retryable: true, error: detail ? `Gemini could not complete this request: ${detail}` : 'Gemini could not complete this request. Check the Cloudflare Function configuration.' };
}

async function callGemini(apiKey, model, body) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const responseBody = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, responseBody };
}

function consumeDailyUsage(clientKey) {
  const day = new Date().toISOString().slice(0, 10);
  const clientUsageKey = `${clientKey}:${day}`;
  const projectUsageKey = `project:${day}`;
  const clientCount = dailyUsage.get(clientUsageKey) || 0;
  const projectCount = dailyUsage.get(projectUsageKey) || 0;
  if (clientCount >= DAILY_AI_LIMIT || projectCount >= PROJECT_DAILY_LIMIT) return false;
  dailyUsage.set(clientUsageKey, clientCount + 1);
  dailyUsage.set(projectUsageKey, projectCount + 1);
  if (dailyUsage.size > 5000) {
    for (const [entry] of dailyUsage) if (!entry.endsWith(`:${day}`)) dailyUsage.delete(entry);
  }
  return true;
}

export async function handleGeminiRequest(request, env, allowedModes = ['insight', 'chat', 'fx']) {
  if (request.method !== 'POST') return json({ code: 'method_not_allowed', retryable: false, error: 'Method not allowed.' }, 405);
  if (!env.GEMINI_API_KEY) return json({ code: 'not_configured', retryable: false, error: 'Gemini is not configured yet. Add GEMINI_API_KEY to Cloudflare Pages Variables and Secrets.' }, 503);

  let payload;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) throw new Error('Request is too large.');
    payload = JSON.parse(rawBody || '{}');
  } catch (error) {
    return json({ code: 'validation', retryable: false, error: error instanceof Error ? error.message : 'Invalid JSON body.' }, 400);
  }

  try {
    const requestedMode = payload?.mode === 'chat' ? 'chat' : payload?.mode === 'fx' ? 'fx' : 'insight';
    if (!allowedModes.includes(requestedMode)) throw new Error('This endpoint does not support that AI mode.');
    const clientKey = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'cloudflare-client';
    if (!consumeDailyUsage(clientKey)) return json({ code: 'daily_limit', retryable: false, error: `Daily AI limit reached (${DAILY_AI_LIMIT} requests). Try again tomorrow.` }, 429);
    const model = cleanText(env.GEMINI_MODEL, 80) || 'gemini-flash-lite-latest';

    if (requestedMode === 'fx') {
      const from = validateCurrency(payload?.from);
      const to = validateCurrency(payload?.to);
      if (from === to) return json({ rate: 1, confidence: 'high', note: 'Same currency.' });
      const result = await callGemini(env.GEMINI_API_KEY, model, {
        systemInstruction: { parts: [{ text: 'You provide cautious currency conversion estimates. Never present an estimate as a guaranteed live market quote.' }] },
        contents: [{ role: 'user', parts: [{ text: fxPrompt(from, to) }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 160, responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { rate: { type: 'NUMBER' }, confidence: { type: 'STRING' }, note: { type: 'STRING' } }, required: ['rate', 'confidence', 'note'] } },
      });
      if (!result.ok) { const failure = upstreamError(result.status, result.responseBody); return json({ code: failure.code, retryable: failure.retryable, error: failure.error }, failure.status); }
      let parsed;
      try { parsed = JSON.parse(result.responseBody?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'); } catch { throw new Error('Gemini returned an unreadable exchange rate.'); }
      const rate = Number(parsed.rate);
      if (!Number.isFinite(rate) || rate <= 0 || rate >= 100000) throw new Error('Gemini returned an invalid exchange rate.');
      return json({ rate: round(rate), confidence: cleanText(parsed.confidence, 10) || 'low', note: cleanText(parsed.note, 120) || 'Verify this estimate before relying on it.' });
    }

    const input = validateSnapshot(payload?.snapshot);
    if (requestedMode === 'chat') {
      const question = cleanText(payload?.question, 400);
      if (!question) throw new Error('Ask a question to continue.');
      const history = normalizeHistory(payload?.history, question);
      const result = await callGemini(env.GEMINI_API_KEY, model, {
        systemInstruction: { parts: [{ text: GUARDRAILS }] },
        contents: [...history.map((entry) => ({ role: entry.role, parts: [{ text: entry.text }] })), { role: 'user', parts: [{ text: chatPrompt(input, question) }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 420 },
      });
      if (!result.ok) { const failure = upstreamError(result.status, result.responseBody); return json({ code: failure.code, retryable: failure.retryable, error: failure.error }, failure.status); }
      const answer = cleanText((result.responseBody?.candidates?.[0]?.content?.parts || []).map((part) => part?.text || '').join(' ').trim(), 900);
      if (!answer) throw new Error('Gemini returned an empty answer.');
      return json({ answer });
    }

    const result = await callGemini(env.GEMINI_API_KEY, model, {
      systemInstruction: { parts: [{ text: GUARDRAILS }] },
      contents: [{ role: 'user', parts: [{ text: insightPrompt(input) }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 380, responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { headline: { type: 'STRING' }, bullets: { type: 'ARRAY', items: { type: 'STRING' } }, nextStep: { type: 'STRING' } }, required: ['headline', 'bullets', 'nextStep'] } },
    });
    if (!result.ok) { const failure = upstreamError(result.status, result.responseBody); return json({ code: failure.code, retryable: failure.retryable, error: failure.error }, failure.status); }
    let parsed;
    try { parsed = JSON.parse(result.responseBody?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'); } catch { throw new Error('Gemini returned an unreadable response.'); }
    return json({ headline: cleanText(parsed.headline, 90) || 'This period has a story worth noticing.', bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 3).map((item) => cleanText(item, 170)).filter(Boolean) : [], nextStep: cleanText(parsed.nextStep, 170) || 'Keep logging consistently so the next read has a stronger baseline.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to analyze this snapshot.';
    const responseInvalid = message.startsWith('Gemini returned');
    const upstreamUnavailable = error instanceof TypeError || /fetch failed|network/i.test(message);
    const code = upstreamUnavailable ? 'service' : responseInvalid ? 'response_invalid' : 'validation';
    return json({ code, retryable: upstreamUnavailable || responseInvalid, error: upstreamUnavailable ? 'The Gemini service could not be reached. Try again shortly.' : message }, upstreamUnavailable || responseInvalid ? 502 : 400);
  }
}
