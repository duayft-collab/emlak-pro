/**
 * Strategy Hub — src/modules/morning-brief.module.js
 * Claude API ile dinamik sabah özeti
 * Canlı FX + altın + petrol verilerini alıp stratejik yorum üretir
 * Anayasa: K04 (Hata Yönetimi), K07 (Cache — gereksiz API çağrısı engelle)
 * Versiyon: 5.2.0 | 2026-03-26
 */

'use strict';

import { Logger } from '../core/logger.js';
import { Store }  from '../core/store.js';

const CACHE_KEY     = 'morning_brief';
const CACHE_TTL_MS  = 4 * 60 * 60 * 1000; // 4 saat — aynı gün tekrar çağırma

async function generate(marketData) {
  // Cache kontrolü — 4 saatten taze özet varsa API çağırma
  const cached = Store.get(CACHE_KEY);
  if (cached && (Date.now() - new Date(cached.generatedAt).getTime()) < CACHE_TTL_MS) {
    Logger.info('MORNING_BRIEF_FROM_CACHE');
    return cached.text;
  }

  const { usd, eur, gold, btc, btcChg, brent } = marketData;

  const prompt = `Sen stratejik bir finans asistanısın. Aşağıdaki güncel piyasa verilerine bakarak Türk iş insanı için 2 cümlelik aksiyon odaklı sabah özeti yaz. Türkçe. Rakamları kullan. Somut öneri ver.

Veriler:
- USD/TRY: ${usd ? usd.toFixed(2) : 'bilinmiyor'}
- EUR/TRY: ${eur ? eur.toFixed(2) : 'bilinmiyor'}  
- Ons Altın: $${gold ? Math.round(gold) : 'bilinmiyor'}
- Bitcoin: $${btc ? Math.round(btc).toLocaleString('en-US') : 'bilinmiyor'} (24s: ${btcChg ? (btcChg >= 0 ? '+' : '') + btcChg.toFixed(2) + '%' : 'bilinmiyor'})
- Brent Petrol: $${brent ? brent.toFixed(2) : '84.20'}

Format: Sadece 2 cümle. İlk cümle piyasa durumu, ikinci cümle aksiyon önerisi. Başlık yok, madde işareti yok.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) throw new Error('Boş yanıt');

    // Cache'e yaz
    Store.set(CACHE_KEY, { text, generatedAt: new Date().toISOString() });
    Logger.info('MORNING_BRIEF_GENERATED');
    return text;
  } catch (err) {
    Logger.warn('MORNING_BRIEF_FAILED', { message: err.message });
    return null; // null dönünce statik metin gösterilir
  }
}

// Hero kartındaki metni güncelle
async function updateHero(marketData) {
  const heroEl = document.querySelector('.hero h2');
  if (!heroEl) return;

  // Yüklenirken iskelet göster
  heroEl.innerHTML = '<span class="sp" style="width:80%;height:18px;display:inline-block"></span>';

  const brief = await generate(marketData);
  if (brief) {
    heroEl.innerHTML = brief;
    heroEl.style.fontFamily = 'var(--serif)';
  } else {
    // Fallback: statik metin
    heroEl.innerHTML = 'Küresel ticaret rotalarında <em>navlun krizi</em> derinleşiyor — likiditeni koru, nakit akışı üret.';
  }
}

export const MorningBriefModule = { generate, updateHero };
