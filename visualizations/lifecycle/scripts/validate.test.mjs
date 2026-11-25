import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyFundingOverlay,fundingExceptions} from '../src/funding.js';
import {radius,segments,layout,xScale,K,ringWidth,buildViewNodes,STAGES,lifecycleRecord,contextRecords,uniqueContextTotal} from '../src/geometry.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/data.json',import.meta.url)));
test('crosswalk counts and organization identity are preserved',()=>{
 assert.equal(data.retainedRoster.length,73);assert.equal(data.audit.retainedRelationships,323);
 assert.equal(new Set(data.retainedRoster.map(n=>n.id)).size,73);assert.equal(data.nodes.length,84);
 for(const n of data.nodes){assert((n.acronym==='APFIT'||n.scopeAdded)||data.retainedRoster.some(r=>r.id===n.id));assert(n.component);assert.equal(data.hierarchy.find(x=>x.id===n.id).parentId,n.parentId);assert.equal(n.attributedAmount,null);assert.equal(n.fundingStatus,'unknown');assert(n.logo.startsWith('data:image/'));}
 assert(data.nodes.find(n=>n.acronym==='AFRL').contextAmount>2000);
});
test('source totals are not duplicated by components or measures',()=>{
 const expected={DARPA:4565.795,DIU:57.547,OSC:.382,CDAO:9.196,Commons:446.261,APFIT:null,NSIC:1.395,SCO:806.909,MDA:7435.156,CYBERCOM:118.73400000000001,};
 for(const n of data.nodes){if(Object.hasOwn(expected,n.acronym))assert(n.contextAmount===expected[n.acronym]||Math.abs(n.contextAmount-expected[n.acronym])<1e-9);const scoped=n.relationships.filter(r=>r.contextScope);assert.equal(new Set(scoped.map(r=>r.id)).size,scoped.length);for(const r of n.relationships){assert.equal(r.measure,'total');assert.equal(r.fy,2026);assert.equal(r.attributedAmount,null);assert(r.source.startsWith('https://drive.google.com/'));}if(n.contextAmount!==null)assert(Math.abs(contextRecords(n).reduce((a,r)=>a+(r.amount??0),0)-n.contextAmount)<1e-8);}
 const commons=data.nodes.find(n=>n.acronym==='Commons');assert.equal(commons.relationships.filter(r=>r.contextScope).length,7);assert.equal(commons.relationships.filter(r=>r.contextScope&&r.amount===0).length,3);
 const cdao=data.nodes.find(n=>n.acronym==='CDAO');assert.equal(cdao.relationships.find(r=>r.number==='0305248J').contextScope,false);
});
test('area is exactly proportional, without minimum funding radii',()=>{
 const known=data.nodes.filter(n=>n.contextAmount>0);for(const a of known)for(const b of known)assert(Math.abs(radius(a.contextAmount)**2/radius(b.contextAmount)**2-a.contextAmount/b.contextAmount)<1e-7);
 assert.equal(radius(0),0);assert.equal(radius(null),null);assert(radius(.382)<2);assert.equal(radius(7435.156),170);
});
test('ring angle and annular area shares match source BA funding shares',()=>{
 for(const n of data.nodes.filter(n=>n.contextAmount)){const r=radius(n.contextAmount);const arcs=segments(n.contextSegments,r);assert(Math.abs(arcs.reduce((a,s)=>a+s.endAngle-s.startAngle,0)-Math.PI*2)<1e-9);for(const s of arcs){assert(Math.abs((s.endAngle-s.startAngle)/(Math.PI*2)-s.data.value/n.contextAmount)<1e-9);assert(s.path&&!s.path.includes('NaN'));assert(Math.abs(s.outerRadius-s.innerRadius-ringWidth(r))<1e-9);}}
});
test('lifecycle mapping excludes unsupported BA6-8 and preserves fixed X',()=>{
 const view=buildViewNodes(data.nodes,true);
 const darpa=view.find(n=>n.acronym==='DARPA');assert(Math.abs(darpa.unmappedAmount-129.296)<1e-8);assert(darpa.position<3);assert(darpa.positionCoverage<1);
 const diu=view.find(n=>n.acronym==='DIU');assert(diu.position>7);assert.equal(lifecycleRecord(diu.relationships.find(r=>r.ba===8)).stage,8);
 const osc=view.find(n=>n.acronym==='OSC');assert.equal(osc.creditIncluded,210000);assert.equal(osc.displayAmount,210000);assert.equal(osc.position,7);assert.deepEqual(osc.displaySegments,{9:210000});
 const without=buildViewNodes(data.nodes).find(n=>n.acronym==='OSC');assert.equal(without.displayAmount,1500);assert.equal(without.position,7);assert.deepEqual(without.displaySegments,{13:1500});assert.equal(without.radiusScale,K);assert.equal(without.contextAmount,osc.contextAmount);
 assert.equal(lifecycleRecord({ba:7,title:'Generic operational system development'}).stage,null);assert.equal(lifecycleRecord({ba:8,title:'Software pilots'}).stage,null);
 const positions=layout(view);assert.equal(positions.length,view.filter(n=>!n.componentOnly&&n.displayAmount>0).length);for(const n of positions)if(!n.unpositioned)assert.equal(n.x,xScale(n.position));
 for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){const a=positions[i],b=positions[j];assert(Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r+2*ringWidth(a.r)+2*ringWidth(b.r),'external rings overlap at minimum zoom')}
 assert.equal(layout(view,'attributed').length,0);assert.equal(STAGES.length,8);assert(STAGES[5].lines.join(' ').includes('Low-Rate'));assert(STAGES[6].lines.join(' ').includes('Full-Rate'));
 console.log(positions.map(n=>({org:n.acronym,r:n.r,ring:ringWidth(n.r),x:n.x,y:n.y})));
});
test('lending ring shares and moderate width remain accurate',()=>{
 const osc=buildViewNodes(data.nodes,true).find(n=>n.acronym==='OSC');const ss=segments(osc.displaySegments,radius(osc.displayAmount));const loan=ss.find(s=>s.data.ba===9);assert(Math.abs((loan.endAngle-loan.startAngle)/(2*Math.PI)-1)<1e-9);
 assert(ringWidth(radius(9.196))>radius(9.196)*.13);assert(ringWidth(radius(9.196))<ringWidth(radius(4565.795)));assert(ringWidth(radius(4565.795))<22.1);
 const oldColors=['#65c6d4','#6599ef','#8d7fe2','#d087c5','#d7a068','#93ab79','#ce727a','#57b39d'];
 assert.deepEqual(segments(Object.fromEntries(oldColors.map((_,i)=>[i+1,1])),20).map(s=>s.color),oldColors);
});

