"""Evidence-based scope review; source values are looked up, never supplied in scope rules.
Run with service source directory. Default emits candidates; --apply applies reviewed rules.
"""
import json,re,hashlib,sys,copy,xml.etree.ElementTree as E
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];W=ROOT/'import_work';SRC=Path(sys.argv[1]);D=json.loads((ROOT/'public/data.json').read_text())
def key(s):return hashlib.sha256(s.encode()).hexdigest()[:16]
def clean(s):return ' '.join((s or '').split())
def tag(e):return e.tag.split('}')[-1]
def v(e,name):return next((''.join(x.itertext()).strip() for x in e if tag(x)==name),'') if e is not None else ''
def descendant(e,name):return next((''.join(x.itertext()).strip() for x in e.iter() if tag(x)==name),'')
def amount(e,name):
 try:return float(v(next((x for x in e if tag(x)==name),None),'BudgetYearOne'))
 except ValueError:return None
catalog={}
for n in D['nodes']:
 for r in n['relationships']:catalog.setdefault((r['appropriation'],r['number'],r['ba']),copy.deepcopy(r))
manifest={f['name']:f['id'] for f in json.loads((SRC/'manifest.json').read_text())}
if (SRC/'army-manifest.json').exists():manifest.update({f['name']:f['id'] for f in json.loads((SRC/'army-manifest.json').read_text())})
army_parts=['1','2','3','4A','4B','5A','5B','5C','5D','6','7','8','9']
def source_name(f):
 m=re.search(r'Budget Activity (\d+[A-D]?)\.xml$',f)
 return '2026_RDTE_Army_Part'+str(army_parts.index(m[1])+1).zfill(2)+'_BA'+re.sub(r'^\d+',lambda z:z[0].zfill(2),m[1])+'.xml' if m else f
for filename in ['Army_FY2026_Processed.json','AFSF.json']:
 source=json.loads((W/filename).read_text())
 for p in source['programElements']:
  first=source_name(p['blocks'][0]['file']);agency='Army' if filename.startswith('Army') else ('Space Force' if 'SpaceForce' in first else 'Air Force');ap={'Army':'2040','Air Force':'3600','Space Force':'3620'}[agency];ck=(ap,p['number'],p['ba'])
  projects=[]
  for q in p['projects']:
   # Source activity rows are page continuations. Preserve text; do not independently sum.
   projects.append({'id':key(agency+p['number']+str(p['ba'])+q['number']),'number':q['number'],'title':q['title'],'amount':q['funding'].get('2026_total'),'mission':'\n'.join(b['text'] for b in q['blocks'] if not b.get('rows')),'activities':[],'screeningActivityText':'\n'.join(b['text'] for b in q['blocks'] if b.get('rows')),'sourceBlocks':[{'file':b['file'],'block':b['block']} for b in q['blocks'] if not b.get('rows')]})
  catalog[ck]={**catalog.get(ck,{}),'id':key('|'.join(map(str,ck))),'number':p['number'],'title':p['title'],'ba':p['ba'],'agency':agency,'appropriation':ap,'amount':p['funding'].get('2026_total'),'mission':'\n'.join(b['text'] for b in p['blocks'] if not b.get('rows')),'screeningSourceText':'\n'.join(b['text'] for b in p['blocks'] if b.get('rows')),'projects':projects,'file':first,'source':'https://drive.google.com/file/d/'+manifest[first]+'/view' if first in manifest else 'https://drive.google.com/drive/folders/18ATR7z-YeflTPknecDp6CjzLHsC1CbXY'}
