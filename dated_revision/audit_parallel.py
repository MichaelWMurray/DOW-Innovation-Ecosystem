import json,collections
v=json.load(open('dated_revision/validation.json'));routes=json.load(open('dated_revision/connector_routes.json'));pos={n['label']:n['position'] for n in v['visible_organizations']}
gutters=collections.defaultdict(list)
for r in routes:
 for a,b in zip(r['points'],r['points'][1:]):
  if a[0]!=b[0] or abs(a[1]-b[1])<2:continue
  col=round((a[0]-66)/284)
  if 66+col*284-55<=a[0]<66+col*284:gutters[col].append((min(a[1],b[1]),max(a[1],b[1]),a[0],r['parent']))
maximum={};pairs=set()
for col,spans in gutters.items():
 points=sorted({p for s in spans for p in s[:2]});best=(0,[])
 for a,b in zip(points,points[1:]):
  mid=(a+b)/2;active=set((x,p) for lo,hi,x,p in spans if lo<mid<hi)
  if len(active)>best[0]:best=(len(active),[p for x,p in active])
  for x,p in active:
   for y,q in active:
    if p!=q:pairs.add(tuple(sorted((p,q))))
 maximum[col]=best
print(json.dumps(maximum,indent=2))
json.dump({'gutters':maximum,'parallel_parent_pairs':sorted(pairs)},open('dated_revision/parallel_audit.json','w'),indent=2)
