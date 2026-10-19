# Freezbee CRM: rebuild plan

Status: **draft for approval**. No app code yet, only this plan and the database schema
(`supabase/migrations/20261019000000_init.sql`, `supabase/seed.sql`).

## 1. Goal

Turn the single-file Claude artifact (`index.html`) into a web app you can deploy:

| Layer    | Choice |
|----------|--------|
| Frontend | Vite + React 18 + TypeScript, no UI library |
| Backend  | Supabase (Postgres, Auth, row-level security), project in **eu-central-1 (Frankfurt)** |
| Hosting  | Vercel (static site + serverless functions in region **fra1**) |
| Places   | Vercel function → Google Places API (New), key in `GOOGLE_PLACES_API_KEY` |

Everything visible stays the same: screens, CSS, Hungarian/English strings, roles and commission rules.

## 2. What carries over as is

- **CSS**: copied unchanged into `src/styles.css` (pink/black theme, dark mode, ticket card, bottom nav, sheets).
- **Strings**: the `T.en` / `T.hu` dictionary moves to `src/i18n.ts`, same keys. Language choice is still
  saved per device and also stored in `user_settings.lang`.
- **Screens**: Home (commission ticket, follow-ups, reorder reminders, pipeline), Clients (search, type
  and stage filters), Client detail (contact lines, stats, follow-up, activity log), Orders (month
  picker, tiles, paid/unpaid), Team (owner only: monthly table plus team members), Settings (language,
  goals, products, CSV export).
- **Sheets**: New/Edit client, Log/Edit order, Log activity, Team member.
- **Commission logic** (`src/lib/commission.ts`, same functions as now):
  - line commission = qty × commission per piece; order total = sum of lines
  - price and commission are **copied onto the order line when it's saved**, so later catalog
    changes don't change past commission. Editing an order keeps the saved price for products
    already on it; newly added products take the current price
  - gross = net × (1 + VAT%); goal progress = month commission ÷ monthly target
  - saving an order moves the client to the "customer" stage
  - logging a call/visit/email moves a lead to "contacted"; a tasting moves a lead or contacted client to "tasting"
- **Small behaviours**: tap-twice-to-delete buttons, toasts, the "Saving… / Saved" status,
  deleting a client also deletes its orders.

## 3. What changes

| Today (artifact) | New app |
|---|---|
| `window.claude.use('user')`: claude.ai account | Supabase Auth: email sign-in (see question 1) |
| Owner = anyone with edit access to the artifact | `team_members.role = 'owner'` |
| Reps appear once they open the artifact; owner links the account by hand | Owner adds a team member **with email**; that person can then sign in, and their account links automatically |
| `window.claude.use('db')` documents per user | Postgres tables, with per-rep privacy enforced by RLS in the database |
| Live `onSnapshot` updates | Load on start + optimistic updates after each change; reload when the app comes back to the foreground. (Supabase Realtime can be added later if needed.) |
| `downloads.save()` for CSV | Browser download (same `;`-separated CSV with BOM, opens in Excel) |
| "Sign in / read-only" banners | Login screen + "not on the team list" screen |

New:
- **Find business** on New client (section 5).
- Client detail shows **Website** and **Open in Google Maps** lines when present.
- Removing a team member **deactivates** them (sign-in blocked, their data hidden from them, history
  kept in the Team view), instead of deleting.

## 4. Database (see the SQL file for details)

```
team_members ─┐ user_id → auth.users
              │
auth.users ── clients ──┬── activities
     │                  └── orders ── order_lines ──→ products
     └── user_settings                        app_settings (currency, VAT)
```

| Table | Holds | Who can read | Who can write |
|---|---|---|---|
| `team_members` | name, email, phone, position, segment, role, active | owner: all; anyone: own row | owner |
| `app_settings` | currency, VAT % (one row) | members | owner |
| `products` | name, net price, commission per piece, active, order | members | owner (hide, never delete) |
| `user_settings` | monthly target, reorder days, language | self | self |
| `clients` | everything on the client form + `website`, `google_maps_url`, `place_id` | own; owner: all | own only |
| `activities` | type, date, text (was an array inside the client) | own; owner: all | own only |
| `orders` | client, date, note, paid, paid_at | own; owner: all | own (only `paid` directly) |
| `order_lines` | product, qty, copied price and commission, line totals | when the order is visible | only through `save_order()` |

Database rules that make the privacy hold even if the app has a bug:
- An order or activity must belong to the **same rep** as its client (composite foreign key).
- Orders are written only by `save_order()`, which checks the client is yours and copies prices from
  the catalog server-side, so commission can't be faked from the browser.
