/**
 * Stratejik Hub — İş Geliştirme Pipeline Modülü
 * src/modules/pipeline.module.js
 * Kural: K06 (Soft Delete), K10 (İş Mantığı — finansal hesap), K05 (Loglama)
 * Versiyon: 5.1.0 | 2026-03-26
 */

'use strict';

import Store        from '../core/store.js';
import ErrorHandler from '../core/error-handler.js';

const COLLECTION = 'pipe';

// Anayasa K10: Para birimi — integer-bazlı hesap
const MULTIPLIERS = Object.freeze({ B: 1_000_000_000, M: 1_000_000, K: 1_000 });

function parseValue(str = '') {
  const upper = str.toUpperCase();
  for (const [suffix, mult] of Object.entries(MULTIPLIERS)) {
    if (upper.includes(suffix)) {
      const num = parseFloat(str.replace(/[$,]/g, ''));
      return Math.round(num * mult);   // integer — float yok
    }
  }
  return Math.round(parseFloat(str.replace(/[$,]/g, '')) || 0);
}

function formatTotal(totalUSD) {
  if (totalUSD >= 1_000_000_000) return `$${(totalUSD / 1_000_000_000).toFixed(1)}B`;
  if (totalUSD >= 1_000_000)     return `$${(totalUSD / 1_000_000).toFixed(1)}M`;
  if (totalUSD >= 1_000)         return `$${(totalUSD / 1_000).toFixed(0)}K`;
  return `$${totalUSD}`;
}

const STAGE_COLORS = Object.freeze({
  Keşfet:   'nt',
  Sunum:    'te',
  Müzakere: 'tu',
  Teklif:   'up',
  Kapandı:  'gd',
});

function render() {
  const listEl  = document.getElementById('pipeline-list');
  const totalEl = document.getElementById('pipe-total');
  const countEl = document.getElementById('pipe-count');
  if (!listEl) return;

  const items = Store.getAll(COLLECTION);

  if (!items.length) {
    listEl.innerHTML = '<div class="empty-state">Pipeline boş.</div>';
    if (totalEl) totalEl.textContent = '$0';
    if (countEl) countEl.textContent = '0';
    return;
  }

  listEl.innerHTML = items.map(p => `
    <div class="li" data-id="${p.id}">
      <div class="li-c">
        <div class="name">${p.name}</div>
        <div class="sub">${p.val} · <span class="bdg ${STAGE_COLORS[p.stage] ?? 'nt'}">${p.stage}</span></div>
      </div>
      <button class="del-btn" aria-label="${p.name} sil"
        onclick="PipelineModule.remove('${p.id}')">Sil</button>
    </div>`).join('');

  // Toplam (integer aritmetik)
  const total = items.reduce((acc, p) => acc + parseValue(p.val), 0);
  if (totalEl) totalEl.textContent = formatTotal(total);
  if (countEl) countEl.textContent = items.length;
}

function add() {
  const name = document.getElementById('pipe-name')?.value.trim();
  if (!name) {
    ErrorHandler.showToast('Şirket adı zorunludur.', ErrorHandler.SEVERITY.WARNING);
    return;
  }
  const data = {
    name,
    val:   document.getElementById('pipe-val')?.value   || '?',
    stage: document.getElementById('pipe-stage')?.value || 'Keşfet',
  };
  Store.add(COLLECTION, data);
  ['pipe-name', 'pipe-val'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  render();
  ErrorHandler.showToast(`"${name}" pipeline'a eklendi.`, ErrorHandler.SEVERITY.SUCCESS);
}

function remove(id) {
  const item = Store.getAll(COLLECTION).find(i => i.id === id);
  if (!item) return;
  Store.softDelete(COLLECTION, id);
  render();
  const toast = ErrorHandler.showUndoToast(`"${item.name}" silindi.`, () => {
    Store.restore(COLLECTION, id);
    render();
    toast.remove();
    ErrorHandler.showToast(`"${item.name}" geri alındı.`, ErrorHandler.SEVERITY.SUCCESS);
  });
}

const PipelineModule = { render, add, remove, parseValue, formatTotal };
window.PipelineModule = PipelineModule;

export default PipelineModule;
