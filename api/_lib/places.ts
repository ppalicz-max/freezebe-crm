// Google Places API (New) calls and the mapping to what the client form needs.
// Files in api/_lib are helpers, not endpoints (Vercel skips names starting with _).

export type ClientType = 'Hotel' | 'Bar' | 'Restaurant' | 'Sport' | 'Leisure' | 'Children' | 'Other';

export interface PlaceSuggestion { placeId: string; main: string; secondary: string }
export interface PlaceDetails {
  placeId: string; name: string; address: string; city: string; phone: string; website: string; googleMapsUrl: string;
  suggestedType: ClientType | null;
}

interface Text { text?: string }
interface AddressComponent { longText?: string; shortText?: string; types?: string[] }
export interface GooglePlace {
  id?: string;
  displayName?: Text;
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryType?: string;
  types?: string[];
}
export interface GoogleAutocomplete {
  suggestions?: {
    placePrediction?: { placeId?: string; text?: Text; structuredFormat?: { mainText?: Text; secondaryText?: Text } };
  }[];
}

// PLACES_API_BASE is only set by the end-to-end tests (fake Google server).
const base = () => process.env.PLACES_API_BASE || 'https://places.googleapis.com/v1';
export const DETAILS_FIELDS = [
  'id', 'displayName', 'formattedAddress', 'addressComponents', 'nationalPhoneNumber', 'internationalPhoneNumber',
  'websiteUri', 'googleMapsUri', 'primaryType', 'types',
].join(',');

/* ---------- type suggestion ---------- */
const SETS: [ClientType, Set<string>][] = [
  ['Hotel', new Set(['lodging', 'hotel', 'motel', 'hostel', 'guest_house', 'bed_and_breakfast', 'resort_hotel', 'inn', 'extended_stay_hotel',
    'cottage', 'farmstay', 'private_guest_room', 'japanese_inn', 'budget_japanese_inn'])],
  ['Bar', new Set(['bar', 'pub', 'wine_bar', 'night_club', 'cocktail_bar', 'brewpub', 'sports_bar', 'lounge_bar', 'irish_pub', 'beer_garden',
    'hookah_bar', 'brewery', 'winery'])],
  ['Restaurant', new Set(['restaurant', 'cafe', 'coffee_shop', 'bakery', 'pizzeria', 'meal_takeaway', 'meal_delivery', 'food_court', 'bistro',
    'diner', 'deli', 'cafeteria', 'bar_and_grill', 'steak_house', 'sandwich_shop', 'buffet_restaurant', 'catering_service', 'food', 'confectionery',
    'dessert_shop', 'ice_cream_shop', 'tea_house', 'snack_bar'])],
  ['Sport', new Set(['gym', 'fitness_center', 'sports_club', 'sports_complex', 'stadium', 'arena', 'swimming_pool', 'sports_activity_location',
    'golf_course', 'ski_resort', 'tennis_court', 'athletic_field', 'ice_skating_rink', 'sports_coaching', 'yoga_studio'])],
  ['Children', new Set(['school', 'primary_school', 'secondary_school', 'preschool', 'child_care_agency', 'playground', 'indoor_playground',
    'summer_camp_organizer', 'childrens_camp'])],
  ['Leisure', new Set(['amusement_park', 'water_park', 'spa', 'sauna', 'wellness_center', 'campground', 'bowling_alley', 'movie_theater',
    'tourist_attraction', 'zoo', 'aquarium', 'museum', 'casino', 'event_venue', 'amusement_center', 'adventure_sports_center', 'marina',
    'karaoke', 'banquet_hall', 'wedding_venue', 'concert_hall', 'cultural_center', 'park', 'beach', 'hiking_area', 'botanical_garden'])],
];

function typeOf(type: string): ClientType | null {
  for (const [ct, set] of SETS) if (set.has(type)) return ct;
  if (type.endsWith('_restaurant')) return 'Restaurant';
  if (type.endsWith('_hotel')) return 'Hotel';
  if (type.startsWith('sports_')) return 'Sport';
  return null;
}

/** Client type from Google's place types; the primary type wins. */
export function suggestType(primaryType?: string, types: string[] = []): ClientType | null {
  for (const ty of [primaryType, ...types]) {
    if (!ty) continue;
    const ct = typeOf(ty);
    if (ct) return ct;
  }
  return null;
}

/* ---------- mapping ---------- */
const comp = (cs: AddressComponent[], ...types: string[]) => {
  for (const ty of types) {
    const c = cs.find((x) => x.types?.includes(ty));
    if (c?.longText) return c.longText;
  }
  return '';
};

const COUNTRY_SUFFIX = /,\s*(Hungary|Magyarország|Ungarn)\s*$/i;

export function toDetails(p: GooglePlace): PlaceDetails {
  const cs = p.addressComponents ?? [];
  const street = [comp(cs, 'route'), comp(cs, 'street_number')].filter(Boolean).join(' ');
  const city = comp(cs, 'locality', 'postal_town', 'administrative_area_level_3', 'administrative_area_level_2');
  const address = street || (p.formattedAddress ?? '').replace(COUNTRY_SUFFIX, '');
  return {
    placeId: p.id ?? '',
    name: p.displayName?.text ?? '',
    address,
    city,
    phone: p.internationalPhoneNumber || p.nationalPhoneNumber || '',
    website: p.websiteUri ?? '',
    googleMapsUrl: p.googleMapsUri ?? '',
    suggestedType: suggestType(p.primaryType, p.types),
  };
}

export function toSuggestions(r: GoogleAutocomplete, max = 5): PlaceSuggestion[] {
  const out: PlaceSuggestion[] = [];
  for (const s of r.suggestions ?? []) {
    const p = s.placePrediction;
    if (!p?.placeId) continue; // skip query predictions
    out.push({
      placeId: p.placeId,
      main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondary: p.structuredFormat?.secondaryText?.text ?? '',
    });
    if (out.length >= max) break;
  }
  return out;
}

/* ---------- Google calls ---------- */
export class GoogleError extends Error {
  constructor(public status: number, body: string) { super(`Google Places ${status}: ${body.slice(0, 300)}`); }
}

export async function autocomplete(key: string, input: string, sessionToken: string, lang: string, f: typeof fetch = fetch) {
  const res = await f(`${base()}/places:autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({ input, sessionToken, languageCode: lang, regionCode: 'hu', includedRegionCodes: ['hu'] }),
  });
  if (!res.ok) throw new GoogleError(res.status, await res.text());
  return toSuggestions((await res.json()) as GoogleAutocomplete);
}

export async function details(key: string, placeId: string, sessionToken: string, lang: string, f: typeof fetch = fetch) {
  const qs = new URLSearchParams({ languageCode: lang, regionCode: 'hu', sessionToken });
  const res = await f(`${base()}/places/${encodeURIComponent(placeId)}?${qs}`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': DETAILS_FIELDS },
  });
  if (!res.ok) throw new GoogleError(res.status, await res.text());
  return toDetails((await res.json()) as GooglePlace);
}
