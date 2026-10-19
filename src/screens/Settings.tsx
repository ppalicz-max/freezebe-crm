import { t, getLang, type Lang } from '../i18n';
import { cur, money, num } from '../lib/format';
import { supabase } from '../lib/supabase';
import type { Catalog } from '../lib/types';
import { useCrm, uuid, type SettingsDraft } from '../store';
import { Icon } from '../components/Icon';
import { Chip, Header, Section } from '../components/ui';
import { ExportButtons } from './Orders';

export function Settings({ email }: { email: string }) {
  const crm = useCrm();
  const { isOwner, settings, catalog, touched, setTouched, setDraft } = crm;
  const fresh = (): SettingsDraft => ({
    target: String(settings.target ?? ''),
    reorderDays: String(settings.reorderDays || 21),
    vat: String(catalog.vat ?? 27),
    products: catalog.products.map((p) => ({ id: p.id, name: p.name, price: String(p.price), commission: String(p.commission), active: p.active })),
  });
  const d = touched && crm.draft ? crm.draft : fresh();
  const edit = (next: SettingsDraft) => { setDraft(next); setTouched(true); };
  const editProduct = (i: number, patch: Partial<SettingsDraft['products'][number]>) =>
    edit({ ...d, products: d.products.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const c = cur();

  const save = () => {
    const next = { target: Math.max(0, num(d.target)), reorderDays: Math.max(1, Math.round(num(d.reorderDays)) || 21) };
    let cat: Catalog | null = null;
    if (isOwner) {
      cat = {
        currency: catalog.currency,
        vat: Math.max(0, num(d.vat)),
        products: d.products.map((p, i) => ({
          id: p.id, name: p.name.trim() || t('new_product'), price: Math.max(0, num(p.price)), commission: Math.max(0, num(p.commission)),
          active: p.active, sortOrder: i + 1,
        })),
      };
    }
    crm.saveSettings(next, cat);
    setTouched(false);
    crm.toast(t('changes_saved'));
  };

  return (
    <>
      <Header title={t('nav_settings')} sub={t('settings_sub')} />
      <Section title={t('language')}>
        <div className="chips">
          {([['hu', 'Magyar'], ['en', 'English']] as [Lang, string][]).map(([l, label]) => (
            <Chip key={l} pressed={getLang() === l} onClick={() => crm.changeLang(l)}>{label}</Chip>
          ))}
        </div>
      </Section>

      <Section title={t('goals')}>
        <div className="panel">
          <label className="field">
            <span className="lbl">{t('goal_label', { c })}</span>
            <input id="s-target" className="input num" inputMode="numeric" value={d.target} onChange={(e) => edit({ ...d, target: e.target.value })} />
          </label>
          <label className="field">
            <span className="lbl">{t('reorder_label')}</span>
            <input id="s-reorder" className="input num" inputMode="numeric" value={d.reorderDays} onChange={(e) => edit({ ...d, reorderDays: e.target.value })} />
          </label>
        </div>
      </Section>

      <Section title={t('products')}>
        {isOwner ? (
          <>
            <p className="note" style={{ margin: '0 4px 12px' }}>{t('products_hint_admin')}</p>
            {d.products.map((x, i) => {
              const pr = num(x.price), cm = num(x.commission);
              return (
                <div key={x.id} className={'prod' + (x.active ? '' : ' off')}>
                  <input id={'p-name-' + i} className="prod-name" value={x.name} placeholder={t('product_name')} aria-label={t('product_name')}
                    autoFocus={x.isNew && i === d.products.length - 1} onChange={(e) => editProduct(i, { name: e.target.value })} />
                  <div className="grid2" style={{ marginTop: 12, gap: 12 }}>
                    <label className="field">
                      <span className="lbl">{t('net_price', { c })}</span>
                      <input id={'p-price-' + i} className="input num" inputMode="numeric" value={x.price} onChange={(e) => editProduct(i, { price: e.target.value })} />
                    </label>
                    <label className="field">
                      <span className="lbl">{t('commission_per', { c })}</span>
                      <input id={'p-com-' + i} className="input num" inputMode="numeric" value={x.commission} onChange={(e) => editProduct(i, { commission: e.target.value })} />
                    </label>
                  </div>
                  <div className="prod-foot">
                    <span>{x.active ? (pr > 0 ? t('pct_of_price', { p: Math.round((cm / pr) * 1000) / 10 }) : '') : t('hidden')}</span>
                    <button className="mini-btn tap" onClick={() => editProduct(i, { active: !x.active })}>{t(x.active ? 'hide_product' : 'show_product')}</button>
                  </div>
                </div>
              );
            })}
            <button className="btn btn-line tap" style={{ marginTop: 10 }}
              onClick={() => edit({ ...d, products: [...d.products, { id: uuid(), name: '', price: '', commission: '', active: true, isNew: true }] })}>
              <Icon name="plus" />{t('add_product')}
            </button>
            <div className="panel" style={{ marginTop: 10 }}>
              <label className="field">
                <span className="lbl">{t('vat_label')}</span>
                <input id="s-vat" className="input num" inputMode="numeric" value={d.vat} onChange={(e) => edit({ ...d, vat: e.target.value })} />
              </label>
            </div>
          </>
        ) : (
          <>
            <p className="note" style={{ margin: '0 4px 12px' }}>{t('products_hint_rep')}</p>
            <div className="card">
              {catalog.products.filter((x) => x.active).map((x) => (
                <div className="prod-ro" key={x.id}><b>{x.name}</b><span>{t('unit_line', { p: money(x.price), c: money(x.commission) })}</span></div>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title={t('your_data')}>
        <p className="note" style={{ margin: '0 4px 12px' }}>{t('data_note')}</p>
        <ExportButtons />
      </Section>

      <Section title={t('account')}>
        <p className="note" style={{ margin: '0 4px 12px' }}>{t('signed_in_as', { e: email })}</p>
        <button className="btn btn-plain tap" onClick={() => { void supabase.auth.signOut(); }}>{t('sign_out')}</button>
      </Section>

      {touched ? (
        <div className="savebar"><button className="btn btn-pink tap" onClick={save}>{t('save_changes')}</button></div>
      ) : null}
    </>
  );
}
