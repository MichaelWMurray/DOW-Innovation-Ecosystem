"""Render complete normalized budget text for the four organizations under review."""
import json,re
from html import escape as e
from pathlib import Path
root=Path(__file__).resolve().parents[1]
d=json.loads((root/'public/data.json').read_text())
order=['JHTO','TRMC','AFRL','ONR']
notes={
'JHTO':'JHTO displays $23.582M after separating the explicitly named $27.416M UCAH activity from the $50.998M PE. The explicitly named JHTO Systems Engineering Field Activity has no separate FY2026 amount in the normalized record.',
'TRMC':'Review program management scope and the explicit FY2026 funding-control corrections in the Test and Evaluation Science and Technology mission text. Do not treat the other three narrative associations as TRMC allocations.',
'AFRL':'Service books are now included. Review the imported PE and project narratives for evidence of managed scope; participation and reference matches alone do not establish AFRL funding allocations.',
'ONR':'Three Navy PE mission statements and five dedicated support projects support $329.681M of partial ONR program context. Other narrative associations remain unallocated; this is not ONR’s full budget.'}
def text(s):return '<div class="source-text">'+e(s or 'Not supplied in the normalized source record.')+'</div>'
def money(v):return 'Amount not supplied' if v is None else f'${v:,.3f}M'
def match(s,n):
 terms=[n['acronym'],n['name']]
 if n['acronym']=='AFRL':terms+=['Air Force Research Lab']
 return any(re.search(r'(?<!\w)'+re.escape(t)+r'(?!\w)',s or '',re.I) for t in terms)
