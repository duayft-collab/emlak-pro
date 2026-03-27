/**
 * Strategy Hub — src/modules/weather.module.js
 * Hava durumu ve haber feed'i
 * Anayasa: K04 (Hata Yönetimi), K07 (Lazy Loading)
 * Versiyon: 5.1.0 | 2026-03-26
 */
'use strict';
import { APP_CONFIG } from '../../config/app.config.js';
import { Logger }     from '../core/logger.js';

const CITIES = [
  { n: 'İstanbul', lat: 41.015, lon: 28.979 },
  { n: 'Ankara',   lat: 39.925, lon: 32.866 },
  { n: 'İzmir',    lat: 38.423, lon: 27.142 },
  { n: 'Dubai',    lat: 25.204, lon: 55.270 },
  { n: 'Hamburg',  lat: 53.551, lon:  9.993 },
];
const ICONS = { 0:'☀',1:'☀',2:'⛅',3:'☁',45:'🌫',51:'🌦',61:'🌧',71:'🌨',80:'🌧',95:'⛈' };
const DESCS = { 0:'Açık',1:'Az bulutlu',2:'Parçalı',3:'Bulutlu',45:'Sisli',51:'Hafif yağmur',61:'Yağmurlu',71:'Karlı',80:'Sağanak',95:'Fırtınalı' };

async function loadWeather() {
  const el = document.getElementById('weather-full');
  if (!el) return;
  try {
    const results = await Promise.all(CITIES.map(async c => {
      try {
        const r   = await fetch(`${APP_CONFIG.API.WEATHER_BASE}?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weathercode,windspeed_10m&timezone=auto`);
        const d   = await r.json();
        const cur = d.current;
        return { n: c.n, t: Math.round(cur.temperature_2m), icon: ICONS[String(cur.weathercode)] ?? '☀', desc: DESCS[String(cur.weathercode)] ?? 'Açık', w: Math.round(cur.windspeed_10m) };
      } catch (_) { return { n: c.n, t: '?', icon: '☀', desc: 'Veri yok', w: '?' }; }
    }));
    el.innerHTML = results.map(c =>
      `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--sidebar-border)">
        <div style="font-size:24px">${c.icon}</div>
        <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text)">${c.n}</div><div style="font-size:11px;color:var(--text3)">${c.desc} · ${c.w} km/h</div></div>
        <div style="font-size:22px;font-weight:700;font-family:var(--mono);color:var(--text)">${c.t}°</div>
      </div>`).join('');
    Logger.info('WEATHER_LOADED');
  } catch (err) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text3)">Bağlantı hatası.</div>';
    Logger.error('WEATHER_LOAD_FAILED', { message: err.message });
  }
}

async function loadNews() {
  const el = document.getElementById('news-feed');
  if (!el) return;
  try {
    const rss = 'https://feeds.bbci.co.uk/news/business/rss.xml';
    const r   = await fetch(`${APP_CONFIG.API.NEWS_PROXY}?url=${encodeURIComponent(rss)}`);
    const d   = await r.json();
    const xml = new DOMParser().parseFromString(d.contents, 'text/xml');
    const items = xml.querySelectorAll('item');
    let html = '';
    for (let i = 0; i < Math.min(6, items.length); i++) {
      const title = items[i].querySelector('title')?.textContent ?? '';
      const pub   = items[i].querySelector('pubDate');
      const date  = pub ? new Date(pub.textContent).toLocaleDateString('tr-TR') : '';
      html += `<div style="padding:8px 0;border-bottom:1px solid var(--sidebar-border)">
        <div style="font-size:9px;font-weight:700;color:var(--text3);letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px">BBC Business</div>
        <div style="font-size:12px;font-weight:600;color:var(--text);line-height:1.4">${title}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">${date}</div>
      </div>`;
    }
    el.innerHTML = html || '<div style="font-size:11px;color:var(--text3)">Haber yüklenemedi.</div>';
    Logger.info('NEWS_LOADED');
  } catch (err) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text3)">Bağlantı hatası.</div>';
    Logger.warn('NEWS_LOAD_FAILED', { message: err.message });
  }
}

async function init() {
  await Promise.allSettled([loadWeather(), loadNews()]);
  Logger.info('WEATHER_MODULE_INIT');
}

export const WeatherModule = { init };
