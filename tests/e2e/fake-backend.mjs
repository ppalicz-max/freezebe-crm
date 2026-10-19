// Test stand-in for the Supabase gateway, on one port like the real thing:
//   /rest/v1/*   -> PostgREST (real database, real row-level security)
//   /auth/v1/*   -> tiny fake of Supabase Auth: email code sign-in; the code is always 123456
//   /google/v1/* -> fake Google Places API (New)
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { sign, verify } from './jwt.mjs';

const PORT = Number(process.env.FAKE_PORT || 54321);
const PGRST = process.env.PGRST_URL || 'http://127.0.0.1:3001';
const PG_HOST = process.env.PG_HOST; // socket dir
const PG_PORT = process.env.PG_PORT || '54330';
const CODE = '123456';

// Values are passed as psql variables (:'v0') so they are quoted safely.
const sqlq = (q, ...vals) =>
  execFileSync('psql', ['-h', PG_HOST, '-p', PG_PORT, '-U', 'postgres', '-d', 'crm', '-tA', '-v', 'ON_ERROR_STOP=1',
    ...vals.flatMap((v, i) => ['-v', `v${i}=${v}`])], { input: q, encoding: 'utf8' }).trim();

const body = (req) => new Promise((ok) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => ok(d)); });
const send = (res, status, obj, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', ...cors, ...headers });
  res.end(obj === undefined ? '' : JSON.stringify(obj));
};
// lower-case keys so they replace (not duplicate) PostgREST's own CORS headers
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'access-control-expose-headers': 'Content-Range, X-Supabase-Api-Version',
};

const pendingCodes = new Map(); // email -> code
const refresh = new Map(); // refresh token -> user

function session(user) {
  const now = Math.floor(Date.now() / 1000);
  const access_token = sign({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600 });
  const refresh_token = randomUUID();
  refresh.set(refresh_token, user);
  return { access_token, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token, user: userJson(user) };
}
const userJson = (u) => ({
  id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [], created_at: new Date().toISOString(),
});
const findUser = (email) => {
  const id = sqlq(`select id from auth.users where email = :'v0'`, email);
  return id ? { id, email } : null;
};

async function auth(req, res, path, url) {
  const raw = req.method === 'GET' ? '' : await body(req);
  const data = raw ? JSON.parse(raw) : {};
  if (path === '/otp') {
    const email = String(data.email || '').toLowerCase();
    if (!findUser(email)) {
      // Same as Supabase: the "before user created" hook decides about new accounts.
      const out = JSON.parse(sqlq(`select public.hook_before_user_created(jsonb_build_object('user', jsonb_build_object('email', :'v0'::text)))`, email));
      if (out.error) return send(res, out.error.http_code, { code: out.error.http_code, error_code: 'hook_error', msg: out.error.message });
    }
    pendingCodes.set(email, CODE);
    return send(res, 200, {});
  }
  if (path === '/verify') {
    const email = String(data.email || '').toLowerCase();
    if (pendingCodes.get(email) !== data.token) return send(res, 403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
    pendingCodes.delete(email);
    let user = findUser(email);
    if (!user) user = { id: sqlq(`insert into auth.users (email) values (:'v0') returning id`, email).split('\n')[0], email };
    return send(res, 200, session(user));
  }
  if (path === '/token' && url.searchParams.get('grant_type') === 'refresh_token') {
    const user = refresh.get(data.refresh_token);
    if (!user) return send(res, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
    refresh.delete(data.refresh_token);
    return send(res, 200, session(user));
  }
  if (path === '/user') {
    const p = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
    if (!p) return send(res, 401, { code: 401, msg: 'invalid JWT' });
    return send(res, 200, userJson({ id: p.sub, email: p.email }));
  }
  if (path === '/logout') return send(res, 204);
  return send(res, 404, { msg: 'not in fake auth: ' + path });
}

const PLACES = {
  ChIJ_aranyhid: {
    id: 'ChIJ_aranyhid', displayName: { text: 'Aranyhíd Szálloda' }, formattedAddress: 'Budapest, Andrássy út 12, 1061 Hungary',
    addressComponents: [
      { longText: '12', types: ['street_number'] }, { longText: 'Andrássy út', types: ['route'] },
      { longText: 'Budapest', types: ['locality', 'political'] }, { longText: '1061', types: ['postal_code'] },
      { longText: 'Hungary', shortText: 'HU', types: ['country'] },
    ],
    internationalPhoneNumber: '+36 1 234 5678', nationalPhoneNumber: '(06 1) 234 5678', websiteUri: 'https://aranyhid.example/',
    googleMapsUri: 'https://maps.google.com/?cid=111', primaryType: 'hotel', types: ['hotel', 'lodging'],
  },
  ChIJ_bistro: {
    id: 'ChIJ_bistro', displayName: { text: 'Aranyhíd Bisztró' }, formattedAddress: 'Siófok, Petőfi sétány 3, 8600 Hungary',
    addressComponents: [
      { longText: '3', types: ['street_number'] }, { longText: 'Petőfi sétány', types: ['route'] },
      { longText: 'Siófok', types: ['locality'] },
    ],
    googleMapsUri: 'https://maps.google.com/?cid=222', primaryType: 'bistro', types: ['bistro', 'restaurant'],
  },
};

async function google(req, res, path) {
  if (req.headers['x-goog-api-key'] !== 'test-key') return send(res, 403, { error: { message: 'bad key' } });
  if (path === '/places:autocomplete') {
    const { input } = JSON.parse(await body(req));
    const list = Object.values(PLACES).filter((p) => p.displayName.text.toLowerCase().includes(String(input).toLowerCase().slice(0, 4)));
    return send(res, 200, {
      suggestions: list.map((p) => ({
        placePrediction: { placeId: p.id, text: { text: p.displayName.text }, structuredFormat: { mainText: { text: p.displayName.text }, secondaryText: { text: p.formattedAddress } } },
      })),
    });
  }
  const m = path.match(/^\/places\/([\w-]+)$/);
  if (m && PLACES[m[1]]) return send(res, 200, PLACES[m[1]]);
  return send(res, 404, { error: { message: 'not found' } });
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    if (url.pathname.startsWith('/auth/v1')) return await auth(req, res, url.pathname.slice(8), url);
    if (url.pathname.startsWith('/google/v1')) return await google(req, res, url.pathname.slice(10));
    if (url.pathname.startsWith('/rest/v1')) {
      const target = PGRST + url.pathname.slice(8) + url.search;
      const headers = { ...req.headers };
      delete headers.host;
      if (!headers.authorization && headers.apikey) headers.authorization = 'Bearer ' + headers.apikey;
      const raw = ['GET', 'HEAD'].includes(req.method) ? undefined : await body(req);
      const r = await fetch(target, { method: req.method, headers, body: raw });
      const out = Buffer.from(await r.arrayBuffer());
      const h = {};
      r.headers.forEach((v, k) => { if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(k)) h[k] = v; });
      Object.assign(h, cors);
      res.writeHead(r.status, h);
      return res.end(out);
    }
    send(res, 404, { msg: 'unknown path' });
  } catch (e) {
    console.error(e);
    send(res, 500, { msg: String(e) });
  }
}).listen(PORT, () => console.log('fake backend on ' + PORT));