test('APFIT procurement record is separate from the retained PE crosswalk',()=>{
 const apfit=buildViewNodes(data.nodes).find(n=>n.acronym==='APFIT');assert.equal(apfit.contextAmount,null);assert.equal(apfit.displayAmount,92.193);assert.equal(apfit.displaySegments[10],92.193);assert.equal(apfit.position,6);assert.equal(apfit.relationships.length,0);assert.equal(apfit.supplementalRecords[0].appropriation,'0300D');assert(!data.retainedRoster.some(n=>n.id===apfit.id));assert.equal(data.audit.supplementalOrganizations,1);
 assert.equal(segments({9:1},10)[0].color,'#2f9e44');assert.equal(segments({10:1},10)[0].color,'#4b678c');
 const nsic=data.nodes.find(n=>n.acronym==='NSIC');const diu=data.nodes.find(n=>n.acronym==='DIU');assert.equal(nsic.parentId,diu.id);assert(!diu.relationships.some(r=>r.contextScope&&r.number==='0603021D8Z'));
 assert.equal(data.nodes.find(n=>n.acronym==='SCO').contextAmount,806.909);
});

test('full retained directory and enacted Credit Program replace authority',()=>{
 assert.equal(data.nodes.length,84);assert.equal(data.retainedRoster.length,73);assert.equal(data.nodes.reduce((a,n)=>a+n.relationships.filter(r=>!r.importedService).length,0),323);
 assert.deepEqual(new Set(data.nodes.filter(n=>n.acronym!=='APFIT'&&!n.scopeAdded).map(n=>n.id)),new Set(data.retainedRoster.map(n=>n.id)));
 const c=data.nodes.find(n=>n.acronym==='OSC').creditProgram;assert.equal(c.amount_m,1500);assert.equal(c.components.reduce((s,r)=>s+r.amount_m,0),1500);assert.equal(c.availableThrough,'2029-09-30');assert(c.source.includes('PLAW-119publ21'));assert.equal(data.nodes.find(n=>n.acronym==='OSC').creditProgram.amount_m,1500);
 const ds=layout(buildViewNodes(data.nodes)).find(n=>n.acronym==='DCSA');assert(ds.unpositioned);assert.equal(ds.position,null);assert(ds.displayAmount>0);
});

