import { handleGeminiRequest } from '../../_lib/gemini.js';

export async function onRequest(context) {
  return handleGeminiRequest(context.request, context.env, ['fx']);
}
