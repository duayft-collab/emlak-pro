/**
 * Strategy Hub — src/modules/africa.module.js
 * Afrika Pazarı — kurlar, navlun, AI risk, pipeline, CRM, rapor
 * Anayasa: K03, K04, K05, K06, K10, K16
 * Versiyon: 5.3.0 | 2026-03-27
 */

'use strict';

import { Store }  from '../core/store.js';
import { Logger } from '../core/logger.js';
import { UI }     from '../core/ui.js';

/* ── STORE ANAHTARLARI ────────────────────────────────────────────────── */
const AF_PIPE_KEY = 'africa_pipeline';
const AF_CRM_KEY  = 'africa_crm';

/* ── YARDIMCILAR ──────────────────────────────────────────────────────── */
function _uid(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }
function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _parseMoney(str) {
  const s = String(str).replace(/[$,\s]/g,'').toUpperCase();
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  if (s.endsWith('B')) return n * 1e9;
  if (s.endsWith('M')) return n * 1e6;
  if (s.endsWith('K')) return n * 1e3;
  return n;
}

/* ── #1+#2: Afrika Döviz Kurları ────────────────────────────────────── */
const AF_CURRENCIES = ['xof','ngn','kes','zar','etb'];

async function loadAfricaFX() {
  try {
    const res  = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json');
    const data = await res.json();
    const r    = data?.usd;
    if (!r) throw new Error('no data');

    const map = { xof: 'af-xof', ngn: 'af-ngn', kes: 'af-kes', zar: 'af-zar', etb: 'af-etb' };
    AF_CURRENCIES.forEach(cur => {
      const val = r[cur];
      if (!val) return;
      UI.setVal(map[cur], val.toFixed(cur === 'xof' ? 0 : 2));
      UI.setBadge(map[cur] + '-c', 'Canlı', 'up');
    });
    Logger.info('AFRICA_FX_LOADED');
  } catch(err) {
    Logger.warn('AFRICA_FX_FAILED', { message: err.message });
    AF_CURRENCIES.forEach(cur => UI.setBadge('af-' + cur + '-c', 'Offline', 'nt'));
  }
}

/* ── #5: Navlun Hesaplayıcı ─────────────────────────────────────────── */
const ROUTES = {
  dakar:    { name: 'Dakar, Senegal',           d20: 2100, d40: 3800, days: 18, via: 'Umit Burnu', extra: '+10 gün' },
  lagos:    { name: 'Lagos, Nijerya',            d20: 2400, d40: 4200, days: 22, via: 'Umit Burnu', extra: '+10 gün' },
  abidjan:  { name: 'Abidjan, Fildişi S.',       d20: 2200, d40: 3900, days: 20, via: 'Umit Burnu', extra: '+9 gün' },
  mombasa:  { name: 'Mombasa, Kenya',            d20: 1800, d40: 3200, days: 16, via: 'Umit Burnu', extra: '+5 gün' },
  durban:   { name: 'Durban, Güney Afrika',      d20: 2600, d40: 4600, days: 24, via: 'Umit Burnu', extra: '+6 gün' },
  djibouti: { name: 'Cibuti (Etiyopya kapısı)', d20: 1400, d40: 2600, days: 12, via: 'Süveyş',     extra: '+2 gün' },
  accra:    { name: 'Accra, Gana',               d20: 2300, d40: 4100, days: 21, via: 'Umit Burnu', extra: '+9 gün' },
  dar:      { name: 'Dar es Salaam, Tanzanya',   d20: 1900, d40: 3400, days: 18, via: 'Umit Burnu', extra: '+5 gün' },
};

