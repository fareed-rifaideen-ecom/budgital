export type FeedbackPayload = {
  kind: string;
  email: string;
  message: string;
  page: 'landing' | 'app';
};

export async function submitFeedback(payload: FeedbackPayload) {
  const body = new URLSearchParams({
    'form-name': 'budgital-feedback',
    kind: payload.kind,
    email: payload.email,
    message: payload.message,
    page: payload.page,
    createdAt: new Date().toISOString(),
  });
  const response = await fetch('/__forms.html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!response.ok) throw new Error(`Feedback could not be sent (${response.status}).`);
}
