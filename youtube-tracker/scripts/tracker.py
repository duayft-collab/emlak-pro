#!/usr/bin/env python3
"""
YouTube Tracker → Strategy Hub
GitHub Actions çalıştırır → data/summaries.json üretir → repo'ya commit eder
Strategy Hub bu JSON'u fetch edip görüntüler.
"""

import os, json, time, sys
from datetime import datetime, timedelta, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError

YT_API_KEY  = os.environ.get('YOUTUBE_API_KEY', '')
OPENAI_KEY  = os.environ.get('OPENAI_API_KEY', '')
SEEN_FILE   = 'data/seen.json'
OUT_FILE    = 'data/summaries.json'

# ── HTTP ──────────────────────────────────────────────────────────────
def get(url, hdrs=None, timeout=15):
    req = Request(url, headers=hdrs or {'User-Agent':'YTTracker/1.0'})
    try:
        with urlopen(req, timeout=timeout) as r:
            return r.read().decode('utf-8')
    except Exception as e:
        print(f'  GET hata: {e}')
        return None

def post_json(url, data, hdrs=None):
    body = json.dumps(data).encode('utf-8')
    h = {'Content-Type':'application/json','User-Agent':'YTTracker/1.0'}
    if hdrs: h.update(hdrs)
    req = Request(url, data=body, headers=h)
    try:
        with urlopen(req, timeout=25) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:
        print(f'  POST hata: {e}')
        return None

# ── SEEN ──────────────────────────────────────────────────────────────
def load_seen():
    try:
        with open(SEEN_FILE) as f: return json.load(f)
    except: return {}

def save_seen(s):
    with open(SEEN_FILE, 'w') as f: json.dump(s, f, indent=2)

# ── VİDEO BULMA ───────────────────────────────────────────────────────
def get_videos(channel_id, hours=25):
    if not YT_API_KEY: return []
    since = (datetime.now(timezone.utc)-timedelta(hours=hours)).strftime('%Y-%m-%dT%H:%M:%SZ')
    url = (f'https://www.googleapis.com/youtube/v3/search'
           f'?key={YT_API_KEY}&channelId={channel_id}&part=snippet'
           f'&type=video&order=date&publishedAfter={since}&maxResults=5')
    raw = get(url)
    if not raw: return []
    items = json.loads(raw).get('items', [])
    out = []
    for item in items:
        vid_id = item['id'].get('videoId')
        if not vid_id: continue
        s = item['snippet']
        out.append({
            'id':          vid_id,
            'title':       s['title'],
            'description': s.get('description','')[:500],
            'published':   s['publishedAt'],
            'channel':     s['channelTitle'],
            'url':         f'https://youtube.com/watch?v={vid_id}',
            'thumbnail':   s['thumbnails'].get('medium',{}).get('url',''),
        })
    return out

# ── TRANSCRIPT ────────────────────────────────────────────────────────
def get_transcript(video_id):
    try:
        import subprocess
        r = subprocess.run(
            ['python3','-c',
             f'from youtube_transcript_api import YouTubeTranscriptApi;'
             f't=YouTubeTranscriptApi.get_transcript("{video_id}",languages=["tr","en"]);'
             f'print(" ".join([x["text"] for x in t[:120]]))'],
            capture_output=True, text=True, timeout=30
        )
        if r.returncode==0 and r.stdout.strip():
            return r.stdout.strip()[:5000]
    except: pass
    return None

# ── AI ÖZETLEME ───────────────────────────────────────────────────────
def summarize(title, content, channel):
    if not OPENAI_KEY:
        return _fallback(content)

    prompt = f"""Sen bir YouTube video analistsin. Bu videoyu izlemeden karar vermeme yardım et.

Kanal: {channel}
Video: {title}

İçerik:
{content[:4000]}

GÖREV: Aşağıdaki formatta cevap ver:

ÖZET:
[2-3 cümle Türkçe genel özet]

5 MADDE:
• [En kritik bilgi veya argüman]
• [İkinci önemli nokta]
• [Pratik çıkarım, öneri veya strateji]
• [Dikkat çeken veri, istatistik veya örnek]
• [Bu videoyu izlemeye değer mi? Kime hitap eder?]

ANAHTAR ALINTILAR:
- "[İngilizce veya Türkçe, kelimesi kelimesine önemli bir alıntı]"
- "[İkinci önemli alıntı varsa]"

ETİKETLER: [konuyla ilgili 3-5 kelime, virgülle ayrılmış]"""

    res = post_json(
        'https://api.openai.com/v1/chat/completions',
        {'model':'gpt-4o-mini','messages':[{'role':'user','content':prompt}],'max_tokens':600,'temperature':0.2},
        {'Authorization':f'Bearer {OPENAI_KEY}'}
    )
    if res and res.get('choices'):
        return res['choices'][0]['message']['content'].strip()
    return _fallback(content)

