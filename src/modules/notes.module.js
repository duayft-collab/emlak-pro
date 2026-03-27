/**
 * Strategy Hub — src/modules/notes.module.js
 * Tarihli notlar, hatırlatıcılar, ülke bazlı etiketleme
 * Anayasa: K06, K05, K12
 * Versiyon: 5.4.0 | 2026-03-27
 */

'use strict';
import { Store }  from '../core/store.js';
import { Logger } from '../core/logger.js';
import { UI }     from '../core/ui.js';

const NOTES_KEY = 'user_notes';
const NOTE_DEFAULTS = [
  { id: 'n1', title: 'Nijerya — Akreditif Hatırlatma', body: 'Al-Futtaim akreditifi 15 Nisan\'a kadar geçerli. Yenilenmesi gerekiyor.', tag: 'Nijerya', priority: 'high',   reminder: '2026-04-10', isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
  { id: 'n2', title: 'TABEF 2026 Zirvesi',             body: 'Afrika\'da IV. Türkiye-Afrika Ortaklık Zirvesi — katılım için DEİK ile iletişime geç.', tag: 'Genel', priority: 'medium', reminder: '2026-06-01', isDeleted: false, deletedAt: null, deletedBy: null, createdAt: new Date().toISOString() },
];

const PRIORITY_CLS = { high: 'dn', medium: 'wn', low: 'up' };
const PRIORITY_LBL = { high: 'Kritik', medium: 'Orta', low: 'Düşük' };

function _uid() { return `n${Date.now()}_${Math.random().toString(36).slice(2,5)}`; }
function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function getNotes() {
  return Store.getCollection(NOTES_KEY, NOTE_DEFAULTS).filter(n => !n.isDeleted);
}

function addNote(fd) {
  const title = String(fd.title || '').trim();
  if (!title) { UI.toast('Başlık zorunludur.', 'warning'); return; }
  const note = {
    id: _uid(), title,
    body:     String(fd.body || '').trim(),
    tag:      String(fd.tag || 'Genel'),
    priority: String(fd.priority || 'medium'),
    reminder: String(fd.reminder || ''),
    isDeleted: false, deletedAt: null, deletedBy: null,
    createdAt: new Date().toISOString(),
  };
  Store.appendToCollection(NOTES_KEY, note, NOTE_DEFAULTS);
  Logger.audit('NOTE_ADDED', { id: note.id, title: note.title });
  UI.toast(`"${title}" eklendi.`, 'success');
  renderNotes();
}

function deleteNote(id) {
  const notes = getNotes();
  const note  = notes.find(n => n.id === id);
  if (!note) return;
  Store.softDeleteInCollection(NOTES_KEY, id, 'user', NOTE_DEFAULTS);
  renderNotes();
  UI.toast(`"${note.title}" silindi.`, 'warning',
    () => { Store.restoreInCollection(NOTES_KEY, id, NOTE_DEFAULTS); renderNotes(); });
}

function renderNotes(filter = '') {
  const el = document.getElementById('notes-list');
  if (!el) return;
  let notes = getNotes();
  if (filter) notes = notes.filter(n => n.tag === filter || n.priority === filter);
  notes.sort((a,b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return (p[a.priority] - p[b.priority]) || new Date(a.reminder||'9999') - new Date(b.reminder||'9999');
  });

  const today = new Date(); today.setHours(0,0,0,0);
  if (!notes.length) { el.innerHTML = '<div class="empty-state">Not bulunamadı.</div>'; return; }

  el.innerHTML = notes.map(n => {
    const rem    = n.reminder ? new Date(n.reminder) : null;
    const days   = rem ? Math.ceil((rem - today) / 86400000) : null;
    const urgent = days !== null && days <= 7;
    return `<div style="padding:12px;background:var(--bg3);border-radius:10px;margin-bottom:8px;border:1px solid ${urgent ? 'rgba(220,38,38,.25)' : 'var(--sidebar-border)'}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px">
        <div>
          <span style="font-size:12px;font-weight:700;color:var(--text)">${_esc(n.title)}</span>
          <span class="bdg ${PRIORITY_CLS[n.priority]}" style="margin-left:6px">${PRIORITY_LBL[n.priority]}</span>
          <span style="font-size:9px;color:var(--text3);margin-left:6px">${_esc(n.tag)}</span>
        </div>
        <button class="del-btn" onclick="NotesModule.deleteNote('${n.id}')">Sil</button>
      </div>
      ${n.body ? `<div style="font-size:11px;color:var(--text2);line-height:1.5;margin-bottom:6px">${_esc(n.body)}</div>` : ''}
      ${rem ? `<div style="font-size:10px;font-weight:700;color:${urgent ? 'var(--red)' : 'var(--text3)'}">
        📅 ${rem.toLocaleDateString('tr-TR')} ${days === 0 ? '— BUGÜN!' : days < 0 ? `— ${Math.abs(days)} gün geçti` : `— ${days} gün kaldı`}
      </div>` : ''}
    </div>`;
  }).join('');
}

/* Yaklaşan hatırlatıcıları dashboard'da göster */
function checkReminders() {
  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = getNotes().filter(n => {
    if (!n.reminder) return false;
    const rem = new Date(n.reminder);
    return (rem - today) / 86400000 <= 3;
  });
  upcoming.forEach(n => {
    const rem  = new Date(n.reminder);
    const days = Math.ceil((rem - today) / 86400000);
    const msg  = days <= 0 ? `⏰ BUGÜN: ${n.title}` : `⏰ ${days} gün: ${n.title}`;
    UI.toast(msg, 'warning');
  });
}

function init() {
  renderNotes();
  checkReminders();
  Logger.info('NOTES_MODULE_INIT');
}

export const NotesModule = { init, addNote, deleteNote, renderNotes, checkReminders };
window.NotesModule = NotesModule;
