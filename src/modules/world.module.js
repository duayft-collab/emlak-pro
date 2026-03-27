/**
 * Strategy Hub — src/modules/world.module.js
 * Dünya ekonomisi: borsa, emtia tablosu
 * Anayasa: K04 (Hata Yönetimi), K07 (Performans)
 * Versiyon: 5.1.1 | 2026-03-26
 */

'use strict';

import { APP_CONFIG } from '../../config/app.config.js';
import { Logger }     from '../core/logger.js';
import { FXModule }   from './fx.module.js';

const PROXY = APP_CONFIG.API.MARKETS_PROXY;
const SYMS  = [
  { iv: 'sp500-v',  ic: 'sp500-c',  s: '%5EGSPC'  },
  { iv: 'nasdaq-v', ic: 'nasdaq-c', s: '%5EIXIC'  },
  { iv: 'bist-v',   ic: 'bist-c',  s: 'XU100.IS' },
];

async function loadMarkets() {
  for (const sym of SYMS) {
    try {
      const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${sym.s}?interval=1d&range=2d`;
      const r    = await fetch(`${PROXY}?url=${encodeURIComponent(url)}`);
      const raw  = await r.json();
      const data = JSON.parse(raw.contents);
      const meta = data.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      const prev  = meta.previousClose;
      const chg   = ((price - prev) / prev * 100);

      const el = document.getElementById(sym.iv);
      if (el) el.textContent = price.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
      const ce = document.getElementById(sym.ic);
      if (ce) ce.innerHTML = `<span class="bdg ${chg >= 0 ? 'up' : 'dn'}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</span>`;
      // Dashboard BIST widget'i
      if (sym.s === 'XU100.IS') {
        const bd = document.getElementById('bist-dash');
        if (bd) bd.textContent = price.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
      }
    } catch (_) { /* sessiz hata — tek sembol başarısız diğerlerini etkilemesin */ }
  }
  Logger.info('MARKETS_LOADED');
}

async function init() {
  // Canlı fiyat tablosu + emtia → fx.module zaten yüklenmiş ve state'i dolu
  FXModule.renderLivePrices();
  FXModule.renderCommodities();

  // FX güncellendiğinde tabloyu da tazele
  window.addEventListener('fx:updated', () => {
    FXModule.renderLivePrices();
    FXModule.renderCommodities();
  });

  // Borsa verileri ayrı (proxy üzerinden)
  await loadMarkets();
  Logger.info('WORLD_MODULE_INIT');
}

export const WorldModule = { init };
