// HS256 JWTs for the local test stack (PostgREST verifies them with the same secret).
import { createHmac } from 'node:crypto';

export const JWT_SECRET = 'e2e-test-secret-that-is-at-least-32-characters-long';
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

export function sign(payload, secret = JWT_SECRET) {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(payload);
  const sig = createHmac('sha256', secret).update(head + '.' + body).digest('base64url');
  return `${head}.${body}.${sig}`;
}

export function verify(token, secret = JWT_SECRET) {
  const [h, b, s] = String(token).split('.');
  if (!h || !b || !s) return null;
  const want = createHmac('sha256', secret).update(h + '.' + b).digest('base64url');
  if (want !== s) return null;
  const p = JSON.parse(Buffer.from(b, 'base64url').toString());
  return p.exp && p.exp * 1000 < Date.now() ? null : p;
}

export const ANON_KEY = sign({ role: 'anon', iss: 'e2e', iat: 1700000000, exp: 4102444800 });
export const SERVICE_KEY = sign({ role: 'service_role', iss: 'e2e', iat: 1700000000, exp: 4102444800 });