nav=''.join(f'<a href="#{x}">{x}</a>' for x in order)
parts=['''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Budget Evidence Review · Innovation Ecosystem</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f7f8;color:#203d49;font:16px/1.65 system-ui,sans-serif}main{max-width:1040px;margin:auto;padding:26px 22px 70px}a{color:#206780}nav{display:flex;flex-wrap:wrap;gap:16px;padding:16px 0}h1{line-height:1.2;font-size:32px}h2{margin-top:0}h3{font-size:20px;line-height:1.4}h4{margin-bottom:8px}.org{scroll-margin-top:20px;background:white;border:1px solid #dce5e8;border-radius:16px;padding:26px;margin:30px 0}.note{background:#f7f3e9;padding:16px;border-left:3px solid #ae8a49}.source-text{white-space:pre-wrap;overflow-wrap:anywhere;color:#283b43;margin:12px 0}.meta{font-size:14px;color:#506b77}.record{border-top:1px solid #dce5e8;margin-top:24px;padding-top:12px}details{margin:14px 0;padding:14px;border:1px solid #dce5e8;border-radius:8px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{text-align:left;border-bottom:1px solid #dce5e8;padding:8px;vertical-align:top}summary{cursor:pointer;font-weight:600;overflow-wrap:anywhere}.matched{border-left:4px solid #517f93}button{font:inherit;background:#214957;color:white;border:0;border-radius:6px;padding:9px 15px;cursor:pointer}blockquote{margin:10px 0;padding-left:15px;border-left:3px solid #dce5e8}.label{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#677f89}@media(max-width:600px){main{padding:20px 12px}.org{padding:18px}h1{font-size:27px}details{padding:10px}}
</style></head><body><main><a href="./">← Funding landscape</a><p class="label">Innovation Ecosystem / Budget evidence</p><h1>Full budget text for review</h1><p>JHTO, TRMC, AFRL and ONR: retained and newly imported organization–PE relationships, with the complete PE mission, notes, R-2A project missions, activity descriptions and FY2026 plans available in the existing normalized dataset. Available source text is reproduced without editorial shortening. Decision evidence excerpts are labeled separately.</p><p class="note">These are FY2026 budget requests and documented associations, not verified organization allocations. Service and DHP imports add explicit narrative associations; no workbook was changed. Army, Navy/Marine Corps, Air Force, Space Force and DHP sources are now included. Navy activity tables and DHP project breakdowns are not normalized; inspect the linked original source for complete tables.</p><nav>'''+nav+'''</nav><button id="expand" type="button">Expand all source text</button> <button id="collapse" type="button">Collapse source text</button>''']
review_path=root/'public/scope-review.json'
if review_path.exists():
 review=json.loads(review_path.read_text())
 parts.append('<section class="org" id="funding-scope"><h2>Funding scope review · November 5, 2026</h2><p>Screened '+str(review['organizationsScreened'])+' loaded organizations, '+str(review['relationshipsScreened'])+' organization–PE relationships and '+str(review['sourceRecordsScreened'])+' available PE/category records. The review includes dedicated scopes and the user-approved single-organization assignment rule. It does not certify institution budgets, complete portfolios or current execution.</p><p>'+str(review['newScopeDecisions'])+' source-supported scopes now contribute to partial program-context bubbles. Shared performers and source conflicts remain unallocated. All amounts below are millions of dollars.</p>')
 if review.get('singleOrganizationPolicy'):
  policy=review['singleOrganizationPolicy'];parts.append('<h3>Single-organization assignment rule</h3><p>'+e(policy['rule'])+'</p><p>'+str(policy['assignedRecords'])+' PE/category records assigned by this rule. These assignments are inferred from source mentions, not verified institutional allocations.</p>')
 for item in review.get('reconciliations',[]):
  parts.append('<article class="record"><h3>'+e(item['pe'])+' · '+e(item['status'])+'</h3><p>'+e(item['note'])+'</p>'+''.join('<a href="'+e(u,quote=True)+'">Official source ↗</a> ' for u in item['sources'])+'</article>')
 if review.get('remainingPeReview'):
  rr=review['remainingPeReview'];parts.append('<h3>Remaining PE / project review</h3><p>'+str(rr['casesReviewed'])+' organization–funding cases across '+str(rr['uniquePeCategoryRecords'])+' PE/category records reviewed. '+e(rr['note'])+'</p><ul>'+''.join('<li>'+e(k)+': '+str(v)+'</li>' for k,v in rr['statusCounts'].items())+'</ul>')
  parts.append('<details><summary>All reviewed cases, source amounts and outcomes</summary>')
  for c in rr['cases']:
   parts.append('<article class="record"><h4>'+e(c['org'])+' · '+e(c['pe'])+' / '+e(c['project'] or 'PE')+' · '+money(c['amount'])+'</h4><p>'+e(c['status'])+' · '+e(c['resolution'])+'</p><blockquote>'+e(c['evidence'])+'</blockquote><a href="'+e(c['source'],quote=True)+'">Budget source ↗</a></article>')
  parts.append('</details>')
 parts.append('<h3>Organizations with additional reviewed scope</h3><table><thead><tr><th>Organization</th><th>Included context ($M)</th><th>Scope decisions</th></tr></thead><tbody>')
 for ac in review['newScopedOrganizations']:
  n=next(n for n in d['nodes'] if n['acronym']==ac)
  rows=[z for z in review['decisions'] if z['org']==ac]
  parts.append(f'<tr><td>{e(n["name"])}</td><td>{n["contextAmount"]:,.3f}</td><td>{len(rows)}</td></tr>')
 parts.append('</tbody></table><h3>Included amounts and evidence</h3>')
 for ac in review['newScopedOrganizations']:
  parts.append(f'<details><summary>{e(ac)} · included scopes</summary>')
  for z in review['decisions']:
   if z['org']!=ac:continue
   parts.append(f'<article class="record"><h4>{e(z["pe"])} / {e(z["project"] or "PE")} · {e(z["title"])} · {money(z["amount"])}</h4><p>BA 6.{z["ba"]} · {e(z["level"])}</p><p>{e(z["basis"])}</p><blockquote>{e(z["evidence"])}</blockquote><a href="{e(z["source"],quote=True)}">Source document ↗</a></article>')
  parts.append('</details>')
 parts.append('<h3>Consolidated unresolved cases</h3><p>Questions fall into source funding corrections, conflicting project labels, parent/subordinate portfolio scope, shared performers without splits, and source dashes. Pending amounts do not contribute to bubbles. A dash is not zero. Parent roll-up is not enabled.</p>')
 for ac in sorted(set(z['org'] for z in review['questions'])):
  rows=[z for z in review['questions'] if z['org']==ac]
  parts.append(f'<details><summary>{e(ac)} · {len(rows)} unresolved records</summary>')
  for q in rows:parts.append(f'<article class="record"><h4>{e(q["pe"])} / {e(q["project"] or "PE")} · {e(q["title"])} · {money(q["amount"])}</h4><p>{e(q["reason"])}</p><blockquote>{e(q["evidence"])}</blockquote><a href="{e(q["source"],quote=True)}">Source document ↗</a></article>')
  parts.append('</details>')
 parts.append('<h3>Rejected acronym matches</h3><p>Historical matches remain in the audit but are labeled excluded in the application. They provide no organization funding scope.</p><ul>')
 for z in review['excludedAcronymCollisions']:parts.append(f'<li>{e(z["org"])} · {e(z["pe"])} · {e(z["reason"])}</li>')
 parts.append('</ul></section>')