navy=E.parse(SRC/'2026_RDTE_Navy-MarineCorps_Master.xml').getroot()
for p in navy.iter():
 if tag(p)!='ProgramElement':continue
 num=v(p,'ProgramElementNumber');ba=int(v(p,'BudgetActivityNumber'));ck=('1319',num,ba)
 projects=[]
 for q in p.iter():
  if tag(q)!='Project':continue
  pn=v(q,'ProjectNumber');projects.append({'id':key(num+str(ba)+pn),'number':pn,'title':v(q,'ProjectTitle'),'amount':amount(q,'ProjectFunding'),'mission':descendant(q,'ProjectMissionDescription'),'screeningActivityText':' '.join(q.itertext()),'activities':[]})
 catalog[ck]={**catalog.get(ck,{}),'id':key('|'.join(map(str,ck))),'number':num,'title':v(p,'ProgramElementTitle'),'agency':'Navy','appropriation':'1319','ba':ba,'amount':amount(p,'ProgramElementFunding'),'mission':v(p,'ProgramElementMissionDescription'),'projects':projects,'file':'2026_RDTE_Navy-MarineCorps_Master.xml','source':'https://drive.google.com/file/d/'+manifest['2026_RDTE_Navy-MarineCorps_Master.xml']+'/view'}
if (SRC/'2026_RDTE_OSD.xml').exists():
 for p in E.parse(SRC/'2026_RDTE_OSD.xml').getroot().iter():
  if tag(p)=='ProgramElement':
   ck=('0400',v(p,'ProgramElementNumber'),int(v(p,'BudgetActivityNumber')))
   if ck in catalog:catalog[ck]['screeningSourceText']=' '.join(p.itertext())
# Full names / documented common forms, not short ambiguous acronyms such as AC.
patterns={
 'AFRL':r'(?:Air Force|AF) Research (?:Laboratory|Lab)|\bAFRL\b',
 'C5ISR':r'\bC5ISR\b', 'GVSC':r'\bGVSC\b|Ground Vehicle Systems? Center',
 'AC':r'Armaments? Center', 'DEVCOM':r'\bDEVCOM\b|Combat Capabilities Development Command',
 'ERDC':r'\bERDC\b|Engineer Research and Development Center',
 'NRL':r'\bNRL\b|Naval Research Laborator', 'P1':r'Platform One',
 'CECOM':r'\bCECOM\b|Communications.Electronics Command',
 'SDA':r'Space Development Agency|\bSDA\b',
}
# Extract decisive clauses for human review. No inferred split of joint performer projects.
clauses=[]
for ck,r in catalog.items():
 for q in [None]+r['projects']:
  s=clean((q or r).get('mission'))
  for ac,pattern in patterns.items():
   for m in re.finditer(r'(?:This program is executed by|All aspects of [^.]{0,100}are managed by|Development of [^.]{0,140}is managed by|(?:Work|Research) (?:in this [Pp]roject |in this PE |in this project )?is (?:performed|conducted) by)\s*([^.!?]+)',s,re.I):
    if re.search(pattern,m[1],re.I):clauses.append({'org':ac,'pe':r['number'],'ba':r['ba'],'appropriation':r['appropriation'],'project':q['number'] if q else None,'title':(q or r)['title'],'amount':(q or r)['amount'],'evidence':m[0],'clause':m[1]})
(W/'scope-clauses.json').write_text(json.dumps(clauses,indent=2))
if '--catalog' in sys.argv:
 (W/'scope-catalog.json').write_text(json.dumps(list(catalog.values()),ensure_ascii=False));print(len(catalog));sys.exit()
if '--apply' not in sys.argv:
 print(json.dumps({'sourceRecords':len(catalog),'clauses':len(clauses),'byOrganization':{ac:sum(c['org']==ac for c in clauses) for ac in patterns}},indent=2));sys.exit()
# Review decisions use source IDs and quotations, never manually entered funding values.
by_ac={n['acronym']:n for n in D['nodes']};decisions=[];questions=[]
def getpe(num,ba=None):
 rs=[r for k,r in catalog.items() if r['number']==num and (ba is None or r['ba']==ba)]
 assert len(rs)==1,(num,ba,len(rs));return rs[0]