// Verify activity scoping without reassigning the full PE or double-counting it.
test('BioMADE uses its named activity and parent/component totals form a union',()=>{
 const b=data.nodes.find(n=>n.acronym==='BioMADE');const pe=b.relationships[0];
 const a=pe.projects.flatMap(p=>p.activities).find(a=>a.title==='Bioindustrial Manufacturing Innovation');
 assert.equal(b.contextAmount,18.432);assert.equal(a.amount,b.contextAmount);assert.equal(pe.amount,409.493);
 const v=buildViewNodes([b])[0];assert.equal(v.position,3);assert.equal(v.displaySegments[3],18.432);
 assert.equal(uniqueContextTotal([b,b]),18.432);
 assert.equal(uniqueContextTotal([b,{relationships:[{...pe,contextComponents:undefined}]}]),409.493);
 assert(data.nodes.filter(n=>buildViewNodes([n])[0].displayAmount===null).length<34);
 const review=fs.readFileSync(new URL('../public/evidence.html',import.meta.url),'utf8');
 for(const ac of ['JHTO','TRMC','AFRL','ONR'])assert(review.includes('id="'+ac+'"'));
 assert(review.includes('FY26 Controls are incorrectly reflected'));
});

test('service imports preserve explicit associations separately from allocated scope',()=>{
 const imported=data.nodes.flatMap(n=>n.relationships.filter(r=>r.importedService));
 assert.equal(data.audit.serviceImport.peRecords,832);
 assert.equal(imported.length,data.audit.serviceImport.addedOrgPeAssociations);
 assert(imported.length>806);
 for(const r of imported){assert(r.evidence.trim());assert.equal(r.attributedAmount,null);assert(Number.isFinite(r.amount)||r.amount===null);}
 const onr=data.nodes.find(n=>n.acronym==='ONR');assert(onr.contextAmount>=329.681);
 assert(Math.abs(onr.contextSegments['2']-186.322)<1e-9);assert(Math.abs(onr.contextSegments['6']-42.785)<1e-9);
 assert(imported.filter(r=>r.contextScope&&!r.scopeReviewApplied).every(r=>onr.relationships.includes(r)));
 const dhp=imported.filter(r=>r.appropriation==='0130');assert(dhp.length>0);assert(dhp.every(r=>r.ba===null));
 const navy=imported.filter(r=>r.agency==='Navy').flatMap(r=>r.projects);assert(navy.length>0);assert(navy.every(p=>p.number!=='Unspecified'&&p.mission));
});

