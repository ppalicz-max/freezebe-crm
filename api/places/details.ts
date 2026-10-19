// GET /api/places/details?id=<placeId>&session=<uuid>&lang=hu
// Name, address, city, phone, website and Google Maps link for one place.
import { googleKey, json, langParam, PLACE_ID_RE, requireMember, SESSION_RE } from '../_lib/http.js';
import { details } from '../_lib/places.js';

export async function GET(req: Request): Promise<Response> {
  const denied = await requireMember(req);
  if (denied) return denied;
  const key = googleKey();
  if (!key) return json({ error: 'GOOGLE_PLACES_API_KEY is not set' }, 500);

  const params = new URL(req.url).searchParams;
  const id = params.get('id') ?? '';
  const session = params.get('session') ?? '';
  if (!PLACE_ID_RE.test(id) || !SESSION_RE.test(session)) return json({ error: 'bad request' }, 400);

  try {
    return json(await details(key, id, session, langParam(params.get('lang'))));
  } catch (e) {
    console.error(e);
    return json({ error: 'place details failed' }, 502);
  }
}
