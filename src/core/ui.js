/**
 * Strategy Hub — src/core/ui.js
 * Paylaşılan UI yardımcıları: toast, modal, skeleton, tema, saat
 * Anayasa: K04 (Hata Bildirimi), K06 (Undo/Custom Modal), K12 (UI/UX)
 * Versiyon: 5.1.0 | 2026-03-26
 */

'use strict';

import { APP_CONFIG } from '../../config/app.config.js';
import { Logger }     from './logger.js';

/* ── TOAST ─────────────────────────────────────────────────────────────── */

const SEVERITY_ICON = Object.freeze({ error: '✕', success: '✓', warning: '!', info: 'i' });

let _undoQueue = [];

function toast(message, severity = 'info', undoFn = null) {
  const container = _ensureToastContainer();
  const el = document.createElement('div');
  el.className = `toast toast--${severity}`;
  el.setAttribute('role', severity === 'error' ? 'alert' : 'status');
  el.setAttribute('aria-live', 'polite');

  el.innerHTML = `
    <span class="toast__icon" aria-hidden="true">${SEVERITY_ICON[severity] ?? 'i'}</span>
    <span class="toast__msg">${_sanitize(message)}</span>
    ${undoFn ? '<button class="toast__undo">Geri Al</button>' : ''}
    <button class="toast__close" aria-label="Kapat">✕</button>`;

  if (undoFn) {
    _trackUndo(undoFn);
    el.querySelector('.toast__undo').addEventListener('click', () => {
      undoFn();
      el.remove();
      Logger.audit('UNDO_TRIGGERED', { message });
    });
  }

  el.querySelector('.toast__close').addEventListener('click', () => el.remove());
  container.appendChild(el);
  setTimeout(() => el.classList.add('toast--visible'), 16);
  setTimeout(() => { el.classList.remove('toast--visible'); setTimeout(() => el.remove(), 300); }, 4000);
}

function _trackUndo(fn) {
  _undoQueue.push(fn);
  if (_undoQueue.length > APP_CONFIG.UNDO_HISTORY_LIMIT) _undoQueue.shift();
}

function _ensureToastContainer() {
  let el = document.getElementById('toast-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-container';
    el.setAttribute('aria-label', 'Bildirimler');
    document.body.appendChild(el);
  }
  return el;
}

/* ── MODAL ─────────────────────────────────────────────────────────────── */
// Anayasa K06 & K12 — native confirm/alert/prompt YASAK

function confirm(options) {
  return new Promise(resolve => {
    const { title = 'Emin misiniz?', message = '', confirmLabel = 'Evet', cancelLabel = 'İptal', danger = false } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-title');

    overlay.innerHTML = `
      <div class="modal">
        <h3 class="modal__title" id="modal-title">${_sanitize(title)}</h3>
        ${message ? `<p class="modal__body">${_sanitize(message)}</p>` : ''}
        <div class="modal__actions">
          <button class="btn-secondary modal__cancel">${_sanitize(cancelLabel)}</button>
          <button class="${danger ? 'btn-danger' : 'btn-primary'} modal__confirm">${_sanitize(confirmLabel)}</button>
        </div>
      </div>`;

    const cleanup = (result) => { overlay.remove(); resolve(result); };
    overlay.querySelector('.modal__confirm').addEventListener('click', () => cleanup(true));
    overlay.querySelector('.modal__cancel').addEventListener('click',  () => cleanup(false));
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') cleanup(false); });
    overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false); });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-overlay--visible'));
    overlay.querySelector('.modal__confirm').focus();
  });
}

/* ── TEMA ─────────────────────────────────────────────────────────────── */

const THEME_KEY = 'sh:theme';

function applyTheme(theme) {
  document.documentElement.dataset.t = theme;
  localStorage.setItem(THEME_KEY, theme);
  document.querySelectorAll('.tb2').forEach(btn => {
    btn.classList.toggle('act', btn.dataset.theme === theme);
  });
  Logger.info('THEME_CHANGED', { theme });
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) ?? '';
  applyTheme(saved);
  document.getElementById('theme-switcher')?.addEventListener('click', e => {
    const btn = e.target.closest('.tb2');
    if (btn) applyTheme(btn.dataset.theme ?? '');
  });
}

/* ── SAAT ─────────────────────────────────────────────────────────────── */

function initClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const tick = () => { el.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
  tick();
  setInterval(tick, 1000);
}

/* ── YARDIMCILAR ────────────────────────────────────────────────────────── */

// Anayasa K02 — XSS: innerHTML'e gitmeden önce sanitize
function _sanitize(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setVal(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setBadge(id, text, cls) {
  const el = document.getElementById(id);
  if (el) { el.textContent = text; el.className = `pc-chg ${cls}`; }
}

function debounce(fn, ms = APP_CONFIG.DEBOUNCE_SEARCH_MS) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export const UI = { toast, confirm, applyTheme, initTheme, initClock, setVal, setBadge, debounce };