test('scope review uses source amounts and preserves unresolved evidence',()=>{
 const audit=JSON.parse(fs.readFileSync(new URL('../public/scope-review.json',import.meta.url)));
 assert.equal(audit.organizationsScreened,84);assert.equal(audit.relationshipsScreened,data.nodes.reduce((s,n)=>s+n.relationships.length,0));
 assert(audit.newScopedOrganizations.length>25);assert(audit.newScopeDecisions>81);
 const expected={C5ISR:229.043,GVSC:73.260,NAVAIR:16.441,NAVWAR:2.497,P1:95.380,SDA:3525.313,SSC:305.484,'Naval Postgraduate School':12.920,'MIT LL':11.479,JHTO:23.582,'DTE&A':37.381,'America Makes':43.731,'AIM Photonics':15.542,ARM:10.820,AFFOA:6.288,DIANA:35.761,T3CP:1.768};
 for(const [ac,total]of Object.entries(expected))assert(Math.abs(data.nodes.find(n=>n.acronym===ac).contextAmount-total)<1e-8,ac);
 const afrl=data.nodes.find(n=>n.acronym==='AFRL');assert(afrl.relationships.some(r=>r.number==='1206601SF'&&r.contextScope));
 for(const ac of ['CECOM'])assert.equal(data.nodes.find(n=>n.acronym===ac).contextAmount,null);
 for(const n of data.nodes)for(const r of n.relationships){assert(r.scopeAssessment);if(r.scopeAssessment.status==='excluded-acronym-collision')assert(!r.contextScope);if(r.contextComponents?.length){assert(r.contextComponents.every(c=>c.amount!==null&&c.basis&&(c.projectNumber||c.scopeLevel==='PE-component')));assert(r.contextComponents.reduce((s,c)=>s+c.amount,0)<=(r.reconciledAmount??r.amount)+.001);}}
 const scopes=new Set();for(const c of audit.decisions){const id=[c.org,c.pe,c.ba,c.project,c.activity].join('|');assert(!scopes.has(id));scopes.add(id);assert(c.evidence&&c.basis&&c.source);}
 assert.equal(audit.excludedAcronymCollisions.length,30);
 assert(!audit.questions.some(q=>q.org==='CECOM'&&q.project==='M44'));assert(audit.pendingCases<152);
 const review=fs.readFileSync(new URL('../public/evidence.html',import.meta.url),'utf8');assert(review.includes('id="funding-scope"'));assert(review.includes('SDA denotes Space Domain Awareness'));
});

test('canonical PE and project/activity unions absorb overlapping parent scopes',()=>{
 const r={id:'old-import-key',number:'0603680D8Z',appropriation:'0400',ba:3,amount:409.493,contextScope:true};
 const activity={id:'activity',amount:18.432,projectNumber:'350',scopeLevel:'activity'};
 const project={id:'project',amount:138.079,projectNumber:'350',scopeLevel:'project'};
 assert.equal(uniqueContextTotal([{relationships:[{...r,contextComponents:[activity]}]},{relationships:[{...r,id:'different-import-key',contextComponents:[project]}]}]),138.079);
 assert.equal(uniqueContextTotal([{relationships:[r]},{relationships:[{...r,id:'different-import-key',contextComponents:[activity]}]}]),409.493);
 assert.equal(uniqueContextTotal([{relationships:[r]},{relationships:[{...r,id:'different-import-key'}]}]),409.493);
 assert.equal(uniqueContextTotal([{relationships:[r]},{relationships:[{...r,id:'different-ba',ba:2}]}]),818.986);
});


test('user decisions split UCAH from JHTO and resolve M44 to C5ISR',()=>{
 const ucah=data.nodes.find(n=>n.acronym==='UCAH'),jhto=data.nodes.find(n=>n.acronym==='JHTO'),c5=data.nodes.find(n=>n.acronym==='C5ISR');
 assert.equal(ucah.contextAmount,27.416);assert(Math.abs(jhto.contextAmount-23.582)<1e-9);assert(Math.abs(uniqueContextTotal([ucah,jhto])-50.998)<1e-9);
 const u=contextRecords(ucah).map(r=>r.id);assert(contextRecords(jhto).every(r=>!u.includes(r.id)));
 const m44=contextRecords(c5).find(r=>r.projectNumber==='M44');assert.equal(m44.amount,4.004);assert(m44.contextBasis.includes('User approved'));assert.equal(data.nodes.find(n=>n.acronym==='CECOM').contextAmount,null);
});

