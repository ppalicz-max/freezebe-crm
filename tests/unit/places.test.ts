import { afterEach, describe, expect, it, vi } from 'vitest';
import { suggestType, toDetails, toSuggestions } from '../../api/_lib/places';
import { requireMember } from '../../api/_lib/http';
import { GET as autocompleteGET } from '../../api/places/autocomplete';
import { GET as detailsGET } from '../../api/places/details';

const PLACE = {
  id: 'ChIJ123',
  displayName: { text: 'Aranyhíd Szálloda', languageCode: 'hu' },
  formattedAddress: 'Budapest, Andrássy út 1, 1061 Hungary',
  addressComponents: [
    { longText: '1', shortText: '1', types: ['street_number'] },
    { longText: 'Andrássy út', shortText: 'Andrássy út', types: ['route'] },
    { longText: 'VI. kerület', shortText: 'VI. kerület', types: ['sublocality_level_1', 'sublocality', 'political'] },
    { longText: 'Budapest', shortText: 'Budapest', types: ['locality', 'political'] },
    { longText: '1061', shortText: '1061', types: ['postal_code'] },
    { longText: 'Hungary', shortText: 'HU', types: ['country', 'political'] },
  ],
  nationalPhoneNumber: '(06 1) 234 5678',
  internationalPhoneNumber: '+36 1 234 5678',
  websiteUri: 'https://aranyhid.hu/',
  googleMapsUri: 'https://maps.google.com/?cid=123',
  primaryType: 'hotel',
  types: ['hotel', 'lodging', 'point_of_interest', 'establishment'],
};

describe('Places mapping', () => {
  it('fills the client form fields', () => {
    expect(toDetails(PLACE)).toEqual({
      placeId: 'ChIJ123', name: 'Aranyhíd Szálloda', address: 'Andrássy út 1', city: 'Budapest', phone: '+36 1 234 5678',
      website: 'https://aranyhid.hu/', googleMapsUrl: 'https://maps.google.com/?cid=123', suggestedType: 'Hotel',
    });
  });
  it('falls back to the formatted address without the country', () => {
    expect(toDetails({ id: 'x', formattedAddress: 'Siófok, Petőfi sétány, Hungary' }).address).toBe('Siófok, Petőfi sétány');
  });
  it('suggests a client type, primary type first', () => {
    expect(suggestType('pizza_restaurant')).toBe('Restaurant');
    expect(suggestType('wine_bar', ['restaurant'])).toBe('Bar');
    expect(suggestType(undefined, ['point_of_interest', 'fitness_center'])).toBe('Sport');
    expect(suggestType('spa')).toBe('Leisure');
    expect(suggestType('preschool')).toBe('Children');
    expect(suggestType('car_repair', ['establishment'])).toBeNull();
  });
  it('keeps place predictions only, at most 5', () => {
    const s = (i: number) => ({ placePrediction: { placeId: 'p' + i, text: { text: 'T' + i }, structuredFormat: { mainText: { text: 'M' + i }, secondaryText: { text: 'S' + i } } } });
    const out = toSuggestions({ suggestions: [{ queryPrediction: {} } as never, s(1), s(2), s(3), s(4), s(5), s(6)] });
    expect(out).toHaveLength(5);
    expect(out[0]).toEqual({ placeId: 'p1', main: 'M1', secondary: 'S1' });
  });
});

describe('API endpoints', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  const setup = (member: boolean | 'badtoken') => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'gkey');
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.startsWith('https://db.example/rest/v1/rpc/is_member')) {
        return member === 'badtoken' ? new Response('{}', { status: 401 }) : Response.json(member);
      }
      if (url.endsWith('places:autocomplete')) {
        return Response.json({ suggestions: [{ placePrediction: { placeId: 'ChIJ123', structuredFormat: { mainText: { text: 'Aranyhíd' }, secondaryText: { text: 'Budapest' } } } }] });
      }
      if (url.includes('/places/ChIJ123')) return Response.json(PLACE);
      return new Response('nope', { status: 404 });
    }));
    return calls;
  };
  const req = (path: string, token = 'tok') => new Request('http://localhost' + path, { headers: token ? { Authorization: 'Bearer ' + token } : {} });

  it('rejects requests without a token, and non-members', async () => {
    setup(false);
    expect((await autocompleteGET(req('/api/places/autocomplete?q=abc&session=s1', ''))).status).toBe(401);
    expect((await autocompleteGET(req('/api/places/autocomplete?q=abc&session=s1'))).status).toBe(403);
    setup('badtoken');
    expect((await detailsGET(req('/api/places/details?id=ChIJ123&session=s1'))).status).toBe(401);
  });

  it('autocomplete sends the key server-side and returns suggestions', async () => {
    const calls = setup(true);
    const res = await autocompleteGET(req('/api/places/autocomplete?q=Aranyh%C3%ADd&session=abc-123&lang=hu'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ suggestions: [{ placeId: 'ChIJ123', main: 'Aranyhíd', secondary: 'Budapest' }] });
    const g = calls.find((c) => c.url.endsWith('places:autocomplete'))!;
    expect((g.init!.headers as Record<string, string>)['X-Goog-Api-Key']).toBe('gkey');
    expect(JSON.parse(String(g.init!.body))).toMatchObject({ input: 'Aranyhíd', sessionToken: 'abc-123', includedRegionCodes: ['hu'] });
    const auth = calls.find((c) => c.url.includes('is_member'))!;
    expect((auth.init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('details asks only for the fields the form needs', async () => {
    const calls = setup(true);
    const res = await detailsGET(req('/api/places/details?id=ChIJ123&session=abc-123&lang=en'));
    expect(res.status).toBe(200);
    expect((await res.json()).city).toBe('Budapest');
    const g = calls.find((c) => c.url.includes('/places/ChIJ123'))!;
    expect(g.url).toContain('sessionToken=abc-123');
    expect(g.url).toContain('languageCode=en');
    expect((g.init!.headers as Record<string, string>)['X-Goog-FieldMask']).toContain('websiteUri');
  });

  it('validates input', async () => {
    setup(true);
    expect((await autocompleteGET(req('/api/places/autocomplete?q=a&session=s1'))).status).toBe(400);
    expect((await detailsGET(req('/api/places/details?id=../../etc&session=s1'))).status).toBe(400);
    expect((await detailsGET(req('/api/places/details?id=ChIJ123&session=' + 'x'.repeat(40)))).status).toBe(400);
  });

  it('hides Google errors from the browser', async () => {
    setup(true);
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.includes('is_member') ? Response.json(true) : new Response('quota exceeded for key gkey', { status: 429 })));
    const res = await autocompleteGET(req('/api/places/autocomplete?q=abc&session=s1'));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('gkey');
  });

  it('requireMember reports a missing server config', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_URL', '');
    expect((await requireMember(req('/x')))?.status).toBe(500);
  });
});
