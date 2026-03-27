# Strategy Hub v5.1

**Stratejik Karar Destek Platformu** — Canlı piyasa verileri, lojistik, gayrimenkul ve kişisel gelişim takibi.

## Özellikler

- 📊 Canlı FX, kripto ve altın fiyatları
- 🚢 Navlun & lojistik endeksleri (SCFI, Baltic Dry)
- 🌍 Dünya ekonomisi makro göstergeleri
- 🏠 Gayrimenkul portföy ve iş geliştirme pipeline
- 🌤️ Canlı hava durumu (5 şehir) + BBC iş haberleri
- 📚 Kişisel gelişim & çocuk aktivite takibi
- ⚖️ Entegre Yazılım Mimarisi Anayasası (v3.0)

## Mimari

```
stratejik-hub/
├── index.html            → Giriş noktası (sadece shell)
├── assets/css/main.css   → Merkezi design system
├── config/app.config.js  → Konfigürasyon (frozen)
├── src/
│   ├── core/
│   │   ├── router.js     → Hybrid SPA router (fetch + önbellek)
│   │   ├── ui.js         → Toast, modal, tema, saat
│   │   └── logger.js     → Audit loglama (Anayasa K05)
│   └── modules/
│       ├── fx.module.js          → FX, kripto, altın
│       ├── realestate.module.js  → Gayrimenkul & pipeline
│       └── anayasa.module.js     → Anayasa sayfası
└── pages/                → Her sekmenin HTML içeriği
```

## GitHub Pages'e Yayınlama

1. Repository oluştur
2. Tüm dosyaları `main` branch root'una yükle
3. `docs/` içine boş `.nojekyll` dosyası ekle
4. Settings → Pages → Source: `main` branch, `/ (root)`
5. ~2 dakikada canlıya alır

## Anayasa Uyumu

Bu platform **Evrensel Yazılım Mimarisi & Geliştirme Anayasası v3.0** kapsamında geliştirilmiştir.

| Kural | Uygulama |
|-------|----------|
| K01 — Dosya Mimarisi | Her modül tek sorumluluk, kebab-case isimlendirme |
| K03 — Veri Bütünlüğü | `Object.freeze` konfigürasyon, sabit bağımlılıklar |
| K04 — Hata Yönetimi  | Global `onerror` + `unhandledrejection` dinleyicisi |
| K05 — Audit Log      | `localStorage` tabanlı kalıcı log (90 gün) |
| K06 — Soft Delete    | `isDeleted` flag, 30 saniyelik undo window |
| K07 — Performans     | Lazy load, `visibilityState` kontrolü, debounce |
| K12 — UI/UX          | Custom toast/modal, skeleton, WCAG AA kontrast |

## Versiyon

`5.1.0` — 2026-03-26
