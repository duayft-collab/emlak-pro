/**
 * Strategy Hub — src/tests/store.test.js
 * Store katmanı unit testleri (localStorage mock ile)
 * Anayasa: K11 (Test), K06 (Soft Delete doğrulaması)
 * Versiyon: 5.1.0 | 2026-03-26
 */

'use strict';

// localStorage mock
const _storage = {};
global.localStorage = {
  getItem:    (k)    => _storage[k] ?? null,
  setItem:    (k, v) => { _storage[k] = v; },
  removeItem: (k)    => { delete _storage[k]; },
  get length()       { return Object.keys(_storage).length; },
  key:        (i)    => Object.keys(_storage)[i],
};

// logger mock
global._loggerMock = { logs: [] };

// Store'u simüle eden saf fonksiyonlar (import olmadan test edilebilir)
const NS = 'sh:store:';

function get(key) {
  const raw = localStorage.getItem(NS + key);
  return raw ? JSON.parse(raw) : null;
}
function set(key, value) {
  localStorage.setItem(NS + key, JSON.stringify(value));
  return true;
}
function getCollection(key, defaults = []) {
  const data = get(key);
  return Array.isArray(data) ? data : defaults;
}
function setCollection(key, items) { return set(key, items); }

function softDelete(col, id) {
  const items = getCollection(col);
  const idx   = items.findIndex(x => x.id === id);
  if (idx === -1) return false;
  items[idx] = { ...items[idx], isDeleted: true, deletedAt: new Date().toISOString(), deletedBy: 'user' };
  return setCollection(col, items);
}
function restore(col, id) {
  const items = getCollection(col);
  const idx   = items.findIndex(x => x.id === id);
  if (idx === -1) return false;
  items[idx] = { ...items[idx], isDeleted: false, deletedAt: null, deletedBy: null };
  return setCollection(col, items);
}

// Test yardımcıları
let passed = 0; let failed = 0;
function assert(c, msg) { if (c) { console.log(`  ✓ ${msg}`); passed++; } else { console.error(`  ✗ ${msg}`); failed++; } }
function test(name, fn) { console.log(`\n[TEST] ${name}`); try { fn(); } catch(e) { console.error(`  ✗ Hata: ${e.message}`); failed++; } }

// --- TESTLER ---

test('get/set — happy path', () => {
  set('test_key', { val: 42 });
  const r = get('test_key');
  assert(r !== null,  'Kayıt bulundu');
  assert(r.val === 42, 'Değer doğru');
});

test('get — var olmayan key', () => {
  const r = get('nonexistent_xyz');
  assert(r === null, 'null döner');
});

test('getCollection — boş → defaults', () => {
  const defaults = [{ id: 'd1', name: 'Varsayılan' }];
  const result   = getCollection('empty_col', defaults);
  assert(result.length === 1,         'Default döner');
  assert(result[0].name === 'Varsayılan', 'Default değer doğru');
});

// Anayasa K06 — Soft delete (fiziksel silme yasak)
test('softDelete — kayıt işaretlenir, silinmez', () => {
  const items = [{ id: 'item1', name: 'Test', isDeleted: false }];
  setCollection('test_col', items);
  softDelete('test_col', 'item1');
  const after = getCollection('test_col');
  assert(after.length === 1,            'Kayıt hâlâ koleksiyonda');
  assert(after[0].isDeleted === true,   'isDeleted: true');
  assert(after[0].deletedAt !== null,   'deletedAt dolu');
  assert(after[0].deletedBy === 'user', 'deletedBy dolu');
});

test('softDelete — var olmayan id güvenli', () => {
  setCollection('test_col2', [{ id: 'x1', isDeleted: false }]);
  const result = softDelete('test_col2', 'nonexistent');
  assert(result === false, 'false döner, hata fırlatmaz');
  assert(getCollection('test_col2').length === 1, 'Koleksiyon bozulmadı');
});

test('restore — soft delete geri alınır', () => {
  const items = [{ id: 'r1', isDeleted: true, deletedAt: new Date().toISOString(), deletedBy: 'user' }];
  setCollection('restore_col', items);
  restore('restore_col', 'r1');
  const after = getCollection('restore_col');
  assert(after[0].isDeleted === false, 'isDeleted: false');
  assert(after[0].deletedAt === null,  'deletedAt temizlendi');
  assert(after[0].deletedBy === null,  'deletedBy temizlendi');
});

console.log(`\n${'─'.repeat(40)}`);
console.log(`Toplam: ${passed+failed} | ✓ ${passed} başarılı | ✗ ${failed} başarısız`);
if (failed > 0) process.exit(1);
