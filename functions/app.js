export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = '/index.html';
  return context.env.ASSETS.fetch(url);
}
