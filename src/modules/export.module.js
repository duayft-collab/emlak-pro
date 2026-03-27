/**
 * Strategy Hub — src/modules/export.module.js
 * İhracat & Ticaret sektör grafiği
 * Versiyon: 5.1.0 | 2026-03-26
 */
'use strict';
import { Logger } from '../core/logger.js';

const SECTORS = [
  { label: 'Otomotiv & Yan San.', pct: 82, color: 'var(--accent)'  },
  { label: 'Tekstil & Hazır Giyim',pct: 74, color: 'var(--accent2)' },
  { label: 'Makine & Ekipman',    pct: 62, color: '#0d9488'         },
  { label: 'Demir & Çelik',       pct: 45, color: 'var(--gold)'    },
  { label: 'Gıda & Tarım',        pct: 38, color: 'var(--green)'   },
];

function render() {
  const el = document.getElementById('sector-chart');
  if (!el) return;
  const labels = ['%16.2','%14.8','%12.4','%8.9','%7.6'];
  el.innerHTML = SECTORS.map((s, i) => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:11px;color:var(--text2)">${s.label}</span>
        <span style="font-size:11px;font-weight:700;font-family:var(--mono);color:var(--text)">${labels[i]}</span>
      </div>
      <div style="height:4px;background:var(--bg3);border-radius:4px;overflow:hidden">
        <div style="width:${s.pct}%;height:100%;background:${s.color};border-radius:4px"></div>
      </div>
    </div>`).join('');
}

function init() { render(); Logger.info('EXPORT_MODULE_INIT'); }
export const ExportModule = { init };
