import { EventEmitter } from 'node:events';
import { handleGeminiRequest } from '../../server/gemini.mjs';

export default async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  const request = new EventEmitter();
  request.method = event.httpMethod;
  request.socket = { remoteAddress: event.headers?.['x-nf-client-connection-ip'] || 'netlify-client' };
  request.destroy = () => undefined;

  const response = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(body = '') { this.body = body; },
  };

  const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  setTimeout(() => {
    request.emit('data', Buffer.from(body));
    request.emit('end');
  }, 0);
  await handleGeminiRequest(request, response);

  return { statusCode: response.statusCode, headers: response.headers, body: response.body };
}
