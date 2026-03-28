#!/usr/bin/env python3
"""
YouTube Tracker — RSS tabanlı
Özet: BİLGİ · ÖNERİ · DİKKAT · ANAHTAR FİKİR · KARAR
"""

import os, json, time
from datetime import datetime, timedelta, timezone
from urllib.request import urlopen, Request
from xml.etree import ElementTree as ET

OPENAI_KEY = os.environ.get('OPENAI_API_KEY', '')
SEEN_FILE  = 'data/seen.json'
OUT_FILE   = 'data/summaries.json'

def get(url, timeout=15):
    try:
        req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urlopen(req, timeout=timeout) as r:
            return r.read().decode('utf-8')
    except Exception as e:
        print(f'  GET hata: {e}')
        return None

def post_json(url, data, hdrs=None):
    body = json.dumps(data).encode('utf-8')
    h = {'Content-Type': 'application/json'}
    if hdrs: h.update(hdrs)
    req = Request(url, data=body, headers=h)
    try:
        with urlopen(req, timeout=25) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:
        print(f'  POST hata: {e}')
        return None

def load_seen():
    try:
        with open(SEEN_FILE) as f: return json.load(f)
    except: return {}

def save_seen(s):
    with open(SEEN_FILE, 'w') as f: json.dump(s, f, indent=2)

def get_videos_rss(channel_id, hours=48):
    url = f'https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}'
    raw = get(url)
    if not raw: return []
    ns = {'yt': 'http://www.youtube.com/xml/schemas/2015',
          'media': 'http://search.yahoo.com/mrss/',
          'atom': 'http://www.w3.org/2005/Atom'}
    try:
        root = ET.fromstring(raw)
    except: return []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    videos = []
    for entry in root.findall('atom:entry', ns):
        vid_id  = entry.findtext('yt:videoId', namespaces=ns)
        title   = entry.findtext('atom:title', namespaces=ns) or ''
        pub     = entry.findtext('atom:published', namespaces=ns) or ''
        channel = entry.findtext('atom:author/atom:name', namespaces=ns) or ''
        desc, thumb = '', ''
        media = entry.find('media:group', ns)
        if media is not None:
            desc  = media.findtext('media:description', namespaces=ns) or ''
            te    = media.find('media:thumbnail', ns)
            thumb = te.get('url', '') if te is not None else ''
        if not vid_id: continue
        try:
            pub_dt = datetime.fromisoformat(pub.replace('Z', '+00:00'))
        except:
            pub_dt = datetime.now(timezone.utc)
        if pub_dt < cutoff: continue
        videos.append({
            'id': vid_id, 'title': title,
            'description': desc[:800],
            'published': pub_dt.isoformat(),
            'channel': channel,
            'url': f'https://youtube.com/watch?v={vid_id}',
            'thumbnail': thumb,
        })
    return videos

def get_transcript(video_id):
    try:
        import subprocess
        r = subprocess.run(
            ['python3', '-c',
             f'from youtube_transcript_api import YouTubeTranscriptApi;'
             f't=YouTubeTranscriptApi.get_transcript("{video_id}",languages=["tr","en"]);'
             f'print(" ".join([x["text"] for x in t[:150]]))'],
            capture_output=True, text=True, timeout=30
        )
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip()[:6000]
    except: pass
    return None

def summarize(title, content, channel):
    if not OPENAI_KEY:
        return _fallback(title, content, channel)

    prompt = f"""Sen iş dünyasına yönelik içerik analisti olarak çalışıyorsun.
Bu YouTube videosunu analiz et. İş insanı için somut, uygulanabilir özet çıkar.
Show, motivasyon, tanıtım kısımlarını yoksay. Sadece gerçek bilgi ve strateji.

Kanal: {channel}
Başlık: {title}

İçerik:
{content[:5000]}

ZORUNLU FORMAT — Türkçe, her başlık yeni satırda:

BİLGİ:
[Videodaki en önemli 2-3 somut veri, gerçek veya kavram. Spesifik ol, jenerik olma.]

ÖNERİ:
[2-3 hemen uygulanabilir öneri. "Şunu yap" formatında, net ve doğrudan.]

DİKKAT:
[1-2 risk, uyarı veya yaygın hata.]

ANAHTAR FİKİR:
[Videonun özü tek cümlede.]

KARAR:
[Kim izlemeli, kim izlememeli? Tek cümle.]"""

    res = post_json(
        'https://api.openai.com/v1/chat/completions',
        {'model': 'gpt-4o-mini',
         'messages': [{'role': 'user', 'content': prompt}],
         'max_tokens': 600, 'temperature': 0.15},
        {'Authorization': f'Bearer {OPENAI_KEY}'}
    )
    if res and res.get('choices'):
        return res['choices'][0]['message']['content'].strip()
    return _fallback(title, content, channel)

