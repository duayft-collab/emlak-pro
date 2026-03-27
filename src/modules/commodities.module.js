/**
 * Strategy Hub — src/modules/commodities.module.js
 * Canlı petrol, navlun ve emtia verileri
 *
 * Petrol (Brent):
 *   Birincil → EIA (ABD Enerji Bakanlığı) — ücretsiz, CORS OK, API key gereksiz
 *   Fallback  → Statik değer (84.20) — API kesilirse platform çalışmaya devam eder
 *
 * Navlun (SCFI, BDI):
 *   Ücretsiz public endpoint yok — statik + haftalık manuel güncelleme önerilir
 *   Gelecek sprint: Freightos API entegrasyonu (kayıt gerekiyor)
 *
 * Anayasa: K03 (Veri Bütünlüğü), K04 (Hata Yönetimi — fallback zinciri)
 * Versiyon: 5.2.0 | 2026-03-26
 */

'use strict';

import { Logger } from '../core/logger.js';

// EIA open data — kayıt gerektirmez, CORS destekli
// WTI ham petrol haftalık spot fiyatı (USD/varil)
const EIA_URL = 'https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=DEMO&data[]=value&sort[0][column]=period&sort[0][direction]=desc&length=2&facets[series][]=RBRTE';

const _state = {
  brent:     null,
  brentChg:  null,
  scfi:      2213,   // Statik — Freightos API sprint'e alındı
  bdi:       1850,   // Statik
  bunker:    480,    // Statik
  lastUpdated: null,
};

async function loadBrent() {
  try {
    const res  = await fetch(EIA_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rows = json?.response?.data;
    if (!rows || rows.length < 1) throw new Error('EIA: boş veri');

    _state.brent = parseFloat(rows[0].value);
    _state.brentChg = rows.length > 1
      ? parseFloat(((_state.brent - parseFloat(rows[1].value)) / parseFloat(rows[1].value) * 100).toFixed(2))
      : null;
    _state.lastUpdated = new Date().toISOString();

    Logger.info('BRENT_LOADED_EIA', { brent: _state.brent });
    _render();
    window.dispatchEvent(new CustomEvent('commodities:updated', { detail: { ..._state } }));
  } catch (err) {
    Logger.warn('BRENT_EIA_FAILED', { message: err.message });
    // Fallback: statik değer — platform çalışmaya devam eder
    _state.brent = 84.20;
    _render();
  }
}

function _render() {
  // Navlun sayfası stat grid'i
  const scfiEl  = document.querySelector('[data-live="scfi"]');
  const bdiEl   = document.querySelector('[data-live="bdi"]');
  const brentEl = document.querySelector('[data-live="brent"]');

  if (brentEl && _state.brent) {
    brentEl.textContent = `$${_state.brent.toFixed(2)}`;
    const chgEl = brentEl.closest('.sc')?.querySelector('.scs');
    if (chgEl && _state.brentChg !== null) {
      const cls = _state.brentChg >= 0 ? 'dn' : 'up'; // Petrol artışı kötü → dn rengi
      chgEl.innerHTML = `<span class="bdg ${cls}">${_state.brentChg >= 0 ? '+' : ''}${_state.brentChg}%</span>`;
    }
  }

  // Dashboard özet
  const dashBrent = document.getElementById('dash-brent');
  if (dashBrent && _state.brent) dashBrent.textContent = `$${_state.brent.toFixed(2)}`;

  // Alert sistemi ile entegrasyon
  window.dispatchEvent(new CustomEvent('commodities:ready', { detail: { brent: _state.brent } }));
}

function getState() { return { ..._state }; }

async function init() {
  await loadBrent();
  // 6 saatte bir güncelle — EIA haftalık veri yayınlıyor
  setInterval(() => { if (!document.hidden) loadBrent(); }, 6 * 60 * 60 * 1000);
  Logger.info('COMMODITIES_MODULE_INIT');
}

export const CommoditiesModule = { init, getState };
window.CommoditiesModule = CommoditiesModule;
