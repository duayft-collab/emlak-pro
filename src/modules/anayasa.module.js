/**
 * Strategy Hub — src/modules/anayasa.module.js
 * Anayasa sekmesi — kural görüntüleme ve interaktif kontrol listesi
 * Anayasa: K01, K08, K12
 * Versiyon: 5.1.0 | 2026-03-26
 */

'use strict';

import { Logger } from '../core/logger.js';

const CHECKLIST_KEY = 'sh:checklist';

const RULES = Object.freeze([
  { id:  1, title: 'Dosya Mimarisi & Modüler Yapı',   keyword: 'Tek Sorumluluk',    priority: 'high'     },
  { id:  2, title: 'Güvenlik & Yetkilendirme',          keyword: 'Sıfır Güven',       priority: 'critical' },
  { id:  3, title: 'Veri Bütünlüğü & Bağımlılık',      keyword: 'Kayıp Yok',         priority: 'critical' },
  { id:  4, title: 'Hata Yönetimi & Dayanıklılık',      keyword: 'Sessiz Hata Yok',   priority: 'critical' },
  { id:  5, title: 'Aktivite Loglama & Audit',          keyword: 'İzlenebilirlik',    priority: 'high'     },
  { id:  6, title: 'Soft Delete & Undo Mekanizması',    keyword: 'Silme Koruması',    priority: 'critical' },
  { id:  7, title: 'Performans & Optimizasyon',         keyword: 'Hız & Verimlilik',  priority: 'high'     },
  { id:  8, title: 'Kod Kalitesi & Standartlar',        keyword: 'Okunabilirlik',     priority: 'high'     },
  { id:  9, title: 'Versiyonlama & Sürüm Yönetimi',    keyword: 'İzlenebilir Deploy', priority: 'high'    },
  { id: 10, title: 'İş Mantığı & Domain Kuralları',    keyword: 'Doğru Hesaplama',   priority: 'critical' },
  { id: 11, title: 'Test & Kalite Güvence',             keyword: 'Doğrulama',         priority: 'high'     },
  { id: 12, title: 'UI/UX & Tasarım Standartları',     keyword: 'Minimalizm',        priority: 'high'     },
  { id: 13, title: 'i18n Çoklu Dil Desteği',           keyword: 'Evrensellik',       priority: 'high'     },
  { id: 14, title: 'PII Maskeleme & KVKK/GDPR',        keyword: 'Gizlilik',          priority: 'critical' },
  { id: 15, title: 'Otomatik Yedekleme',               keyword: 'Felaket Koruması',  priority: 'high'     },
  { id: 16, title: 'Ölçeklenebilirlik & Gelecek',      keyword: 'Geleceğe Hazır',    priority: 'medium'   },
]);

const PRIORITY_LABEL = Object.freeze({ critical: '🔴 Kritik', high: '🟡 Yüksek', medium: '🟢 Orta' });
const PRIORITY_CSS   = Object.freeze({ critical: 'dn', high: 'te', medium: 'up' });

const CHECKLIST_ITEMS = Object.freeze([
  { id: 'cl_01', text: 'Yalnızca talep edilen güncelleme yapıldı',       rule: 'K08' },
  { id: 'cl_02', text: 'Hardcode credential yok',                         rule: 'K02' },
  { id: 'cl_03', text: 'Tam kod teslim edildi (kısaltma yok)',            rule: 'K08' },
  { id: 'cl_04', text: 'Versiyon bilgisi güncellendi',                    rule: 'K09' },
  { id: 'cl_05', text: 'Dosya satır limiti kontrol edildi',               rule: 'K01' },
  { id: 'cl_06', text: 'Soft delete kullanıldı (splice değil)',           rule: 'K06' },
  { id: 'cl_07', text: 'İşlem loglandı',                                  rule: 'K05' },
  { id: 'cl_08', text: 'PII maskelendi',                                  rule: 'K14' },
  { id: 'cl_09', text: 'Native confirm()/alert() kullanılmadı',           rule: 'K12' },
  { id: 'cl_10', text: 'i18n string çeviri fonksiyonuyla sarıldı',        rule: 'K13' },
  { id: 'cl_11', text: 'Min. 3 test senaryosu yazıldı',                   rule: 'K11' },
  { id: 'cl_12', text: '5 geliştirme önerisi sunuldu',                    rule: 'Protokol' },
]);

/* ── RENDER ─────────────────────────────────────────────────────────────── */

function renderRuleTable() {
  const el = document.getElementById('anayasa-rule-table');
  if (!el) return;
  el.innerHTML = RULES.map(r => `
    <tr>
      <td style="font-family:var(--mono);font-weight:600">${String(r.id).padStart(2, '0')}</td>
      <td class="s">${r.title}</td>
      <td>${r.keyword}</td>
      <td><span class="bdg ${PRIORITY_CSS[r.priority]}">${PRIORITY_LABEL[r.priority]}</span></td>
    </tr>`).join('');
}

function renderChecklist() {
  const el = document.getElementById('anayasa-checklist-items');
  if (!el) return;
  const saved = _loadChecklist();
  el.innerHTML = CHECKLIST_ITEMS.map(item => `
    <label class="cl-item" for="${item.id}">
      <input type="checkbox" id="${item.id}" data-cl-id="${item.id}" ${saved[item.id] ? 'checked' : ''}>
      <span class="cl-text">${item.text}</span>
      <span class="cl-rule">[${item.rule}]</span>
    </label>`).join('');

  el.addEventListener('change', e => {
    const cb = e.target.closest('input[data-cl-id]');
    if (cb) {
      _saveChecklist(cb.dataset.clId, cb.checked);
      Logger.info('CHECKLIST_TOGGLED', { id: cb.dataset.clId, checked: cb.checked });
    }
  });

  _updateProgress();
}

function resetChecklist() {
  try { localStorage.removeItem(CHECKLIST_KEY); } catch (_) {}
  document.querySelectorAll('[data-cl-id]').forEach(cb => { cb.checked = false; });
  _updateProgress();
  Logger.audit('CHECKLIST_RESET');
}

function _updateProgress() {
  const total   = CHECKLIST_ITEMS.length;
  const checked = document.querySelectorAll('[data-cl-id]:checked').length;
  const pct     = Math.round((checked / total) * 100);
  const bar     = document.getElementById('checklist-progress-bar');
  const label   = document.getElementById('checklist-progress-label');
  if (bar)   { bar.style.width = `${pct}%`; bar.style.background = pct === 100 ? 'var(--green)' : 'var(--accent)'; }
  if (label) label.textContent = `${checked} / ${total} tamamlandı`;
}

function _loadChecklist() {
  try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? '{}'); } catch (_) { return {}; }
}

function _saveChecklist(id, checked) {
  try {
    const data = _loadChecklist();
    data[id] = checked;
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(data));
    _updateProgress();
  } catch (_) {}
}

/* ── BAŞLATMA ─────────────────────────────────────────────────────────── */

function init() {
  renderRuleTable();
  renderChecklist();
  document.getElementById('checklist-reset-btn')?.addEventListener('click', resetChecklist);
  Logger.info('ANAYASA_MODULE_INIT');
}

export const AnayasaModule = { init, resetChecklist };
window.AnayasaModule = AnayasaModule;
