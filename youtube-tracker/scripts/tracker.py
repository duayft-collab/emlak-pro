#!/usr/bin/env python3
"""
YouTube Tracker — RSS tabanlı, API key gerektirmez
GitHub Actions çalıştırır → youtube-tracker/data/summaries.json günceller
Strategy Hub bu dosyayı okur.
"""

import os, json, time, re
from datetime import datetime, timedelta, timezone
from urllib.request import urlopen, Request
from urllib.parse import quote
from xml.etree import ElementTree as ET

OPENAI_KEY = os.environ.get('OPENAI_API_KEY', '')
SEEN_FILE  = 'data/seen.json'
OUT_FILE   = 'data/summaries.json'

# ── HTTP ─────────────────────────────────────────────────────────────
def get(url, timeout=15):
    try:
        req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urlopen(req, timeout=timeout) as r:
            return r.read().decode('utf-8')
    except Exception as e:
        print(f'  GET hata: {e}')
        return None

def post_json(url, data, hdrs=None):
    import json as _j
    body = _j.dumps(data).encode('utf-8')
    h = {'Content-Type': 'application/json'}
    if hdrs: h.update(hdrs)
    req = Request(url, data=body, headers=h)
    try:
        with urlopen(req, timeout=25) as r:
            return _j.loads(r.read().decode('utf-8'))
    except Exception as e:
        print(f'  POST hata: {e}')
        return None

# ── SEEN ─────────────────────────────────────────────────────────────
def load_seen():
    try:
        with open(SEEN_FILE) as f: return json.load(f)
    except: return {}

def save_seen(s):
    with open(SEEN_FILE, 'w') as f: json.dump(s, f, indent=2)

# ── RSS İLE VİDEO BULMA — API key gerekmez ───────────────────────────
def get_videos_rss(channel_id, hours=25):
    """YouTube RSS feed — tamamen ücretsiz, API key yok"""
    url = f'https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}'
    raw = get(url)
    if not raw:
        return []

    ns = {'yt': 'http://www.youtube.com/xml/schemas/2015',
          'media': 'http://search.yahoo.com/mrss/',
          'atom': 'http://www.w3.org/2005/Atom'}

    try:
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        print(f'  RSS parse hata: {e}')
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    videos = []

    for entry in root.findall('atom:entry', ns):
        vid_id = entry.findtext('yt:videoId', namespaces=ns)
        title  = entry.findtext('atom:title', namespaces=ns) or ''
        pub    = entry.findtext('atom:published', namespaces=ns) or ''
        channel= entry.findtext('atom:author/atom:name', namespaces=ns) or ''
        desc   = ''

        media = entry.find('media:group', ns)
        if media is not None:
            desc = media.findtext('media:description', namespaces=ns) or ''
            thumb_el = media.find('media:thumbnail', ns)
            thumb = thumb_el.get('url', '') if thumb_el is not None else ''
        else:
            thumb = ''

        if not vid_id: continue

        try:
            pub_dt = datetime.fromisoformat(pub.replace('Z', '+00:00'))
        except:
            pub_dt = datetime.now(timezone.utc)

        if pub_dt < cutoff:
            continue

        videos.append({
            'id':          vid_id,
            'title':       title,
            'description': desc[:500],
            'published':   pub_dt.isoformat(),
            'channel':     channel,
            'url':         f'https://youtube.com/watch?v={vid_id}',
            'thumbnail':   thumb,
        })

    return videos

# ── TRANSCRIPT ───────────────────────────────────────────────────────
def get_transcript(video_id):
    try:
        import subprocess
        r = subprocess.run(
            ['python3', '-c',
             f'from youtube_transcript_api import YouTubeTranscriptApi;'
             f't=YouTubeTranscriptApi.get_transcript("{video_id}",languages=["tr","en"]);'
             f'print(" ".join([x["text"] for x in t[:120]]))'],
            capture_output=True, text=True, timeout=30
        )
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip()[:5000]
    except: pass
    return None

# ── AI ÖZETLEME ──────────────────────────────────────────────────────
def summarize(title, content, channel):
    if not OPENAI_KEY:
        return _fallback(content)

    prompt = f"""Sen bir YouTube video analistsin. Bu videoyu izlemeden karar vermeme yardım et.

Kanal: {channel}
Video: {title}

İçerik:
{content[:4000]}

GÖREV — Aşağıdaki formatta cevap ver:

ÖZET:
[2-3 cümle Türkçe genel özet]

5 MADDE:
• [En kritik bilgi veya argüman]
• [İkinci önemli nokta]
• [Pratik çıkarım veya öneri]
• [Dikkat çeken veri veya örnek]
• [İzlemeye değer mi? Kime hitap eder?]

ANAHTAR ALINTILAR:
- "[Önemli bir alıntı — Türkçe veya İngilizce]"
- "[İkinci alıntı varsa]"

ETİKETLER: [3-5 kelime, virgülle ayrılmış]"""

    res = post_json(
        'https://api.openai.com/v1/chat/completions',
        {'model': 'gpt-4o-mini', 'messages': [{'role': 'user', 'content': prompt}],
         'max_tokens': 600, 'temperature': 0.2},
        {'Authorization': f'Bearer {OPENAI_KEY}'}
    )
    if res and res.get('choices'):
        return res['choices'][0]['message']['content'].strip()
    return _fallback(content)

