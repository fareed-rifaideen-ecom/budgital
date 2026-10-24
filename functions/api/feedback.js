const MAX_BODY_BYTES = 12_000;
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_EMAIL_LENGTH = 254;
const MAX_KIND_LENGTH = 40;
const MAX_PAGE_LENGTH = 80;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const requestLog = new Map();

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

function cleanText(value, max) {
  return typeof value === 'string' ? value.replace(/[<>]/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : '';
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br />');
}

function validEmail(value) {
  return !value || (value.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/[\r\n]/.test(value));
}

function consumeRateLimit(key) {
  const now = Date.now();
  const recent = (requestLog.get(key) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(key, recent);
    return false;
  }
  recent.push(now);
  requestLog.set(key, recent);
  if (requestLog.size > 2_000) {
    for (const [entry, times] of requestLog) if (!times.some((time) => now - time < WINDOW_MS)) requestLog.delete(entry);
  }
  return true;
}

function requestOriginAllowed(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function emailBody(input) {
  const emailLine = input.email ? `<p><strong>Reply email:</strong> ${escapeHtml(input.email)}</p>` : '<p><strong>Reply email:</strong> Not provided</p>';
  return `<h2>New Budgital ${escapeHtml(input.kind.toLowerCase())}</h2><p><strong>Page:</strong> ${escapeHtml(input.page)}</p>${emailLine}<p><strong>Message:</strong></p><p>${escapeHtml(input.message)}</p><hr /><p style="color:#667085;font-size:12px">Received ${escapeHtml(input.createdAt)} from Budgital feedback.</p>`;
}

async function sendEmail(env, input) {
  const apiKey = env.RESEND_API_KEY;
  const to = cleanText(env.FEEDBACK_TO_EMAIL, MAX_EMAIL_LENGTH);
  const from = cleanText(env.FEEDBACK_FROM_EMAIL, MAX_EMAIL_LENGTH);
  if (!apiKey || !to || !from) return { configured: false };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[Budgital] ${input.kind} from ${input.page}`,
      html: emailBody(input),
      text: `New Budgital ${input.kind.toLowerCase()}\nPage: ${input.page}\nReply email: ${input.email || 'Not provided'}\n\n${input.message}\n\nReceived: ${input.createdAt}`,
      ...(input.email ? { reply_to: input.email } : {}),
    }),
  });
  const body = await response.json().catch(() => null);
  return { configured: true, ok: response.ok, status: response.status, body };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ code: 'method_not_allowed', retryable: false, error: 'Method not allowed.' }, 405);
  if (!requestOriginAllowed(request)) return json({ code: 'origin_not_allowed', retryable: false, error: 'This form can only be submitted from Budgital.' }, 403);

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'cloudflare-client';
  if (!consumeRateLimit(ip)) return json({ code: 'rate_limit', retryable: true, error: 'Too many feedback attempts. Please try again later.' }, 429);

  let payload;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) throw new Error('Request is too large.');
    payload = JSON.parse(rawBody || '{}');
  } catch (error) {
    return json({ code: 'validation', retryable: false, error: error instanceof Error ? error.message : 'Invalid JSON body.' }, 400);
  }

  const input = {
    kind: cleanText(payload?.kind, MAX_KIND_LENGTH),
    email: cleanText(payload?.email, MAX_EMAIL_LENGTH),
    message: cleanText(payload?.message, MAX_MESSAGE_LENGTH),
    page: cleanText(payload?.page, MAX_PAGE_LENGTH),
    createdAt: cleanText(payload?.createdAt, 60) || new Date().toISOString(),
    website: cleanText(payload?.website, 120),
  };
  if (input.website) return json({ ok: true });
  if (!['Feedback', 'Inquiry', 'Suggestion'].includes(input.kind)) return json({ code: 'validation', retryable: false, error: 'Choose a valid feedback type.' }, 400);
  if (input.message.length < 5) return json({ code: 'validation', retryable: false, error: 'Your note must be at least 5 characters.' }, 400);
  if (!validEmail(input.email)) return json({ code: 'validation', retryable: false, error: 'Enter a valid email address or leave it blank.' }, 400);

  try {
    const result = await sendEmail(env, input);
    if (!result.configured) return json({ code: 'not_configured', retryable: false, error: 'Feedback email notifications are not configured yet.' }, 503);
    if (!result.ok) return json({ code: result.status === 429 ? 'rate_limit' : 'email_service', retryable: result.status >= 500 || result.status === 429, error: 'The feedback email service could not accept this note. Please try again later.' }, result.status === 429 ? 429 : 502);
    return json({ ok: true, message: 'Feedback sent.' });
  } catch {
    return json({ code: 'email_service', retryable: true, error: 'The feedback email service could not be reached. Please try again later.' }, 502);
  }
}
