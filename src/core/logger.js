/**
 * Strategy Hub — src/core/logger.js
 * Merkezi audit loglama sistemi
 * Anayasa: K05 (Aktivite Loglama & Audit), K08 (Kod Kalitesi)
 * Versiyon: 5.1.0 | 2026-03-26
 */

'use strict';

const SEVERITY = Object.freeze({ INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', AUDIT: 'AUDIT' });

const LOG_STORAGE_KEY = 'sh:audit_log';
const MAX_LOG_ENTRIES = 500;

function _buildEntry(severity, action, details = {}, userId = 'anonymous') {
  return {
    timestamp: new Date().toISOString(),
    userId,
    action,
    severity,
    details,
    sessionId: _getSessionId(),
  };
}

function _getSessionId() {
  if (!sessionStorage.getItem('sh:session_id')) {
    sessionStorage.setItem('sh:session_id', `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  }
  return sessionStorage.getItem('sh:session_id');
}

function _persist(entry) {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    if (logs.length > MAX_LOG_ENTRIES) logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (_) {
    // localStorage dolu olabilir — sessizce geç, log yazmayı engelleme
  }
}

function _emit(severity, action, details) {
  const entry = _buildEntry(severity, action, details);
  _persist(entry);
  if (severity === SEVERITY.ERROR) {
    console.error(`[${entry.timestamp}] ${severity} — ${action}`, details);
  }
  return entry;
}

const Logger = {
  info:  (action, details)  => _emit(SEVERITY.INFO,  action, details),
  warn:  (action, details)  => _emit(SEVERITY.WARN,  action, details),
  error: (action, details)  => _emit(SEVERITY.ERROR, action, details),
  audit: (action, details)  => _emit(SEVERITY.AUDIT, action, details),

  getLogs() {
    try {
      const raw = localStorage.getItem(LOG_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  },

  clearLogs() {
    Logger.audit('LOGS_CLEARED', { by: 'super_admin' });
    localStorage.removeItem(LOG_STORAGE_KEY);
  },
};

// Anayasa K04 — Global hata dinleyicileri
window.addEventListener('error', (e) => {
  Logger.error('GLOBAL_JS_ERROR', { message: e.message, filename: e.filename, line: e.lineno });
});
window.addEventListener('unhandledrejection', (e) => {
  Logger.error('UNHANDLED_PROMISE', { reason: String(e.reason) });
});

export { Logger, SEVERITY };
