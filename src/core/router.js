/**
 * Strategy Hub — src/core/router.js
 * Hybrid SPA router
 * Anayasa: K01, K04, K07
 * Versiyon: 5.1.2 | 2026-03-26
 */

'use strict';

import { APP_CONFIG } from '../../config/app.config.js';
import { Logger }     from './logger.js';

const _pageCache = new Map();

async function _fetchPage(pageUrl) {
  if (_pageCache.has(pageUrl)) return _pageCache.get(pageUrl);
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), APP_CONFIG.API_TIMEOUT_MS);
  try {
    const res = await fetch(pageUrl, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    _pageCache.set(pageUrl, html);
    return html;
  } catch (err) {
    clearTimeout(tid);
    Logger.error('PAGE_FETCH_FAILED', { pageUrl, message: err.message });
    throw err;
  }
}

function _showSkeleton(container) {
  container.innerHTML = `
    <div class="skeleton-wrap" aria-busy="true">
      <div class="skeleton-hero"></div>
      <div class="skeleton-row">
        <div class="skeleton-card"></div><div class="skeleton-card"></div>
        <div class="skeleton-card"></div><div class="skeleton-card"></div>
      </div>
      <div class="skeleton-row" style="grid-template-columns:1fr 1fr">
        <div class="skeleton-block"></div><div class="skeleton-block"></div>
      </div>
    </div>`;
}

function _showError(container, tabId) {
  container.innerHTML = `
    <div class="page-error">
      <div class="page-error__icon">⚠</div>
      <h2 class="page-error__title">Sayfa yüklenemedi</h2>
      <p class="page-error__desc">${tabId} modülü şu an kullanılamıyor.</p>
      <button class="btn-primary" onclick="HubRouter.navigate('${tabId}')">Tekrar Dene</button>
    </div>`;
}

function _injectScripts(container) {
  // fetch ile eklenen script tag'ları çalışmaz — klon ile yeniden inject et
  container.querySelectorAll('script').forEach(old => {
    const s = document.createElement('script');
    s.type = 'module';

    // data-module varsa src olarak kullan (absolute path)
    if (old.dataset.module) {
      s.src = old.dataset.module;
    } else if (old.textContent.trim()) {
      // Inline script — blob URL ile çalıştır (module import'ları desteklensin)
      const blob = new Blob([old.textContent], { type: 'text/javascript' });
      s.src = URL.createObjectURL(blob);
    } else {
      return;
    }
    old.replaceWith(s);
  });
}

function _setActiveNav(tabId) {
  document.querySelectorAll('.ni[data-tab]').forEach(btn => {
    const active = btn.dataset.tab === tabId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
  });
  const titleEl = document.getElementById('page-title');
  const tab = APP_CONFIG.TABS.find(t => t.id === tabId);
  if (titleEl && tab) titleEl.textContent = tab.label;
}

function _updateUrl(tabId) {
  const url = new URL(window.location.href);
  url.hash = tabId;
  window.history.pushState({ tabId }, '', url.toString());
}

async function navigate(tabId) {
  const tab = APP_CONFIG.TABS.find(t => t.id === tabId);
  if (!tab) { Logger.warn('ROUTER_UNKNOWN_TAB', { tabId }); return; }

  const container = document.getElementById('page-outlet');
  if (!container) return;

  _setActiveNav(tabId);
  _updateUrl(tabId);
  _showSkeleton(container);
  Logger.info('PAGE_NAVIGATE', { tabId });

  try {
    const html   = await _fetchPage(tab.page);
    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, 'text/html');
    const body   = doc.querySelector('.page-content') ? doc.body : doc.body;
    container.innerHTML = body.innerHTML;
    _injectScripts(container);
    container.setAttribute('tabindex', '-1');
    container.focus({ preventScroll: true });
  } catch (_) {
    _showError(container, tabId);
  }
}

function _resolveInitialTab() {
  const hash  = window.location.hash.replace('#', '');
  const valid = APP_CONFIG.TABS.find(t => t.id === hash);
  return valid ? hash : APP_CONFIG.DEFAULT_TAB;
}

function init() {
  window.addEventListener('popstate', e => navigate(e.state?.tabId || _resolveInitialTab()));
  document.getElementById('sidebar')?.addEventListener('click', e => {
    const btn = e.target.closest('.ni[data-tab]');
    if (btn) { e.preventDefault(); navigate(btn.dataset.tab); }
  });
  navigate(_resolveInitialTab());
  Logger.info('ROUTER_INIT', { version: APP_CONFIG.VERSION });
}

export const HubRouter = { init, navigate };
window.HubRouter = HubRouter;
