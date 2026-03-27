/**
 * Strategy Hub — config/app.config.js
 * Merkezi uygulama konfigürasyonu
 * Anayasa: K01 (Dosya Mimarisi), K03 (Veri Bütünlüğü), K08 (Kod Kalitesi)
 * Versiyon: 5.1.1 | 2026-03-26
 */

'use strict';

const APP_CONFIG = Object.freeze({
  APP_NAME:   'Strategy Hub',
  VERSION:    '5.1.1',
  BUILD_DATE: '2026-03-26',

  // Anayasa K07 — Refresh aralıkları (ms)
  REFRESH_INTERVAL_FX_MS:      60_000,   // 1 dk  — FX + altın
  REFRESH_INTERVAL_CRYPTO_MS: 180_000,   // 3 dk  — BTC
  REFRESH_INTERVAL_NEWS_MS:   900_000,   // 15 dk — haberler
  DEBOUNCE_SEARCH_MS:          200,
  API_TIMEOUT_MS:             8_000,

  VIRTUAL_SCROLL_THRESHOLD: 1000,
  TRASH_RETENTION_DAYS:       30,
  UNDO_WINDOW_MS:          30_000,
  UNDO_HISTORY_LIMIT:          10,
  LOG_RETENTION_DAYS:          90,

  TABS: Object.freeze([
    { id: 'dashboard',  label: 'Genel Bakış',       icon: 'grid',      page: 'pages/dashboard.html'  },
    { id: 'world',      label: 'Dünya Ekonomisi',    icon: 'globe',     page: 'pages/world.html'      },
    { id: 'logistics',  label: 'Navlun & Lojistik',  icon: 'truck',     page: 'pages/logistics.html'  },
    { id: 'weather',    label: 'Hava & Haberler',    icon: 'cloud',     page: 'pages/weather.html'    },
    { id: 'realestate', label: 'Gayrimenkul',         icon: 'home',      page: 'pages/realestate.html' },
    { id: 'africa',     label: 'Afrika Pazarı',       icon: 'globe',     page: 'pages/africa.html'     },
    { id: 'export',     label: 'İhracat & Ticaret',  icon: 'cart',      page: 'pages/export.html'     },
    { id: 'bizdev',     label: 'İş Geliştirme',      icon: 'briefcase', page: 'pages/bizdev.html'     },
    { id: 'growth',     label: 'Kişisel Gelişim',    icon: 'academic',  page: 'pages/growth.html'     },
    { id: 'kids',       label: 'Çocuk Gelişimi',     icon: 'heart',     page: 'pages/kids.html'       },
    { id: 'datasources',label: 'Veri Kaynakları',    icon: 'data',      page: 'pages/datasources.html'},
    { id: 'bookmarks',  label: 'Faydalı Siteler',     icon: 'link',      page: 'pages/bookmarks.html'  },
    { id: 'anayasa',    label: 'Anayasa v3.0',       icon: 'document',  page: 'pages/anayasa.html'    },
  ]),

  DEFAULT_TAB: 'dashboard',

  // API — güvenilirlik sırasına göre
  API: Object.freeze({
    // FX: CDN tabanlı, rate-limit yok, CORS tam destekli
    FX_CDN:          'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json',
    FX_FALLBACK:     'https://api.frankfurter.app/latest',

    // Kripto: Binance public ticker (hızlı, geniş limit)
    CRYPTO_PRIMARY:  'https://api.binance.com/api/v3/ticker/24hr',
    CRYPTO_FALLBACK: 'https://min-api.cryptocompare.com/data/pricemultifull',

    // Altın: goldprice.org → metals.live
    GOLD_PRIMARY:    'https://data-asg.goldprice.org/dbXRates/USD',
    GOLD_FALLBACK:   'https://api.metals.live/v1/spot/gold',

    // Hava: open-meteo (CORS OK, limit yok)
    WEATHER_BASE:    'https://api.open-meteo.com/v1/forecast',

    // Haberler & Borsa: allorigins proxy (CORS sorununu aşar)
    NEWS_PROXY:      'https://api.allorigins.win/get',
    MARKETS_PROXY:   'https://api.allorigins.win/get',
  }),

  THEMES: Object.freeze(['', 'dark', 'glass', 'swiss', 'arctic']),
  THEME_LABELS: Object.freeze({ '': 'Zen', dark: 'Dark', glass: 'Glass', swiss: 'Swiss', arctic: 'Arctic' }),
});

export { APP_CONFIG };
