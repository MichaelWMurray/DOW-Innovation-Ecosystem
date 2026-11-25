"""Inventory-wide single-organization screening. No budget amounts are inferred here."""
import json,re
from pathlib import Path
GENERIC={'Army','Navy','ManTech','SBIR/STTR','SecDef','JS','MII'}
AMBIGUOUS={'DOTC','SDA','NAVWAR','SSC','MDA','DIA','NSC','AMC','ARM','AC','SC','P1','APEX','Lift','SWAP','SWIA','NEST','STIB','NSPPC'}
EXTERNAL=['INSCOM','PdM-IW','Air Force Institute of Technology','United States Air Force Academy','National Science Foundation','National Academy of Sciences','Lockheed Martin','Northrop Grumman','Raytheon','Boeing','General Dynamics','BAE Systems','Georgia Tech Research Institute','Massachusetts Institute of Technology','United States Army Research Institute','Space and Missile Defense Technical Center','United States Army Medical Research Institute of Infectious Diseases','United States Army Medical Research Institute for Chemical Defense','Defense Finance and Accounting Service','Air Force Test Center','Department of Energy','Department of Homeland Security','National Aeronautics and Space Administration']
def norm(s):return re.sub(r'[^a-z0-9]+',' ',s.lower()).strip()
def names(n):
 name=re.sub(r'\s*\([^)]*\)\s*$','',n['name']);out=[name]
 if name.startswith('DEVCOM '):out.append(name[7:])
 for prefix in ([] if n.get('acronym') in ['USAF','USSF','USMC'] else ['U.S. ','United States ','US ']):
  if name.startswith(prefix):out.append(name[len(prefix):])
 aliases={'USAF':['U.S. Air Force'],'USSF':['U.S. Space Force'],'USMC':['U.S. Marine Corps'],'AFRL':['Air Force Research Lab','AF Research Laboratory'],'DEVCOM':['Combat Capabilities Development Command'],'NRL':['Naval Research Lab'],'GVSC':['Ground Vehicle System Center'],'AC':['Armaments Center','Armament Center'],'MRDC':['Army Medical Research and Development Command','Medical Research and Development Command'],'C5ISR':['Command, Control, Computers, Communications, Cyber, Intelligence, Surveillance and Reconnaissance Center'],'NIWC Atlantic':['Naval Information Warfare Center Atlantic'],'NIWC Pacific':['Naval Information Warfare Center Pacific'],'NSWC Crane':['Naval Surface Warfare Center Crane Division'],'MIT LL':['MIT Lincoln Laboratory']}
 out+=aliases.get(n.get('acronym'),[])
 return [x for x in set(out) if len(norm(x).split())>=2 and len(norm(x))>=8]
def narrative(r):
 parts=[r.get('title'),r.get('mission'),r.get('note'),r.get('screeningSourceText')]
 for p in r['projects']:
  parts.extend([p.get('title'),p.get('mission'),p.get('screeningActivityText')])
  for a in p.get('activities',[]):parts.extend([a.get('title'),a.get('description'),a.get('plan')])
 return '\n'.join(str(s) for s in parts if s)