def relationship(ac,r):
 n=by_ac[ac];found=next((z for z in n['relationships'] if (z['appropriation'],z['number'],z['ba'])==(r['appropriation'],r['number'],r['ba'])),None)
 if found:
  if r['agency']=='Army':found.update(file=r['file'],source=r['source'])
  return found
 z=copy.deepcopy(r);z.update(fy=2026,measure='total',attributedAmount=None,checks=[],officialStatus='Source scope review: explicit narrative / dedicated project',tier='Scope review — source-supported relationship',role='Dedicated organization project or sole performing organization',disposition='Reviewed partial program context; not an organization budget',contextScope=False,contextBasis=None,evidence='',importedService=True,scopeDiscovery=True)
 z['projects']=[];n['relationships'].append(z);return z

def approve(ac,r,q=None,a=None,evidence='',basis=''):
 assert evidence and basis
 item=a or q or r;assert item['amount'] is not None,(ac,r['number'],item['title'])
 z=relationship(ac,r);level='activity' if a else 'project' if q else 'PE'
 reason=basis+' FY2026 published request; identifiable program context, not a verified total organization budget or disbursement.'
 if q and not any(p['number']==q['number'] for p in z['projects']):z['projects'].append(copy.deepcopy(q))
 if q or a:
  comp={'id':item['id'],'number':r['number']+' / '+(q['number'] if q else item['title']),'title':item['title'],'amount':item['amount'],'ba':r['ba'],'basis':reason,'scopeLevel':level,'projectNumber':q['number'] if q else None,'evidence':evidence}
  if not z['contextScope'] or z.get('contextComponents'):
   cs=z.setdefault('contextComponents',[])
   if not any(c['id']==comp['id'] for c in cs):cs.append(comp)
   z['contextScope']=True;z['contextBasis']='Reviewed source-supported project/activity context only. The full PE is excluded.'
 else:z.update(contextScope=True,contextBasis=reason);z.pop('contextComponents',None)
 z['scopeReviewApplied']=True
 z['officialStatus']='Published request parsed; program-context scope reviewed. Institution allocation remains unverified.'
 if z.get('scopeDiscovery'):z['evidence']=evidence
 decisions.append({'organizationId':by_ac[ac]['id'],'org':ac,'pe':r['number'],'appropriation':r['appropriation'],'ba':r['ba'],'project':q['number'] if q else None,'activity':a['title'] if a else None,'level':level,'amount':item['amount'],'title':item['title'],'evidence':evidence,'basis':reason,'source':r['source']})
def pending(ac,r,reason,q=None,evidence=''):
 item=q or r
 questions.append({'org':ac,'organizationId':by_ac[ac]['id'],'pe':r['number'],'appropriation':r['appropriation'],'ba':r['ba'],'project':q['number'] if q else None,'title':item['title'],'amount':item['amount'],'reason':reason,'evidence':evidence or clean(item.get('mission'))[:900],'source':r['source']})
# Sole performer or explicit executing agency. Lists of collaborating centers never qualify.
sole={'AC':r'(?:the )?Armaments? Center(?: \(AC\))?(?: C)?',
 'GVSC':r'(?:the )?Ground Vehicle Systems? Center(?: \(GVSC\))?(?: C)?',
 'C5ISR':r'(?:the )?Command, Control, Computers?, Communications?, Cyber, Intelligence, Surveillance,? (?:and )?Reconnaissance(?: Center)? \(C5ISR\)(?: Center)?(?: C)?',
 'ERDC':r'(?:the )?(?:United States |US )?(?:Army )?Engineer Research and Development Center',
 'AFRL':r'(?:the )?(?:Air Force|AF) Research Laboratory(?: \(AFRL\))?'}
