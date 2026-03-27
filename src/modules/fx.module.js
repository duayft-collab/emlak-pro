/**
 * Strategy Hub — src/modules/fx.module.js
 * Canlı döviz, kripto ve altın verisi
 *
 * API tercih sırası (güvenilirlik + CORS):
 *   FX     → fawazahmed0/currency-api (CDN, limit yok, kayıt yok)
 *          → Fallback: frankfurter.app
 *   BTC    → Binance (en hızlı, limit yok)
 *          → Fallback: CryptoCompare
 *   ALTIN  → goldprice.org dbXRates
 *          → Fallback: metals.live
 *
 * Anayasa: K03 (Veri Bütünlüğü), K04 (Hata Yönetimi), K07 (Performans)
 * Versiyon: 5.1.1 | 2026-03-26
 */

'use strict';

import { APP_CONFIG } from '../../config/app.config.js';
import { Logger }     from '../core/logger.js';
import { UI }         from '../core/ui.js';

/* ── DURUM ─────────────────────────────────────────────────────────────── */

const _state = {
  usd: null, eur: null, eurusd: null,
  gold: null, btc: null, btcChg: null,
  lastUpdated: null,
};

let _fxTimer     = null;
let _cryptoTimer = null;
let _goldTimer   = null;

/* ── FETCH YARDIMCISI ───────────────────────────────────────────────────── */

async function _get(url) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), APP_CONFIG.API_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(tid);
    throw err;
  }
}

/* ── FX — fawazahmed0 CDN (birincil) ───────────────────────────────────── */
// API: https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json
// Her gün güncellenir, CDN üzerinden → rate limit yok, CORS tam destekli

async function loadFX() {
  try {
    // Birincil: fawazahmed0 CDN
    const data = await _get(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json'
    );
    // Yanıt: { date, usd: { try: 44.18, eur: 0.92, ... } }
    const rates = data?.usd;
    if (!rates?.try || !rates?.eur) throw new Error('Unexpected shape');

    _state.usd    = rates.try;                          // 1 USD = X TRY
    _state.eur    = rates.try / rates.eur;              // 1 EUR = X TRY  (USD/EUR oranından)
    _state.eurusd = 1 / rates.eur;                      // 1 EUR = X USD

    _renderFX('up');
    Logger.info('FX_LOADED_CDN', { usd: _state.usd, eur: _state.eur });
  } catch (primaryErr) {
    Logger.warn('FX_CDN_FAILED', { message: primaryErr.message });
    // Fallback: Frankfurter
    try {
      const [tryD, eurD] = await Promise.all([
        _get('https://api.frankfurter.app/latest?from=USD&to=TRY'),
        _get('https://api.frankfurter.app/latest?from=EUR&to=TRY,USD'),
      ]);
      _state.usd    = tryD.rates?.TRY ?? null;
      _state.eur    = eurD.rates?.TRY ?? null;
      _state.eurusd = eurD.rates?.USD ? (1 / eurD.rates.USD) : null;
      _renderFX('up');
      Logger.info('FX_LOADED_FALLBACK', { usd: _state.usd });
    } catch (fallbackErr) {
      Logger.error('FX_ALL_FAILED', { message: fallbackErr.message });
      _renderFXOffline();
    }
  }
}

function _renderFX(cls) {
  if (_state.usd) {
    UI.setVal('pc-usd', `${_state.usd.toFixed(2)} <span class="u">TL</span>`);
    UI.setBadge('pc-usd-c', `${_state.usd.toFixed(2)}`, cls);
  }
  if (_state.eur) {
    UI.setVal('pc-eur', `${_state.eur.toFixed(2)} <span class="u">TL</span>`);
    UI.setBadge('pc-eur-c', 'Canlı', cls);
  }
  if (_state.eurusd) {
    const valEl = document.getElementById('eurusd-val');
    if (valEl) valEl.textContent = _state.eurusd.toFixed(4);
    const subEl = document.getElementById('eurusd-sub');
    if (subEl) { subEl.textContent = 'Canlı'; subEl.className = 'up'; }
    const wEl = document.getElementById('eurusd-w');
    if (wEl) { wEl.textContent = _state.eurusd.toFixed(4); wEl.classList.remove('sp'); }
    UI.setBadge('eurusd-wc', 'Canlı', cls);
  }
  _state.lastUpdated = new Date().toISOString();
  _broadcastUpdate();
  _updateLastRefresh();
}

function _renderFXOffline() {
  ['pc-usd-c', 'pc-eur-c', 'eurusd-wc'].forEach(id => UI.setBadge(id, 'Offline', 'nt'));
}

