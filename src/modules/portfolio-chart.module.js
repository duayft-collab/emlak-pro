/**
 * Strategy Hub — src/modules/portfolio-chart.module.js
 * Gayrimenkul portföyü net değer + pipeline büyüme zaman serisi
 * Chart.js CDN — import gerekmez, global Chart objesi
 * Anayasa: K07 (Performans — lazy load Chart.js), K10 (Finansal hesaplama)
 * Versiyon: 5.2.0 | 2026-03-26
 */

'use strict';

import { Store }  from '../core/store.js';
import { Logger } from '../core/logger.js';

const RE_KEY   = 're_portfolio';
const PIPE_KEY = 'biz_pipeline';

// TL değerini sayıya çevir: "2,400,000 TL" → 2400000
function _parseTL(str) {
  return parseFloat(String(str).replace(/[^\d.]/g, '')) || 0;
}

// USD değerini sayıya çevir: "$1.8M" → 1800000
function _parseUSD(str) {
  const s = String(str).replace(/[$,\s]/g, '').toUpperCase();
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  if (s.endsWith('B')) return n * 1e9;
  if (s.endsWith('M')) return n * 1e6;
  if (s.endsWith('K')) return n * 1e3;
  return n;
}

// Aylık gruplandır — zaman serisi için
function _groupByMonth(items, valueKey, parseFunc) {
  const map = {};
  items.forEach(item => {
    if (item.isDeleted) return;
    const d     = new Date(item.createdAt);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[month]  = (map[month] || 0) + parseFunc(item[valueKey]);
  });
  // Kümülatif topla
  const sorted = Object.keys(map).sort();
  let cum = 0;
  return sorted.map(m => { cum += map[m]; return { month: m, value: cum }; });
}

function _formatMonth(ym) {
  const [y, m] = ym.split('-');
  const names  = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${names[parseInt(m) - 1]} ${y}`;
}

async function loadChartJS() {
  return new Promise((resolve, reject) => {
    if (window.Chart) { resolve(window.Chart); return; }
    const s   = document.createElement('script');
    s.src     = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload  = () => resolve(window.Chart);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function renderPortfolioChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  try {
    const Chart = await loadChartJS();
    const reItems   = Store.getCollection(RE_KEY, []);
    const pipeItems = Store.getCollection(PIPE_KEY, []);

    const reData   = _groupByMonth(reItems,   'val', _parseTL);
    const pipeData = _groupByMonth(pipeItems, 'val', _parseUSD);

    // Tüm ayları birleştir
    const allMonths = [...new Set([...reData.map(d => d.month), ...pipeData.map(d => d.month)])].sort();

    if (allMonths.length === 0) {
      canvas.closest('.card')?.querySelector('.chart-empty')?.classList.remove('hidden');
      return;
    }

    // Her ay için değer bul (boş aylara önceki değeri koy)
    function fillSeries(data, months) {
      let last = 0;
      return months.map(m => {
        const found = data.find(d => d.month === m);
        if (found) last = found.value;
        return last;
      });
    }

    const reSeries   = fillSeries(reData,   allMonths);
    const pipeSeries = fillSeries(pipeData, allMonths);
    const labels     = allMonths.map(_formatMonth);

    // Eski chart'ı temizle
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    const isDark  = document.documentElement.dataset.t === 'dark';
    const gridClr = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)';
    const textClr = isDark ? '#7B85A0' : '#9BA3B8';

    new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label:           'Gayrimenkul (TL)',
            data:            reSeries,
            borderColor:     '#2563EB',
            backgroundColor: 'rgba(37,99,235,.07)',
            borderWidth:     2,
            tension:         0.35,
            fill:            true,
            pointRadius:     3,
            pointHoverRadius:5,
            yAxisID:         'yTL',
          },
          {
            label:           'Pipeline (USD)',
            data:            pipeSeries,
            borderColor:     '#7C3AED',
            backgroundColor: 'rgba(124,58,237,.07)',
            borderWidth:     2,
            tension:         0.35,
            fill:            true,
            pointRadius:     3,
            pointHoverRadius:5,
            yAxisID:         'yUSD',
          },
        ],
      },
      options: {
        responsive:         true,
        maintainAspectRatio:false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: textClr, font: { size: 11 }, boxWidth: 12, padding: 16 },
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const v = ctx.parsed.y;
                return ctx.dataset.yAxisID === 'yTL'
                  ? ` ${(v / 1_000_000).toFixed(2)}M TL`
                  : ` $${(v / 1_000_000).toFixed(2)}M`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: textClr, font: { size: 10 } },
            grid:  { color: gridClr },
          },
          yTL: {
            position: 'left',
            ticks: {
              color: '#2563EB',
              font: { size: 10 },
              callback: v => `${(v / 1_000_000).toFixed(1)}M ₺`,
            },
            grid: { color: gridClr },
          },
          yUSD: {
            position: 'right',
            ticks: {
              color: '#7C3AED',
              font: { size: 10 },
              callback: v => `$${(v / 1_000_000).toFixed(1)}M`,
            },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });

    Logger.info('PORTFOLIO_CHART_RENDERED', { months: allMonths.length });
  } catch (err) {
    Logger.error('PORTFOLIO_CHART_FAILED', { message: err.message });
  }
}

export const PortfolioChartModule = { renderPortfolioChart };
window.PortfolioChartModule = PortfolioChartModule;
