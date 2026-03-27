/**
 * Stratejik Hub — Merkezi Hata Yöneticisi
 * src/core/error-handler.js
 * Kural: K04 (Hata Yönetimi & Dayanıklılık)
 * Versiyon: 5.1.0 | 2026-03-26
 */

'use strict';

import Logger from './logger.js';

// ─── Bildirim Şiddeti ─────────────────────────────────────────────────────────
const SEVERITY = Object.freeze({
  ERROR:   'error',
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO:    'info',
});

// ─── Toast Bildirimi ──────────────────────────────────────────────────────────
function showToast(message, severity = SEVERITY.INFO, { duration = 4000, action = null } = {}) {
  const container = document.getElementById('toast-container') ?? createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${severity}`;
  toast.setAttribute('role', severity === SEVERITY.ERROR ? 'alert' : 'status');
  toast.innerHTML = `
    <span class="toast-msg">${message}</span>
    ${action ? `<button class="toast-action" onclick="${action.fn}">${action.label}</button>` : ''}
    <button class="toast-close" aria-label="Kapat" onclick="this.parentElement.remove()">✕</button>`;

  container.appendChild(toast);

  // Anayasa K12: 200-300ms animasyon
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  const timer = setTimeout(() => toast.remove(), duration);
  toast.querySelector('.toast-close').addEventListener('click', () => clearTimeout(timer));

  return toast;
}

function createToastContainer() {
  const el = document.createElement('div');
  el.id = 'toast-container';
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return el;
}

// ─── Undo Toast (Anayasa K06) ─────────────────────────────────────────────────
function showUndoToast(message, onUndo) {
  return showToast(message, SEVERITY.WARNING, {
    duration: 30_000,
    action:   { label: 'Geri Al', fn: onUndo.toString() },
  });
}

// ─── Global Hata Dinleyicileri (Anayasa K04) ─────────────────────────────────
function registerGlobalHandlers() {
  window.addEventListener('error', (event) => {
    Logger.error('UNCAUGHT_ERROR', {
      message:  event.message,
      filename: event.filename,
      line:     event.lineno,
      col:      event.colno,
    });
    // Teknik mesajı kullanıcıya gösterme (K04)
    showToast('Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.', SEVERITY.ERROR);
  });

  window.addEventListener('unhandledrejection', (event) => {
    Logger.error('UNHANDLED_PROMISE', { reason: String(event.reason) });
    event.preventDefault(); // Sessiz hata yutma değil — loglandı ve bildirildi
  });
}

const ErrorHandler = {
  SEVERITY,
  showToast,
  showUndoToast,
  registerGlobalHandlers,

  // Bağlantı durumu (Anayasa K04 — offline-first)
  watchConnectivity() {
    const update = () => {
      const online = navigator.onLine;
      const banner = document.getElementById('offline-banner');
      if (banner) banner.style.display = online ? 'none' : 'flex';
      if (!online) {
        Logger.warn('OFFLINE_DETECTED', {});
        showToast('İnternet bağlantısı kesildi. Çevrimdışı modda çalışıyorsunuz.', SEVERITY.WARNING, { duration: 0 });
      } else {
        Logger.info('ONLINE_RESTORED', {});
        showToast('Bağlantı yeniden kuruldu.', SEVERITY.SUCCESS);
      }
    };
    window.addEventListener('online',  update);
    window.addEventListener('offline', update);
  },
};

export default ErrorHandler;
