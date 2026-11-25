import type {validateWorkbook, WorkbookOrg} from './workbook-data';
import nonRdte from './non-rdte.json';
import rollupData from './funding-rollups.json';
import {hierarchy, packSiblings, packEnclose, type HierarchyCircularNode} from 'd3-hierarchy';
import snapshot from './draft.json';

import logoData from './logos.json';
export const logos: Record<string,string> = logoData;
const hiddenRoot = 'IEORG-0240';
const workbookOrganizations: WorkbookOrg[] = snapshot.organizations;
export const organizations = workbookOrganizations.filter(org => org.id !== hiddenRoot);
type FundingRecord = ReturnType<typeof validateWorkbook>['funding'][number];
export const funding: FundingRecord[] = snapshot.funding;
export type Org = typeof organizations[number];
type Group = {id: string; label: string; org?: Org; children: Group[]};
export const overview = 'view:overview';
const external = 'view:external';
const unresolved = 'view:unresolved';
export type Circle = HierarchyCircularNode<Group>;
function buildLayout() {
  const groups: Group[] = [
    {id: overview, label: 'Overview', children: []},
    {id: external, label: 'External parent', children: []},
    {id: unresolved, label: 'Placement unresolved', children: []}
  ];
  const groupMap = new Map([...groups, ...organizations.map(org => ({
    id: org.id, label: org.label, org, children: [] as Group[]
  }))].map(group => [group.id, group]));
  for (const org of organizations) {
    const parent = org.parentId === hiddenRoot ? overview : org.parentId ?? (org.hierarchyStatus === 'unresolved' ? unresolved :
      org.hierarchyStatus === 'external_parent' ? external : overview);
    groupMap.get(parent)!.children.push(groupMap.get(org.id)!);
  }
  for (const group of groups.slice(1)) if (group.children.length) groups[0].children.push(group);
  return hierarchy(groups[0]).sort((a,b) => a.data.id.localeCompare(b.data.id)) as Circle;
}
export let layout = buildLayout();
// A single global coordinate system: children remain drawn inside their parents.
const amounts = new Map(snapshot.funding.map(item => [item.orgId,
  item.status === 'supported' ? Math.max(0,Number(item.amountMillionsDecimal)) : 0]));
export const rollups = new Map(Object.entries(rollupData));
export const procurement = new Map(Object.entries(nonRdte.procurement));
export const lendingAuthority = new Map(Object.entries(nonRdte.authority));
export const procurementByBranch = new Map<string, number>();
const fallbackArea = 8;
function packLayout(root: Circle, showLending: boolean) {
  root.eachAfter(node => {
    const procurementTotal = (procurement.get(node.data.id)?.amount ?? 0) +
      (node.children ?? []).reduce((sum, child) => sum + (procurementByBranch.get(child.data.id) ?? 0), 0);
    procurementByBranch.set(node.data.id, procurementTotal);
    const rdte = rollups.get(node.data.id)?.amountMillions ?? amounts.get(node.data.id) ?? 0;
    const authority = showLending ? lendingAuthority.get(node.data.id)?.amount : undefined;
    const ownRadius = Math.sqrt((authority ?? (rdte + procurementTotal)) || fallbackArea);
    if (!node.children?.length) { node.r=ownRadius; node.x=0; node.y=0; return; }
    const gap=node.depth===0 ? Math.max(6,Math.max(...node.children.map(child=>child.r))*.065) : 1.2;
    const packed=node.children.map(child => ({child,x:0,y:0,r:child.r+gap}));
    packSiblings(packed);
    const enclosure=packEnclose(packed)!;
    node.r=Math.max(ownRadius,enclosure.r*1.14+gap);
    node.x=0; node.y=0;
    for (const item of packed) {
      item.child.x=item.x-enclosure.x;
      item.child.y=item.y-enclosure.y+enclosure.r*.04;
    }
  });
  root.eachBefore(node => {
    if(node.parent) {node.x+=node.parent.x;node.y+=node.parent.y;}
  });
}
packLayout(layout, false);
let lendingLayout = layout.copy() as Circle;
packLayout(lendingLayout, true);
export function levelLayout(focus: Circle, showLending: boolean) {
  const root = showLending ? lendingLayout : layout;
  const nodes = root.descendants();
  const center = nodes.find(node => node.data.id === focus.data.id) ?? root;
  return {circles:nodes.slice(1).map(node => ({...node,
    x:node.x-center.x,y:node.y-center.y})) as Circle[],radius:center.r};
}
export const byId = new Map(layout.descendants().map(node => [node.data.id, node]));
export const money = new Map(funding.map(item => [item.orgId, item]));
export function applyWorkbookData(next: ReturnType<typeof validateWorkbook>) {
  workbookOrganizations.splice(0, workbookOrganizations.length, ...next.organizations);
  organizations.splice(0, organizations.length, ...next.organizations.filter(org => org.id !== hiddenRoot));
  money.clear();
  amounts.clear();
  funding.splice(0, funding.length, ...next.funding);
  for (const record of funding) {
    money.set(record.orgId, record);
    amounts.set(record.orgId, Number(record.amountMillionsDecimal ?? 0));
  }
  rollups.clear();
  for (const [id, record] of next.rollups) rollups.set(id, record);
  Object.assign(nonRdte.procurement, next.supplemental.procurement);
  Object.assign(nonRdte.authority, next.supplemental.authority);
  for (const [id, record] of Object.entries(nonRdte.procurement)) procurement.set(id, record);
  for (const [id, record] of Object.entries(nonRdte.authority)) lendingAuthority.set(id, record);
  layout = buildLayout();
  lendingLayout = layout.copy() as Circle;
  byId.clear();
  for (const node of layout.descendants()) byId.set(node.data.id, node);
  procurementByBranch.clear();
  packLayout(layout, false);
  packLayout(lendingLayout, true);
  components = componentOptions();
  orgTypes = orgTypeOptions();
}
export const history = new Map(snapshot.identityHistory.map(record => [record.id, record]));
export const alphabetical = (a: Circle, b: Circle) => a.data.label.localeCompare(b.data.label);
const componentOptions = () => [...new Set(organizations.map(org => org.type ?? 'Unspecified'))].filter(type => type !== 'Secretary of War').sort();
const orgTypeOptions = () => [...new Set(organizations.map(org => org.orgType ?? 'Unspecified'))].sort();

