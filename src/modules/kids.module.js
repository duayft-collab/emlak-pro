/**
 * Strategy Hub — src/modules/kids.module.js
 * Çocuk gelişimi aktivite takibi
 * Anayasa: K06 (Soft Delete), K05 (Loglama)
 * Versiyon: 5.1.0 | 2026-03-26
 */

'use strict';

import { Store }  from '../core/store.js';
import { Logger } from '../core/logger.js';
import { UI }     from '../core/ui.js';

const KIDS_KEY = 'kids';
const DEFAULTS = [
  { id: 'kd_1', act: 'Kodlama Atölyesi', day: 'Cumartesi 10:00', emoji: '💻', isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'kd_2', act: 'Doğa Yürüyüşü',   day: 'Cumartesi 15:00', emoji: '🌳', isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'kd_3', act: 'Satranç Turnuvası',day: 'Pazar 11:00',     emoji: '♟', isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'kd_4', act: 'Yüzme',            day: 'Salı 17:30',      emoji: '🏊', isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
];

const SKILLS = [
  { label: 'Kodlama (Scratch)', val: 4, max: 5,  color: 'var(--accent)'  },
  { label: 'Python',            val: 2, max: 8,  color: 'var(--accent2)' },
  { label: 'Satranç',          val: 12,max: 20, color: 'var(--gold)'    },
  { label: 'Fiziksel',         val: 5, max: 6,  color: 'var(--green)'   },
];

function _uid(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }
function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderActivities() {
  const el  = document.getElementById('kids-list');
  const cnt = document.getElementById('kids-cnt');
  if (!el) return;
  const items = Store.getCollection(KIDS_KEY, DEFAULTS).filter(k => !k.isDeleted);
  if (cnt) cnt.textContent = String(items.length);
  if (!items.length) { el.innerHTML = '<div class="empty-state">Aktivite yok.</div>'; return; }
  el.innerHTML = items.map(a => `
    <div class="li">
      <div style="font-size:18px;width:28px;text-align:center">${_esc(a.emoji || '⭐')}</div>
      <div class="li-c" style="flex:1"><div class="name">${_esc(a.act)}</div><div class="sub">${_esc(a.day)}</div></div>
      <button class="del-btn" data-id="${a.id}">Sil</button>
    </div>`).join('');
}

function renderSkills() {
  const el = document.getElementById('kids-progress');
  if (!el) return;
  el.innerHTML = SKILLS.map(s => {
    const p = Math.round(s.val / s.max * 100);
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:11px;color:var(--text3);min-width:140px">${s.label}</span>
      <div style="flex:1;height:4px;background:var(--bg3);border-radius:4px;overflow:hidden">
        <div style="width:${p}%;height:100%;background:${s.color};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;font-family:var(--mono);color:var(--text3);min-width:36px;text-align:right">${s.val}/${s.max}</span>
    </div>`;
  }).join('');
}

function addActivity(fd) {
  const act = String(fd.act ?? '').trim();
  if (!act) { UI.toast('Aktivite adı zorunludur.', 'warning'); return; }
  const item = { id: _uid('kd'), act, day: String(fd.day || 'Belirtilmedi').trim(), emoji: String(fd.emoji || '⭐').trim(), isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() };
  Store.appendToCollection(KIDS_KEY, item, DEFAULTS);
  Logger.audit('KIDS_ACTIVITY_ADDED', { id: item.id, act: item.act });
  UI.toast(`"${item.act}" eklendi.`, 'success');
  renderActivities();
}

function deleteActivity(id) {
  const items = Store.getCollection(KIDS_KEY, DEFAULTS);
  const item  = items.find(k => k.id === id);
  if (!item) return;
  Store.softDeleteInCollection(KIDS_KEY, id, 'user', DEFAULTS);
  renderActivities();
  UI.toast(`"${item.act}" silindi.`, 'warning', () => { Store.restoreInCollection(KIDS_KEY, id, DEFAULTS); renderActivities(); });
}

function init() {
  renderActivities();
  renderSkills();
  document.getElementById('kids-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.del-btn[data-id]');
    if (btn) deleteActivity(btn.dataset.id);
  });
  Logger.info('KIDS_MODULE_INIT');
}

export const KidsModule = { init, addActivity, deleteActivity };
window.KidsModule = KidsModule;