for c in clauses:
 ac=c['org'];r=getpe(c['pe'],c['ba']);q=next((p for p in r['projects'] if p['number']==c['project']),None) if c['project'] else None
 if c['amount'] is None:
  pending(ac,r,'Performer/execution evidence exists, but the FY2026 project amount is a dash/unavailable; no zero or PE-total substitution.',q,c['evidence']);continue
 if ac=='AFRL' and r['number'] in ['1206601SF','1206616SF']:
  pending(ac,r,'Source explicitly identifies erroneous programming / BA realignment. Hold pending choice to use published request unchanged or a separately reconciled correction.',q,c['evidence']);continue
 if re.fullmatch(sole.get(ac,r'(?!)'),c['clause'],re.I):
  if q or ac=='AFRL':approve(ac,r,q,evidence=c['evidence'],basis='Source explicitly identifies the sole performing organization for this project.' if q else 'PE mission explicitly states this program is executed by AFRL.')
 elif q and ac in ['C5ISR','GVSC','AC','ERDC','DEVCOM','AFRL']:
  pending(ac,r,'Several performers, a named subordinate unit, or a limited management role; no unsupported division or parent roll-up.',q,c['evidence'])
# Dedicated program/project and institute activity scopes supported by full source narratives.
for ac,num in [('MIT LL','0602234D8Z'),('JHTO','0603183D8Z'),('DTE&A','0605804D8Z')]:
 r=getpe(num);approve(ac,r,evidence=clean(r['mission'])[:1500],basis='Dedicated PE mission describes this organization and its funded program functions.')
for ac,num,pn in [('NRL','0605853N','3330'),('Naval Postgraduate School','0605853N','2098'),('P1','0308602F','6622P1'),('DIANA','0603945D8Z','353')]:
 r=getpe(num);q=next(p for p in r['projects'] if p['number']==pn)
 approve(ac,r,q,evidence=clean(q['title']+' '+q.get('mission',''))[:1600],basis='Dedicated named organization project. Only the project request is included, not the parent PE.')
r=getpe('0603680D8Z')
for ac,title in [('America Makes','Additive Manufacturing Innovation'),('AIM Photonics','Photonic Foundry and Packaging Innovation'),('ARM','Robotic Automation Innovation'),('AFFOA','Advanced Fiber and Fabric'),('T3CP','Technology Transfer (T2), Transition, and Commercial Partnerships (T3CP)')]:
 q=next(p for p in r['projects'] if any(a['title']==title for a in p['activities']));a=next(a for a in q['activities'] if a['title']==title)
 approve(ac,r,q,a,evidence=clean((a.get('description') or '')+' '+(a.get('plan') or ''))[:1800],basis='Named institute/program activity using the same activity-level context standard as the reviewed BioMADE scope. This is not proof the whole activity is a grant to the institution.')
# SDA responsibility is specified in the PE mission, not inferred from its acronym.
for num in ['1206310SF','1206410SF','1206446SF']:
 r=getpe(num);s=clean(r['mission']);assert 'SDA is responsible' in s or 'Space Development Agency (SDA) is developing' in s
 approve('SDA',r,evidence=s[:2400],basis='PE mission identifies SDA as responsible for programmatic development/execution of the funded architecture. Only the published discretionary table total is included; separately described mandatory funding is not added.')
# Dedicated SSC workforce support: exclude SSIO enterprise-engineering project pending hierarchy review.
for num in ['1206392SF','1206398SF']:
 r=getpe(num);approve('SSC',r,evidence=clean(r['mission'])[:2000],basis='Dedicated SSC acquisition workforce / management-headquarters support PE, not all programs associated with SSC.')
# Dedicated Navy command projects and Marine Corps-specific projects, not whole command portfolios.
for ac,num,pn in [('ONR','0602861N','0000'),('ONR','0602861N','0824'),('ONR','0605853N','3017'),('ONR','0605898N','0824'),('ONR','0605898N','3345'),('NAVAIR','0604286N','0311'),('NAVAIR','0605013N','2903'),('NAVSEA','0603563N','3161'),('NAVSEA','0604286N','0312'),('NAVSEA','0605013N','2904'),('NAVWAR','0604286N','0313'),('USMC','0304240M','3135'),('USMC','0604840M','2576'),('SSC','1203010SF','646017')]:
 r=getpe(num);q=next(p for p in r['projects'] if p['number']==pn)
 approve(ac,r,q,evidence=clean(q['title']+' '+q.get('mission',''))[:1800],basis='Dedicated named command support or service-specific project. Only this published project request is included, not the command or component portfolio.')
