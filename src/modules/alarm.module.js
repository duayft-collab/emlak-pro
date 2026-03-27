/**
 * Strategy Hub — src/modules/alarm.module.js
 * Fiyat & değişim alarm sistemi
 * Kullanıcı eşik değeri belirler → koşul sağlandığında toast + ses + bildirim
 * Anayasa: K04, K05, K06
 * Versiyon: 5.4.0 | 2026-03-27
 */

'use strict';
import { Store }  from '../core/store.js';
import { Logger } from '../core/logger.js';
import { UI }     from '../core/ui.js';

const ALARM_KEY = 'price_alarms';

const ALARM_TARGETS = Object.freeze({
  usd_try:  { label: 'USD/TRY',        unit: '₺'  },
  eur_try:  { label: 'EUR/TRY',        unit: '₺'  },
  gold:     { label: 'Ons Altın',      unit: '$'  },
  btc:      { label: 'Bitcoin',        unit: '$'  },
  bist100:  { label: 'BIST 100',       unit: 'pt' },
  brent:    { label: 'Brent Petrol',   unit: '$'  },
  xof:      { label: 'USD/XOF',        unit: ''   },
  ngn:      { label: 'USD/NGN',        unit: ''   },
  kes:      { label: 'USD/KES',        unit: ''   },
  zar:      { label: 'USD/ZAR',        unit: ''   },
});

function _uid() { return `alm_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }
function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function getAlarms() {
  return Store.getCollection(ALARM_KEY, []).filter(a => !a.isDeleted);
}

/* ── ALARM KONTROL — her veri güncellendiğinde çağrılır ──────────── */
function check(target, currentValue) {
  if (!currentValue || isNaN(currentValue)) return;
  const alarms = getAlarms().filter(a => a.target === target && !a.triggered);
  alarms.forEach(alarm => {
    const hit = alarm.condition === 'above'
      ? currentValue >= alarm.threshold
      : currentValue <= alarm.threshold;
    if (!hit) return;

    // Alarm tetiklendi
    const meta = ALARM_TARGETS[target];
    const msg  = `🔔 ${meta.label} ${alarm.condition === 'above' ? '▲' : '▼'} ${alarm.threshold}${meta.unit} — Şu an: ${currentValue.toFixed(2)}${meta.unit}`;

    UI.toast(msg, alarm.condition === 'above' ? 'warning' : 'info');
    _playBeep(alarm.condition === 'above');

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('Strategy Hub Alarm', { body: msg, icon: '/assets/img/icon-192.png' });
    }

    // Tek seferlik alarm — triggered olarak işaretle
    if (alarm.oneShot) {
      Store.softDeleteInCollection(ALARM_KEY, alarm.id, 'system', []);
    } else {
      Store.updateInCollection(ALARM_KEY, alarm.id, { triggered: true, triggeredAt: new Date().toISOString() }, []);
    }
    Logger.audit('ALARM_TRIGGERED', { target, threshold: alarm.threshold, currentValue });
  });
}

function _playBeep(high = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = high ? 880 : 440;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch(_) {}
}

/* ── ALARM EKLEME ─────────────────────────────────────────────────── */
function addAlarm(formData) {
  const { target, condition, threshold, oneShot } = formData;
  if (!target || !threshold || isNaN(threshold)) {
    UI.toast('Eşik değeri gerekli.', 'warning'); return;
  }
  const alarm = {
    id: _uid(), target, condition, threshold: parseFloat(threshold),
    oneShot: !!oneShot, triggered: false, triggeredAt: null,
    isDeleted: false, deletedAt: null, deletedBy: null,
    createdAt: new Date().toISOString(),
  };
  Store.appendToCollection(ALARM_KEY, alarm, []);
  Logger.audit('ALARM_ADDED', { target, condition, threshold });
  UI.toast(`Alarm kuruldu: ${ALARM_TARGETS[target]?.label} ${condition === 'above' ? '▲' : '▼'} ${threshold}`, 'success');

  // Bildirim izni iste
  if (Notification.permission === 'default') Notification.requestPermission();
  renderAlarms();
}

function deleteAlarm(id) {
  Store.softDeleteInCollection(ALARM_KEY, id, 'user', []);
  renderAlarms();
  UI.toast('Alarm silindi.', 'info');
}

function resetAlarm(id) {
  Store.updateInCollection(ALARM_KEY, id, { triggered: false, triggeredAt: null }, []);
  renderAlarms();
  UI.toast('Alarm sıfırlandı.', 'success');
}

/* ── RENDER ──────────────────────────────────────────────────────── */
function renderAlarms() {
  const el = document.getElementById('alarm-list');
  if (!el) return;
  const alarms = getAlarms();
  if (!alarms.length) { el.innerHTML = '<div class="empty-state">Alarm yok — aşağıdan ekle.</div>'; return; }
  el.innerHTML = alarms.map(a => {
    const meta = ALARM_TARGETS[a.target];
    const cls  = a.triggered ? 'wn' : 'up';
    return `<div class="li">
      <div class="li-c" style="flex:1">
        <div class="name">${_esc(meta?.label || a.target)} <span class="bdg ${cls}">${a.triggered ? 'Tetiklendi' : 'Aktif'}</span></div>
        <div class="sub">${a.condition === 'above' ? '▲ Üstüne çıkınca' : '▼ Altına düşünce'} ${a.threshold}${meta?.unit || ''} ${a.oneShot ? '· Tek seferlik' : '· Sürekli'}</div>
      </div>
      <div style="display:flex;gap:4px">
        ${a.triggered ? `<button class="del-btn" style="color:var(--accent)" onclick="AlarmModule.resetAlarm('${a.id}')">Sıfırla</button>` : ''}
        <button class="del-btn" onclick="AlarmModule.deleteAlarm('${a.id}')">Sil</button>
      </div>
    </div>`;
  }).join('');
}

function init() {
  renderAlarms();
  // Bildirim izni
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  Logger.info('ALARM_MODULE_INIT');
}

export const AlarmModule = { init, check, addAlarm, deleteAlarm, resetAlarm, renderAlarms };
window.AlarmModule = AlarmModule;
