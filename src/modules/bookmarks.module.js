/**
 * Strategy Hub — src/modules/bookmarks.module.js
 * Faydalı web siteleri yönetimi — 15 hazır site + kullanıcı ekleme
 * Anayasa: K01, K06, K12
 * Versiyon: 5.4.0 | 2026-03-27
 */

'use strict';
import { Store }  from '../core/store.js';
import { Logger } from '../core/logger.js';
import { UI }     from '../core/ui.js';

const BM_KEY = 'bookmarks';

/* ── 15 HAZIR FAYDALI WEB SİTESİ ─────────────────────────────────── */
const PRESET_BOOKMARKS = [
  // Piyasa & Finans
  { id: 'bm_01', cat: 'Piyasa & Finans',    title: 'TCMB Döviz Kurları',    url: 'https://www.tcmb.gov.tr/kurlar/today.xml',              desc: 'Merkez Bankası resmi günlük kurlar',           icon: '🏦' },
  { id: 'bm_02', cat: 'Piyasa & Finans',    title: 'Borsa İstanbul',         url: 'https://www.borsaistanbul.com',                          desc: 'BIST canlı veri ve endeksler',                 icon: '📈' },
  { id: 'bm_03', cat: 'Piyasa & Finans',    title: 'TradingEconomics TR',    url: 'https://tr.tradingeconomics.com/turkey',                 desc: 'Türkiye makro göstergeler — 300+ veri',        icon: '📊' },
  { id: 'bm_04', cat: 'Piyasa & Finans',    title: 'IMF Data',               url: 'https://www.imf.org/en/Data',                            desc: 'IMF küresel ekonomik veriler',                 icon: '🌐' },
  // İhracat & Ticaret
  { id: 'bm_05', cat: 'İhracat & Ticaret',  title: 'TİM İhracat Verileri',  url: 'https://www.tim.org.tr/tr/ihracat-rakamlari.html',       desc: 'Türkiye İhracatçılar Meclisi aylık veriler',  icon: '📦' },
  { id: 'bm_06', cat: 'İhracat & Ticaret',  title: 'Trade Map (ITC)',        url: 'https://www.trademap.org',                               desc: 'Ülke bazlı ihracat/ithalat istatistikleri',   icon: '🗺️' },
  { id: 'bm_07', cat: 'İhracat & Ticaret',  title: 'Ticaret Bakanlığı',     url: 'https://www.ticaret.gov.tr',                             desc: 'Destekler, mevzuat, hedef ülkeler',            icon: '🏛️' },
  { id: 'bm_08', cat: 'İhracat & Ticaret',  title: 'Türk Eximbank',         url: 'https://www.eximbank.gov.tr',                            desc: 'İhracat finansmanı ve alacak sigortası',       icon: '🛡️' },
  // Afrika
  { id: 'bm_09', cat: 'Afrika Pazarı',      title: 'DEİK Afrika',           url: 'https://www.deik.org.tr/bolgeler/afrika',               desc: 'Türkiye-Afrika ticaret ilişkileri',            icon: '🌍' },
  { id: 'bm_10', cat: 'Afrika Pazarı',      title: 'African Development Bank', url: 'https://www.afdb.org/en',                             desc: 'Afrika Kalkınma Bankası proje ihaleleri',      icon: '🏗️' },
  { id: 'bm_11', cat: 'Afrika Pazarı',      title: 'TABEF Forum',           url: 'https://tabef.org/tr',                                   desc: 'Türkiye-Afrika İş ve Ekonomi Forumu',          icon: '🤝' },
  // Lojistik & Navlun
  { id: 'bm_12', cat: 'Lojistik',           title: 'Freightos Navlun',       url: 'https://www.freightos.com/freight-resources/freight-rate-index/', desc: 'Küresel navlun endeksleri',        icon: '⚓' },
  { id: 'bm_13', cat: 'Lojistik',           title: 'Baltic Exchange',        url: 'https://www.balticexchange.com',                         desc: 'Baltic Dry Index ve deniz taşımacılığı',      icon: '🚢' },
  // Haber
  { id: 'bm_14', cat: 'Haberler',           title: 'BBC Africa Business',    url: 'https://www.bbc.com/news/topics/cyd7z4rvdm8t/africa-business', desc: 'Afrika ekonomi haberleri',          icon: '📰' },
  { id: 'bm_15', cat: 'Haberler',           title: 'Reuters Africa',         url: 'https://www.reuters.com/places/africa',                  desc: 'Reuters Afrika haberleri',                     icon: '📡' },
];