# Resolve evidence conflicts and portfolio questions only after user review.
r=getpe('1206616SF',2);pending('AFRL',r,'Published BA2 fragment is described by the source as erroneously programmed and due for transfer to BA3. Hold this separate compound-key record; do not silently move or add it twice.')
r=getpe('0605801A');q=next(p for p in r['projects'] if p['number']=='M44');pending('CECOM',r,'Project title says CECOM, but mission explicitly funds DEVCOM C5ISR headquarters support. Hold assignment to either organization.',q)
for ac,num in [('TRMC','0603941D8Z'),('Industrial Base Policy (IBP)','0607210D8Z'),('DLA R&D','0603680S'),('DLA R&D','0603712S'),('SSC','1206399SF')]:
 r=getpe(num);pending(ac,r,'Source funding-control corrections and mixed mandatory/discretionary basis require reconciliation.' if ac=='TRMC' else 'Explicit subordinate/program portfolio connection. Confirm whether to display parent-managed program context; preserve distinct entities and deduplicate overlapping scopes.')
for num in ['0602134A','0604134A']:
 r=getpe(num);pending('C5ISR',r,'C5ISR is named as project manager, but the program names multiple performers. Decide whether explicit management responsibility establishes whole-program context; do not represent it as received funding.')
r=getpe('0305103C');pending('DIA',r,'Director DIA has functional/fiscal management, while the PE is issued by MDA. Hold cross-agency management context to avoid implying a separate DIA allocation.')
for ac,num,pn,reason in [('AFMC','0101113F','671803','Title names AFMC test assets but the mission funds Air Force Test Center aircraft, staff and facilities. Hold parent/subordinate assignment.'),('NAVAIR','0605864N','0566','Named NAVAIR environmental-compliance project supports several facilities, including AUTEC; command-specific share is not separated.')]:
 r=getpe(num);q=next(p for p in r['projects'] if p['number']==pn);pending(ac,r,reason,q)
for ac,num,title,reason in [('UCAH','0603183D8Z','University Consortium for Applied Hypersonics (UCAH)','Dedicated UCAH activity is funded within the already included JHTO program. Resolve parent/child display and overlap before assigning it to a second bubble.'),('MRDC','0605384BP','2) Laboratory Infrastructure (LABINF) - Medical Research and Development Command (MRDC) Laboratory Infrastructure','Activity names MRDC but funds infrastructure at USAMRIID and USAMRICD. Resolve parent/child managed-context policy before assigning it to MRDC.')]:
 r=getpe(num);q=next(p for p in r['projects'] if any(a['title']==title for a in p['activities']));a=next(a for a in q['activities'] if a['title']==title)
 pending(ac,r,reason,{**q,'title':a['title'],'amount':a['amount'],'mission':a['description']})
r=getpe('0603680D8Z');q=next(p for p in r['projects'] if p['number']=='350');pending('MII',r,'Umbrella institute project overlaps the individually included institute activities. Resolve parent/group display before adding it as a distinct funding scope.',q)
r=getpe('0305146V');pending('ARLIS',r,'The same project/activity funds both ARLIS and CTPIC; the institution-specific split is not published.')
# Generic AFRL boilerplate is not enough to claim every associated S&T PE.
for r in by_ac['AFRL']['relationships']:
 if not r['contextScope'] and r['ba'] in [1,2,3] and r.get('importedService') and r['number'] not in ['1206601SF','1206616SF']:
  pending('AFRL',r,'AFRL S&T narrative / directorate role, but not an explicit whole-PE executing statement. Review managed-portfolio scope before adding full PE.',evidence=clean(r['mission'])[:1200])
