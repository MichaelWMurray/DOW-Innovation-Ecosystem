"""Read existing source downloads; never writes to Google Sheets.

Usage: python scripts/import_data.py CROSSWALK.xlsx BUDGET.xlsx INVENTORY.json RELATIONSHIPS.json
The JSON inputs are Google Sheets values responses {values: [[header], ...]}.
"""
import sys, json, collections, datetime
from pathlib import Path
import openpyxl

cw, bd, inv, connections = sys.argv[1:]
def records(w, sheet):
    a = list(w[sheet].values)
    return [dict(zip(a[0], row)) for row in a[1:] if any(v is not None for v in row)]
w = openpyxl.load_workbook(cw, read_only=True, data_only=True)
b = openpyxl.load_workbook(bd, read_only=True, data_only=True)
orgs = records(w, 'Organizations')
rels = [r for r in records(w, 'PE Relationships') if str(r['Direct-match disposition']).startswith('Retain')]
iv = json.load(open(inv))['values']
inventory = {row[0]:dict(zip(iv[0],row)) for row in iv[1:]}
pes = {x['pe_key']:x for x in records(b,'Program Elements')}
funds = records(b,'PE Funding')
projects = records(b,'Projects')
pf = records(b,'Project Funding')
activities = records(b,'R2A Activities')
checks = records(b,'Official PDF Checks')
selected = [o['Org ID'] for o in orgs if o['Retained PE candidates']] + ['IEORG-0334']
def total(key):
    a=[x for x in funds if x['pe_key']==key and x['FY']==2026 and x['measure']=='total']
    assert len(a)<=1
    return a[0]['amount_m'] if a else None
def scope(o,p):
    # Deliberately narrow budget-context selection; never an organization allocation.
    if o=='IEORG-0064' and p['agency']=='Defense Advanced Research Projects Agency':
        return 'DARPA issuing budget agency; agency PE scope only.'
    n=p['pe_number']
    if o=='IEORG-0067' and n in ['0603342D8Z','0604341D8Z','0608776D8Z']:
        return 'Dedicated DIU PE title; excludes partner and subordinate-program references.'
    if o=='IEORG-0294' and n in ['0604679D8Z','0901579D8Z']:
        return 'Dedicated OSC PE title; RDT&E scope only, excludes lending authority and other appropriations.'
    if o=='IEORG-0050' and n in ['0604123D8Z','0604124D8Z','0606135D8Z']:
        return 'Dedicated OSD CDAO PE title; excludes Joint Staff CDAO and broader mission-reference PEs.'
    if o=='IEORG-0268' and p['pe_title'].startswith('Microelectronics Commons - '):
        return 'Dedicated Commons PE title, distinguished by appropriation and BA; no hub allocation.'
    agency_scopes={'IEORG-0130':'Missile Defense Agency','IEORG-0140':'Defense Logistics Agency','IEORG-0011':'United States Cyber Command','IEORG-0228':'The Joint Staff','IEORG-0280':'Defense Counterintelligence and Security Agency','IEORG-0241':'United States Special Operations Command'}
    if o in agency_scopes and p['agency']==agency_scopes[o]:
        return 'Issuing budget agency matches this inventory organization; identified agency PE scope only, not a complete organization budget.'
    if o=='IEORG-0137' and n=='0603021D8Z':
        return 'Dedicated National Security Innovation Capital PE; separate from DIU, no parent inheritance.'
    if o=='IEORG-0186' and n in ['0603289D8Z','0604250D8Z']:
        return 'PE mission explicitly identifies SCO as conducting the program; references to SCO in other PEs are excluded.'
    if o=='IEORG-0172' and n in ['0602751D8Z','0603781D8Z']:
        return 'Dedicated Software Engineering Institute PE title; identified PE scope only.'
    return None