/* ── BTC — Binance (birincil) ──────────────────────────────────────────── */
// Binance public ticker: CORS destekli, kayıt gereksiz, rate limit çok yüksek
// 24h değişim için ayrı endpoint kullanıyoruz

async function loadCrypto() {
  try {
    // Binance — fiyat + 24h değişim
    const data = await _get(
      'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'
    );
    _state.btc    = parseFloat(data.lastPrice);
    _state.btcChg = parseFloat(data.priceChangePercent);

    UI.setVal('pc-btc', `<span class="u">$</span>${Math.round(_state.btc).toLocaleString('en-US')}`);
    const cls = _state.btcChg >= 0 ? 'up' : 'dn';
    UI.setBadge('pc-btc-c', `${_state.btcChg >= 0 ? '+' : ''}${_state.btcChg.toFixed(2)}%`, cls);
    Logger.info('CRYPTO_LOADED_BINANCE', { btc: _state.btc, chg: _state.btcChg });
    _broadcastUpdate();
  } catch (primaryErr) {
    Logger.warn('CRYPTO_BINANCE_FAILED', { message: primaryErr.message });
    // Fallback: CryptoCompare
    try {
      const data = await _get(
        'https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC&tsyms=USD'
      );
      const btcData    = data?.RAW?.BTC?.USD;
      _state.btc       = btcData?.PRICE ?? null;
      _state.btcChg    = btcData?.CHANGEPCT24HOUR ?? null;
      if (_state.btc) {
        UI.setVal('pc-btc', `<span class="u">$</span>${Math.round(_state.btc).toLocaleString('en-US')}`);
        UI.setBadge('pc-btc-c', `${_state.btcChg >= 0 ? '+' : ''}${_state.btcChg?.toFixed(2)}%`,
          _state.btcChg >= 0 ? 'up' : 'dn');
      }
      Logger.info('CRYPTO_LOADED_FALLBACK', { btc: _state.btc });
      _broadcastUpdate();
    } catch (fallbackErr) {
      Logger.error('CRYPTO_ALL_FAILED', { message: fallbackErr.message });
      UI.setBadge('pc-btc-c', 'Offline', 'nt');
    }
  }
}

/* ── ALTIN — goldprice.org (birincil) ─────────────────────────────────── */
// API: https://data-asg.goldprice.org/dbXRates/USD
// Yanıt: { items: [{ xauPrice: 3100.xx, ... }] }

async function loadGold() {
  try {
    const data = await _get('https://data-asg.goldprice.org/dbXRates/USD');
    const xau  = data?.items?.[0]?.xauPrice;          // Ons altın USD fiyatı
    if (!xau || typeof xau !== 'number') throw new Error('Invalid xauPrice');

    _state.gold = xau;
    UI.setVal('pc-gold', `<span class="u">$</span>${Math.round(_state.gold).toLocaleString('en-US')}`);
    UI.setBadge('pc-gold-c', 'Canlı', 'up');
    Logger.info('GOLD_LOADED_GOLDPRICE', { gold: _state.gold });
    _broadcastUpdate();
  } catch (primaryErr) {
    Logger.warn('GOLD_GOLDPRICE_FAILED', { message: primaryErr.message });
    // Fallback: metals.live
    try {
      const data = await _get('https://api.metals.live/v1/spot/gold');
      const xau  = data?.[0]?.gold;
      if (!xau) throw new Error('No gold data');
      _state.gold = xau;
      UI.setVal('pc-gold', `<span class="u">$</span>${Math.round(_state.gold).toLocaleString('en-US')}`);
      UI.setBadge('pc-gold-c', 'Canlı', 'up');
      Logger.info('GOLD_LOADED_FALLBACK', { gold: _state.gold });
      _broadcastUpdate();
    } catch (fallbackErr) {
      Logger.error('GOLD_ALL_FAILED', { message: fallbackErr.message });
      // Son çare: statik referans değer
      _state.gold = null;
      UI.setVal('pc-gold', `<span class="u">$</span>—`);
      UI.setBadge('pc-gold-c', 'Offline', 'nt');
    }
  }
}

/* ── CANLI FİYAT TABLOSU ─────────────────────────────────────────────── */