# User decisions: split the separately named UCAH activity out of JHTO, and use M44's mission.
r=getpe('0603183D8Z');q=next(p for p in r['projects'] if p['number']=='066')
uca=next(a for a in q['activities'] if a['title']=='University Consortium for Applied Hypersonics (UCAH)')
assert abs(sum(a['amount'] or 0 for a in q['activities'])-r['amount'])<.001
j=relationship('JHTO',r);j['contextScope']=False;j.pop('contextComponents',None)
decisions=[c for c in decisions if not(c['org']=='JHTO' and c['pe']==r['number'])]
approve('UCAH',r,q,uca,evidence=clean(uca['description']),basis='User approved a separate UCAH bubble. This explicitly named activity is removed from JHTO displayed context to prevent overlapping funding.')
for a in q['activities']:
 if a['id']!=uca['id'] and a['amount'] is not None and a['amount']>0:
  approve('JHTO',r,q,a,evidence=clean(a['description']),basis='User-approved non-overlapping parent/child display: retain this separately funded JHTO activity, excluding the UCAH activity shown in its own bubble.')
by_ac['JHTO']['scopeDisplayNote']='The full PE request is $50.998M. UCAH receives its separately named $27.416M activity in its own bubble. JHTO displays the other two funded activities, totaling $23.582M, so the combined amount is counted once.'
by_ac['UCAH']['scopeDisplayNote']='The $27.416M UCAH activity is within JHTO PE 0603183D8Z. It is excluded from JHTO displayed scope. This is named program context, not the consortium’s total institutional budget.'
r=getpe('0605801A');q=next(p for p in r['projects'] if p['number']=='M44')
approve('C5ISR',r,q,evidence=clean(q['mission'])[:1800],basis='User approved assignment using the explicit C5ISR mission despite the legacy CECOM Cmd/Ctr Spt project title. No amount is assigned to CECOM.')
questions=[c for c in questions if not(c['org']=='UCAH' and c['pe']=='0603183D8Z') and not(c['org']=='CECOM' and c['project']=='M44')]
from sole_organization_rule import apply_policy
policy,questions=apply_policy(D,catalog,relationship,approve,questions)
from reconcile_controls import reconcile
reconciliations,questions=reconcile(D,catalog,relationship,approve,questions)
# Preserve original retained associations even when ambiguous; flag new acronym collisions.
excluded=[];reviews=[]
for n in D['nodes']:
 for r in n['relationships']:
  ck=(r['appropriation'],r['number'],r['ba']);full=catalog.get(ck,r);s=clean((full.get('mission') or '')+' '+' '.join(p.get('mission') or '' for p in full['projects']));status='associated-only';reason='Narrative establishes a relationship, but not a separately allocated organization amount. Full PE budget is excluded.'
  if r['contextScope']:status='scoped-context';reason=r['contextBasis']
  elif n['acronym']=='SDA' and r.get('importedService') and 'Space Development Agency' not in s and re.search(r'Space Domain Awareness|space domain awareness',s):status='excluded-acronym-collision';reason='SDA denotes Space Domain Awareness in this record; no full organization-name evidence of Space Development Agency.'
  elif n['acronym']=='NAVWAR' and r.get('importedService') and r['agency']!='Navy' and 'Naval Information Warfare' not in s and re.search(r'Navigation Warfare \(NAVWAR\)',s,re.I):status='excluded-acronym-collision';reason='NAVWAR denotes Navigation Warfare, not Naval Information Warfare Systems Command.'
  elif n['acronym']=='AMC' and r.get('importedService') and 'Air Mobility Command' not in s and 'Army Materiel Command' in s:status='excluded-acronym-collision';reason='AMC denotes Army Materiel Command, not the inventory Air Mobility Command entity.'
  if any(q['organizationId']==n['id'] and q['pe']==r['number'] and q['ba']==r['ba'] for q in questions) and status=='associated-only':status='needs-review';reason='See consolidated evidence questions; no additional funding assigned.'
  r['scopeAssessment']={'status':status,'basis':reason,'reviewDate':'2026-11-05'}
  if status=='excluded-acronym-collision':excluded.append({'org':n['acronym'],'pe':r['number'],'ba':r['ba'],'reason':reason})
  reviews.append({'organizationId':n['id'],'org':n['acronym'],'pe':r['number'],'ba':r['ba'],'appropriation':r['appropriation'],'status':status,'reason':reason})
 seg={}
 for r in n['relationships']:
  if r['contextScope']:
   for c in r.get('contextComponents') or [r]:
    if c is not r and not c.get('projectNumber'):
     for p in r['projects']:
      if any(a['id']==c['id'] for a in p['activities']):c.update(projectNumber=p['number'],scopeLevel='activity')
    if c['amount'] is not None:category=11 if c['ba']==9 else 12 if c['ba'] is None else c['ba'];seg[str(category)]=seg.get(str(category),0)+c['amount']
 n['contextSegments']=seg;n['contextAmount']=sum(seg.values()) if seg else None
 n['scopeReviewSummary']={'status':'partial-context' if seg else 'unallocated','reviewedRelationships':len(n['relationships']),'scopedRecords':sum(len(r.get('contextComponents') or [r]) for r in n['relationships'] if r['contextScope']),'note':'All organization–PE associations screened. Includes reviewed scopes and user single-organization rule assignments. No inferred split or parent-to-subordinate transfer. This is program context, not a verified institution budget.'}
