/**
 * Strategy Hub — src/core/store.js
 * Veri soyutlama katmanı — localStorage adaptörü
 * Veriyi buradan okuyup yazarak backend değişikliğine hazır hale gelir (Anayasa K16).
 * Anayasa: K03 (Veri Bütünlüğü), K04 (Hata Yönetimi), K16 (Ölçeklenebilirlik)
 * Versiyon: 5.1.0 | 2026-03-26
 */

'use strict';

import { Logger } from './logger.js';

const NS = 'sh:store:'; // Namespace — diğer localStorage anahtarlarıyla çakışmaz

/* ── TEMEL ADAPTÖR ───────────────────────────────────────────────────── */

function get(key) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    Logger.error('STORE_READ_FAILED', { key, message: err.message });
    return null;
  }
}

function set(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch (err) {
    // QuotaExceededError — depolama dolu
    Logger.error('STORE_WRITE_FAILED', { key, message: err.message });
    return false;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(NS + key);
    return true;
  } catch (err) {
    Logger.error('STORE_DELETE_FAILED', { key, message: err.message });
    return false;
  }
}

function keys() {
  try {
    const prefix = NS;
    return Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .map(k => k.slice(prefix.length));
  } catch (_) { return []; }
}

/* ── KOLEKSİYON YARDIMCILARI ─────────────────────────────────────────── */
// Anayasa K03 — Veri bütünlüğü: id garantisi, timestamp, schema koruması

function getCollection(key, defaults = []) {
  const data = get(key);
  return Array.isArray(data) ? data : defaults;
}

function setCollection(key, items) {
  Logger.audit(`STORE_COLLECTION_SAVE`, { key, count: items.length });
  return set(key, items);
}

function appendToCollection(key, item, defaults = []) {
  const items = getCollection(key, defaults);
  items.push(item);
  return setCollection(key, items);
}

function updateInCollection(key, id, patch, defaults = []) {
  const items = getCollection(key, defaults);
  const idx = items.findIndex(x => x.id === id);
  if (idx === -1) {
    Logger.warn('STORE_UPDATE_NOT_FOUND', { key, id });
    return false;
  }
  // Anayasa K10 — Atomicity: tüm nesne değiştirilir, kısmi güncelleme değil
  items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
  Logger.audit('STORE_ITEM_UPDATED', { key, id });
  return setCollection(key, items);
}

// Anayasa K06 — Soft delete: fiziksel silme YASAK
function softDeleteInCollection(key, id, userId = 'user', defaults = []) {
  return updateInCollection(key, id, {
    isDeleted:  true,
    deletedAt:  new Date().toISOString(),
    deletedBy:  userId,
  }, defaults);
}

function restoreInCollection(key, id, defaults = []) {
  return updateInCollection(key, id, {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  }, defaults);
}

/* ── KULLANICI TERCİHLERİ ────────────────────────────────────────────── */

function getPreference(prefKey, fallback = null) {
  const prefs = get('preferences') ?? {};
  return prefs[prefKey] !== undefined ? prefs[prefKey] : fallback;
}

function setPreference(prefKey, value) {
  const prefs = get('preferences') ?? {};
  prefs[prefKey] = value;
  return set('preferences', prefs);
}

/* ── DEPOLAMA BOYUTU ─────────────────────────────────────────────────── */

function estimateUsedBytes() {
  try {
    let total = 0;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(NS)) {
        total += (localStorage.getItem(key) ?? '').length * 2; // UTF-16 ~ 2 byte/char
      }
    }
    return total;
  } catch (_) { return 0; }
}

export const Store = {
  get, set, remove, keys,
  getCollection, setCollection, appendToCollection,
  updateInCollection, softDeleteInCollection, restoreInCollection,
  getPreference, setPreference,
  estimateUsedBytes,
};
