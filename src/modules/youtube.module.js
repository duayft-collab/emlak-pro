/**
 * Strategy Hub — youtube.module.js
 * Yeni format: BİLGİ · ÖNERİ · DİKKAT · ANAHTAR FİKİR · KARAR
 */
'use strict';
import { Store }  from '../core/store.js';
import { Logger } from '../core/logger.js';

const SUMMARIES_URL = 'https://raw.githubusercontent.com/duayft-collab/Karar-destek/main/youtube-tracker/data/summaries.json';
const CACHE_KEY = 'yt_summaries';
const CACHE_TTL = 30 * 60 * 1000;

function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

let _all = [], _filter = 'all';

async function loadSummaries() {
  const cached = Store.get(CACHE_KEY);
  if (cached && Date.now() - new Date(cached.ts).getTime() < CACHE_TTL) {
    _all = cached.videos || []; render(); _meta(cached.generated_at, true); return;
  }
  try {
    const res  = await fetch(SUMMARIES_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    _all = data.videos || [];
    Store.set(CACHE_KEY, { videos: _all, generated_at: data.generated_at, ts: new Date().toISOString() });
    render();
    _meta(data.generated_at, false);
    Logger.info('YT_LOADED', { count: _all.length });
  } catch(e) {
    Logger.warn('YT_FAILED', { message: e.message });
    _showEmpty();
  }
}

function _meta(gen, fromCache) {
  const el = document.getElementById('yt-meta');
  if (!el || !gen) return;
  el.textContent = `Son güncelleme: ${new Date(gen).toLocaleString('tr-TR')}${fromCache?' · önbellekten':''}`;
}

function renderFilters() {
  const el = document.getElementById('yt-filters');
  if (!el) return;
  const cats = ['Tümü', ...new Set(_all.map(v => v.category).filter(Boolean))];
  el.innerHTML = cats.map(c => {
    const val = c === 'Tümü' ? 'all' : c;
    const act = _filter === val;
    return `<button onclick="YouTubeModule.setFilter('${_esc(val)}')"
      style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;
      border:1px solid var(--border);transition:all .15s;
      background:${act?'var(--text)':'transparent'};color:${act?'var(--bg2)':'var(--text2)'}">
      ${_esc(c)}</button>`;
  }).join('');
}

function setFilter(f) { _filter = f; renderFilters(); render(); }

function render() {
  const loading = document.getElementById('yt-loading');
  if (loading) loading.style.display = 'none';
  const list = document.getElementById('yt-list');
  if (!list) return;
  const videos = _filter === 'all' ? _all : _all.filter(v => v.category === _filter);
  renderFilters();
  if (!videos.length) { _showEmpty(); list.innerHTML = ''; return; }
  document.getElementById('yt-empty').style.display = 'none';
  list.innerHTML = videos.map(_card).join('');
}

function _card(v) {
  const hasNew = v.info && v.info.length > 0;

  const infoRows  = (v.info    || []).map(x => `<div class="_yt-row"><span class="_yt-dot" style="background:#0066CC"></span><span>${_esc(x)}</span></div>`).join('');
  const advRows   = (v.advice  || []).map(x => `<div class="_yt-row"><span class="_yt-dot" style="background:#34C759"></span><span>${_esc(x)}</span></div>`).join('');
  const warnRows  = (v.warning || []).map(x => `<div class="_yt-row"><span class="_yt-dot" style="background:#FF9500"></span><span>${_esc(x)}</span></div>`).join('');

  const trBadge = v.has_transcript
    ? '<span class="bdg up" style="font-size:9px">Transcript</span>'
    : '<span class="bdg nt" style="font-size:9px">Açıklama</span>';

  return `
  <style>
    ._yt-row{display:flex;gap:8px;align-items:flex-start;padding:4px 0;font-size:12px;color:var(--text2);line-height:1.55}
    ._yt-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:5px}
    ._yt-sec{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:10px 0 5px}
  </style>
  <div style="padding:16px;background:var(--bg2);border-radius:12px;border:1px solid var(--border);margin-bottom:10px">

    <!-- Başlık satırı -->
    <div style="display:flex;gap:12px;margin-bottom:${hasNew?'14px':'0'}">
      ${v.thumbnail?`<a href="${_esc(v.url)}" target="_blank" rel="noopener" style="flex-shrink:0">
        <img src="${_esc(v.thumbnail)}" style="width:120px;height:68px;border-radius:8px;object-fit:cover" loading="lazy">
      </a>`:''}
      <div style="flex:1;min-width:0">
        <a href="${_esc(v.url)}" target="_blank" rel="noopener" style="text-decoration:none">
          <div style="font-size:13px;font-weight:600;color:var(--text);line-height:1.35;margin-bottom:5px">${_esc(v.title)}</div>
        </a>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-size:11px;font-weight:600;color:var(--accent)">${_esc(v.channel)}</span>
          <span style="color:var(--text3)">·</span>
          <span style="font-size:11px;color:var(--text3)">${_esc(v.published_tr||'')}</span>
          <span style="color:var(--text3)">·</span>
          ${trBadge}
        </div>
      </div>
    </div>

    ${hasNew ? `
    <!-- Anahtar Fikir -->
    ${v.key_idea ? `<div style="padding:10px 12px;background:var(--bg3);border-radius:8px;border-left:3px solid var(--text);margin-bottom:12px">
      <div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text3);margin-bottom:4px">Anahtar Fikir</div>
      <div style="font-size:13px;font-weight:500;color:var(--text);line-height:1.5">${_esc(v.key_idea)}</div>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <!-- Bilgi -->
      ${infoRows ? `<div style="padding:10px 12px;background:rgba(0,102,204,.04);border-radius:8px;border:1px solid rgba(0,102,204,.12)">
        <div class="_yt-sec" style="color:var(--accent)">📊 Bilgi</div>
        ${infoRows}
      </div>` : ''}

      <!-- Öneri -->
      ${advRows ? `<div style="padding:10px 12px;background:rgba(52,199,89,.04);border-radius:8px;border:1px solid rgba(52,199,89,.12)">
        <div class="_yt-sec" style="color:var(--green)">✅ Öneri</div>
        ${advRows}
      </div>` : ''}
    </div>

    <!-- Dikkat -->
    ${warnRows ? `<div style="padding:10px 12px;background:rgba(255,149,0,.04);border-radius:8px;border:1px solid rgba(255,149,0,.15);margin-bottom:10px">
      <div class="_yt-sec" style="color:var(--gold)">⚠ Dikkat</div>
      ${warnRows}
    </div>` : ''}

    <!-- Karar + Buton -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
      ${v.decision ? `<div style="font-size:11px;color:var(--text3);flex:1"><strong style="color:var(--text2)">Kim izlemeli:</strong> ${_esc(v.decision)}</div>` : '<div></div>'}
      <a href="${_esc(v.url)}" target="_blank" rel="noopener"
        style="display:inline-flex;align-items:center;gap:5px;padding:6px 14px;
        background:var(--text);color:var(--bg2);border-radius:8px;font-size:11px;font-weight:600;text-decoration:none;white-space:nowrap">
        İzle →
      </a>
    </div>
    ` : `
    <!-- Eski format fallback -->
    <div style="font-size:11px;color:var(--text3);margin-top:8px">Bir sonraki çalışmada tam özet gelecek.</div>
    <div style="margin-top:8px;text-align:right">
      <a href="${_esc(v.url)}" target="_blank" rel="noopener"
        style="display:inline-flex;align-items:center;gap:5px;padding:6px 14px;
        background:var(--text);color:var(--bg2);border-radius:8px;font-size:11px;font-weight:600;text-decoration:none">
        İzle →
      </a>
    </div>
    `}
  </div>`;
}

function _showEmpty() {
  const el = document.getElementById('yt-empty');
  if (el) el.style.display = 'block';
}

async function init() {
  await loadSummaries();
  setInterval(() => { if (!document.hidden) loadSummaries(); }, CACHE_TTL);
  Logger.info('YOUTUBE_MODULE_INIT_v5.6');
}

export const YouTubeModule = { init, setFilter, loadSummaries };
window.YouTubeModule = YouTubeModule;