def _fallback(content):
    lines = [l.strip() for l in content.split('\n') if len(l.strip()) > 40][:5]
    bullets = '\n'.join(f'• {l[:150]}' for l in lines) or '• İçerik özeti mevcut değil'
    return f'ÖZET:\n[OpenAI API bağlı değil — video açıklaması]\n\n5 MADDE:\n{bullets}\n\nANAHTAR ALINTILAR:\n\nETİKETLER: genel'

# ── PARSE ────────────────────────────────────────────────────────────
def parse_summary(raw):
    r = {'summary': '', 'bullets': [], 'quotes': [], 'tags': []}
    section = None
    for line in raw.splitlines():
        l = line.strip()
        if not l: continue
        if l.startswith('ÖZET:'):             section = 'summary'; continue
        if l.startswith('5 MADDE:'):          section = 'bullets'; continue
        if l.startswith('ANAHTAR ALINTILAR:'): section = 'quotes'; continue
        if l.startswith('ETİKETLER:'):
            r['tags'] = [t.strip() for t in l.replace('ETİKETLER:', '').split(',') if t.strip()]
            section = None; continue
        if section == 'summary': r['summary'] += (' ' if r['summary'] else '') + l
        elif section == 'bullets' and l.startswith('•'): r['bullets'].append(l[1:].strip())
        elif section == 'quotes' and l.startswith('-'):
            q = l[1:].strip().strip('"').strip("'")
            if q: r['quotes'].append(q)
    return r

# ── ANA ──────────────────────────────────────────────────────────────
def main():
    print(f'YouTube RSS Tracker — {datetime.now().strftime("%Y-%m-%d %H:%M UTC")}')

    config   = json.load(open('channels.json'))
    settings = config['settings']
    seen     = load_seen()

    try:
        existing = json.load(open(OUT_FILE)).get('videos', [])
    except:
        existing = []

    new_videos = []

    for ch in config['channels']:
        cid = ch.get('channel_id', '')
        if not cid or cid.startswith('UCx'):
            print(f'  {ch["name"]}: channel_id eksik, atlanıyor')
            continue

        print(f'\n📡 {ch["name"]} ({cid})')
        videos = get_videos_rss(cid, settings.get('lookback_hours', 25))
        print(f'  {len(videos)} yeni video bulundu')

        for v in videos[:settings.get('max_videos_per_run', 5)]:
            if v['id'] in seen:
                print(f'  Zaten görüldü: {v["title"][:50]}')
                continue

            print(f'  İşleniyor: {v["title"][:60]}')
            transcript = get_transcript(v['id'])
            content    = transcript or v['description']
            raw        = summarize(v['title'], content, ch['name'])
            parsed     = parse_summary(raw)

            pub = datetime.fromisoformat(v['published'])
            entry = {
                'id':            v['id'],
                'title':         v['title'],
                'channel':       ch['name'],
                'category':      ch.get('category', 'Genel'),
                'url':           v['url'],
                'thumbnail':     v['thumbnail'],
                'published':     v['published'],
                'published_tr':  pub.strftime('%d %b %Y, %H:%M'),
                'has_transcript': transcript is not None,
                'summary':       parsed['summary'],
                'bullets':       parsed['bullets'],
                'quotes':        parsed['quotes'],
                'tags':          parsed['tags'],
                'processed_at':  datetime.now(timezone.utc).isoformat(),
            }
            new_videos.append(entry)
            seen[v['id']] = {'title': v['title'], 'channel': ch['name'],
                             'ts': entry['processed_at']}
            print(f'  ✓ Eklendi')
            time.sleep(1)

    all_videos = (new_videos + existing)[:50]
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({'generated_at': datetime.now(timezone.utc).isoformat(),
                   'total': len(all_videos), 'videos': all_videos},
                  f, ensure_ascii=False, indent=2)

    save_seen(seen)
    print(f'\n✅ {len(new_videos)} yeni video işlendi, toplam {len(all_videos)} kayıtlı')

if __name__ == '__main__':
    main()