function renderNavlun() {
  const routeId = document.getElementById('af-route-sel')?.value;
  const cnt     = document.getElementById('af-cnt-sel')?.value;
  const el      = document.getElementById('af-navlun-result');
  if (!el || !routeId) return;

  const r    = ROUTES[routeId];
  const cost = cnt === '40ft' ? r.d40 : r.d20;
  const cls  = cost > 2500 ? 'dn' : cost > 1800 ? 'wn' : 'up';

  el.innerHTML = `
    <div style="background:var(--bg3);border-radius:10px;padding:14px;border:1px solid var(--sidebar-border)">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px">${_esc(r.name)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div><div style="font-size:9px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px">${cnt} Navlun</div>
          <div style="font-size:18px;font-weight:700;font-family:var(--mono);color:var(--text)">$${cost.toLocaleString('en-US')}</div>
          <span class="bdg ${cls}" style="margin-top:4px;display:inline-block">${cls==='dn'?'Yüksek':cls==='wn'?'Orta':'Uygun'}</span>
        </div>
        <div><div style="font-size:9px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px">Transit Süre</div>
          <div style="font-size:18px;font-weight:700;font-family:var(--mono);color:var(--text)">${r.days} gün</div>
          <div style="font-size:10px;color:var(--gold);margin-top:4px">+Kızıldeniz: ${r.extra}</div>
        </div>
        <div><div style="font-size:9px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px">Rota</div>
          <div style="font-size:12px;font-weight:600;color:var(--text);margin-top:4px">Mersin →</div>
          <div style="font-size:12px;color:var(--text2)">${r.via}</div>
        </div>
      </div>
    </div>`;
}

/* ── #9: Kâr Marjı Hesaplayıcı ─────────────────────────────────────── */
function calcMargin() {
  const price    = parseFloat(document.getElementById('af-price')?.value) || 0;
  const currency = document.getElementById('af-currency')?.value;
  const freight  = parseFloat(document.getElementById('af-freight')?.value) || 0;
  const customs  = parseFloat(document.getElementById('af-customs')?.value) || 0;
  const cost     = parseFloat(document.getElementById('af-cost')?.value) || 0;
  const el       = document.getElementById('af-margin-result');
  if (!el) return;

  // Canlı kur al
  const fxState = window.FXState || {};
  const usdTRY  = fxState.usd || 44.18;
  const eurTRY  = fxState.eur || 47.32;
  const rate    = currency === 'EUR' ? eurTRY : usdTRY;

  const priceTRY    = price * rate;
  const freightTRY  = freight * usdTRY;
  const customsTRY  = priceTRY * (customs / 100);
  const totalCost   = cost + freightTRY + customsTRY;
  const profit      = priceTRY - totalCost;
  const margin      = priceTRY > 0 ? (profit / priceTRY * 100) : 0;
  const cls         = margin > 20 ? 'gd' : margin > 10 ? 'wn' : 'dn';

  el.innerHTML = `
    <div style="background:var(--bg3);border-radius:10px;padding:12px;border:1px solid var(--sidebar-border)">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
        <div class="mm"><span class="mml">Satış (TL karş.)</span><span class="mmv gd">${Math.round(priceTRY).toLocaleString('tr-TR')} ₺</span></div>
        <div class="mm"><span class="mml">Navlun (TL)</span><span class="mmv ne">${Math.round(freightTRY).toLocaleString('tr-TR')} ₺</span></div>
        <div class="mm"><span class="mml">Gümrük (TL)</span><span class="mmv ne">${Math.round(customsTRY).toLocaleString('tr-TR')} ₺</span></div>
        <div class="mm"><span class="mml">Toplam Maliyet</span><span class="mmv hi">${Math.round(totalCost).toLocaleString('tr-TR')} ₺</span></div>
      </div>
      <div style="text-align:center;padding:10px;background:var(--bg2);border-radius:8px;border:1px solid var(--sidebar-border)">
        <div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">Net Kâr / Marj</div>
        <div style="font-size:22px;font-weight:800;font-family:var(--mono);color:var(--text)">${Math.round(profit).toLocaleString('tr-TR')} ₺</div>
        <span class="bdg ${cls}" style="margin-top:6px;display:inline-block;font-size:12px">%${margin.toFixed(1)} marj</span>
      </div>
    </div>`;

  Logger.info('MARGIN_CALCULATED', { price, currency, margin: margin.toFixed(1) });
}