export let components = componentOptions();
export let orgTypes = orgTypeOptions();

const colors: Record<string, [string,string]> = {
  'Army': ['#e3ead9','#597548'], 'Navy': ['#d9e7f7','#316197'],
  'Air Force': ['#dcecf1','#367387'], 'Space Force': ['#ebe4fa','#705795'],
  'Marine Corps': ['#f4e0d9','#985949'], 'OSD': ['#e0e7fa','#4c639e'],
  'Joint Staff': ['#f4ead4','#896624'], 'USW(R&E)': ['#e3e4f7','#615b93'],
  'USW(A&S)': ['#dcf0e9','#377766'], 'USW(I&S)': ['#f1e3ef','#875782'],
  'USW(P)': ['#e6eddb','#647645'], 'National Guard Bureau': ['#f0e6d3','#7c6437'],
  'Combatant Command': ['#f0e4d9','#885a43'], 
  'NATO': ['#e3edf6','#446785']
};
export function color(node: Circle) {
  return colors[node.data.org?.type ?? ''] ?? ['#e7ebf1','#63758b'];
}
export function acronym(org: Org) {
  return org.acronym || org.label.split(/\s+/).slice(0,4).map(word => word[0]).join('').toUpperCase();
}
export function search(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return organizations.map(org => {
    const label = org.label.toLowerCase();
    const score = org.id.toLowerCase() === needle || org.acronym?.toLowerCase() === needle ? 0 :
      label.startsWith(needle) ? 1 : label.includes(needle) ? 2 :
      (history.get(org.id)?.priorLabels as string[] | undefined)?.some(alias => alias.toLowerCase().includes(needle)) ? 3 : 4;
    return {node: byId.get(org.id)!, score};
  }).filter(result => result.score < 4).sort((a,b) => a.score-b.score || alphabetical(a.node,b.node))
    .slice(0,12).map(result => result.node);
}

export function placeholderLogo(node: Circle) {
  const label = node.data.org ? acronym(node.data.org).slice(0,8) : 'GROUP';
  const safe = label.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#dce7f4"/><text x="100" y="104" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="25" font-weight="bold" fill="#173453">'+safe+'</text><text x="100" y="140" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#4f6279">LOGO UNAVAILABLE</text></svg>');
}
