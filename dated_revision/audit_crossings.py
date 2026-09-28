import json,collections,itertools
from pathlib import Path
r=json.load(open('dated_revision/connector_routes.json'));v=json.load(open('dated_revision/validation.json'))
coords={n['label']:n['position'] for n in v['visible_organizations']}
segments=set()
for route in r:
 for a,b in zip(route['points'],route['points'][1:]):
  if a!=b:segments.add((route['parent'],tuple(a),tuple(b)))
hs=[(p,min(a[0],b[0]),max(a[0],b[0]),a[1]) for p,a,b in segments if a[1]==b[1]]
vs=[(p,a[0],min(a[1],b[1]),max(a[1],b[1])) for p,a,b in segments if a[0]==b[0]]
hits={}
for p,x1,x2,y in hs:
 for q,x,y1,y2 in vs:
  if p==q:continue
  if x1<=x<=x2 and y1<=y<=y2:
   key=(tuple(sorted([p,q])),x,y)
   hits[key]={'parents':list(key[0]),'point':[x,y],'kind':'crossing' if x1<x<x2 and y1<y<y2 else 'touch'}
items=list(hits.values())
for h in items:
 x,y=h['point'];h['nearest_cards']=[n for n in sorted(coords,key=lambda n:abs(coords[n][0]+96-x)+abs(coords[n][1]+34-y))[:2]]
Path('dated_revision/crossing_audit.json').write_text(json.dumps(items,indent=2))
print('TOTAL',len(items),collections.Counter(h['kind'] for h in items))
counts=collections.Counter(tuple(h['parents']) for h in items)
for pair,count in counts.most_common():print(count,' / '.join(pair))
