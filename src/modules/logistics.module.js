/**
 * Strategy Hub — src/modules/logistics.module.js
 * Navlun & Lojistik liman yoğunluğu render
 * Versiyon: 5.1.0 | 2026-03-26
 */
'use strict';
import { Logger } from '../core/logger.js';

const PORTS = [
  { name: 'Şangay',    pct: 82, color: 'var(--red)'   },
  { name: 'Rotterdam', pct: 61, color: 'var(--gold)'  },
  { name: 'Singapur',  pct: 74, color: 'var(--red)'   },
  { name: 'Mersin',    pct: 45, color: 'var(--green)' },
  { name: 'İstanbul',  pct: 53, color: 'var(--gold)'  },
];

function render() {
  const el = document.getElementById('port-utilization');
  if (!el) return;
  el.innerHTML = PORTS.map(p => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:11px;color:var(--text2)">${p.name}</span>
        <span style="font-size:11px;font-weight:700;font-family:var(--mono);color:var(--text)">%${p.pct}</span>
      </div>
      <div style="height:4px;background:var(--bg3);border-radius:4px;overflow:hidden">
        <div style="width:${p.pct}%;height:100%;background:${p.color};border-radius:4px"></div>
      </div>
    </div>`).join('');
}

function init() { render(); Logger.info('LOGISTICS_MODULE_INIT'); }
export const LogisticsModule = { init };