/* ── #3: AI Risk Raporu ─────────────────────────────────────────────── */
async function getRiskReport() {
  const country = document.getElementById('af-risk-country')?.value;
  const el      = document.getElementById('af-risk-result');
  if (!el || !country) return;

  el.innerHTML = '<span class="sp" style="width:90%;height:14px;display:inline-block;margin-bottom:6px"></span><br><span class="sp" style="width:70%;height:14px;display:inline-block"></span>';

  const RISK_DATA = {
    Nigeria:      { cds: 'yüksek', currency: 'Naira (NGN) — son 2 yılda %60 değer kaybetti', payment: 'akreditif zorunlu', recommend: 'Ön ödeme veya teyitli akreditif. Eximbank ihracat alacak sigortası al.' },
    Kenya:        { cds: 'orta',   currency: 'Şilin (KES) — görece stabil, %8/yıl devalüasyon', payment: '%30 ön ödeme + sigorta', recommend: 'Kısmi ön ödeme ile başla. Nairobi üzerinden Doğu Afrika hub\'u kur.' },
    Ghana:        { cds: 'orta',   currency: 'Cedi (GHS) — 2023 IMF kurtarma paketinden çıkıyor', payment: '%30 ön ödeme', recommend: 'IMF programı sürerken temkinli ol. Küçük partilerle başla.' },
    'South Africa': { cds: 'düşük', currency: 'Rand (ZAR) — en likit Afrika parası', payment: 'açık hesap mümkün', recommend: 'En güvenli Afrika pazarı. Gümrük birliği ile tüm Güney Afrika\'ya erişim.' },
    Ethiopia:     { cds: 'yüksek', currency: 'Birr (ETB) — döviz kıtlığı var, transfer riski yüksek', payment: 'akreditif zorunlu', recommend: 'Cibuti limanı üzerinden çalış. Büyük projeler için garantili finans.' },
    Senegal:      { cds: 'düşük',  currency: 'CFA Frangı (XOF) — Euro\'ya sabitli, istikrarlı', payment: 'açık hesap OK', recommend: 'En stabil Batı Afrika parası. Dakar bölgesel dağıtım merkezi olabilir.' },
    Tanzania:     { cds: 'orta',   currency: 'Şilin (TZS) — stabil, %5/yıl devalüasyon', payment: '%20 ön ödeme', recommend: 'Turizm büyümesi inşaat malzemesi talebini artırıyor. Fırsat var.' },
    'Ivory Coast': { cds: 'düşük', currency: 'CFA Frangı (XOF) — Euro\'ya sabitli', payment: 'açık hesap OK', recommend: 'Abidjan Batı Afrika\'nın finans merkezi. Lojistik altyapısı güçlü.' },
    Egypt:        { cds: 'orta',   currency: 'Pound (EGP) — IMF devalüasyon baskısı sürüyor', payment: 'akreditif önerilir', recommend: 'En büyük Afrika pazarı. Normalleşen Türkiye ilişkileri fırsat yaratıyor.' },
    Morocco:      { cds: 'düşük',  currency: 'Dirhem (MAD) — stabil, Avrupa entegrasyonu güçlü', payment: 'açık hesap OK', recommend: 'Avrupa-Afrika köprüsü. AB serbest ticaret anlaşması avantaj sağlıyor.' },
    Libya:        { cds: 'çok yüksek', currency: 'Dinar (LYD) — çift kur sorunu var', payment: '%100 ön ödeme zorunlu', recommend: 'Yüksek risk, yüksek getiri. Müşteri istihbaratı kritik. Eximbank sigortası zorunlu.' },
  };

  const d = RISK_DATA[country];
  if (!d) { el.innerHTML = '<span style="color:var(--text3);font-size:11px">Veri bulunamadı.</span>'; return; }

  const cdsClr = d.cds === 'düşük' ? 'up' : d.cds === 'orta' ? 'wn' : 'dn';

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px">
      <div class="mm"><span class="mml">Ülke Risk Seviyesi</span><span class="bdg ${cdsClr}">${d.cds.toUpperCase()}</span></div>
      <div style="padding:8px 10px;background:var(--bg3);border-radius:8px;font-size:11px;color:var(--text2);line-height:1.5"><strong style="color:var(--text)">Döviz:</strong> ${d.currency}</div>
      <div style="padding:8px 10px;background:var(--bg3);border-radius:8px;font-size:11px;color:var(--text2);line-height:1.5"><strong style="color:var(--text)">Ödeme:</strong> ${d.payment}</div>
      <div style="padding:8px 10px;background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.15);border-radius:8px;font-size:11px;color:var(--text2);line-height:1.5"><strong style="color:var(--accent)">Öneri:</strong> ${d.recommend}</div>
    </div>`;

  Logger.info('RISK_REPORT_VIEWED', { country });
}

/* ── #8: Afrika Haber Akışı ─────────────────────────────────────────── */
async function loadAfricaNews() {
  const el = document.getElementById('af-news-feed');
  if (!el) return;

  // BBC Africa Economy RSS
  const feeds = [
    'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
  ];

  try {
    const proxy = 'https://api.allorigins.win/get?url=';
    const r = await fetch(proxy + encodeURIComponent(feeds[0]));
    const d = await r.json();
    const xml = new DOMParser().parseFromString(d.contents, 'text/xml');
    const items = xml.querySelectorAll('item');
    let html = '';
    for (let i = 0; i < Math.min(6, items.length); i++) {
      const title = items[i].querySelector('title')?.textContent ?? '';
      const pub   = items[i].querySelector('pubDate');
      const date  = pub ? new Date(pub.textContent).toLocaleDateString('tr-TR') : '';
      html += `<div style="padding:8px 0;border-bottom:1px solid var(--sidebar-border)">
        <div style="font-size:9px;font-weight:700;color:var(--text3);letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px">BBC Africa</div>
        <div style="font-size:12px;font-weight:600;color:var(--text);line-height:1.4">${_esc(title)}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">${date}</div>
      </div>`;
    }
    el.innerHTML = html || '<div style="font-size:11px;color:var(--text3)">Haber yüklenemedi.</div>';
    Logger.info('AFRICA_NEWS_LOADED');
  } catch(err) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text3)">Bağlantı hatası.</div>';
    Logger.warn('AFRICA_NEWS_FAILED', { message: err.message });
  }
}

/* ── #4: Afrika Pipeline ─────────────────────────────────────────────── */
const PIPE_DEFAULTS = [
  { id: 'afp_1', name: 'Al-Futtaim Group', val: '$1.8M', country: 'Nijerya',       sector: 'İnşaat Malz.', stage: 'Teklif',   isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'afp_2', name: 'Nairobi Traders',  val: '$650K', country: 'Kenya',          sector: 'Tekstil',      stage: 'Müzakere', isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'afp_3', name: 'Dakar Industries', val: '$420K', country: 'Senegal',        sector: 'Makine',       stage: 'Sunum',    isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
];

const STAGE_CLS = { Keşfet:'nt', Sunum:'te', Müzakere:'tu', Teklif:'up', Kapandı:'gd' };

function renderAfricaPipeline() {
  const el = document.getElementById('af-pipeline-list');
  if (!el) return;
  const items = Store.getCollection(AF_PIPE_KEY, PIPE_DEFAULTS).filter(x => !x.isDeleted);

  // İstatistikler
  const total = items.reduce((a,p) => a + _parseMoney(p.val), 0);
  const countEl = document.getElementById('af-pipe-count');
  const totalEl = document.getElementById('af-pipe-total');
  const topEl   = document.getElementById('af-pipe-top');
  const stageEl = document.getElementById('af-pipe-stage');
  if (countEl) countEl.textContent = String(items.length);
  if (totalEl) totalEl.textContent = `$${(total/1e6).toFixed(1)}M`;
  // En büyük ülke
  const countryMap = {};
  items.forEach(p => { countryMap[p.country] = (countryMap[p.country]||0) + _parseMoney(p.val); });
  const topCountry = Object.entries(countryMap).sort((a,b) => b[1]-a[1])[0];
  if (topEl) topEl.textContent = topCountry ? topCountry[0] : '—';
  // Teklif aşamasındaki sayı
  const teklifCount = items.filter(p => p.stage === 'Teklif').length;
  if (stageEl) stageEl.textContent = `${teklifCount} Teklif`;

  if (!items.length) { el.innerHTML = '<div class="empty-state">Afrika pipeline boş.</div>'; return; }
  el.innerHTML = items.map(p => `
    <div class="li">
      <div class="li-c" style="flex:1">
        <div class="name">${_esc(p.name)} <span style="font-size:9px;color:var(--text3)">${_esc(p.country)}</span></div>
        <div class="sub">${_esc(p.val)} · ${_esc(p.sector)} · <span class="bdg ${STAGE_CLS[p.stage]||'nt'}">${_esc(p.stage)}</span></div>
      </div>
      <button class="del-btn" data-id="${p.id}">Sil</button>
    </div>`).join('');
}

function addAfricaPipeline() {
  const name    = document.getElementById('af-pipe-name')?.value.trim();
  if (!name) { UI.toast('Şirket adı zorunludur.', 'warning'); return; }
  const item = {
    id: _uid('afp'),
    name,
    val:     document.getElementById('af-pipe-val')?.value || '?',
    country: document.getElementById('af-pipe-country')?.value || 'Diğer',
    sector:  document.getElementById('af-pipe-sector')?.value || 'Diğer',
    stage:   document.getElementById('af-pipe-stage-sel')?.value || 'Keşfet',
    isDeleted: false, deletedAt: null, deletedBy: null,
    createdAt: new Date().toISOString(),
  };
  Store.appendToCollection(AF_PIPE_KEY, item, PIPE_DEFAULTS);
  Logger.audit('AFRICA_PIPELINE_ADDED', { id: item.id, name: item.name, country: item.country });
  ['af-pipe-name','af-pipe-val'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  UI.toast(`"${item.name}" Afrika pipeline'a eklendi.`, 'success');
  renderAfricaPipeline();
}