def _fallback(title, content, channel):
    lines = [l.strip() for l in content.split('\n')
             if len(l.strip()) > 40
             and not l.strip().startswith('http')
             and not any(x in l.lower() for x in
                         ['subscribe','follow','instagram','twitter','abone','like','streamyard','discord'])]
    info   = lines[0] if len(lines) > 0 else 'İçerik mevcut değil.'
    oneri  = lines[1] if len(lines) > 1 else 'Videoyu izleyerek detay edinin.'
    dikkat = lines[2] if len(lines) > 2 else 'Ek araştırma önerilir.'
    return f"BİLGİ:\n{info}\n\nÖNERİ:\n{oneri}\n\nDİKKAT:\n{dikkat}\n\nANAHTAR FİKİR:\n{title}\n\nKARAR:\n{channel} takipçileri ve konuyla ilgilenenler için."

def parse(raw):
    r = {'info': [], 'advice': [], 'warning': [], 'key_idea': '', 'decision': ''}
    section = None
    for line in raw.splitlines():
        l = line.strip()
        if not l: continue
        if l.startswith('BİLGİ:'):         section='info';     continue
        if l.startswith('ÖNERİ:'):         section='advice';   continue
        if l.startswith('DİKKAT:'):        section='warning';  continue
        if l.startswith('ANAHTAR FİKİR:'): section='key';      continue
        if l.startswith('KARAR:'):         section='decision'; continue
        if section == 'info':     r['info'].append(l.lstrip('•-– '))
        elif section == 'advice': r['advice'].append(l.lstrip('•-– '))
        elif section == 'warning':r['warning'].append(l.lstrip('•-– '))
        elif section == 'key' and not r['key_idea']:    r['key_idea']  = l
        elif section == 'decision' and not r['decision']:r['decision'] = l
    return r

def main():
    print(f'YouTube Tracker — {datetime.now().strftime("%Y-%m-%d %H:%M UTC")}')
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
            print(f'  {ch["name"]}: channel_id eksik'); continue
        print(f'\n📡 {ch["name"]}')
        videos = get_videos_rss(cid, settings.get('lookback_hours', 48))
        print(f'  {len(videos)} video')
        for v in videos[:settings.get('max_videos_per_run', 5)]:
            if v['id'] in seen:
                print(f'  Görüldü: {v["title"][:50]}'); continue
            print(f'  İşleniyor: {v["title"][:60]}')
            transcript = get_transcript(v['id'])
            content    = transcript or v['description']
            raw        = summarize(v['title'], content, ch['name'])
            p          = parse(raw)
            pub        = datetime.fromisoformat(v['published'])
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
                'info':          p['info'],
                'advice':        p['advice'],
                'warning':       p['warning'],
                'key_idea':      p['key_idea'],
                'decision':      p['decision'],
                'processed_at':  datetime.now(timezone.utc).isoformat(),
            }
            new_videos.append(entry)
            seen[v['id']] = {'title': v['title'], 'channel': ch['name'], 'ts': entry['processed_at']}
            print(f'  ✓')
            time.sleep(1)

    all_videos = (new_videos + existing)[:60]
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({'generated_at': datetime.now(timezone.utc).isoformat(),
                   'total': len(all_videos), 'videos': all_videos},
                  f, ensure_ascii=False, indent=2)
    save_seen(seen)
    print(f'\n✅ {len(new_videos)} yeni, toplam {len(all_videos)} video')

if __name__ == '__main__':
    main()