def _fallback(content):
    lines = [l.strip() for l in content.split('\n') if len(l.strip())>40][:5]
    bullets = '\n'.join(f'• {l[:150]}' for l in lines) or '• İçerik mevcut değil'
    return f'ÖZET:\n[Otomatik özet — API bağlantısı yok]\n\n5 MADDE:\n{bullets}\n\nANAHTAR ALINTILAR:\n- Mevcut değil\n\nETİKETLER: genel'

# ── PARSE: AI çıktısını yapılandırılmış JSON'a çevir ──────────────────
def parse_summary(raw_text, video):
    result = {
        'summary':   '',
        'bullets':   [],
        'quotes':    [],
        'tags':      [],
    }
    section = None
    for line in raw_text.splitlines():
        l = line.strip()
        if not l: continue
        if l.startswith('ÖZET:'): section='summary'; continue
        if l.startswith('5 MADDE:'): section='bullets'; continue
        if l.startswith('ANAHTAR ALINTILAR:'): section='quotes'; continue
        if l.startswith('ETİKETLER:'): 
            tags_raw = l.replace('ETİKETLER:','').strip()
            result['tags'] = [t.strip() for t in tags_raw.split(',') if t.strip()]
            section=None; continue
        if section=='summary' and l:
            result['summary'] += (' ' if result['summary'] else '') + l
        elif section=='bullets' and l.startswith('•'):
            result['bullets'].append(l[1:].strip())
        elif section=='quotes' and l.startswith('-'):
            q = l[1:].strip().strip('"').strip("'")
            if q and q != 'Mevcut değil': result['quotes'].append(q)
    return result

# ── ANA ───────────────────────────────────────────────────────────────
def main():
    print(f'YouTube Tracker — {datetime.now().strftime("%Y-%m-%d %H:%M UTC")}')

    config   = json.load(open('channels.json'))
    channels = config['channels']
    settings = config['settings']
    seen     = load_seen()

    # Mevcut summaries'i yükle (eskiler korunur, max 50)
    try:
        existing = json.load(open(OUT_FILE)).get('videos', [])
    except:
        existing = []

    new_videos = []

    for ch in channels:
        cid = ch.get('channel_id','')
        if not cid or cid.startswith('UCx'): 
            print(f'  {ch["name"]}: channel_id ayarlanmamış, atlanıyor')
            continue
        print(f'\n📡 {ch["name"]}')
        videos = get_videos(cid, settings.get('lookback_hours',25))
        print(f'  {len(videos)} video bulundu')

        for v in videos[:settings.get('max_videos_per_run',5)]:
            if v['id'] in seen:
                print(f'  Görüldü: {v["title"][:50]}')
                continue
            print(f'  İşleniyor: {v["title"][:60]}')

            transcript = get_transcript(v['id'])
            content    = transcript or v['description']
            raw        = summarize(v['title'], content, ch['name'])
            parsed     = parse_summary(raw, v)

            pub = datetime.fromisoformat(v['published'].replace('Z','+00:00'))

            entry = {
                'id':          v['id'],
                'title':       v['title'],
                'channel':     ch['name'],
                'category':    ch.get('category','Genel'),
                'url':         v['url'],
                'thumbnail':   v['thumbnail'],
                'published':   v['published'],
                'published_tr': pub.strftime('%d %b %Y, %H:%M'),
                'has_transcript': transcript is not None,
                'summary':     parsed['summary'],
                'bullets':     parsed['bullets'],
                'quotes':      parsed['quotes'],
                'tags':        parsed['tags'],
                'processed_at': datetime.now(timezone.utc).isoformat(),
            }
            new_videos.append(entry)
            seen[v['id']] = {'title':v['title'],'channel':ch['name'],'ts':entry['processed_at']}
            print(f'  ✓ İşlendi')
            time.sleep(2)

    # Tüm videoları birleştir, en yeni önce, max 50 tut
    all_videos = new_videos + existing
    all_videos = all_videos[:50]

    out = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'total': len(all_videos),
        'videos': all_videos,
    }
    with open(OUT_FILE,'w',encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    save_seen(seen)
    print(f'\n✅ {len(new_videos)} yeni video işlendi, toplam {len(all_videos)} kayıtlı')

if __name__ == '__main__':
    main()
