"""Merge reviewed service imports into the existing application without parent funding inheritance."""
import json,re,hashlib,sys,xml.etree.ElementTree as E
from pathlib import Path
root=Path(__file__).resolve().parents[1];work=root/'import_work';src=Path(sys.argv[1]) if len(sys.argv)>1 else Path('integration_sources')
d=json.loads(((work/'base-data.json') if (work/'base-data.json').exists() else root/'public/data.json').read_text());
for node in d['nodes']:node['relationships']=[r for r in node['relationships'] if not r.get('importedService')]
manifest=json.loads((src/'manifest.json').read_text());files={f['name']:f for f in manifest}
def url(name):return 'https://drive.google.com/file/d/'+files[name]['id']+'/view'
def key(s):return hashlib.sha256(s.encode()).hexdigest()[:16]
def norm(t):return ' '.join(t.split())
records=[]
for dataset in ['Army_FY2026_Processed.json','AFSF.json']:
 x=json.loads((work/dataset).read_text())
 for p in x['programElements']:
  first=p['blocks'][0]['file'];agency='Army' if dataset.startswith('Army') else ('Space Force' if 'SpaceForce' in first else 'Air Force');appn={'Army':'2040','Air Force':'3600','Space Force':'3620'}[agency]
  source=(url(first) if first in files else 'https://drive.google.com/drive/folders/18ATR7z-YeflTPknecDp6CjzLHsC1CbXY')
  blocks=[b for b in p['blocks'] if not b.get('rows')];mission='\n'.join(b['text'] for b in blocks)
  projects=[]
  for q in p['projects']:
   projects.append({'id':key(agency+p['number']+str(p['ba'])+q['number']),'number':q['number'],'title':q['title'],'amount':q['funding'].get('2026_total'),'mission':'\n'.join(b['text'] for b in q['blocks'] if not b.get('rows')),'activities':[{'id':key(first+str(a['block'])),'title':a['cells'][0][:110],'description':a['cells'][0],'plan':None,'amount':None} for a in q['activityRows']]})
  records.append({'id':key(appn+'|'+p['number']+'|'+str(p['ba'])),'number':p['number'],'title':p['title'],'agency':agency,'appropriation':appn,'ba':p['ba'],'amount':p['funding'].get('2026_total'),'mission':mission,'projects':projects,'file':first,'source':source})
navy=E.parse(src/'2026_RDTE_Navy-MarineCorps_Master.xml').getroot()
def child(el,name):return next((x for x in el if x.tag.split('}')[-1]==name),None)
def val(el,name):
 c=child(el,name);return ''.join(c.itertext()).strip() if c is not None else None
def fund(el,name):
 c=child(el,name);v=val(c,'BudgetYearOne') if c is not None else None
 try:return float(v)
 except:return None
for p in navy.iter():
 if p.tag.split('}')[-1]!='ProgramElement':continue
 n=val(p,'ProgramElementNumber');ba=int(val(p,'BudgetActivityNumber'));projects=[]
 for q in p.iter():
  if q.tag.split('}')[-1]!='Project':continue
  num=val(q,'ProjectNumber') or val(q,'ProjectCode') or 'Unspecified'
  projects.append({'id':key(n+str(ba)+num),'number':num,'title':val(q,'ProjectTitle') or num,'mission':next((''.join(z.itertext()).strip() for z in q.iter() if z.tag.split('}')[-1]=='ProjectMissionDescription'),''),'amount':fund(q,'ProjectFunding'),'activities':[]})
 records.append({'id':key('1319|'+n+'|'+str(ba)),'number':n,'title':val(p,'ProgramElementTitle'),'agency':'Navy','appropriation':'1319','ba':ba,'amount':fund(p,'ProgramElementFunding'),'mission':val(p,'ProgramElementMissionDescription') or '', 'projects':projects,'file':'2026_RDTE_Navy-MarineCorps_Master.xml','source':url('2026_RDTE_Navy-MarineCorps_Master.xml')})
# DHP R-2 PDF extraction: preserve all pages; only explicit total-row columns become amounts.
dhp={}
for page,t in enumerate(json.loads((work/'DHP-pages.json').read_text()),1):
 if not re.search(r'Exhibit R-2(?:A)?[,\s]',t):continue
 m=re.search(r'R-1 Program Element \(Number/Name\)\s*PE\s+(\w+)\s*/\s*([^\n]+)',t)
 if not m:continue
 n,title=m.groups();r=dhp.setdefault(n,{'id':key('0130|'+n),'number':n,'title':title,'agency':'Defense Health Agency','appropriation':'0130','ba':None,'amount':None,'mission':'','projects':[],'file':'2026_RDTE_DefenseHealth_Vols01-02.pdf','source':url('2026_RDTE_DefenseHealth_Vols01-02.pdf')})
 r['mission']+='\nPDF page '+str(page)+'\n'+t
 row=re.search(r'Total Program Element([^\n]+)',t)
 if row:
  nums=re.findall(r'(?<!\w)(?:-?|[\d,]+\.\d+)(?!\w)',row[1]);nums=[x for x in nums if x]
  if len(nums)>=6:
   vals=[None if v=='-' else float(v.replace(',','')) for v in nums[:6]]
   if vals[3] is not None and vals[5] is not None and abs(vals[3]+(vals[4] or 0)-vals[5])<.0011:r['amount']=vals[5]