nodes=[]
for oid in selected:
    o=next(x for x in orgs if x['Org ID']==oid)
    i=inventory[o['Innovation organization']]
    relationships=[]
    for r in rels:
        if r['Org ID']!=oid: continue
        p=pes[r['PE key']]; basis=scope(oid,p)
        sub=[]
        for pr in projects:
            if pr['pe_key']!=p['pe_key']: continue
            amounts=[x['amount_m'] for x in pf if x['project_key']==pr['project_key'] and x['FY']==2026 and x['measure']=='total']
            sub.append({'id':pr['project_key'],'number':pr['project_num'],'title':pr['project_title'],'mission':pr['mission'],'amount':amounts[0] if amounts else None,'activities':[{'id':a['activity_key'],'title':a['title'],'description':a['description'],'amount':a['fy2026_m'],'plan':a['fy2026_text']} for a in activities if a['project_key']==pr['project_key']]})
        relationships.append({'id':p['pe_key'],'number':p['pe_number'],'title':p['pe_title'],'agency':p['agency'],'appropriation':p['appropriation'],'ba':int(p['BA']),'amount':total(p['pe_key']),'fy':2026,'measure':'total','source':p['drive_url'],'file':p['source_file'],'mission':p['mission'],'note':p['note'],'officialStatus':p['official_status'],'checks':[x for x in checks if x['pe_key']==p['pe_key'] and x['FY']==2026],'tier':r['Direct evidence tier'],'evidence':r['Evidence excerpt'],'role':r['Organization role supported by source'],'disposition':r['Direct-match disposition'],'contextScope':bool(basis),'contextBasis':basis,'attributedAmount':None,'projects':sub})
    ss={}
    for r in relationships:
        if r['contextScope'] and r['amount'] is not None:
            ss[r['ba']]=ss.get(r['ba'],0)+r['amount']
    amount=sum(ss.values()) if ss else None
    life=sum(k*v for k,v in ss.items())/amount if amount and amount>0 else None
    nodes.append({'id':oid,'name':o['Innovation organization'],'acronym':o['Acronym'] or ('Commons' if oid=='IEORG-0268' else o['Innovation organization']),'type':o['Org type'],'component':i.get('Type') or 'Unspecified','parentId':o['Parent Org ID'],'parent':o['Parent organization'],'managerId':o['Manager Org ID'],'manager':o['Managing organization'],'description':i.get('Description'),'website':i.get('Website'),'logo':i.get('Image'),'attributedAmount':None,'fundingStatus':'unknown','contextAmount':amount,'contextSegments':ss,'contextLifecycle':life,'relationships':relationships})
