// GET /api/places/autocomplete?q=Aranyhíd&session=<uuid>&lang=hu
// Up to 5 business suggestions in Hungary from Google Places Autocomplete (New).
import { googleKey, json, langParam, requireMember, SESSION_RE } from '../_lib/http.js';
import { autocomplete } from '../_lib/places.js';

export async function GET(req: Request): Promise<Response> {
  const denied = await requireMember(req);
  if (denied) return denied;
  const key = googleKey();
  if (!key) return json({ error: 'GOOGLE_PLACES_API_KEY is not set' }, 500);

  const params = new URL(req.url).searchParams;
  const q = (params.get('q') ?? '').trim();
  const session = params.get('session') ?? '';
  if (q.length < 2 || q.length > 120 || !SESSION_RE.test(session)) return json({ error: 'bad request' }, 400);

  try {
    return json({ suggestions: await autocomplete(key, q, session, langParam(params.get('lang'))) });
  } catch (e) {
    console.error(e);
    return json({ error: 'places search failed' }, 502);
  }
}
