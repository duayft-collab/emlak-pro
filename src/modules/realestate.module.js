/**
 * Strategy Hub — src/modules/realestate.module.js
 * Gayrimenkul & pipeline — artık Store üzerinden kalıcı
 * Anayasa: K06 (Soft Delete), K05 (Loglama), K10 (İş Mantığı), K16 (Store soyutlama)
 * Versiyon: 5.2.0 | 2026-03-26
 */

'use strict';

import { Store }  from '../core/store.js';
import { Logger } from '../core/logger.js';
import { UI }     from '../core/ui.js';

/* ── STORE ANAHTARLARI ───────────────────────────────────────────────── */
const RE_KEY   = 're_portfolio';
const PIPE_KEY = 'biz_pipeline';

/* ── VARSAYILAN VERİ ─────────────────────────────────────────────────── */
const RE_DEFAULTS = [
  { id: 're_1', name: 'Kadıköy 2+1',       val: '2,400,000 TL', rent: '14,000 TL/ay', type: 'Konut',
    isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 're_2', name: 'Gebze Lojistik Depo', val: '8,200,000 TL', rent: '52,000 TL/ay', type: 'Lojistik Depo',
    isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
];
const PIPE_DEFAULTS = [
  { id: 'pipe_1', name: 'Al-Futtaim Group', val: '$1.8M', stage: 'Teklif',   isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'pipe_2', name: 'Siemens AG',       val: '$2.4M', stage: 'Müzakere', isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'pipe_3', name: 'Toyota Türkiye',   val: '$680K', stage: 'Sunum',    isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
];

/* ── YARDIMCILAR ─────────────────────────────────────────────────────── */
function _uid(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }
function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Anayasa K10 — Finansal parse: "$1.8M", "$680K" → tam sayı
function _parseMoney(str) {
  const s = String(str).replace(/[$,\s]/g, '').toUpperCase();
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  if (s.endsWith('B')) return n * 1_000_000_000;
  if (s.endsWith('M')) return n * 1_000_000;
  if (s.endsWith('K')) return n * 1_000;
  return n;
}

/* ── GAYRİMENKUL ─────────────────────────────────────────────────────── */

function renderRE() {
  const el = document.getElementById('re-list');
  if (!el) return;
  const items = Store.getCollection(RE_KEY, RE_DEFAULTS).filter(x => !x.isDeleted);
  if (!items.length) { el.innerHTML = '<div class="empty-state">Henüz mülk yok.</div>'; return; }
  el.innerHTML = items.map(r => `
    <div class="li">
      <div class="li-c" style="flex:1">
        <div class="name">${_esc(r.name)}</div>
        <div class="sub">${_esc(r.type)} · ${_esc(r.val)} · Kira: ${_esc(r.rent)}</div>
      </div>
      <button class="del-btn" data-id="${r.id}">Sil</button>
    </div>`).join('');
}

function addRE(fd) {
  const name = String(fd.name ?? '').trim();
  if (!name) { UI.toast('Mülk adı zorunludur.', 'warning'); return; }
  const item = { id: _uid('re'), name, val: String(fd.val||'—').trim(), rent: String(fd.rent||'—').trim(),
    type: String(fd.type||'Konut'), isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() };
  Store.appendToCollection(RE_KEY, item, RE_DEFAULTS);
  Logger.audit('RE_ADDED', { id: item.id, name: item.name });
  UI.toast(`"${item.name}" portföye eklendi.`, 'success');
  renderRE();
}

function deleteRE(id) {
  const items = Store.getCollection(RE_KEY, RE_DEFAULTS);
  const item  = items.find(x => x.id === id);
  if (!item) return;
  Store.softDeleteInCollection(RE_KEY, id, 'user', RE_DEFAULTS);
  Logger.audit('RE_DELETED', { id, name: item.name });
  renderRE();
  UI.toast(`"${item.name}" silindi.`, 'warning', () => {
    Store.restoreInCollection(RE_KEY, id, RE_DEFAULTS);
    renderRE();
  });
}

/* ── PIPELINE ─────────────────────────────────────────────────────────── */
const STAGE_CLS = { Keşfet: 'nt', Sunum: 'te', Müzakere: 'tu', Teklif: 'up', Kapandı: 'gd' };

function renderPipeline() {
  const el    = document.getElementById('pipeline-list');
  const total = document.getElementById('pipe-total');
  const count = document.getElementById('pipe-count');
  if (!el) return;
  const items = Store.getCollection(PIPE_KEY, PIPE_DEFAULTS).filter(x => !x.isDeleted);
  if (!items.length) {
    el.innerHTML = '<div class="empty-state">Pipeline boş.</div>';
    if (total) total.textContent = '$0'; if (count) count.textContent = '0'; return;
  }
  el.innerHTML = items.map(p => `
    <div class="li">
      <div class="li-c" style="flex:1">
        <div class="name">${_esc(p.name)}</div>
        <div class="sub">${_esc(p.val)} · <span class="bdg ${STAGE_CLS[p.stage]||'nt'}">${_esc(p.stage)}</span></div>
      </div>
      <button class="del-btn" data-id="${p.id}">Sil</button>
    </div>`).join('');
  const tot = items.reduce((a, p) => a + _parseMoney(p.val), 0);
  if (total) total.textContent = `$${(tot / 1_000_000).toFixed(1)}M`;
  if (count) count.textContent = String(items.length);
}

function addPipeline(fd) {
  const name = String(fd.name ?? '').trim();
  if (!name) { UI.toast('Şirket adı zorunludur.', 'warning'); return; }
  const item = { id: _uid('pipe'), name, val: String(fd.val||'?').trim(), stage: String(fd.stage||'Keşfet'),
    isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() };
  Store.appendToCollection(PIPE_KEY, item, PIPE_DEFAULTS);
  Logger.audit('PIPELINE_ADDED', { id: item.id, name: item.name });
  UI.toast(`"${item.name}" pipeline'a eklendi.`, 'success');
  renderPipeline();
}

function deletePipeline(id) {
  const items = Store.getCollection(PIPE_KEY, PIPE_DEFAULTS);
  const item  = items.find(x => x.id === id);
  if (!item) return;
  Store.softDeleteInCollection(PIPE_KEY, id, 'user', PIPE_DEFAULTS);
  Logger.audit('PIPELINE_DELETED', { id, name: item.name });
  renderPipeline();
  UI.toast(`"${item.name}" silindi.`, 'warning', () => {
    Store.restoreInCollection(PIPE_KEY, id, PIPE_DEFAULTS);
    renderPipeline();
  });
}

/* ── EVENT DELEGATION ─────────────────────────────────────────────────── */
function _bindDel(containerId, deleteFn) {
  document.getElementById(containerId)?.addEventListener('click', e => {
    const btn = e.target.closest('.del-btn[data-id]');
    if (btn) deleteFn(btn.dataset.id);
  });
}

/* ── BAŞLATMA ─────────────────────────────────────────────────────────── */
function init() {
  renderRE();
  renderPipeline();
  _bindDel('re-list',       deleteRE);
  _bindDel('pipeline-list', deletePipeline);
  Logger.info('REALESTATE_MODULE_INIT_v5.2');
}

export const REModule = { init, addRE, deleteRE, addPipeline, deletePipeline, renderRE, renderPipeline };
window.REModule = REModule;
