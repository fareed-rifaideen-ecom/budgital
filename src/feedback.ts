export type FeedbackPayload = {
  kind: string;
  email: string;
  message: string;
  page: 'landing' | 'app';
};

export async function submitFeedback(payload: FeedbackPayload) {
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, createdAt: new Date().toISOString() }),
  });
  const result = await response.json().catch(() => null) as { error?: string } | null;
  if (response.status === 404 || response.status === 405) {
    const legacyBody = new URLSearchParams({
      'form-name': 'budgital-feedback',
      kind: payload.kind,
      email: payload.email,
      message: payload.message,
      page: payload.page,
      createdAt: new Date().toISOString(),
    });
    const legacyResponse = await fetch('/__forms.html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: legacyBody.toString(),
    });
    if (!legacyResponse.ok) throw new Error(`Feedback could not be sent (${legacyResponse.status}).`);
    return;
  }
  if (!response.ok) throw new Error(result?.error || `Feedback could not be sent (${response.status}).`);
}
