/**
 * Strategy Hub — src/tests/fx.test.js
 * FX modülü unit testleri
 * Anayasa: K11 (Test & Kalite Güvence) — min. 3 senaryo per kritik fonksiyon
 * Versiyon: 5.1.0 | 2026-03-26
 *
 * Çalıştırma: npx vitest run src/tests/fx.test.js
 */

'use strict';

// --- Test yardımcıları (framework bağımlılığı olmadan) ---
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { console.log(`  ✓ ${msg}`); passed++; }
  else           { console.error(`  ✗ ${msg}`); failed++; }
}

function test(name, fn) {
  console.log(`\n[TEST] ${name}`);
  try { fn(); }
  catch (err) { console.error(`  ✗ Hata fırlattı: ${err.message}`); failed++; }
}

// --- Saf fonksiyonlar (import gerekmez) ---

// Para birimi parse — fx.module.js içindeki _parseMoneyStr mantığının izole kopyası
function parseMoneyStr(str) {
  const s = String(str).replace(/[$,\s]/g, '').toUpperCase();
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  if (s.endsWith('B')) return n * 1_000_000_000;
  if (s.endsWith('M')) return n * 1_000_000;
  if (s.endsWith('K')) return n * 1_000;
  return n;
}

// Gram altın hesabı
function calcGoldTL(onsUSD, usdTRY) {
  if (!onsUSD || !usdTRY) return 0;
  return Math.round(onsUSD * usdTRY / 31.1035);
}

// XSS sanitize
function sanitize(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- TEST BLOKLARI ---

// Anayasa K11 — Para birimi parse (K10 — Finansal hassasiyet)
test('parseMoneyStr — happy path', () => {
  assert(parseMoneyStr('$1.8M')   === 1_800_000, '$1.8M → 1.800.000');
  assert(parseMoneyStr('$680K')   === 680_000,   '$680K → 680.000');
  assert(parseMoneyStr('$2.4B')   === 2_400_000_000, '$2.4B → 2.400.000.000');
  assert(parseMoneyStr('500000')  === 500_000,   'Düz sayı geçer');
});

test('parseMoneyStr — edge case', () => {
  assert(parseMoneyStr('$0')      === 0,      'Sıfır dolar');
  assert(parseMoneyStr('$0.5M')   === 500_000, 'Ondalıklı M');
  assert(parseMoneyStr('0.001B')  === 1_000_000, 'Küçük B değeri');
});

test('parseMoneyStr — error case', () => {
  assert(parseMoneyStr('')        === 0, 'Boş string → 0');
  assert(parseMoneyStr('abc')     === 0, 'Geçersiz string → 0');
  assert(parseMoneyStr(null)      === 0, 'null → 0');
  assert(parseMoneyStr(undefined) === 0, 'undefined → 0');
});

// Gram altın hesabı (K10 — Finansal hesaplama doğruluğu)
test('calcGoldTL — happy path', () => {
  const result = calcGoldTL(2650, 44.18);
  assert(result > 0, 'Pozitif sonuç');
  assert(typeof result === 'number', 'Sayı tipinde');
  // 2650 * 44.18 / 31.1035 ≈ 3766 TL (gram altın)
  assert(result > 3700 && result < 3900, `Beklenen aralıkta: ${result}`);
});

test('calcGoldTL — edge case', () => {
  assert(calcGoldTL(0, 44.18)    === 0, 'Altın 0 → 0 TL');
  assert(calcGoldTL(2650, 0)     === 0, 'Kur 0 → 0 TL');
  assert(Number.isFinite(calcGoldTL(2650, 44.18)), 'Sonuç sonlu sayı');
});

test('calcGoldTL — error case', () => {
  assert(calcGoldTL(null, 44.18) === 0, 'null altın fiyatı → 0');
  assert(calcGoldTL(2650, null)  === 0, 'null kur → 0');
});

// XSS sanitize (K02 — Güvenlik)
test('sanitize — happy path', () => {
  assert(sanitize('Merhaba')          === 'Merhaba',    'Temiz string değişmez');
  assert(sanitize('1+1=2')           === '1+1=2',       'Matematik işaretleri güvenli');
  assert(sanitize('İstanbul')        === 'İstanbul',    'Türkçe karakter güvenli');
});

test('sanitize — XSS vektörleri', () => {
  assert(!sanitize('<script>alert(1)</script>').includes('<script>'), 'Script tagi engellendi');
  assert(!sanitize('<img onerror="xss()">').includes('<img'),         'Img tagi engellendi');
  assert(!sanitize('"onclick="xss()"').includes('"onclick'),         'Event handler engellendi');
});

test('sanitize — edge case', () => {
  assert(sanitize('')        === '',    'Boş string');
  assert(sanitize(null)      === 'null','null string\'e dönüşür');
  assert(sanitize(42)        === '42',  'Sayı stringe dönüşür');
});

// --- SONUÇ ---
console.log(`\n${'─'.repeat(40)}`);
console.log(`Toplam: ${passed + failed} | ✓ ${passed} başarılı | ✗ ${failed} başarısız`);
if (failed > 0) process.exit(1);
