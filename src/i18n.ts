// UI strings, copied from the original artifact (same keys), plus a few for the web app.
/* eslint-disable */
const T = {
en:{
 nav_home:'Today',nav_clients:'Clients',nav_orders:'Orders',nav_team:'Team',nav_settings:'Settings',
 log_order:'Log order',saving:'Saving…',saved:'Saved',not_saved:'Not saved',loading:'Loading your clients…',
 commission_in:'Your commission in {m}',goal_pct:'{p}% of {g} goal',goal_reached:'Goal reached',to_go:'{v} to go',
 pizzas_sold:'Pieces sold',net_sales:'Net sales',not_paid:'Not paid out',
 followups:'Follow-ups',followups_empty:'Nothing due this week. Set a follow-up date on a client and it shows up here.',
 reorder_due:'Due for a reorder',last_order_ago:'Last order {n} days ago',best_clients:'Best clients this month',pipeline:'Pipeline',
 start_title:'Start with your first client',start_body:'Add a hotel, bar or restaurant, then log each order. Your commission adds up automatically.',
 add_client:'Add client',today:'Today',tomorrow:'Tomorrow',overdue1:'1 day overdue',overdueN:'{n} days overdue',inN:'In {n} days, {d}',
 clients_sub:'{n} total, {b} buying',no_clients_yet:'No clients yet',search_ph:'Search name, city, contact',
 all_types:'All types',all_stages:'All stages',clients_empty:'Add the hotels, bars and restaurants you sell to, or want to.',
 clients_nomatch:'No clients match these filters.',followup_prefix:'Follow up: {r}',
 back:'Back',edit:'Edit',call:'Call',copy:'Copy',copied:'Copied',email:'Email',directions:'Directions',
 pieces_bought:'Pieces bought',your_commission:'Your commission',log_activity:'Log activity',stage:'Stage',
 next_followup:'Next follow-up',not_set:'Not set',clear:'Clear',in3:'In 3 days',next_week:'Next week',in2w:'In 2 weeks',no_followup:'No follow-up',
 pick_date:'Or pick a date',orders:'Orders',last_on:'Last on {d}',orders_empty_client:'No orders yet. Tap Log order when {n} buys.',
 activity:'Activity',activity_empty:'Log calls, visits and tastings to keep a history with this client.',notes:'Notes',
 delete_client:'Delete client',delete_client_confirm:'Tap again to delete client and their orders',
 paid_out:'Paid out',unpaid:'Unpaid',pieces_n:'{n} pcs',pieces_net:'{n} pcs, {v} net',
 orders_sub:'Every order and what it earns you',commission:'Commission',mark_all_paid:'Mark all {n} as paid out',all:'All',
 orders_empty_month:'No orders in {m}. Tap Log order to add one.',orders_nomatch:'No orders match this filter.',
 paid_hint:'Tap Unpaid once you have received the commission for an order.',
 export_orders:'Export orders',export_clients:'Export clients',exported:'File saved',export_declined:'Export cancelled',export_failed:'Export failed',
 settings_sub:'Products, goals and your data',language:'Language',goals:'Goals and reminders',
 goal_label:'Monthly commission goal ({c})',reorder_label:'Remind me to call a customer after this many days without an order',
 save_changes:'Save changes',changes_saved:'Changes saved',products:'Products',
 products_hint_admin:'Net prices without VAT. New orders use these numbers; orders already logged keep theirs. Every rep sees this list.',
 products_hint_rep:'Set by the CRM owner. Net prices without VAT.',
 net_price:'Net price ({c})',commission_per:'Commission per piece ({c})',pct_of_price:'{p}% of the net price',
 add_product:'Add product',hide_product:'Hide from orders',show_product:'Show in orders',hidden:'Hidden from new orders',vat_label:'VAT rate (%)',
 your_data:'Your data',data_note:'Your clients and orders save automatically to your account. Other reps can’t see them; the CRM’s owners can, in the Team view.',
 team_sub:'Each rep’s results for the month',team_empty:'No reps yet. Add them under Team members; they appear here once they sign in.',
 rep_someone:'Unnamed rep',you:'(you)',rep:'Rep',clients_lbl:'Clients',total:'Total',
 new_client:'New client',edit_client:'Edit client',biz_name:'Business name',biz_ph:'e.g. Aranyhíd Hotel',type:'Type',
 contact:'Contact person',contact_ph:'e.g. Kata, head chef',phone:'Phone',address:'Address',city:'City',
 notes_ph:'Delivery days, freezer space, who decides',choose_client:'Choose a client',client:'Client',date:'Date',
 note_opt:'Note (optional)',note_ph:'e.g. Deliver Thursday morning',save_order:'Save order',edit_order:'Edit order',
 delete_order:'Delete order',delete_order_confirm:'Tap again to delete this order',
 order_needs_client:'Every order belongs to a client. Add the hotel, bar or restaurant first.',
 unit_line:'{p} net, you earn {c}',foot_line:'{n} pcs, {net} net, {gross} gross',what_happened:'What happened',
 close:'Close',less:'One less {n}',more:'One more {n}',
 save_failed:'Couldn’t save. Check your connection and try again.',
 product_name:'Product name',new_product:'New product',name_required:'Enter the business name',
 type_Hotel:'Hotel',type_Bar:'Bar',type_Restaurant:'Restaurant',type_Sport:'Sport',type_Leisure:'Leisure',type_Children:'Children',type_Other:'Other',
 members:'Team members',add_member:'Add team member',new_member:'New team member',edit_member:'Edit team member',
 m_name:'Name',m_name_ph:'e.g. Kovács Anna',position:'Position',position_ph:'e.g. Sales rep',segment:'Segment',segment_ph:'e.g. Hotels, Budapest',
 m_account:'CRM account',m_not_linked:'Not linked yet',m_account_hint:'They sign in with this email. Their account links to this entry automatically the first time they do.',
 members_empty:'Add your reps with their email address. Only people on this list can sign in.',
 members_note:'Only owners see this list. Removing someone blocks their sign-in; their past results stay in the Team view.',save_member:'Save team member',delete_member:'Remove team member',delete_member_confirm:'Tap again to remove from the list',
 m_name_required:'Enter a name',linked:'Uses the CRM',not_using:'Not signed in yet',
 st_lead:'Lead',st_contacted:'Contacted',st_tasting:'Tasting',st_negotiating:'Negotiating',st_customer:'Customer',st_lost:'Lost',
 act_call:'Call',act_visit:'Visit',act_email:'Email',act_tasting:'Tasting',act_note:'Note',
 csv_orders:'Date;Client;Type;City;Product;Qty;Net unit price;Net total;Commission per piece;Commission;Paid out;Note',
 csv_clients:'Name;Type;Stage;Contact;Phone;Email;Address;City;Website;Next follow-up;Orders;Pieces;Net sales;Commission;Notes',
 yes:'Yes',no:'No',
 // added for the web app
 website:'Website',
 login_title:'Sign in',login_body:'Enter your work email. We’ll send you a 6-digit code.',login_email_ph:'name@company.hu',
 send_code:'Send code',sending:'Sending…',code_label:'Code from the email',code_sent:'We sent a code to {e}. It can take a minute to arrive.',
 verify:'Sign in',verifying:'Signing in…',other_email:'Use another email',resend:'Send a new code',
 code_wrong:'That code didn’t work. Check it or send a new one.',not_on_team:'This email isn’t on the Freezbee team list. Ask the CRM owner to add you.',
 send_failed:'Couldn’t send the code. Wait a minute and try again.',
 noaccess_title:'No access',noaccess_body:'{e} isn’t on the active team list. Ask the CRM owner to add you, then sign in again.',
 sign_out:'Sign out',signed_in_as:'Signed in as {e}',account:'Account',load_failed:'Couldn’t load your data. Check your connection.',retry:'Try again',
 role:'Role',role_owner:'Owner',role_rep:'Rep',role_hint:'Owners see the Team view and edit products and team members.',
 m_email_required:'Enter their email: it’s how they sign in',email_taken:'Another team member already has this email',
 last_owner:'The CRM needs at least one active owner',removed:'Removed',restore_member:'Give access again',member_restored:'Access restored'
},
hu:{
 nav_home:'Ma',nav_clients:'Ügyfelek',nav_orders:'Rendelések',nav_team:'Csapat',nav_settings:'Beállítások',
 log_order:'Új rendelés',saving:'Mentés…',saved:'Mentve',not_saved:'Nincs mentve',loading:'Ügyfelek betöltése…',
 commission_in:'{m} havi jutalékod',goal_pct:'A {g} cél {p}%-a',goal_reached:'Cél teljesítve',to_go:'Még {v}',
 pizzas_sold:'Eladott darab',net_sales:'Nettó forgalom',not_paid:'Kifizetetlen',
 followups:'Teendők',followups_empty:'Erre a hétre nincs teendő. Adj meg követési dátumot egy ügyfélnél, és itt megjelenik.',
 reorder_due:'Újrarendelés esedékes',last_order_ago:'Utolsó rendelés {n} napja',best_clients:'A hónap legjobb ügyfelei',pipeline:'Értékesítési tölcsér',
 start_title:'Kezdd az első ügyféllel',start_body:'Vegyél fel egy szállodát, bárt vagy éttermet, majd rögzítsd a rendeléseit. A jutalékod automatikusan összeadódik.',
 add_client:'Új ügyfél',today:'Ma',tomorrow:'Holnap',overdue1:'1 napja lejárt',overdueN:'{n} napja lejárt',inN:'{n} nap múlva, {d}',
 clients_sub:'{n} ügyfél, {b} rendel',no_clients_yet:'Még nincs ügyfél',search_ph:'Keresés: név, város, kapcsolattartó',
 all_types:'Minden típus',all_stages:'Minden szakasz',clients_empty:'Vedd fel a szállodákat, bárokat és éttermeket, akiknek eladsz vagy eladnál.',
 clients_nomatch:'Nincs a szűrésnek megfelelő ügyfél.',followup_prefix:'Teendő: {r}',
 back:'Vissza',edit:'Szerkesztés',call:'Hívás',copy:'Másolás',copied:'Másolva',email:'E-mail',directions:'Útvonal',
 pieces_bought:'Vásárolt darab',your_commission:'Jutalékod',log_activity:'Esemény rögzítése',stage:'Szakasz',
 next_followup:'Következő teendő',not_set:'Nincs megadva',clear:'Törlés',in3:'3 nap múlva',next_week:'Jövő héten',in2w:'2 hét múlva',no_followup:'Nincs',
 pick_date:'Vagy válassz dátumot',orders:'Rendelések',last_on:'Utolsó: {d}',orders_empty_client:'Még nincs rendelés. Ha {n} rendel, koppints az Új rendelés gombra.',
 activity:'Események',activity_empty:'Rögzítsd a hívásokat, látogatásokat és kóstoltatásokat, hogy meglegyen az ügyfél előzménye.',notes:'Jegyzetek',
 delete_client:'Ügyfél törlése',delete_client_confirm:'Koppints újra: az ügyfél és a rendelései törlődnek',
 paid_out:'Kifizetve',unpaid:'Kifizetetlen',pieces_n:'{n} db',pieces_net:'{n} db, nettó {v}',
 orders_sub:'Minden rendelés és a jutalékod',commission:'Jutalék',mark_all_paid:'Mind a(z) {n} kifizetve',all:'Mind',
 orders_empty_month:'{m}: nincs rendelés. Koppints az Új rendelés gombra.',orders_nomatch:'Nincs a szűrésnek megfelelő rendelés.',
 paid_hint:'Ha megkaptad egy rendelés jutalékát, koppints a Kifizetetlen jelölésre.',
 export_orders:'Rendelések exportálása',export_clients:'Ügyfelek exportálása',exported:'Fájl mentve',export_declined:'Exportálás megszakítva',export_failed:'Az exportálás nem sikerült',
 settings_sub:'Termékek, célok és adataid',language:'Nyelv',goals:'Célok és emlékeztetők',
 goal_label:'Havi jutalékcél ({c})',reorder_label:'Ennyi nap rendelés nélkül után emlékeztessen, hogy hívjam az ügyfelet',
 save_changes:'Mentés',changes_saved:'Mentve',products:'Termékek',
 products_hint_admin:'Nettó árak ÁFA nélkül. Az új rendelések ezeket használják, a korábbiak megtartják a sajátjukat. Minden értékesítő ezt a listát látja.',
 products_hint_rep:'A CRM tulajdonosa állítja be. Nettó árak ÁFA nélkül.',
 net_price:'Nettó ár ({c})',commission_per:'Jutalék darabonként ({c})',pct_of_price:'a nettó ár {p}%-a',
 add_product:'Új termék',hide_product:'Elrejtés',show_product:'Megjelenítés',hidden:'Új rendelésben nem látszik',vat_label:'ÁFA (%)',
 your_data:'Adataid',data_note:'Az ügyfeleid és rendeléseid automatikusan mentődnek a fiókodba. A többi értékesítő nem látja őket; a CRM tulajdonosai a Csapat nézetben igen.',
 team_sub:'Az értékesítők havi eredményei',team_empty:'Még nincs értékesítő. Vedd fel őket a Csapattagok között; az első bejelentkezésük után itt jelennek meg.',
 rep_someone:'Névtelen értékesítő',you:'(te)',rep:'Értékesítő',clients_lbl:'Ügyfél',total:'Összesen',
 new_client:'Új ügyfél',edit_client:'Ügyfél szerkesztése',biz_name:'Cégnév',biz_ph:'pl. Aranyhíd Szálloda',type:'Típus',
 contact:'Kapcsolattartó',contact_ph:'pl. Kata, séf',phone:'Telefon',address:'Cím',city:'Város',
 notes_ph:'Szállítási napok, fagyasztókapacitás, ki dönt',choose_client:'Válassz ügyfelet',client:'Ügyfél',date:'Dátum',
 note_opt:'Megjegyzés (nem kötelező)',note_ph:'pl. Csütörtök reggel szállítás',save_order:'Mentés',edit_order:'Rendelés szerkesztése',
 delete_order:'Rendelés törlése',delete_order_confirm:'Koppints újra a törléshez',
 order_needs_client:'Minden rendelés egy ügyfélhez tartozik. Előbb vedd fel a szállodát, bárt vagy éttermet.',
 unit_line:'nettó {p}, jutalék {c}',foot_line:'{n} db, nettó {net}, bruttó {gross}',what_happened:'Mi történt',
 close:'Bezárás',less:'Eggyel kevesebb: {n}',more:'Eggyel több: {n}',
 save_failed:'Nem sikerült menteni. Ellenőrizd a kapcsolatot, és próbáld újra.',
 product_name:'Termék neve',new_product:'Új termék',name_required:'Add meg a cégnevet',
 type_Hotel:'Szálloda',type_Bar:'Bár',type_Restaurant:'Étterem',type_Sport:'Sport',type_Leisure:'Szabadidő',type_Children:'Gyerek',type_Other:'Egyéb',
 members:'Csapattagok',add_member:'Új csapattag',new_member:'Új csapattag',edit_member:'Csapattag szerkesztése',
 m_name:'Név',m_name_ph:'pl. Kovács Anna',position:'Beosztás',position_ph:'pl. Értékesítő',segment:'Szegmens',segment_ph:'pl. Szállodák, Budapest',
 m_account:'CRM-fiók',m_not_linked:'Még nincs összekapcsolva',m_account_hint:'Ezzel az e-mail-címmel jelentkezik be. A fiókja az első bejelentkezéskor automatikusan összekapcsolódik ezzel a bejegyzéssel.',
 members_empty:'Vedd fel az értékesítőket az e-mail-címükkel. Csak a listán szereplők tudnak bejelentkezni.',
 members_note:'Ezt a listát csak a tulajdonosok látják. Az eltávolított tag nem tud bejelentkezni, de a korábbi eredményei a Csapat nézetben megmaradnak.',save_member:'Mentés',delete_member:'Eltávolítás a listából',delete_member_confirm:'Koppints újra az eltávolításhoz',
 m_name_required:'Add meg a nevet',linked:'Használja a CRM-et',not_using:'Még nem jelentkezett be',
 st_lead:'Érdeklődő',st_contacted:'Megkeresve',st_tasting:'Kóstoltatás',st_negotiating:'Tárgyalás',st_customer:'Ügyfél',st_lost:'Elveszett',
 act_call:'Hívás',act_visit:'Látogatás',act_email:'E-mail',act_tasting:'Kóstoltatás',act_note:'Jegyzet',
 csv_orders:'Dátum;Ügyfél;Típus;Város;Termék;Darab;Nettó egységár;Nettó összesen;Jutalék/db;Jutalék;Kifizetve;Megjegyzés',
 csv_clients:'Név;Típus;Szakasz;Kapcsolattartó;Telefon;E-mail;Cím;Város;Weboldal;Következő teendő;Rendelések;Darab;Nettó forgalom;Jutalék;Jegyzetek',
 yes:'Igen',no:'Nem',
 // added for the web app
 website:'Weboldal',
 login_title:'Belépés',login_body:'Add meg a munkahelyi e-mail-címed. Küldünk egy 6 jegyű kódot.',login_email_ph:'nev@ceg.hu',
 send_code:'Kód küldése',sending:'Küldés…',code_label:'Kód az e-mailből',code_sent:'Elküldtük a kódot ide: {e}. Egy percig is eltarthat, mire megérkezik.',
 verify:'Belépés',verifying:'Belépés…',other_email:'Másik e-mail-cím',resend:'Új kód küldése',
 code_wrong:'Ez a kód nem jó. Ellenőrizd, vagy kérj újat.',not_on_team:'Ez az e-mail-cím nincs a Freezbee csapatlistán. Kérd meg a CRM tulajdonosát, hogy vegyen fel.',
 send_failed:'Nem sikerült elküldeni a kódot. Várj egy percet, és próbáld újra.',
 noaccess_title:'Nincs hozzáférésed',noaccess_body:'A(z) {e} cím nincs az aktív csapatlistán. Kérd meg a CRM tulajdonosát, hogy vegyen fel, majd lépj be újra.',
 sign_out:'Kijelentkezés',signed_in_as:'Bejelentkezve: {e}',account:'Fiók',load_failed:'Nem sikerült betölteni az adataidat. Ellenőrizd a kapcsolatot.',retry:'Újra',
 role:'Szerepkör',role_owner:'Tulajdonos',role_rep:'Értékesítő',role_hint:'A tulajdonosok látják a Csapat nézetet, és szerkeszthetik a termékeket és a csapattagokat.',
 m_email_required:'Add meg az e-mail-címét: ezzel jelentkezik be',email_taken:'Ez az e-mail-cím már egy másik csapattaghoz tartozik',
 last_owner:'A CRM-nek legalább egy aktív tulajdonosa kell legyen',removed:'Eltávolítva',restore_member:'Hozzáférés visszaadása',member_restored:'Hozzáférés visszaadva'
}};

export type Lang = 'hu' | 'en';
export type StrKey = keyof typeof T.en;

function initialLang(): Lang {
  try {
    const v = localStorage.getItem('fz-lang');
    if (v === 'hu' || v === 'en') return v;
  } catch { /* storage blocked */ }
  return (navigator.language || '').toLowerCase().startsWith('hu') ? 'hu' : 'en';
}

let lang: Lang = typeof window === 'undefined' ? 'hu' : initialLang();

export const getLang = (): Lang => lang;
export function setLang(l: Lang): void {
  lang = l;
  try { localStorage.setItem('fz-lang', l); } catch { /* storage blocked */ }
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

export function t(k: StrKey, p?: Record<string, string | number>): string {
  let s: string | undefined = (T[lang] as Record<string, string>)[k];
  if (s == null) s = (T.en as Record<string, string>)[k];
  if (s == null) return k;
  if (p) s = s.replace(/\{(\w+)\}/g, (m, x) => (p[x] != null ? String(p[x]) : m));
  return s;
}

export const STRINGS = T;