test('request control reconciliation conserves funding and retains unresolved source limits',()=>{
 const review=JSON.parse(fs.readFileSync(new URL('../public/scope-review.json',import.meta.url)));
 const [trmc,unlocated,transfer]=review.reconciliations;
 assert.equal(trmc.publishedDiscretionary+trmc.mandatoryRequest,trmc.combinedRequest);assert.equal(trmc.unresolvedProjectVariance,359);
 assert.equal(unlocated.destination,null);assert.equal(unlocated.transferApplied,false);assert.equal(unlocated.activeDiscretionary,245.497);
 assert.equal(transfer.activeBA2,0);assert.equal(transfer.activeBA3,131.179);assert(Math.abs(transfer.publishedBA2+transfer.publishedBA3-transfer.activeBA3)<1e-9);
 const rs=data.nodes.flatMap(n=>n.relationships).filter(r=>r.number==='1206616SF');assert(rs.filter(r=>r.ba===2).every(r=>!r.contextScope));assert.equal(uniqueContextTotal([{relationships:rs.filter(r=>r.contextScope)}]),131.179);
 assert(review.singleOrganizationPolicy.assignedRecords>90);
 for(const c of review.singleOrganizationPolicy.assignments){assert.equal(c.organizations.length,1);assert.equal(c.otherNamedOrganizations.length,0);}
 const dla=buildViewNodes(data.nodes).find(n=>n.acronym==='DLA');assert.equal(dla.displaySegments[11],143.618);assert(!dla.displaySegments[9]);
});

test('service components remain in hierarchy but never become innovation bubbles',()=>{
 const components=data.nodes.filter(n=>n.componentOnly);assert.deepEqual(new Set(components.map(n=>n.acronym)),new Set(['USAF','USSF','USMC']));
 const circles=layout(buildViewNodes(data.nodes));assert.equal(circles.length,59);
 for(const n of components){assert(!circles.some(c=>c.id===n.id));assert(data.hierarchy.some(h=>h.id===n.id));assert(n.relationships.length>0);}
 assert(circles.some(n=>n.acronym==='AFRL'));assert(circles.some(n=>n.acronym==='DEVCOM'));
});

test('remaining PE review resolves dedicated scopes and preserves source limitations',()=>{
 const audit=JSON.parse(fs.readFileSync(new URL('../public/scope-review.json',import.meta.url)));const review=audit.remainingPeReview;
 assert.equal(review.casesReviewed,142);assert.equal(review.queuedCasesReviewed,129);assert.equal(review.uniquePeCategoryRecords,59);assert.equal(Object.values(review.statusCounts).reduce((a,b)=>a+b,0),142);
 assert.equal(review.statusCounts['assigned-project'],37);assert.equal(review.statusCounts['assigned-single-organization'],10);assert.equal(review.statusCounts['not-sole-organization'],2);
 for(const c of review.cases.filter(c=>c.status==='assigned-project')){const n=data.nodes.find(n=>n.acronym===c.org);const r=n.relationships.find(r=>r.number===c.pe&&r.appropriation===c.appropriation&&r.ba===c.ba);assert.equal(r.contextComponents.find(x=>x.projectNumber===c.project).amount,c.amount);}
 const expected={AFRL:2076.131,C5ISR:229.043,ERDC:363.794,DLA:148.638,'DLA R&D':70.25,DMEA:135.016,SC:2,ARL:172.463,CBC:8.209,AvMC:28.893,AFWERX:18.499};
 for(const [ac,total]of Object.entries(expected))assert(Math.abs(data.nodes.find(n=>n.acronym===ac).contextAmount-total)<1e-8,ac);
 const group=['DLA','DLA R&D','DMEA'].map(ac=>data.nodes.find(n=>n.acronym===ac));assert(Math.abs(uniqueContextTotal(group)-353.904)<1e-9);
 for(const num of ['0603680S','0603712S','0603720S'])assert(!group[0].relationships.find(r=>r.number===num).contextScope);
 assert(!data.nodes.some(n=>n.acronym==='ARCYBER'||n.acronym==='DOTC'));
 assert.equal(data.nodes.filter(n=>n.scopeAdded).length,10);assert.equal(data.hierarchy.length-data.nodes.length,339);
 const dev=data.nodes.find(n=>n.acronym==='DEVCOM');assert(!contextRecords(dev).some(c=>c.projectNumber==='DO1'));
 assert(review.cases.filter(c=>c.amount===null).every(c=>c.status==='amount-unavailable'));
});

