import sys,re,json,hashlib,collections
from pathlib import Path
from decimal import Decimal,InvalidOperation
import xml.etree.ElementTree as E
def text(e):return ' '.join(' '.join(e.itertext()).split())
def blocks(e):
 if e.tag in ('Table','P','H2','H4','LBody'):yield e
 else:
  for c in e:yield from blocks(c)
def value(s):
 try:return float(Decimal(s.replace(',','')))
 except InvalidOperation:return None
pes={};sources=[];conflicts=[];raw_totals=0
for f in sorted(Path(sys.argv[1]).glob('2026_RDTE_*Force*.xml')):
 b=f.read_bytes();r=E.fromstring(re.sub(rb'&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)',b'&amp;',b));assert r.tag=='TaggedPDF-doc';sources.append({'file':f.name,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)})
 pe=pr=None;ex=None
 for i,e in enumerate(blocks(r)):
  t=text(e);m=re.search(r'Exhibit (R-[2345]A?)\b',t)
  if m:ex=m[1]
  rows=[[text(c) for c in row if c.tag in ('TD','TH')] for row in e.findall('./TR')] if e.tag=='Table' else []
  raw_totals+=sum(bool(cs and cs[0]=='Total Program Element') for cs in rows)
  m=re.search(r'R-1 Program Element \(Number/Name\)\s*PE\s+(\w+)\s*/\s*(.*?)(?=Project \(Number/Name\)|COST \(\$|$)',t)
  if m:
   ba=re.search(r'(?:3600|3620|6\.0)[^/]*?/\s*(?:BA\s*)?(\d+)',t)
   pe=pes.setdefault(m[1]+'|'+(ba[1] if ba else 'unknown'),{'number':m[1],'title':m[2].strip(),'agency':'Air Force / Space Force','appropriation':'unresolved','ba':int(ba[1]) if ba else None,'funding':{},'projects':{},'blocks':[]});pr=None
   pm=re.search(r'Project \(Number/Name\)\s*(\w+)\s*/\s*(.*?)(?=COST \(\$|$)',t)
   if pm:pr=pe['projects'].setdefault(pm[1],{'number':pm[1],'title':pm[2].strip(),'funding':{},'blocks':[],'activityRows':[]})
  if not pe:continue
  dst=pr or pe;block={'file':f.name,'block':i,'exhibit':ex,'text':t}
  if rows:block['rows']=rows
  dst['blocks'].append(block);header=None
  for cs in rows:
   if any('COST ($ in Millions)' in c for c in cs) and any('FY 2026 Total' in c for c in cs):header=cs;continue
   if header and len(cs)==len(header):
    dest=None
    if cs[0]=='Total Program Element' and not pr:dest=pe
    pm=re.match(r'^(\w+):\s*(.+)$',cs[0])
    if pm and (not pr or pm[1]==pr['number']):dest=pe['projects'].setdefault(pm[1],{'number':pm[1],'title':pm[2],'funding':{},'blocks':[],'activityRows':[]})
    if dest is not None:
     for j,h in enumerate(header):
      fy=re.fullmatch(r'FY (20\d\d)(?: (Base|OOC|Total))?',h)
      if fy:
       key=fy[1]+'_'+(fy[2] or 'total').lower();v=value(cs[j]);old=dest['funding'].get(key)
       if key in dest['funding'] and old!=v:conflicts.append({'pe':pe['number'],'record':dest['number'],'column':key,'old':old,'new':v})
       else:dest['funding'][key]=v
   if pr and cs and cs[0].startswith('Title:'):pr['activityRows'].append({'file':f.name,'block':i,'cells':cs})
checks=[]
for p in pes.values():
 p['projects']=list(p['projects'].values())
 for q in [p]+p['projects']:
  f=q['funding'];base=f.get('2026_base');total=f.get('2026_total');ooc=f.get('2026_ooc')
  if base is not None and total is not None and abs(base+(ooc or 0)-total)>.0011:checks.append({'kind':'base_total_difference','record':q['number']})
 vals=[q['funding'].get('2026_total') for q in p['projects']];total=p['funding'].get('2026_total')
 if vals and total is not None and all(v is not None for v in vals) and abs(sum(vals)-total)>.005:checks.append({'kind':'project_sum_difference','pe':p['number'],'peTotal':total,'projectSum':round(sum(vals),3)})
summary={'files':len(sources),'PEs':len(pes),'sourceTotalPERows':raw_totals,'projects':sum(len(p['projects']) for p in pes.values()),'activityTableRows':sum(len(q['activityRows']) for p in pes.values() for q in p['projects']),'PE_FY2026_total_m':round(sum(p['funding'].get('2026_total') or 0 for p in pes.values()),3),'missingPETotalColumns':[p['number'] for p in pes.values() if '2026_total' not in p['funding']],'missingProjectTotalColumns':[p['number']+'/'+q['number'] for p in pes.values() for q in p['projects'] if '2026_total' not in q['funding']],'conflicts':conflicts,'arithmeticExceptions':checks,'byBA':dict(collections.Counter(p['ba'] for p in pes.values()))}
output={'fiscalYear':2026,'basis':'Discretionary President’s Budget request. Not enacted or mandatory funding.','sources':sources,'summary':summary,'programElements':list(pes.values()),'limitations':['Activity rows preserve complete source cells, including page continuations; they are not independently summed.','Dash cells are preserved in source tables; parsed numeric values remain null, never silently zero.','PE subtotal has not been reconciled to the complete Army appropriation or classified funding.','Organization allocations are not inferred.']}
Path(sys.argv[2]).write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')));print(json.dumps(summary,indent=2))
