import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Runs against the local stack from playwright.config.ts. Tests share one
// database and run in order, like a day in the life of the team.
test.describe.configure({ mode: 'serial' });

const SHOTS = process.env.SCREENSHOT_DIR;
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function newUser(browser: Browser) {
  const ctx = await browser.newContext({
    ...devices['Pixel 7'], baseURL: 'http://localhost:5173', locale: 'hu-HU', timezoneId: 'Europe/Budapest', acceptDownloads: true,
  });
  return ctx.newPage();
}

async function signIn(page: Page, email: string, opts: { wrongCodeFirst?: boolean } = {}) {
  await page.goto('/');
  await page.locator('#login-email').fill(email);
  await page.getByRole('button', { name: 'Kód küldése' }).click();
  await expect(page.getByText('Elküldtük a kódot ide: ' + email)).toBeVisible();
  if (opts.wrongCodeFirst) {
    await page.locator('#login-code').fill('000000');
    await page.getByRole('button', { name: 'Belépés' }).click();
    await expect(page.getByRole('alert')).toHaveText('Ez a kód nem jó. Ellenőrizd, vagy kérj újat.');
  }
  await page.locator('#login-code').fill('123456');
  await page.getByRole('button', { name: 'Belépés' }).click();
  await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible();
}

const sheet = (page: Page) => page.getByRole('dialog');
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name });
// Money as shown in Hungarian (spaces may be non-breaking).
const ft = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s'));

test('someone not on the team list cannot sign up', async ({ browser }) => {
  const page = await newUser(browser);
  await page.goto('/');
  await shot(page, '01-login');
  await page.locator('#login-email').fill('stranger@test.hu');
  await page.getByRole('button', { name: 'Kód küldése' }).click();
  await expect(page.getByRole('alert')).toHaveText('Ez az e-mail-cím nincs a Freezbee csapatlistán. Kérd meg a CRM tulajdonosát, hogy vegyen fel.');
});