_names={}
def screen(r,inventory):
 s=narrative(r);ns=norm(s);hits=[]
 for n in inventory:
  ac=n.get('acronym') or '';patterns=_names.setdefault(n['id'],[(a,norm(a)) for a in names(n)])
  for alias,an in patterns:
   if an not in ns:continue
   for m in re.finditer(r'(?<!\w)'+re.escape(an)+r'(?!\w)',ns):hits.append({'id':n['id'],'name':n['name'],'acronym':ac,'start':m.start(),'end':m.end(),'text':ns[max(0,m.start()-90):m.end()+180],'kind':'name'})
  # Short or polysemous acronyms require expanded-name evidence. Generic component nouns
  # and issuing headers do not establish a separately named funded organization.
  if ac in GENERIC or ac in AMBIGUOUS or ac not in s:continue
  if ((len(ac)>=4 and ac.upper()==ac and ' ' not in ac) or ac in ['NRL','ONR','NSA','DLA','NGA','NGB','DIU']):
   for m in re.finditer(r'(?<![A-Za-z0-9])'+re.escape(ac)+r'(?![A-Za-z0-9])',s):
    # Evidence positions are normalized separately, for containment only.
    idx=len(norm(s[:m.start()]));hits.append({'id':n['id'],'name':n['name'],'acronym':ac,'start':idx,'end':idx+len(ac),'text':s[max(0,m.start()-90):m.end()+180],'kind':'acronym'})
 # A parent name embedded inside an explicitly named subordinate is a single mention.
 chosen=[h for h in hits if not any(z['id']!=h['id'] and z['kind']=='name' and z['start']<=h['start'] and z['end']>=h['end'] and z['end']-z['start']>h['end']-h['start'] for z in hits)]
 found={h['id']:h for h in chosen}
 external=[]
 for a in EXTERNAL:
  if norm(a) not in ns:continue
  for m in re.finditer(r'(?<!\w)'+re.escape(norm(a))+r'(?!\w)',ns):
   if not any(h['start']<=m.start() and h['end']>=m.end() for h in chosen if h['kind']=='name'):external.append(a)
 org_pattern=r"(?P<name>(?:(?:[A-Z][A-Za-z&'.-]*|of|the|and|for|in)\s+){1,12}(?:Agency|Command|Center|Laboratory|University|Institute|Office|Council|Service|Corporation|Division|Department|Association|School))\s*\((?P<ac>[A-Z][A-Za-z0-9/& -]{1,20})\)"
 for m in re.finditer(org_pattern,s):
  candidate=m['name'].strip();cn=norm(candidate)
  if cn in ['department of defense','department of war']:continue
  if not any(norm(a) in cn or cn in norm(a) for n in inventory for a in names(n)):external.append(candidate)
 for m in re.finditer(r'\b(?:PMA|PMW|PMS|PMX)[ -]?\d{2,4}\b|\bPdM [A-Z][A-Za-z0-9& -]{2,65}|\bPEO [A-Z][A-Z0-9&/ -]{1,45}',s):external.append(m[0].strip())
 return {'pe':r['number'],'appropriation':r['appropriation'],'ba':r['ba'],'amount':r['amount'],'organizations':[{k:h[k] for k in ['id','name','acronym','text']} for h in found.values()],'otherNamedOrganizations':sorted(set(external)),'sole':next(iter(found)) if len(found)==1 and not external else None}
def apply_policy(D,catalog,relationship,approve,questions):
 loaded={n['id']:n for n in D['nodes']};checks=[];assigned=[];conflicts=[]
 for r in catalog.values():
  check=screen(r,D['hierarchy']);checks.append(check)
  if check['sole'] not in loaded or r['amount'] is None:continue
  n=loaded[check['sole']]
  other=[o['acronym'] for o in D['nodes'] if o['id']!=n['id'] and any(z['contextScope'] and (z['appropriation'],z['number'],z['ba'])==(r['appropriation'],r['number'],r['ba']) for z in o['relationships'])]
  if other:conflicts.append({**check,'existingScopedOwners':other});continue
  evidence=check['organizations'][0]['text']
  approve(n['acronym'],r,evidence=evidence,basis='User single-organization rule: exactly one identified organization in the available PE narrative, projects and activity text, with no explicitly identified second organization. Assign the published PE amount to that entity. Rule-based assignment; not independently verified institutional funding.')
  z=relationship(n['acronym'],r)
  if not z['projects']:
   import copy
   z['projects']=copy.deepcopy(r['projects'])
  z['assignmentPolicy']={'kind':'user-single-organization-rule','inferred':True,'namedOrganization':n['id'],'evidence':evidence}
  assigned.append({**check,'org':n['acronym']})
 resolved={(c['sole'],c['appropriation'],c['pe'],c['ba']) for c in assigned}
 questions=[q for q in questions if (q['organizationId'],q['appropriation'],q['pe'],q['ba']) not in resolved]
 return {'rule':'Assign the complete published PE request when only one organization is identified in available source narratives. Explicit multiple organizations prevent this assignment. Existing reviewed shared-project allocations are preserved.','screenedRecords':len(checks),'assignedRecords':len(assigned),'assignments':assigned,'conflicts':conflicts,'multiOrganizationRecords':sum(len(c['organizations'])>1 or bool(c['otherNamedOrganizations']) for c in checks)},questions
if __name__=='__main__':
 root=Path(__file__).resolve().parents[1];d=json.loads((root/'public/data.json').read_text());rs=json.loads((root/'import_work/scope-catalog.json').read_text());checks=[screen(r,d['hierarchy']) for r in rs];(root/'import_work/sole-org-screen.json').write_text(json.dumps(checks,indent=2));loaded={n['id']:n for n in d['nodes']};sole=[r for r in checks if r['sole'] in loaded];print('sole loaded',len(sole),'orgs',len(set(r['sole'] for r in sole)))
 for r in sole:print(loaded[r['sole']]['acronym'],r['pe'],r['ba'],r['amount'])
