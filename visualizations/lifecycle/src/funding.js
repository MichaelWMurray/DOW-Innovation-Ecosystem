import nonRdte from '../../hierarchy/src/non-rdte.json' with { type: 'json' };

// Keep the imported FY2026 request scopes independent of the historical PE crosswalk.
export function applyFundingOverlay(data, overlay) {
 const byId=new Map(overlay.organizations.map(row=>[row.organizationId,row]));
 const attach=node=>{
  const funding=byId.get(node.id);
  const supplemental=nonRdte.procurement[node.id];
  const updated={...node,...(funding?{reconciledFunding:funding}:{})};
  if(supplemental&&node.supplementalRecords){
   updated.supplementalRecords=node.supplementalRecords.map(record=>({
    ...record,amount_m:supplemental.amount,
    measure:'FY2026 procurement spend plan ($M)',
    basis:supplemental.basis,
    reference:'FY2026 APFIT procurement spend plan: $1,355.5M. '+supplemental.components.map(c=>c.label+': $'+c.amount.toLocaleString('en-US')+'M').join(' + '),
    components:supplemental.components,
    source:node.website,
    sourceLabel:'APFIT program information',
   }));
  }
  return updated;
 };
 return {...data,nodes:[...data.nodes,...overlay.inventoryNodes].map(attach),hierarchy:data.hierarchy.map(attach)};
}

export function fundingExceptions(release,id) {
 return release.openItems.filter(item=>item.organization_id===id||item.scopes?.some(scope=>scope.organizationId===id));
}
