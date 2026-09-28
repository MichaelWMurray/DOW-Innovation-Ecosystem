import json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
import build_dated as b
p=Path(__file__).resolve().parent
v=json.load(open(p/'validation.json'));a=json.load(open(p/'parallel_audit.json'));c=json.load(open(p/'connector_colors.json'))
assert v['expected_visible']==v['rendered_cards']==len(b.V)
for k in ['missing','duplicates','card_overlaps','connector_card_crossings','text_overflows']:assert not v[k],(k,v[k])
assert not json.load(open(p/'crossing_audit.json'))
assert max(z[0] for z in a['gutters'].values())<=2
assert all(c.get(x,0)!=c.get(y,0) for x,y in a['parallel_parent_pairs'])
bad=[]
for r in json.load(open(p/'connector_routes.json')):
 for a,z in zip(r['points'],r['points'][1:]):
  if a[1]!=z[1] or a==z:continue
  lo,hi=sorted([a[0],z[0]]);y=a[1]
  for n in b.pos:
   x,cy,w,h=b.card_box(n);bw=3.8 if n in b.EMPHASIZED else (2.7 if b.d[n]['type'] in b.BORDER_COLORS else .9)
   if max(lo,x+2)<min(hi,x+w-2):
    dist=max(cy-y,y-cy-h)
    if dist<bw/2+.9+1:bad.append((r['parent'],n,round(dist,2),y))
assert not bad,bad
for title,col,top,bottom,members in b.groups:
 gx=b.X0+col*b.DX-6;gy=top-3;gw=b.CW+12
 for n in b.pos:
  if n in members:continue
  x,y,w,h=b.card_box(n);pad=1.9 if n in b.EMPHASIZED else 1.35
  assert not(max(x-pad,gx-.7)<min(x+w+pad,gx+gw+.7) and max(y-pad,gy-.7)<min(y+h+pad,bottom+.7)),(title,n)
report={'expected_cards':len(b.V),'horizontal_connector_border_clearance_failures':bad,'minimum_extra_clearance_beyond_strokes':1,'group_overlaps':0,'unrelated_crossings':0,'maximum_parallel_lines':2}
(p/'clearance_validation.json').write_text(json.dumps(report,indent=2));print(report)
