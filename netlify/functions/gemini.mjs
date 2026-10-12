import { EventEmitter } from 'node:events';
import { handleGeminiRequest } from '../../server/gemini.mjs';

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const nodeRequest = new EventEmitter();
  nodeRequest.method = request.method;
  nodeRequest.socket = { remoteAddress: request.headers.get('x-nf-client-connection-ip') || 'netlify-client' };
  nodeRequest.destroy = () => undefined;

  const nodeResponse = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(body = '') { this.body = body; },
  };

  const body = await request.text();
  setTimeout(() => {
    nodeRequest.emit('data', Buffer.from(body));
    nodeRequest.emit('end');
  }, 0);
  await handleGeminiRequest(nodeRequest, nodeResponse);

  return new Response(nodeResponse.body, {
    status: nodeResponse.statusCode,
    headers: nodeResponse.headers,
  });
}