# One consolidated question per organization/PE/project/reason.
decisions=list({(c['org'],c['pe'],c['ba'],c['project'],c['activity']):c for c in decisions}.values())
questions=list({(q['org'],q['pe'],q['ba'],q['project'],q['reason']):q for q in questions}.values())
# Shared allocations are visible in source, never multiplied across organizations.
audit={'singleOrganizationPolicy':policy,'reconciliations':reconciliations,'reviewDate':'2026-11-05','basis':'FY2026 published request program context; not institution budgets or executed funding','sourceRecordsScreened':len(catalog),'relationshipsScreened':len(reviews),'organizationsScreened':len(D['nodes']),'resolvedUserDecisions':['Separate UCAH activity from JHTO displayed scope without duplicate funding.','Assign project M44 to C5ISR using its mission; preserve the conflicting original title.'],'newScopeDecisions':len(decisions),'newScopedOrganizations':sorted(set(z['org'] for z in decisions)),'excludedAcronymCollisions':excluded,'pendingCases':len(questions),'decisions':decisions,'questions':questions,'relationshipAssessments':reviews}
D['audit']['fundingScopeReview']={k:v for k,v in audit.items() if k not in ['decisions','questions','relationshipAssessments','singleOrganizationPolicy']}
D['audit']['fundingScopeReview']['singleOrganizationPolicy']={k:v for k,v in policy.items() if k not in ['assignments','conflicts']}
D['audit']['serviceImport']['addedOrgPeAssociations']=sum(r.get('importedService',False) for n in D['nodes'] for r in n['relationships'])
D['audit']['serviceImport']['scopeDiscoveredAssociations']=sum(r.get('scopeDiscovery',False) for n in D['nodes'] for r in n['relationships'])
D['audit']['limitations']=[s for s in D['audit']['limitations'] if not s.startswith('Scope review:')]+['Scope review: dedicated project and activity amounts represent partial program context, not total institution budgets. Single-organization assignments follow the user rule; shared cases remain unallocated unless a dedicated component was supported. Reconciliation details retain unresolved project variance and unspecified transfer destinations.','Scope review: acronym collisions are retained in the historical match audit but explicitly excluded as organizational evidence.']
for n in D['nodes']:
 for r in n['relationships']:
  r.pop('screeningSourceText',None)
  for p in r['projects']:p.pop('screeningActivityText',None)
(ROOT/'public/data.json').write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
(ROOT/'public/scope-review.json').write_text(json.dumps(audit,ensure_ascii=False,separators=(',',':')))
print(json.dumps({k:v for k,v in audit.items() if k not in ['decisions','questions','relationshipAssessments']},indent=2))
print('SCOPES',[(n['acronym'],round(n['contextAmount'],3)) for n in D['nodes'] if n['contextAmount'] is not None]);print('bytes',(ROOT/'public/data.json').stat().st_size)
