/**
 * Strategy Hub — Cloudflare Worker CORS Proxy
 * Deploy: https://workers.cloudflare.com (ücretsiz, saniyede 100k istek)
 *
 * Kullanım:
 * 1. workers.cloudflare.com → Create Worker
 * 2. Bu kodu yapıştır → Deploy
 * 3. Worker URL'ini (ör: proxy.kullanici.workers.dev) al
 * 4. config/app.config.js içindeki PROXY_BASE değerini güncelle
 *
 * İzin verilen domainler (güvenlik — sadece bunlar proxylenir):
 */

const ALLOWED_ORIGINS = [
  'query1.finance.yahoo.com',
  'feeds.bbci.co.uk',
  'query2.finance.yahoo.com',
];

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url    = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response(JSON.stringify({ error: 'url parametresi gerekli' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Güvenlik: sadece izin verilen domainler
    const targetUrl    = new URL(target);
    const targetDomain = targetUrl.hostname;
    if (!ALLOWED_ORIGINS.some(o => targetDomain === o || targetDomain.endsWith('.' + o))) {
      return new Response(JSON.stringify({ error: 'Domain izin listesinde değil: ' + targetDomain }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    try {
      const res  = await fetch(target, {
        headers: { 'User-Agent': 'StrategyHub/5.2 (compatible; curl)' },
      });
      const body = await res.text();

      return new Response(JSON.stringify({ contents: body, status: { http_code: res.status } }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60', // 60 sn cache — Yahoo Finance'i korur
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
