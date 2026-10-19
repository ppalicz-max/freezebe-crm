// Shared helpers for the Vercel functions.

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const env = (...names: string[]) => names.map((n) => process.env[n]).find(Boolean) ?? '';

/**
 * Only signed-in, active team members may use the Places endpoints, so the
 * Google key can't be used by outsiders. The user's Supabase token is checked
 * by asking the database itself (rpc is_member), which also verifies the JWT.
 * Returns an error response, or null when the caller is allowed.
 */
export async function requireMember(req: Request, f: typeof fetch = fetch): Promise<Response | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return json({ error: 'unauthorized' }, 401);
  const url = env('SUPABASE_URL', 'VITE_SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');
  if (!url || !key) return json({ error: 'server not configured' }, 500);
  try {
    const r = await f(`${url}/rest/v1/rpc/is_member`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (r.status === 401) return json({ error: 'unauthorized' }, 401);
    if (!r.ok) return json({ error: 'auth check failed' }, 502);
    return (await r.json()) === true ? null : json({ error: 'forbidden' }, 403);
  } catch {
    return json({ error: 'auth check failed' }, 502);
  }
}

export const googleKey = () => env('GOOGLE_PLACES_API_KEY');

export const SESSION_RE = /^[A-Za-z0-9_-]{1,36}$/;
export const PLACE_ID_RE = /^[A-Za-z0-9_-]{1,300}$/;
export const langParam = (v: string | null) => (v === 'en' ? 'en' : 'hu');