roster=[{'id':o['Org ID'],'name':o['Innovation organization'],'acronym':o['Acronym'],'count':o['Retained PE candidates']} for o in orgs if o['Retained PE candidates']]
hierarchy=[{'id':o['Org ID'],'name':o['Innovation organization'],'acronym':o['Acronym'],'parentId':o['Parent Org ID'],'managerId':o['Manager Org ID'],'parent':o['Parent organization'],'manager':o['Managing organization'],'type':o['Org type']} for o in orgs]
rr=json.load(open(connections))['values']
byname={o['name']:o['id'] for o in hierarchy}
edges=[{'from':byname.get(row[0]),'to':byname.get(row[1]),'fromName':row[0],'toName':row[1],'type':row[2] if len(row)>2 else None} for row in rr[1:] if len(row)>1]
assert len(roster)==73 and len(rels)==323
assert len(set((r['Org ID'],r['PE key']) for r in rels))==323
assert all(n['attributedAmount'] is None for n in nodes)
output={'fiscalYear':2026,'snapshotDate':'2026-11-04','sources':{'inventory':'https://docs.google.com/spreadsheets/d/1db8IsJfFm6lozj8g05WwjtKjXmlS0emzZTT_6n6OssU/edit','crosswalk':'https://docs.google.com/spreadsheets/d/12ueDrEyPn0VJuFX-wrKYYEaN7UGX2H-W/edit','budget':'https://docs.google.com/spreadsheets/d/1knGOC4BlCuXMWLqZvMtEq-bg5JVo-myx/edit'},'audit':{'inventory':423,'retainedOrganizations':73,'retainedRelationships':323,'verifiedAllocations':0,'validLogoDataUris':sum(str(x.get('Image','')).startswith('data:image') for x in inventory.values()),'peRecords':273,'projects':570,'activities':1528,'sourceCoverage':'18 XML files, primarily Defense-wide; Army, Navy and Air Force books absent.','limitations':['The crosswalk explicitly marks every organization–PE relationship as not funding-attributed.','PE budget scope is context, not an organization budget or a verified allocation. Scope uses dedicated titles or DARPA issuing-agency identity; all other references remain associated.','FY2026 XML total values only; base and total are never added. Reconciliation/mandatory figures in narrative notes are not automatically incorporated.','Budget activity is a budget classification, not a measured technology readiness level. BA 6 and BA 8 are management/software categories.','Some official PDF spot checks exist; most source records still await PDF reconciliation.']},'nodes':nodes,'retainedRoster':roster,'hierarchy':hierarchy,'edges':edges}
next(n for n in nodes if n['acronym']=='OSC')['creditProgram']={'amount_m': 1500, 'label': 'Credit Program', 'measure': 'Enacted credit-program appropriation; not loan principal authority, obligations, or disbursements', 'asOf': '2025-07-04', 'availableThrough': '2029-09-30', 'source': 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm', 'reference': 'Public Law 119-21, sections 20004(d) ($500M) and 20005(b) ($1,000M)', 'stage': 6, 'placementBasis': 'User-approved analytical placement at Low-Rate Production; not the stage of each financed project.', 'components': [{'section': '20004(d)', 'amount_m': 500}, {'section': '20005(b)', 'amount_m': 1000}]}
apfit=next(n for n in nodes if n['acronym']=='APFIT')
apfit['supplementalRecords']=[{'id':'PROC-0300D-LI30-ITEM4-APFIT-FY2026-PB','category':10,'label':'Procurement — APFIT','amount_m':92.193,'fy':2026,'measure':'FY2026 President’s Budget request, total ($M)','appropriation':'0300D','source':'https://comptroller.war.gov/Portals/45/Documents/defbudget/FY2026/budget_justification/pdfs/02_Procurement/PROC_OSD_PB_2026.pdf','reference':'PB2026 OSD, June 2025, Exhibit P-5, P-1 line 30 Major Equipment OSD, item 4 APFIT; FY2026 total $92.193M','basis':'Dedicated APFIT item, not the entire Major Equipment OSD line. Original FY2026 request only; excludes later enacted/reconciliation/spend-plan amounts and cumulative awards.','stage':6,'placementBasis':'Official APFIT FAQ describes initial procurement at LRIP prices, targeting the first 10–25% of a capability.','placementSource':'https://ac.cto.mil/apfit/faq/'}]
apfit['subsetStatus']='Supplemental procurement program; outside original 73 retained RDT&E matches'
output['audit']['loadedOrganizations']=len(nodes)
output['audit']['supplementalOrganizations']=1
# Reviewed BioMADE scope: use the named activity, never its entire parent PE.
bio=next(n for n in nodes if n['acronym']=='BioMADE')
bio_pe=next(r for r in bio['relationships'] if r['number']=='0603680D8Z')
bio_activity=next(a for p in bio_pe['projects'] for a in p['activities'] if a['title']=='Bioindustrial Manufacturing Innovation')
bio_basis='User-approved activity-level budget context: Bioindustrial Manufacturing Innovation explicitly names the BioMADE partnership. Only this activity amount is included; the full parent PE is excluded. Not a verified organization allocation.'
bio_pe.update(contextScope=True,contextBasis=bio_basis,contextComponents=[{'id':bio_activity['id'],'number':bio_pe['number']+' / '+bio_activity['title'],'title':bio_activity['title'],'amount':bio_activity['amount'],'ba':bio_pe['ba'],'basis':bio_basis}])
bio.update(contextAmount=bio_activity['amount'],contextSegments={'3':bio_activity['amount']},contextLifecycle=3)
out=Path(__file__).resolve().parents[1]/'public'/'data.json'
out.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')))
for n in nodes: print(n['acronym'],len(n['relationships']),n['contextAmount'],n['contextSegments'],n['contextLifecycle'])
print('Saved',out)