records.extend(dhp.values())
# Match the existing 74 entities only; preserve original retained roster and relationships.
added=0;scope_added=[]
for org in d['nodes']:
 terms=[org['name'],re.sub(r'\s*\([^)]*\)\s*$','',org['name'])]
 ac=org.get('acronym') or ''
 if len(ac)>=4 or ac in ['ONR','NRL','SDA','OSC']:terms.append(ac)
 pattern=re.compile(r'(?<!\w)(?:'+'|'.join(re.escape(t) for t in set(terms) if t)+r')(?!\w)',re.I)
 for r in records:
  # Use PE and project narrative evidence, rather than boilerplate repeated funding headers.
  hits=[('PE mission',r['mission'])]+[(q['number'],q['mission'] or '') for q in r['projects']]
  matches=[(place,text,pattern.search(text)) for place,text in hits if pattern.search(text)]
  if not matches:continue
  if any(x['id']==r['id'] for x in org['relationships']):continue
  place,text,m=matches[0];rr=dict(r);rr.update(fy=2026,measure='total',attributedAmount=None,checks=[],officialStatus='Source import validated; organization association awaits allocation review',tier='Service import — explicit narrative match',role='Explicit organization reference in '+place,disposition='Imported association; not an organization allocation',contextScope=False,contextBasis=None,evidence=text[max(0,m.start()-180):m.end()+300],importedService=True)
  # Restrict detail payload to projects with an explicit organization reference; source contains complete PE.
  rr['projects']=[q for q in r['projects'] if pattern.search(q['mission'] or '')]
  # ONR mission statements explicitly describe office responsibilities; use program context only.
  if ac=='ONR' and r['agency']=='Navy' and r['ba'] in [1,2,3] and re.search(r"Office of Naval Research.{0,30}mission",r['mission'],re.I):
   rr['contextScope']=True;rr['contextBasis']='PE mission explicitly states ONR mission and responsibilities. PE program context, not a verified organization allocation.';scope_added.append(r['number'])
  org['relationships'].append(rr);added+=1
 # Recalculate scope including the reviewed BioMADE activity component.
 seg={}
 for r in org['relationships']:
  if r['contextScope']:
   for c in r.get('contextComponents') or [r]:
    if c.get('amount') is not None:seg[str(c['ba'])]=seg.get(str(c['ba']),0)+c['amount']
 org['contextSegments']=seg;org['contextAmount']=sum(seg.values()) if seg else None
sources_count={'Army':232,'Air Force / Space Force':334,'Navy / Marine Corps':252}
d['audit']['serviceImport']={'peRecords':len(records),'sources':sources_count,'addedOrgPeAssociations':added,'ONRscopePEs':scope_added,'originalRetainedRelationships':323,'fundingBasis':'FY2026 source request totals; source-specific mandatory/reconciliation treatment must be retained','DHP':{'PEs':len(dhp),'PEsWithAmount':sum(r['amount'] is not None for r in dhp.values()),'basis':'PDF R-2 total rows; appropriation BA2 is not mapped to lifecycle BA1-8'}}
d['audit']['sourceCoverage']='Defense-wide original collection plus Army, Air Force, Space Force and Navy/Marine Corps service imports. DHP R-2 PDF records also imported; its appropriation BA2 remains unmapped to the lifecycle categories.'
d['audit']['limitations']=[s for s in d['audit']['limitations'] if 'Army, Navy and Air Force books absent' not in s]
d['audit']['limitations']+=['New service narrative matches are associations, not verified allocations. Only explicitly scoped programs affect bubbles.','Army and AF/SF imported from tagged XML tables. Navy master uses DTIC structured XML.','Service profiles display explicitly matched project narratives; complete PE details remain in the linked source.','DHP PDF records retain page text. Its appropriation-level BA2 is not conflated with RDT&E lifecycle BA6.2; DHP amounts remain associated context only.']
(root/'public/data.json').write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')))
(work/'service-import-audit.json').write_text(json.dumps(d['audit']['serviceImport'],indent=2));print(json.dumps(d['audit']['serviceImport']));print('app dataset bytes',(root/'public/data.json').stat().st_size)