- An owner can read everyone's data but can't change other reps' data.
- Only emails on the active team list can create an account (Supabase "Before User Created" hook).
  People removed from the list lose access immediately.
- The last active owner can't be demoted or removed.
- `team_month_summary(month)` feeds the Team table; a rep calling it only gets their own row.

**Tested** on a local Postgres 16 with a stand-in for Supabase auth: rep B can't see or touch rep A's
clients, orders or lines; reps can't edit products or team members; spoofing `rep_id` fails; direct
order/line edits are refused; catalog price changes don't alter saved orders; deactivated members
and strangers see nothing; the last-owner guard works.

## 5. Find business (Google Places)

UI: a search field at the top of the **New client** sheet ("Find business" / "Üzlet keresése").
Typing (debounced, 3+ characters) shows up to 5 suggestions; tapping one fills **name, address,
city, phone, website, Google Maps link**, stores the **place_id**, and suggests a client type from
Google's place type (lodging → Hotel, bar → Bar, restaurant/cafe → Restaurant, gym → Sport, …).
Everything stays editable. Without a match, the rep fills the form by hand as today.

Two Vercel functions in `api/places/`:

| Endpoint | Google call | Fields requested |
|---|---|---|
| `GET /api/places/autocomplete?q=&session=` | Places Autocomplete (New), `includedRegionCodes: ["hu"]`, language hu/en | suggestions only |
| `GET /api/places/details?id=&session=` | Place Details (New) | `id, displayName, formattedAddress, addressComponents, nationalPhoneNumber, websiteUri, googleMapsUri, primaryType` |

- Both functions require the user's Supabase session token, so the API key can't be used by
  outsiders. The key never reaches the browser.
- A session token groups the typing and the final selection, so Google bills it as one session.
- Address = street and number, city = locality, from `addressComponents`.
- If you already have a client with the same `place_id`, the app says so instead of creating a duplicate.

## 6. Project layout

```
api/places/autocomplete.ts      Vercel functions
api/places/details.ts
api/_lib/auth.ts                checks the Supabase token
src/main.tsx, App.tsx           tabs, current client, open sheet
src/styles.css                  copied CSS
src/i18n.ts                     T.en / T.hu + t()
src/lib/supabase.ts             client
src/lib/commission.ts           totals, month filters
src/lib/format.ts               dates, money, months (same as now)
src/data/*.ts                   load and save (clients, orders, activities, catalog, team, settings)
src/screens/                    Home, Clients, ClientDetail, Orders, Team, Settings, Login
src/sheets/                     ClientSheet (+ FindBusiness), OrderSheet, ActivitySheet, MemberSheet
src/components/                 Header, Nav, Fab, Ticket, Rows, Chips, Icons
supabase/migrations/, seed.sql
vercel.json                     fra1 region, SPA rewrite
.env.example                    VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
                                SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_PLACES_API_KEY
```

## 7. Steps after you approve

1. Scaffold Vite + React + TS, copy CSS, strings, icons and helpers.
2. Supabase client, login screen, team-list gate.
3. Screens and sheets, one by one, matching the current UI.
4. `save_order` wiring, paid toggles, team view, product and team editing.
5. Places functions + Find business field.
6. CSV export.
7. Tests: unit tests for commission and helpers (Vitest), the RLS checks above as a repeatable
   SQL test, and a browser run-through with Playwright on a phone-sized screen.
8. README with the setup: create the Supabase project (Frankfurt), run the migration and seed,
   enable the auth hook, set the env variables in Vercel, restrict the Google key to the Places API.

## 8. Questions for you

1. **Sign-in method.** I suggest an **email code** (6 digits, also with a link). It works well on
   phones and when the app is added to the home screen; no passwords to forget. Alternatives:
   email + password, or Google sign-in.
2. **Who marks commission as paid?** Today the rep does. Keep that, or owner only?
3. **Existing data.** Is there data in the current artifact to bring over? If yes, I'll add a
   one-off import from the app's CSV exports.
4. **Duplicates across reps.** Should a rep be warned when *another* rep already has the same
   business (without showing who)? Off in the current schema, as it shares a little information between reps.

## 9. Things to know

- **Vercel Hobby plan is for non-commercial use**; a company CRM should run on Vercel Pro.
- **Google terms**: storing `place_id` is allowed. Copying the address, phone and website into
  your own record when a rep picks a business is how most CRMs do it, but Google's terms limit
  caching Places content, so the app won't refresh or bulk-store anything from Google.
- Google Places needs billing on the Google Cloud project; at a small team's volume it should stay
  within the monthly free usage, but check Google's current pricing.
- Deleting a rep's login in Supabase is blocked while they have clients; deactivate them instead.