function renderLivePrices() {
  const el = document.getElementById('live-prices');
  if (!el) return;

  const fmt = (n, decimals = 2) => n != null
    ? n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : '—';

  const rows = [
    ['USD/TRY',   _state.usd    != null ? `${fmt(_state.usd)} TL`   : '—', _state.usd    ? 'up' : 'nt'],
    ['EUR/TRY',   _state.eur    != null ? `${fmt(_state.eur)} TL`   : '—', _state.eur    ? 'up' : 'nt'],
    ['EUR/USD',   _state.eurusd != null ? fmt(_state.eurusd, 4)      : '—', _state.eurusd ? 'nt' : 'nt'],
    ['Ons Altın', _state.gold   != null ? `$${Math.round(_state.gold).toLocaleString('en-US')}` : '—', _state.gold ? 'up' : 'nt'],
    ['Bitcoin',   _state.btc    != null ? `$${Math.round(_state.btc).toLocaleString('en-US')}`  : '—', _state.btc  ? 'up' : 'nt'],
  ];

  el.innerHTML = `<table class="dt">
    <thead><tr><th>Varlık</th><th>Fiyat</th><th>Kaynak</th></tr></thead>
    <tbody>${rows.map(([name, val, cls]) =>
      `<tr>
        <td class="s">${name}</td>
        <td style="font-family:var(--mono);font-weight:600">${val}</td>
        <td><span class="bdg ${cls}">${cls === 'up' ? 'Canlı' : cls === 'dn' ? 'Offline' : 'Statik'}</span></td>
      </tr>`
    ).join('')}</tbody>
  </table>`;
}

/* ── EMTIA TABLOSU ───────────────────────────────────────────────────── */

function renderCommodities() {
  const el = document.getElementById('commodity-table');
  if (!el) return;

  const gold   = _state.gold;
  const usd    = _state.usd;
  const goldTL = (gold && usd) ? Math.round(gold * usd / 31.1035) : null;

  el.innerHTML = `<table class="dt">
    <thead><tr><th>Emtia</th><th>Fiyat</th><th></th></tr></thead>
    <tbody>
      <tr>
        <td class="s">Ons Altın</td>
        <td style="font-family:var(--mono);font-weight:600">${gold ? `$${Math.round(gold).toLocaleString('en-US')}` : '—'}</td>
        <td><span class="bdg ${gold ? 'up' : 'nt'}">${gold ? 'Canlı' : 'Offline'}</span></td>
      </tr>
      <tr>
        <td class="s">Gram Altın</td>
        <td style="font-family:var(--mono);font-weight:600">${goldTL ? `${goldTL.toLocaleString('tr-TR')} TL` : '—'}</td>
        <td><span class="bdg nt">Hesap</span></td>
      </tr>
      <tr><td class="s">Brent Petrol</td><td style="font-family:var(--mono);font-weight:600">$84.20</td><td><span class="bdg wn">Statik</span></td></tr>
      <tr><td class="s">Doğalgaz</td><td style="font-family:var(--mono);font-weight:600">$2.85</td><td><span class="bdg nt">Statik</span></td></tr>
      <tr><td class="s">Bakır</td><td style="font-family:var(--mono);font-weight:600">$4.15</td><td><span class="bdg nt">Statik</span></td></tr>
    </tbody>
  </table>`;
}

/* ── BROADCAST ────────────────────────────────────────────────────────── */

function _broadcastUpdate() {
  window.dispatchEvent(new CustomEvent('fx:updated', { detail: { ..._state } }));
}

function _updateLastRefresh() {
  const el = document.getElementById('last-refresh');
  if (el) el.textContent = 'Son: ' + new Date().toLocaleTimeString('tr-TR');
}

function getState() { return { ..._state }; }

/* ── ZAMANLAYICILAR ─────────────────────────────────────────────────── */
// Anayasa K07 — visibilityState kontrolü: sekme arka plandaysa istek atma

function startAutoRefresh() {
  const ifVisible = fn => () => { if (!document.hidden) fn(); };

  _fxTimer     = setInterval(ifVisible(loadFX),     APP_CONFIG.REFRESH_INTERVAL_FX_MS);
  _cryptoTimer = setInterval(ifVisible(loadCrypto), APP_CONFIG.REFRESH_INTERVAL_CRYPTO_MS);
  _goldTimer   = setInterval(ifVisible(loadGold),   APP_CONFIG.REFRESH_INTERVAL_FX_MS * 5); // 5 dk
}

function stopAutoRefresh() {
  [_fxTimer, _cryptoTimer, _goldTimer].forEach(clearInterval);
}

/* ── BAŞLATMA ─────────────────────────────────────────────────────────── */

async function init() {
  await Promise.allSettled([loadFX(), loadCrypto(), loadGold()]);
  renderLivePrices();
  renderCommodities();
  startAutoRefresh();
  Logger.info('FX_MODULE_INIT_v5.1.1');
}

export const FXModule = {
  init, loadFX, loadCrypto, loadGold,
  renderLivePrices, renderCommodities,
  getState, stopAutoRefresh,
};