test('reconciled FY2026 records reconcile by inventory ID and budget activity',()=>{
 const overlay=JSON.parse(fs.readFileSync(new URL('../src/funding-overlay.json',import.meta.url)));
 const joined=applyFundingOverlay(data,overlay);
 assert.equal(new Set(joined.nodes.map(n=>n.id)).size,joined.nodes.length);
 assert.equal(new Set(overlay.organizations.map(n=>n.organizationId)).size,423);
 assert.equal(joined.hierarchy.filter(n=>n.reconciledFunding.amount===null).length,295);
 const supported=joined.hierarchy.filter(n=>n.reconciledFunding.amount!==null);
 assert.equal(supported.length,128);
 for(const {id,reconciledFunding:f} of supported){
  const segments={};
  for(const r of f.records){
   assert.equal(r.organizationId,id);
   segments[r.category]=(segments[r.category]??0)+Math.round(1000*r.amount);
  }
  assert.deepEqual(segments,Object.fromEntries(Object.entries(f.segments).map(([ba,m])=>[ba,Math.round(1000*m)])));
  assert.equal(Object.values(segments).reduce((sum,m)=>sum+m,0),Math.round(1000*f.amount));
 }
 const onr=joined.nodes.find(n=>n.id==='IEORG-0160').reconciledFunding;
 assert.equal(onr.amount,139.749);
 assert.equal(onr.records.find(r=>r.attributionRole==='Administered funding').amount,51.117);
 const ssc=joined.nodes.find(n=>n.id==='IEORG-0243').reconciledFunding;
 assert.equal(ssc.amount,392.679);
 assert.equal(fundingExceptions(overlay.release,ssc.organizationId)[0].amount_m,12.310);
 assert.equal(ssc.records.find(r=>r.projectNumber==='664280').amount,256.852);
});

test('the reconciled and legacy views retain independent scopes and geometry',()=>{
 const overlay=JSON.parse(fs.readFileSync(new URL('../src/funding-overlay.json',import.meta.url)));
 const {nodes}=applyFundingOverlay(data,overlay);
 assert.equal(layout(buildViewNodes(nodes,true,'legacy')).length,59);
 const view=buildViewNodes(nodes,true,'reconciled');
 const positions=layout(view);
 assert.equal(positions.length,125);
 assert.equal(positions.filter(n=>n.reconciledFunding?.amount>0).length,124);
 const apfit=positions.find(n=>n.acronym==='APFIT');
 assert.equal(apfit.displaySegments[10],1355.5);
 assert.equal(apfit.displayAmount,1355.5);
 assert.equal(apfit.supplementalRecords[0].components.reduce((sum,c)=>sum+c.amount,0),1355.5);
 assert.equal(apfit.position,6);
 assert.equal(apfit.reconciledFunding.amount,null);
 assert.equal(positions.find(n=>n.acronym==='OSC').displaySegments[9],210000);
 const osc=positions.find(n=>n.acronym==='OSC');
 assert.equal(osc.r,170);assert.equal(osc.x,xScale(7));
 const peer=positions.find(n=>n.acronym==='APFIT');
 assert(Math.abs((osc.r/peer.r)**2-osc.displayAmount/peer.displayAmount)<1e-8);
 assert.equal(view.find(n=>n.acronym==='TRMC').displayAmount,null);
 assert.equal(buildViewNodes([{...nodes[0],reconciledFunding:{amount:0,segments:{},records:[]}}],false,'reconciled')[0].displayAmount,0);
 for(const [i,a] of positions.entries()){
  assert(Number.isFinite(a.y));
  if(!a.unpositioned)assert.equal(a.x,xScale(a.position));
  for(const b of positions.slice(0,i))assert(Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r+2*(ringWidth(a.r)+ringWidth(b.r)));
 }
});
