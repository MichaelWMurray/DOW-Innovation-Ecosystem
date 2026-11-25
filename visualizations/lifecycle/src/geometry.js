import {scaleLinear, pie, arc, quadtree} from 'd3';
import {MANUFACTURING_READINESS, organizationPlacements, mctssaPlacements} from './lifecycle-placements.js';
export const BA = [
 {id:1,code:'6.1',label:'Basic Research',color:'#65c6d4'},
 {id:2,code:'6.2',label:'Applied Research',color:'#6599ef'},
 {id:3,code:'6.3',label:'Advanced Technology Development',color:'#8d7fe2'},
 {id:4,code:'6.4',label:'Advanced Component Development & Prototypes',color:'#d087c5'},
 {id:5,code:'6.5',label:'System Development & Demonstration',color:'#d7a068'},
 {id:6,code:'6.6',label:'RDT&E Management Support',color:'#93ab79'},
 {id:7,code:'6.7',label:'Operational Systems Development',color:'#ce727a'},
 {id:8,code:'6.8',label:'Software & Digital Technology Pilots',color:'#57b39d'},
 {id:9,code:'',label:'Lending Authority',color:'#2f9e44'},
 {id:10,code:'',label:'Procurement',color:'#4b678c'},
 {id:11,code:'6.9',label:'Agile RDT&E Portfolio Management',color:'#be8b45'},
 {id:12,code:'',label:'Budget activity unassigned',color:'#9ba8b5'},
 {id:13,code:'',label:'Credit Program Appropriation',color:'#17695a'},
];
export const STAGES=[
 {id:1,code:'6.1',lines:['Basic','Research']},
 {id:2,code:'6.2',lines:['Applied','Research']},
 {id:3,code:'6.3',lines:['Advanced Technology','Development']},
 {id:4,code:'6.4',lines:['Advanced Component','Development &','Prototypes']},
 {id:5,code:'6.5',lines:['System Development','& Demonstration']},
 {id:6,code:'',lines:['Low-Rate','Production']},
 {id:7,code:'',lines:['Full-Rate','Production']},
 {id:8,code:'',lines:['Operations, Sustainment','& Lifecycle','Management']},
];
export const OSC_LENDING_AUTHORITY_M=210000;
export const OSC_PRODUCTION_STAGE=7;
export const K=170/Math.sqrt(7435.156);
export const radius=(amount,scale=K)=>amount===null?null:Math.sqrt(Math.max(0,amount))*scale;
export const ringWidth=r=>Math.max(3.5,Math.min(22.1,22.1*Math.sqrt(r/170)));
export const money=v=>v===null||v===undefined?'Unknown':v>=1000?`$${(v/1000).toFixed(3)}B`:`$${v.toFixed(3)}M`;
export const xScale=scaleLinear().domain([1,8]).range([115,1135]);
export const categoryLabel=id=>{const b=BA.find(b=>b.id===+id);return `${b.code?b.code+' — ':''}${b.label}`};
export const lifecycleLabel=stage=>stage===null?'Unresolved':stage===MANUFACTURING_READINESS?'Manufacturing Readiness':STAGES[stage-1].lines.join(' ');
export function lifecycleRecord(r,organizationId){
 const placement=organizationId==='IEORG-0341'?mctssaPlacements[r.id]:organizationPlacements[organizationId];
 if(placement){
  const [stage,basis]=placement;
  return {stage,basis};
 }
 if(r.ba>=1&&r.ba<=5)return {stage:r.ba,basis:`Source BA 6.${r.ba}: initial lifecycle crosswalk.`};
 if(r.ba===8&&/\bfielding\b/i.test(r.title))return {stage:8,basis:'PE title explicitly identifies fielding; assigned to the operations/delivery end of this display. Not a TRL or manufacturing assessment.'};
 return {stage:null,basis:'Lifecycle stage unresolved from available record; excluded from horizontal average, retained in ring and budget scope.'};
}
export const contextRecords=n=>n.relationships.filter(r=>r.contextScope).flatMap(r=>r.contextComponents?.length?r.contextComponents.map(c=>({...r,...c,parentPeId:r.id,contextBasis:c.basis})): [r]);
export function uniqueContextTotal(nodes){
 const pes=new Map();
 for(const n of nodes)for(const r of n.relationships.filter(r=>r.contextScope)){
  const peKey=r.appropriation&&r.number?`${r.appropriation}|${r.number}|${r.ba}`:r.id;
  const scope=pes.get(peKey)??{full:null,components:new Map()};
  if(r.contextComponents?.length)for(const c of r.contextComponents)scope.components.set(c.id,c);
  else if(r.amount!==null)scope.full=r.amount;
  pes.set(peKey,scope);
 }
 if(!pes.size)return null;
 return [...pes.values()].reduce((sum,p)=>{
  if(p.full!==null)return sum+p.full;
  const components=[...p.components.values()];
  const projects=new Set(components.filter(c=>c.scopeLevel==='project').map(c=>c.projectNumber));
  return sum+components.filter(c=>c.scopeLevel!=='activity'||!projects.has(c.projectNumber)).reduce((a,c)=>a+(c.amount??0),0);
 },0);
}
export function buildViewNodes(nodes,includeCredit=false,fundingView='legacy'){
 const scale=includeCredit&&nodes.some(n=>n.creditProgram)?170/Math.sqrt(OSC_LENDING_AUTHORITY_M):K;
 return nodes.map(n=>{
 const useReconciled=fundingView==='reconciled';
 const funding=useReconciled?n.reconciledFunding:null;
 const rdteAmount=useReconciled?funding?.amount??null:n.contextAmount;
 const rdteSegments=useReconciled?funding?.segments:n.contextSegments;
 const records=(useReconciled?funding?.records??[]:contextRecords(n)).map(r=>({...lifecycleRecord(r,useReconciled?n.id:undefined),id:r.id,number:r.number,amount:r.amount}));
 const extra=n.supplementalRecords??[];const supplemental=extra.reduce((s,r)=>s+r.amount_m,0);
 const credit=includeCredit&&n.creditProgram?OSC_LENDING_AUTHORITY_M:0;
 const appropriation=n.creditProgram?.amount_m??0;
 const oscAmount=credit||appropriation;
 const seg=oscAmount?{[credit?9:13]:oscAmount}:{...rdteSegments};
 for(const r of extra)seg[r.category]=(seg[r.category]??0)+r.amount_m;
 const amount=oscAmount||(rdteAmount===null&&!supplemental?null:(rdteAmount??0)+supplemental);
 const placed=records.filter(r=>r.stage!==null&&r.amount!==null&&r.amount>0);
 const extraMapped=extra.filter(r=>r.stage!==null);const mapped=oscAmount||(placed.reduce((a,r)=>a+r.amount,0)+extraMapped.reduce((s,r)=>s+r.amount_m,0));
 const position=oscAmount?OSC_PRODUCTION_STAGE:mapped>0?(placed.reduce((a,r)=>a+r.stage*r.amount,0)+extraMapped.reduce((s,r)=>s+r.stage*r.amount_m,0))/mapped:null;
 return {...n,radiusScale:scale,displayAmount:amount,displaySegments:seg,position,positionCoverage:amount?mapped/amount:null,unmappedAmount:(amount??0)-mapped,lifecycleRecords:[...records,...extra.map(r=>({id:r.id,number:r.label,amount:r.amount_m,stage:r.stage,basis:r.placementBasis}))],creditIncluded:credit};
})}
export function segments(values,r,width=ringWidth(r)){
 const entries=Object.entries(values).map(([ba,value])=>({ba:+ba,value})).filter(x=>x.value>0).sort((a,b)=>a.ba-b.ba);
 return pie().sort(null).value(d=>d.value)(entries).map(s=>({...s,innerRadius:r,outerRadius:r+width,path:arc().innerRadius(r).outerRadius(r+width)(s),color:BA[s.data.ba-1].color}));
}
export function layout(nodes,mode='scope'){
 const sized=nodes.filter(n=>!n.componentOnly&&mode==='scope'&&n.displayAmount>0&&n.position!==null).map(n=>({...n,r:radius(n.displayAmount,n.radiusScale),x:xScale(n.position),y:650}));
 for(let t=0;t<100;t++){
  const tree=quadtree(sized,d=>d.x,d=>d.y);
  for(const a of sized){tree.visit((quad,x0,y0,x1,y1)=>{
   if(!quad.length)for(let leaf=quad;leaf;leaf=leaf.next){const b=leaf.data;if(a===b)continue;const min=a.r+b.r+ringWidth(a.r)+ringWidth(b.r)+65,dx=a.x-b.x,dy=a.y-b.y;if(Math.hypot(dx,dy)<min){const required=Math.sqrt(Math.max(0,min*min-dx*dx));a.y+=(dy===0?(a.id<b.id?-1:1):Math.sign(dy))*(required-Math.abs(dy))*.52;}}
   return x0>a.x+a.r+250||x1<a.x-a.r-250||y0>a.y+a.r+250||y1<a.y-a.r-250;
  });a.y=Math.max(115+a.r+ringWidth(a.r),Math.min(1350-a.r-ringWidth(a.r),a.y));}
 }
 // Resolve boundary traps from relaxation while preserving the lifecycle X.
 // Place large circles first so a smaller circle can move around an anchored one.
 const settled=[];
 for(const a of [...sized].sort((a,b)=>b.r-a.r)){
  const separation=b=>a.r+b.r+ringWidth(a.r)+ringWidth(b.r)+50;
  if(settled.some(b=>Math.hypot(a.x-b.x,a.y-b.y)<separation(b))){
   const candidates=[a.y];
   for(const b of settled){const dx=a.x-b.x,min=separation(b);if(Math.abs(dx)<min){const dy=Math.sqrt(min*min-dx*dx)+.01;candidates.push(b.y-dy,b.y+dy)}}
   const available=candidates.filter(y=>y>=115+a.r+ringWidth(a.r)&&settled.every(b=>Math.hypot(a.x-b.x,y-b.y)>=separation(b)));
   available.sort((y,z)=>Math.abs(y-a.y)-Math.abs(z-a.y));a.y=available[0];
  }
  settled.push(a);
 }
 const unassignedY=Math.max(1520,...sized.map(n=>n.y+n.r+2*ringWidth(n.r)+200));
 const unassigned=mode==='scope'?nodes.filter(n=>!n.componentOnly&&n.displayAmount>0&&n.position===null).map((n,i,arr)=>({...n,r:radius(n.displayAmount,n.radiusScale),x:arr.length===1?625:170+i*900/Math.max(1,arr.length-1),y:unassignedY,unpositioned:true})):[];
 for(let i=0;i<unassigned.length;i++){const a=unassigned[i];for(let j=0;j<i;j++){const b=unassigned[j],min=a.r+b.r+2*ringWidth(a.r)+2*ringWidth(b.r)+50,dx=a.x-b.x;if(Math.abs(dx)<min&&Math.hypot(dx,a.y-b.y)<min)a.y=b.y+Math.sqrt(min*min-dx*dx)+1;}}
 return [...sized,...unassigned];
}
