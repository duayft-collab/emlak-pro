/**
 * Strategy Hub — src/modules/dashboard.module.js
 * Dashboard sayfası orkestratörü
 * Anayasa: K04 (Hata Yönetimi), K07 (Performans)
 * Versiyon: 5.1.0 | 2026-03-26
 */

'use strict';

import { APP_CONFIG } from '../../config/app.config.js';
import { Logger }     from '../core/logger.js';
import { UI }         from '../core/ui.js';

const PROXY = APP_CONFIG.API.MARKETS_PROXY;

async function _fetchMarket(sym) {
  try {
    const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=2d`;
    const res  = await fetch(`${PROXY}?url=${encodeURIComponent(url)}`);
    const data = JSON.parse((await res.json()).contents);
    const meta = data.chart.result[0].meta;
    return { price: meta.regularMarketPrice, prev: meta.previousClose };
  } catch (_) { return null; }
}

async function loadMarketSummary() {
  const bist = await _fetchMarket('XU100.IS');
  if (bist) {
    const el = document.getElementById('bist-dash');
    if (el) el.textContent = bist.price.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  }
}

function renderAlerts() {
  const el = document.getElementById('dash-alerts');
  if (!el) return;

  // FX modülünden anlık veri al
  const fxEvent = new Promise(resolve => {
    const unsub = () => resolve();
    window.addEventListener('fx:updated', unsub, { once: true });
    setTimeout(unsub, 3000); // Zaman aşımı
  });

  fxEvent.then(() => {
    const oil = 84.20; // Statik — navlun modülü canlı endpoint eklenince güncellenir
    let html = '';
    if (oil > 80) {
      html += `<div class="al al-d">
        <svg width="15" height="15" style="flex-shrink:0;color:var(--red);margin-top:1px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
        <div><h4>Petrol Kritik — $${oil.toFixed(2)}</h4><p>Brent $80 üstünde. Navlun ve enflasyon baskısı süreçleri tetikleyebilir.</p><span class="al-act">Eylem: Lojistik bütçenizi revize edin</span></div>
      </div>`;
    }
    html += `<div class="al al-w">
      <svg width="15" height="15" style="flex-shrink:0;color:var(--gold);margin-top:1px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
      <div><h4>TCMB — 18 Mart Faiz Kararı</h4><p>150 baz puan indirim fiyatlanıyor. TL faizli pozisyonları gözden geçirin.</p><span class="al-act">Eylem: TL vadeli pozisyonları değerlendirin</span></div>
    </div>`;
    el.innerHTML = html;
  });
}

async function loadWeatherDash() {
  const cities = [
    { n: 'İstanbul', lat: 41.015, lon: 28.979 },
    { n: 'Ankara',   lat: 39.925, lon: 32.866 },
  ];
  const icons  = { 0:'☀', 1:'☀', 2:'⛅', 3:'☁', 45:'🌫', 51:'🌦', 61:'🌧', 71:'🌨', 80:'🌧', 95:'⛈' };
  const descs  = { 0:'Açık', 1:'Az bulutlu', 2:'Parçalı', 3:'Bulutlu', 45:'Sisli', 51:'Hafif yağmur', 61:'Yağmurlu', 71:'Karlı', 80:'Sağanak', 95:'Fırtınalı' };

  const el = document.getElementById('weather-dash');
  if (!el) return;

  try {
    const results = await Promise.all(cities.map(async c => {
      const r = await fetch(`${APP_CONFIG.API.WEATHER_BASE}?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weathercode,windspeed_10m&timezone=auto`);
      const d = await r.json();
      const cur = d.current;
      return { n: c.n, t: Math.round(cur.temperature_2m), icon: icons[String(cur.weathercode)] ?? '☀', desc: descs[String(cur.weathercode)] ?? 'Açık', w: Math.round(cur.windspeed_10m) };
    }));
    el.innerHTML = results.map(c =>
      `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--sidebar-border)">
        <div style="font-size:20px">${c.icon}</div>
        <div style="flex:1"><div style="font-size:12px;font-weight:600;color:var(--text)">${c.n}</div><div style="font-size:10px;color:var(--text3)">${c.desc} · ${c.w} km/h</div></div>
        <div style="font-size:18px;font-weight:700;font-family:var(--mono);color:var(--text)">${c.t}°</div>
      </div>`
    ).join('');
  } catch (_) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text3)">Hava verisi alınamadı.</div>';
  }
}

function updateLastRefresh() {
  const el = document.getElementById('last-refresh');
  if (el) el.textContent = 'Son: ' + new Date().toLocaleTimeString('tr-TR');
}

function init() {
  renderAlerts();
  loadMarketSummary();
  loadWeatherDash();
  updateLastRefresh();
  Logger.info('DASHBOARD_MODULE_INIT');
}

export const DashboardModule = { init };