const CATS = ['Tümü', 'Piyasa & Finans', 'İhracat & Ticaret', 'Afrika Pazarı', 'Lojistik', 'Haberler'];
let _activeFilter = 'Tümü';

function _uid() { return `bm_u${Date.now()}_${Math.random().toString(36).slice(2,5)}`; }
function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function getBookmarks() {
  const user = Store.getCollection(BM_KEY, []).filter(b => !b.isDeleted);
  return [...PRESET_BOOKMARKS, ...user];
}

function addBookmark(fd) {
  const title = String(fd.title || '').trim();
  const url   = String(fd.url || '').trim();
  if (!title || !url) { UI.toast('Başlık ve URL zorunludur.', 'warning'); return; }
  const bm = {
    id: _uid(), title, url,
    desc: String(fd.desc || '').trim(),
    cat:  String(fd.cat || 'Diğer'),
    icon: String(fd.icon || '🔗'),
    isDeleted: false, deletedAt: null, deletedBy: null,
    createdAt: new Date().toISOString(),
  };
  Store.appendToCollection(BM_KEY, bm, []);
  Logger.audit('BOOKMARK_ADDED', { id: bm.id, title: bm.title });
  UI.toast(`"${title}" eklendi.`, 'success');
  renderBookmarks();
}

function deleteBookmark(id) {
  // Preset siteleri silinemez
  if (PRESET_BOOKMARKS.find(b => b.id === id)) {
    UI.toast('Yerleşik siteler silinemez.', 'warning'); return;
  }
  Store.softDeleteInCollection(BM_KEY, id, 'user', []);
  renderBookmarks();
  UI.toast('Site kaldırıldı.', 'info');
}

function renderBookmarks() {
  const el = document.getElementById('bookmarks-grid');
  if (!el) return;
  const all  = getBookmarks();
  const list = _activeFilter === 'Tümü' ? all : all.filter(b => b.cat === _activeFilter);
  const isPreset = id => !!PRESET_BOOKMARKS.find(b => b.id === id);

  // Kategori filtreleri
  const filterEl = document.getElementById('bookmark-filters');
  if (filterEl) {
    filterEl.innerHTML = CATS.map(c => `
      <button onclick="BookmarksModule.setFilter('${c}')"
        style="padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;cursor:pointer;border:none;
        background:${_activeFilter===c?'var(--accent)':'var(--bg3)'};
        color:${_activeFilter===c?'#fff':'var(--text3)'};transition:all .2s">
        ${_esc(c)}
      </button>`).join('');
  }

  // Kategorilere göre grupla
  const grouped = {};
  list.forEach(b => { (grouped[b.cat] = grouped[b.cat]||[]).push(b); });

  el.innerHTML = Object.entries(grouped).map(([cat, items]) => `
    <div style="margin-bottom:20px">
      <div style="font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--text3);margin-bottom:8px">${_esc(cat)}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
        ${items.map(b => `
          <a href="${_esc(b.url)}" target="_blank" rel="noopener"
            style="display:flex;align-items:flex-start;gap:10px;padding:12px;background:var(--bg3);
            border-radius:10px;border:1px solid var(--sidebar-border);text-decoration:none;
            transition:all .2s;cursor:pointer"
            onmouseover="this.style.borderColor='var(--accent)';this.style.transform='translateY(-1px)'"
            onmouseout="this.style.borderColor='var(--sidebar-border)';this.style.transform=''">
            <span style="font-size:20px;flex-shrink:0">${b.icon || '🔗'}</span>
            <div style="min-width:0;flex:1">
              <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(b.title)}</div>
              <div style="font-size:10px;color:var(--text3);line-height:1.4">${_esc(b.desc)}</div>
            </div>
            ${!isPreset(b.id) ? `<button onclick="event.preventDefault();BookmarksModule.deleteBookmark('${b.id}')"
              style="font-size:10px;color:var(--text3);flex-shrink:0;background:none;border:none;cursor:pointer">✕</button>` : ''}
          </a>`).join('')}
      </div>
    </div>`).join('');
}

function setFilter(cat) {
  _activeFilter = cat;
  renderBookmarks();
}

function init() {
  renderBookmarks();
  Logger.info('BOOKMARKS_MODULE_INIT');
}

export const BookmarksModule = { init, addBookmark, deleteBookmark, renderBookmarks, setFilter };
window.BookmarksModule = BookmarksModule;
