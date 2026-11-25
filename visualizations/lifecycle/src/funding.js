// Keep the imported FY2026 request scopes independent of the historical PE crosswalk.
export function applyFundingOverlay(data, overlay) {
 const byId=new Map(overlay.organizations.map(row=>[row.organizationId,row]));
 const attach=node=>byId.has(node.id)?{...node,reconciledFunding:byId.get(node.id)}:node;
 return {...data,nodes:[...data.nodes,...overlay.inventoryNodes].map(attach),hierarchy:data.hierarchy.map(attach)};
}

export function fundingExceptions(release,id) {
 return release.openItems.filter(item=>item.organization_id===id||item.scopes?.some(scope=>scope.organizationId===id));
}
