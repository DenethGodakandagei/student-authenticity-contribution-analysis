import datetime
from pymongo import MongoClient

client = MongoClient('mongodb+srv://root:root@cluster0.zufjtmd.mongodb.net/?appName=Cluster0')
db = client.test

def parse_dt(v):
    if not v: return None
    if isinstance(v, datetime.datetime):
        if v.tzinfo is None: v = v.replace(tzinfo=datetime.timezone.utc)
        return v
    if isinstance(v, str):
        try:
            return datetime.datetime.fromisoformat(v.replace('Z', '+00:00'))
        except Exception:
            return None
    return None

for s in db.vscodesessions.find({'student': {'$exists': True}}).sort('sessionStart', -1).limit(6):
    fa = s.get('fileActivities', [])
    times = []
    for f in fa:
        t = parse_dt(f.get('timestamp'))
        if t: times.append(t)
        for r in f.get('lineRecords', []):
            rt = parse_dt(r.get('timestamp'))
            if rt: times.append(rt)
    
    print('ID:', s['_id'], '| Stored dur:', s.get('durationMinutes'), 'min | Keystrokes:', s.get('keystrokes'))
    print('  sessionStart stored:', s.get('sessionStart'), '| sessionEnd:', s.get('sessionEnd'))
    if times:
        t_min = min(times).astimezone()
        t_max = max(times).astimezone()
        active_span_min = round((max(times) - min(times)).total_seconds() / 60.0, 1)
        print('  Earliest activity (Local):', t_min.strftime('%Y-%m-%d %I:%M:%S %p'))
        print('  Latest activity   (Local):', t_max.strftime('%Y-%m-%d %I:%M:%S %p'))
        print('  Actual Active Span:', active_span_min, 'minutes')
    print('-' * 60)