for acronym in order:
 n=next(n for n in d['nodes'] if n['acronym']==acronym)
 parts.append(f'<section class="org" id="{acronym}"><h2>{e(n["name"])}</h2><p class="note">Review question: {e(notes[acronym])}</p>')
 for r in n['relationships']:
  parts.append(f'<article class="record"><h3>{e(r["number"])} · {e(r["title"])}</h3><p class="meta">FY{r["fy"]} · {("BA 6."+str(r["ba"])) if r["ba"] is not None else "DHP appropriation BA2; lifecycle unassigned"} · {money(r["amount"])} total PE request · Appropriation {e(r["appropriation"])}</p><p class="meta">Issuing agency: {e(r["agency"])}<br>Source: {e(r["file"])}<br>{e(r["officialStatus"])}</p><a href="{e(r["source"],quote=True)}" target="_blank" rel="noreferrer">Open source document ↗</a><h4>Organization-match evidence excerpt</h4><blockquote>{e(r["evidence"] or "")}</blockquote><p>{e(r["role"] or "")}</p>')
  # Show the full source paragraphs containing the name/acronym immediately, including activity plans.
  passages=[]
  fields=[('PE mission',r.get('mission')),('PE budget note',r.get('note'))]
  for p in r['projects']:
   fields.append((f'Project {p["number"]}: {p["title"]} — mission',p.get('mission')))
   for a in p['activities']:
    fields.extend([(f'Activity: {a["title"]} — description ({money(a["amount"])})',a.get('description')),(f'Activity: {a["title"]} — FY2026 plan',a.get('plan'))])
  for label,s in fields:
   for paragraph in re.split(r'\n\s*\n',s or ''):
    if match(paragraph,n) and paragraph not in [v for _,v in passages]:passages.append((label,paragraph))
  parts.append('<h4>Complete source paragraphs naming the organization</h4>')
  if not passages:parts.append('<p>The organization is named in a title or crosswalk excerpt; see complete records below.</p>')
  for label,s in passages:parts.append(f'<div class="matched"><p class="meta">{e(label)}</p>{text(s)}</div>')
  parts.append('<details><summary>Complete PE mission and budget notes</summary><h4>PE mission</h4>'+text(r.get('mission'))+'<h4>Budget notes</h4>'+text(r.get('note'))+'</details>')
  for p in r['projects']:
   parts.append(f'<details><summary>Project {e(p["number"])} · {e(p["title"])} · {money(p["amount"])}</summary><h4>Complete project mission</h4>'+text(p.get('mission')))
   for a in p['activities']:
    parts.append(f'<details><summary>{e(a["title"])} · {money(a["amount"])}</summary><h4>Complete activity description</h4>'+text(a.get('description'))+'<h4>Complete FY2026 plan</h4>'+text(a.get('plan'))+'</details>')
   parts.append('</details>')
  parts.append('</article>')
 parts.append('</section>')
parts.append('''<a href="./">← Back to the funding landscape</a></main><script>document.querySelector('#expand').onclick=()=>document.querySelectorAll('details').forEach(d=>d.open=true);document.querySelector('#collapse').onclick=()=>document.querySelectorAll('details').forEach(d=>d.open=false);</script></body></html>''')
(root/'public/evidence.html').write_text('\n'.join(line.rstrip() for line in ''.join(parts).splitlines()))
print('Rendered complete evidence review:',len(''.join(parts)),'characters')