/* ── #10: Afrika CRM ─────────────────────────────────────────────────── */
const CRM_DEFAULTS = [
  { id: 'crm_1', name: 'Lagos Trading Co.', country: 'Nijerya', contact: '2026-03-15', payment: 'Akreditif', note: 'Son sipariş Mart 2026 — 2 konteyner', isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'crm_2', name: 'Nairobi Imports',   country: 'Kenya',   contact: '2026-03-10', payment: 'Ön Ödeme',  note: 'Memnun müşteri — referans verebilir', isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
];

function renderCRM() {
  const el = document.getElementById('af-crm-list');
  if (!el) return;
  const items = Store.getCollection(AF_CRM_KEY, CRM_DEFAULTS).filter(x => !x.isDeleted);
  if (!items.length) { el.innerHTML = '<div class="empty-state">CRM boş.</div>'; return; }

  const now = new Date();
  el.innerHTML = items.map(c => {
    const lastContact = new Date(c.contact);
    const daysSince   = Math.floor((now - lastContact) / (1000*60*60*24));
    const urgency     = daysSince > 30 ? 'dn' : daysSince > 14 ? 'wn' : 'up';
    return `<div class="li">
      <div class="li-c" style="flex:1">
        <div class="name">${_esc(c.name)} <span style="font-size:9px;color:var(--text3)">${_esc(c.country)}</span></div>
        <div class="sub">${_esc(c.payment)} · Son temas: ${daysSince} gün önce <span class="bdg ${urgency}" style="margin-left:4px">${urgency==='dn'?'Ara!':urgency==='wn'?'Takip Et':'Güncel'}</span></div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">${_esc(c.note)}</div>
      </div>
      <button class="del-btn" data-id="${c.id}">Sil</button>
    </div>`;
  }).join('');
}

function addCRM() {
  const name = document.getElementById('crm-name')?.value.trim();
  if (!name) { UI.toast('Firma adı zorunludur.', 'warning'); return; }
  const item = {
    id: _uid('crm'),
    name,
    country: document.getElementById('crm-country')?.value || 'Diğer',
    contact: document.getElementById('crm-contact')?.value || new Date().toISOString().split('T')[0],
    payment: document.getElementById('crm-payment')?.value || 'Akreditif',
    note:    document.getElementById('crm-note')?.value || '',
    isDeleted: false, deletedAt: null, deletedBy: null,
    createdAt: new Date().toISOString(),
  };
  Store.appendToCollection(AF_CRM_KEY, item, CRM_DEFAULTS);
  Logger.audit('AFRICA_CRM_ADDED', { id: item.id, name: item.name });
  ['crm-name','crm-note'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  UI.toast(`"${item.name}" CRM'e eklendi.`, 'success');
  renderCRM();
}

/* ── #11: Rapor Oluşturucu ───────────────────────────────────────────── */
async function generateReport(format = 'pdf') {
  const statusEl = document.getElementById('af-report-status');
  if (statusEl) statusEl.textContent = 'Rapor hazırlanıyor…';

  try {
    const pipe  = Store.getCollection(AF_PIPE_KEY, PIPE_DEFAULTS).filter(x => !x.isDeleted);
    const crm   = Store.getCollection(AF_CRM_KEY,  CRM_DEFAULTS).filter(x => !x.isDeleted);
    const fx    = window.FXState || {};
    const total = pipe.reduce((a,p) => a + _parseMoney(p.val), 0);
    const now   = new Date().toLocaleDateString('tr-TR');

    if (format === 'excel') {
      // CSV olarak indir (Excel açar)
      let csv = 'Şirket,Ülke,Sektör,Değer,Aşama\n';
      pipe.forEach(p => { csv += `"${p.name}","${p.country}","${p.sector}","${p.val}","${p.stage}"\n`; });
      csv += '\nMüşteri,Ülke,Ödeme,Son Temas\n';
      crm.forEach(c => { csv += `"${c.name}","${c.country}","${c.payment}","${c.contact}"\n`; });

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `afrika-rapor-${now}.csv`; a.click();
      URL.revokeObjectURL(url);
      if (statusEl) statusEl.textContent = '✓ Excel (CSV) indirildi.';
    } else {
      // Print-to-PDF
      const reportWin = window.open('', '_blank');
      reportWin.document.write(`<!DOCTYPE html><html lang="tr"><head>
        <meta charset="UTF-8">
        <title>Afrika İhracat Raporu — ${now}</title>
        <style>
          body{font-family:system-ui,sans-serif;padding:32px;color:#111;max-width:800px;margin:0 auto}
          h1{font-size:22px;margin-bottom:4px}
          h2{font-size:15px;margin:20px 0 8px;color:#2563eb}
          .meta{font-size:12px;color:#666;margin-bottom:24px}
          table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}
          th{text-align:left;padding:6px 8px;background:#f4f6fa;border:1px solid #e2e8f0;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#666}
          td{padding:6px 8px;border:1px solid #e2e8f0}
          .stat-row{display:flex;gap:24px;margin-bottom:20px}
          .stat{padding:12px 16px;background:#f4f6fa;border-radius:8px;flex:1}
          .stat-val{font-size:20px;font-weight:700;font-family:monospace}
          .stat-lbl{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.08em}
          .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#999}
        </style>
      </head><body>
        <h1>Afrika İhracat Raporu</h1>
        <div class="meta">Strategy Hub v5.3 · Hazırlanma: ${now} · USD/TRY: ${fx.usd?.toFixed(2)||'—'}</div>
        <div class="stat-row">
          <div class="stat"><div class="stat-lbl">Pipeline Değeri</div><div class="stat-val">$${(total/1e6).toFixed(1)}M</div></div>
          <div class="stat"><div class="stat-lbl">Aktif Fırsat</div><div class="stat-val">${pipe.length}</div></div>
          <div class="stat"><div class="stat-lbl">Müşteri</div><div class="stat-val">${crm.length}</div></div>
        </div>
        <h2>Pipeline</h2>
        <table><tr><th>Şirket</th><th>Ülke</th><th>Sektör</th><th>Değer</th><th>Aşama</th></tr>
        ${pipe.map(p => `<tr><td>${p.name}</td><td>${p.country}</td><td>${p.sector}</td><td>${p.val}</td><td>${p.stage}</td></tr>`).join('')}
        </table>
        <h2>Müşteri Listesi</h2>
        <table><tr><th>Firma</th><th>Ülke</th><th>Ödeme</th><th>Son Temas</th><th>Not</th></tr>
        ${crm.map(c => `<tr><td>${c.name}</td><td>${c.country}</td><td>${c.payment}</td><td>${c.contact}</td><td>${c.note}</td></tr>`).join('')}
        </table>
        <h2>Piyasa Verileri</h2>
        <table><tr><th>Varlık</th><th>Değer</th></tr>
          <tr><td>USD/TRY</td><td>${fx.usd?.toFixed(2)||'—'} TL</td></tr>
          <tr><td>EUR/TRY</td><td>${fx.eur?.toFixed(2)||'—'} TL</td></tr>
          <tr><td>Ons Altın</td><td>$${fx.gold?Math.round(fx.gold).toLocaleString('en-US'):'—'}</td></tr>
          <tr><td>Bitcoin</td><td>$${fx.btc?Math.round(fx.btc).toLocaleString('en-US'):'—'}</td></tr>
        </table>
        <div class="footer">Strategy Hub · Duay Global Trade · ${now} · Bu rapor otomatik oluşturulmuştur.</div>
        <script>window.onload = () => { window.print(); }<\/script>
      </body></html>`);
      reportWin.document.close();
      if (statusEl) statusEl.textContent = '✓ PDF hazırlandı — yazdır/kaydet penceresini kullan.';
    }
    Logger.audit('AFRICA_REPORT_GENERATED', { format });
  } catch(err) {
    Logger.error('AFRICA_REPORT_FAILED', { message: err.message });
    if (statusEl) statusEl.textContent = '✕ Rapor oluşturulamadı: ' + err.message;
  }
}

/* ── EVENT BAĞLAMA ───────────────────────────────────────────────────── */
function _bindEvents() {
  document.getElementById('af-route-sel')?.addEventListener('change', renderNavlun);
  document.getElementById('af-cnt-sel')?.addEventListener('change', renderNavlun);
  document.getElementById('af-pipeline-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.del-btn[data-id]');
    if (!btn) return;
    const items = Store.getCollection(AF_PIPE_KEY, PIPE_DEFAULTS);
    const item  = items.find(x => x.id === btn.dataset.id);
    if (!item) return;
    Store.softDeleteInCollection(AF_PIPE_KEY, btn.dataset.id, 'user', PIPE_DEFAULTS);
    renderAfricaPipeline();
    UI.toast(`"${item.name}" silindi.`, 'warning', () => { Store.restoreInCollection(AF_PIPE_KEY, btn.dataset.id, PIPE_DEFAULTS); renderAfricaPipeline(); });
  });
  document.getElementById('af-crm-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.del-btn[data-id]');
    if (!btn) return;
    const items = Store.getCollection(AF_CRM_KEY, CRM_DEFAULTS);
    const item  = items.find(x => x.id === btn.dataset.id);
    if (!item) return;
    Store.softDeleteInCollection(AF_CRM_KEY, btn.dataset.id, 'user', CRM_DEFAULTS);
    renderCRM();
    UI.toast(`"${item.name}" silindi.`, 'warning', () => { Store.restoreInCollection(AF_CRM_KEY, btn.dataset.id, CRM_DEFAULTS); renderCRM(); });
  });
}

/* ── BAŞLATMA ─────────────────────────────────────────────────────────── */
async function init() {
  renderNavlun();
  renderAfricaPipeline();
  renderCRM();
  _bindEvents();
  await Promise.allSettled([loadAfricaFX(), loadAfricaNews()]);
  setInterval(() => { if (!document.hidden) loadAfricaFX(); }, 60_000);
  Logger.info('AFRICA_MODULE_INIT_v5.3');
}

export const AfricaModule = {
  init, loadAfricaFX, renderNavlun, calcMargin, getRiskReport,
  addAfricaPipeline, renderAfricaPipeline,
  addCRM, renderCRM, generateReport,
};
window.AfricaModule = AfricaModule;