test('a rep adds a client, logs an order and an activity', async ({ browser }) => {
  const page = await newUser(browser);
  await signIn(page, 'anna@test.hu', { wrongCodeFirst: true });
  await expect(page.getByRole('heading', { name: 'Kezdd az első ügyféllel' })).toBeVisible();
  await expect(nav(page, 'Csapat')).toHaveCount(0); // reps have no Team tab
  await shot(page, '02-home-empty');

  await page.getByRole('button', { name: 'Új ügyfél' }).click();
  await expect(sheet(page).getByRole('heading', { name: 'Új ügyfél' })).toBeVisible();
  // name is required
  await sheet(page).getByRole('button', { name: 'Új ügyfél' }).click();
  await expect(page.locator('#toast')).toHaveText('Add meg a cégnevet');
  await page.locator('#cf-name').fill('Aranyhíd Szálloda');
  await sheet(page).getByRole('button', { name: 'Szálloda' }).click();
  await page.locator('#cf-contact').fill('Kata, recepció');
  await page.locator('#cf-phone').fill('+36 1 234 5678');
  await page.locator('#cf-address').fill('Andrássy út 12');
  await page.locator('#cf-city').fill('Budapest');
  await page.locator('#cf-website').fill('aranyhid.example');
  await shot(page, '03-new-client-filled');
  await sheet(page).getByRole('button', { name: 'Új ügyfél' }).click();

  // client detail
  await expect(page.getByRole('heading', { name: 'Aranyhíd Szálloda' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Útvonal' })).toHaveAttribute('href',
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Andrássy út 12, Budapest'));
  await expect(page.getByRole('link', { name: 'Weboldal' })).toHaveAttribute('href', 'https://aranyhid.example/');
  await expect(page.getByRole('link', { name: 'Hívás' })).toHaveAttribute('href', 'tel:+3612345678');

  // order: 10 Margherita (160) + 5 Sonkás (189) = 2 545 Ft commission
  await page.getByRole('button', { name: 'Új rendelés' }).click();
  await expect(page.locator('#o-client')).toHaveValue(/.+/);
  await sheet(page).getByRole('textbox', { name: 'Margherita' }).fill('10');
  await sheet(page).getByRole('textbox', { name: 'Sonkás' }).fill('4');
  await sheet(page).getByRole('button', { name: 'Eggyel több: Sonkás' }).click();
  await expect(page.locator('#ofoot')).toContainText(ft('+2545 Ft'));
  await expect(page.locator('#ofoot')).toContainText(ft('15 db, nettó 25 450 Ft, bruttó 32 322 Ft'));
  await shot(page, '04-order-sheet');
  await sheet(page).getByRole('button', { name: 'Mentés' }).click();
  await expect(page.locator('.orow .earn')).toHaveText(ft('+2545 Ft'));
  await expect(page.getByRole('button', { name: 'Ügyfél', exact: true })).toHaveAttribute('aria-pressed', 'true');

  // activity with a follow-up tomorrow
  await page.getByRole('button', { name: 'Esemény rögzítése' }).click();
  await sheet(page).getByRole('button', { name: 'Látogatás' }).click();
  await page.locator('#a-text').fill('Kóstoló jövő héten');
  await sheet(page).getByRole('button', { name: 'Holnap' }).click();
  await sheet(page).getByRole('button', { name: 'Esemény rögzítése' }).click();
  await expect(page.locator('.act')).toContainText('Látogatás');
  await expect(page.locator('.act')).toContainText('Kóstoló jövő héten');
  await expect(page.locator('.status')).toContainText('Mentve');
  await shot(page, '05-client-detail');

  // Today
  await nav(page, 'Ma').click();
  await expect(page.locator('.t-big')).toHaveText(ft('2545 Ft'));
  await expect(page.locator('.sec').filter({ hasText: 'Teendők' })).toContainText('Holnap');
  await shot(page, '06-home');

  // Orders: mark paid
  await nav(page, 'Rendelések').click();
  await page.locator('.orow .paid').click();
  await expect(page.locator('.orow .paid')).toHaveText('Kifizetve');
  await shot(page, '07-orders');

  // everything came from the database: reload and check
  await page.reload();
  await nav(page, 'Rendelések').click();
  await expect(page.locator('.orow')).toContainText('Aranyhíd Szálloda');
  await expect(page.locator('.orow .paid')).toHaveText('Kifizetve');
  await nav(page, 'Ügyfelek').click();
  await expect(page.locator('#clist')).toContainText('Aranyhíd Szálloda');
  await expect(page.locator('#clist')).toContainText('Ügyfél');
  await shot(page, '08-clients');
  await page.emulateMedia({ colorScheme: 'dark' });
  await nav(page, 'Ma').click();
  await shot(page, '09-home-dark');
});

test('another rep only sees their own clients', async ({ browser }) => {
  const page = await newUser(browser);
  await signIn(page, 'bela@test.hu');
  await nav(page, 'Ügyfelek').click();
  await expect(page.locator('#clist')).toHaveText('Vedd fel a szállodákat, bárokat és éttermeket, akiknek eladsz vagy eladnál.');
  await nav(page, 'Rendelések').click();
  await expect(page.locator('.tile b.acc')).toHaveText(ft('0 Ft'));
  await nav(page, 'Ügyfelek').click();
  await page.getByRole('button', { name: 'Új ügyfél' }).click();
  await page.locator('#cf-name').fill('Aranyhíd Bisztró');
  await sheet(page).getByRole('button', { name: 'Étterem' }).click();
  await page.locator('#cf-city').fill('Siófok');
  await sheet(page).getByRole('button', { name: 'Új ügyfél' }).click();
  await expect(page.getByRole('heading', { name: 'Aranyhíd Bisztró' })).toBeVisible();
  await page.getByRole('button', { name: 'Vissza' }).click();
  await expect(page.locator('#clist .row')).toHaveCount(1);
});

test('the owner sees the team, manages members and edits the catalog', async ({ browser }) => {
  const page = await newUser(browser);
  await signIn(page, 'owner@test.hu');
  await nav(page, 'Csapat').click();
  const anna = page.locator('tr', { hasText: 'Kovács Anna' });
  await expect(anna).toContainText(ft('2545 Ft'));
  await expect(anna.locator('td').nth(1)).toHaveText('1');
  await expect(page.locator('tr', { hasText: 'Nagy Béla' }).locator('td').nth(1)).toHaveText('1');
  await expect(page.locator('tr', { hasText: 'Olga Owner' })).toContainText('(te)');
  await expect(page.locator('tr.tot')).toContainText(ft('2545 Ft'));
  await shot(page, '11-team');

  // add a member
  await page.getByRole('button', { name: 'Új csapattag' }).click();
  await page.locator('#mf-name').fill('Szabó Csilla');
  await page.locator('#mf-email').fill('Csilla@Test.hu');
  await sheet(page).getByRole('button', { name: 'Új csapattag' }).click();
  await expect(page.locator('.row', { hasText: 'Szabó Csilla' })).toContainText('Még nem jelentkezett be');

  // the last owner can't step down
  await page.locator('.row', { hasText: 'Olga Owner' }).getByRole('button').click();
  await sheet(page).getByRole('button', { name: 'Értékesítő' }).click();
  await sheet(page).getByRole('button', { name: 'Mentés' }).click();
  await expect(page.locator('#toast')).toHaveText('A CRM-nek legalább egy aktív tulajdonosa kell legyen');
  await sheet(page).getByRole('button', { name: 'Bezárás' }).click();

  // the owner's own data stays separate: no clients
  await nav(page, 'Ügyfelek').click();
  await expect(page.locator('#clist .empty')).toBeVisible();

  // catalog: Margherita commission 160 -> 200
  await nav(page, 'Beállítások').click();
  await expect(page.locator('#p-name-0')).toHaveValue('Margherita');
  await page.locator('#p-com-0').fill('200');
  await expect(page.locator('.prod').first()).toContainText('a nettó ár 12.5%-a');
  await page.locator('.savebar').getByRole('button', { name: 'Mentés' }).click();
  await expect(page.locator('#toast')).toHaveText('Mentve');
  await shot(page, '12-settings-owner');
  await page.reload();
  await nav(page, 'Beállítások').click();
  await expect(page.locator('#p-com-0')).toHaveValue('200');
});

test('old orders keep their commission after the catalog changes', async ({ browser }) => {
  const page = await newUser(browser);
  await signIn(page, 'anna@test.hu');
  await nav(page, 'Beállítások').click();
  await expect(page.locator('.prod-ro').first()).toContainText(ft('nettó 1600 Ft, jutalék 200 Ft'));
  await shot(page, '13-settings-rep');

  await nav(page, 'Rendelések').click();
  await expect(page.locator('.orow .earn')).toHaveText(ft('+2545 Ft'));
  await page.locator('.orow-main').click();
  // the saved prices stay on the order being edited
  await expect(sheet(page).locator('.prow', { hasText: 'Margherita' })).toContainText(ft('jutalék 160 Ft'));
  await sheet(page).getByRole('button', { name: 'Eggyel több: Margherita' }).click();
  await expect(page.locator('#ofoot')).toContainText(ft('+2705 Ft'));
  await sheet(page).getByRole('button', { name: 'Mentés' }).click();
  await expect(page.locator('.orow .earn')).toHaveText(ft('+2705 Ft'));

  // a new order uses the new commission
  await page.locator('.fab').click();
  await page.locator('#o-client').selectOption({ label: 'Aranyhíd Szálloda, Budapest' });
  await sheet(page).getByRole('textbox', { name: 'Margherita' }).fill('1');
  await expect(page.locator('#ofoot')).toContainText(ft('+200 Ft'));
  await sheet(page).getByRole('button', { name: 'Mentés' }).click();
  await expect(page.locator('.tile b.acc')).toHaveText(ft('2905 Ft'));
  await page.reload();
  await nav(page, 'Rendelések').click();
  await expect(page.locator('.tile b.acc')).toHaveText(ft('2905 Ft'));
});

test('language choice is saved and CSV export works', async ({ browser }) => {
  const page = await newUser(browser);
  await signIn(page, 'anna@test.hu');
  await nav(page, 'Beállítások').click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(nav(page, 'Today')).toBeVisible();
  await expect(page.locator('.status')).toContainText('Saved');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export orders' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^freezbee-orders-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = readFileSync(await download.path(), 'utf8');
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('Date;Client;Type;City;Product;Qty;Net unit price;Net total;Commission per piece;Commission;Paid out;Note');
  expect(csv).toContain('Aranyhíd Szálloda;Hotel;Budapest;Margherita;11;1600;17600;160;1760;Yes;');

  // a new browser (no local language setting) picks the saved language
  const other = await newUser(browser);
  await signIn(other, 'anna@test.hu').catch(() => {}); // the sign-in screen is in Hungarian
  await expect(nav(other, 'Today')).toBeVisible();
});

test('a removed member loses access', async ({ browser }) => {
  const bela = await newUser(browser);
  await signIn(bela, 'bela@test.hu');
  const owner = await newUser(browser);
  await signIn(owner, 'owner@test.hu');
  await nav(owner, 'Csapat').click();
  await owner.locator('.row', { hasText: 'Nagy Béla' }).getByRole('button').click();
  const remove = sheet(owner).getByRole('button', { name: 'Eltávolítás a listából' });
  await remove.click();
  await sheet(owner).getByRole('button', { name: 'Koppints újra az eltávolításhoz' }).click();
  await expect(owner.locator('.row', { hasText: 'Nagy Béla' })).toContainText('Eltávolítva');
  // removed members only stay in the Team table for months they sold in (Béla sold nothing)
  await expect(owner.locator('tr', { hasText: 'Nagy Béla' })).toHaveCount(0);
  await expect(owner.locator('tr', { hasText: 'Kovács Anna' })).toBeVisible();

  await bela.reload();
  await expect(bela.getByRole('heading', { name: 'Nincs hozzáférésed' })).toBeVisible();
  await shot(bela, '14-no-access');
});
