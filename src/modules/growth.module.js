/**
 * Strategy Hub — src/modules/growth.module.js
 * Kişisel gelişim: kitap listesi, hedefler
 * Anayasa: K06 (Soft Delete), K05 (Loglama), K10 (İş Mantığı)
 * Versiyon: 5.1.0 | 2026-03-26
 */

'use strict';

import { Store }  from '../core/store.js';
import { Logger } from '../core/logger.js';
import { UI }     from '../core/ui.js';

const BOOK_KEY = 'books';
const GOAL_KEY = 'goals';

const BOOK_DEFAULTS = [
  { id: 'bk_1', title: 'The Great Reset',           author: 'Klaus Schwab',  pct: 68,  isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'bk_2', title: 'Never Split the Difference', author: 'Chris Voss',    pct: 100, isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'bk_3', title: 'Psychology of Money',        author: 'Morgan Housel', pct: 20,  isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
];
const GOAL_DEFAULTS = [
  { id: 'gl_1', name: 'Kitap okuma',           cur: 1,   tot: 2,   isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'gl_2', name: 'HBR Kursu',             cur: 3,   tot: 6,   isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'gl_3', name: 'Haftalık yürüyüş (dk)', cur: 110, tot: 150, isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'gl_4', name: 'Network toplantıları',  cur: 3,   tot: 5,   isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
];

function _uid(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }
function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _pct(cur, tot) { return tot > 0 ? Math.min(100, Math.max(0, Math.round(cur / tot * 100))) : 0; }

/* ── KİTAPLAR ────────────────────────────────────────────────────────── */

function renderBooks() {
  const el = document.getElementById('books-list');
  if (!el) return;
  const items = Store.getCollection(BOOK_KEY, BOOK_DEFAULTS).filter(b => !b.isDeleted);
  if (!items.length) { el.innerHTML = '<div class="empty-state">Liste boş.</div>'; return; }
  el.innerHTML = items.map(b => {
    const p = Math.min(100, Math.max(0, b.pct ?? 0));
    const clr = p >= 100 ? 'var(--green)' : p > 50 ? 'var(--accent)' : 'var(--gold)';
    return `<div class="li" style="flex-direction:column;align-items:flex-start;gap:6px">
      <div style="display:flex;align-items:center;width:100%">
        <div style="font-size:18px;width:28px;text-align:center;flex-shrink:0">📖</div>
        <div class="li-c" style="flex:1"><div class="name">${_esc(b.title)}</div><div class="sub">${_esc(b.author)}</div></div>
        <button class="del-btn" data-col="books" data-id="${b.id}">Sil</button>
      </div>
      <div style="width:100%">
        <div style="height:4px;background:var(--bg3);border-radius:4px;overflow:hidden"><div style="width:${p}%;height:100%;background:${clr};border-radius:4px"></div></div>
        <div style="font-size:10px;color:var(--text3);margin-top:3px">${p >= 100 ? 'Tamamlandı ✓' : p + '%'}</div>
      </div>
    </div>`;
  }).join('');
}

function addBook(fd) {
  const title = String(fd.title ?? '').trim();
  if (!title) { UI.toast('Kitap adı zorunludur.', 'warning'); return; }
  const item = { id: _uid('bk'), title, author: String(fd.author || 'Yazar').trim(), pct: Math.min(100, Math.max(0, parseInt(fd.pct) || 0)), isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() };
  Store.appendToCollection(BOOK_KEY, item, BOOK_DEFAULTS);
  Logger.audit('BOOK_ADDED', { id: item.id, title: item.title });
  UI.toast(`"${item.title}" eklendi.`, 'success');
  renderBooks();
}

function deleteBook(id) {
  const items = Store.getCollection(BOOK_KEY, BOOK_DEFAULTS);
  const item  = items.find(b => b.id === id);
  if (!item) return;
  Store.softDeleteInCollection(BOOK_KEY, id, 'user', BOOK_DEFAULTS);
  renderBooks();
  UI.toast(`"${item.title}" silindi.`, 'warning', () => { Store.restoreInCollection(BOOK_KEY, id, BOOK_DEFAULTS); renderBooks(); });
}

/* ── HEDEFLER ────────────────────────────────────────────────────────── */

function renderGoals() {
  const el = document.getElementById('goals-list');
  if (!el) return;
  const items = Store.getCollection(GOAL_KEY, GOAL_DEFAULTS).filter(g => !g.isDeleted);
  if (!items.length) { el.innerHTML = '<div class="empty-state">Hedef eklenmedi.</div>'; return; }
  el.innerHTML = items.map(g => {
    const p   = _pct(g.cur, g.tot);
    const clr = p >= 100 ? 'var(--green)' : p > 60 ? 'var(--accent)' : 'var(--gold)';
    return `<div class="li" style="flex-direction:column;align-items:flex-start;gap:6px">
      <div style="display:flex;align-items:center;width:100%">
        <div class="li-c" style="flex:1"><div class="name">${_esc(g.name)}</div><div class="sub">${g.cur} / ${g.tot} · %${p}</div></div>
        <button class="del-btn" data-col="goals" data-id="${g.id}">Sil</button>
      </div>
      <div style="width:100%"><div style="height:4px;background:var(--bg3);border-radius:4px;overflow:hidden"><div style="width:${p}%;height:100%;background:${clr};border-radius:4px"></div></div></div>
    </div>`;
  }).join('');
}

function addGoal(fd) {
  const name = String(fd.name ?? '').trim();
  if (!name) { UI.toast('Hedef adı zorunludur.', 'warning'); return; }
  const item = { id: _uid('gl'), name, cur: parseInt(fd.cur) || 0, tot: parseInt(fd.tot) || 10, isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() };
  Store.appendToCollection(GOAL_KEY, item, GOAL_DEFAULTS);
  Logger.audit('GOAL_ADDED', { id: item.id, name: item.name });
  UI.toast(`"${item.name}" eklendi.`, 'success');
  renderGoals();
}

function deleteGoal(id) {
  const items = Store.getCollection(GOAL_KEY, GOAL_DEFAULTS);
  const item  = items.find(g => g.id === id);
  if (!item) return;
  Store.softDeleteInCollection(GOAL_KEY, id, 'user', GOAL_DEFAULTS);
  renderGoals();
  UI.toast(`"${item.name}" silindi.`, 'warning', () => { Store.restoreInCollection(GOAL_KEY, id, GOAL_DEFAULTS); renderGoals(); });
}

/* ── BAŞLATMA ─────────────────────────────────────────────────────────── */

function init() {
  renderBooks();
  renderGoals();
  document.getElementById('books-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.del-btn[data-col="books"]');
    if (btn) deleteBook(btn.dataset.id);
  });
  document.getElementById('goals-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.del-btn[data-col="goals"]');
    if (btn) deleteGoal(btn.dataset.id);
  });
  Logger.info('GROWTH_MODULE_INIT');
}

export const GrowthModule = { init, addBook, deleteBook, addGoal, deleteGoal, renderBooks, renderGoals };
window.GrowthModule = GrowthModule;
