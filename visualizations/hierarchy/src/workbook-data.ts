import snapshot from './draft.json';
import nonRdte from './non-rdte.json';

export const workbookId = '1SMiL7EyX5DM8rE_bPQt_a4Fq_i6Ml4Bqk074IUYgLpE';
export const workbookTabs = [1245809201, 1956591700, 423758257, 99198919] as const;

export function csvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') {
      if (quoted && csv[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(field); field = '';
      if (char !== ',') {
        rows.push(row); row = [];
        if (char === '\r' && csv[i + 1] === '\n') i++;
      }
    } else field += char;
  }
  if (quoted) throw Error('Incomplete workbook export');
  if (row.length || field) rows.push([...row, field]);
  return rows;
}

function amount(value: string, allowNegative = false) {
  const clean = value?.trim().replace(/,/g, '');
  const pattern = allowNegative ? /^-?\d+(?:\.\d+)?$/ : /^\d+(?:\.\d+)?$/;
  if (!pattern.test(clean ?? '')) throw Error('Invalid workbook amount');
  const number = Number(clean);
  if (!Number.isFinite(number)) throw Error('Invalid workbook amount');
  return number;
}

function grouped<T>(values: T[], key: (value: T) => string) {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const k = key(value);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(value);
  }
  return groups;
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const rounded = (value: number) => Math.round(value * 1e6) / 1e6;
const same = (a: number, b: number) => Math.abs(a - b) < 1e-6;

// Resolve columns by header so inserting or moving columns does not change the data read.
function columns(rows: string[][], tab: string, names: string[]) {
  const header = rows.findIndex(row => row.includes(names[0]));
  const positions = names.map(name => rows[header]?.indexOf(name) ?? -1);
  if (positions.includes(-1)) throw Error(tab + ' is missing required columns');
  return rows.map((row, index) => index > header ? positions.map(position => row[position] ?? '') : []);
}

export type WorkbookOrg = Omit<typeof snapshot.organizations[number], never>;

function readOrganizations(rows: string[][]) {
  const originals = new Map(snapshot.organizations.map(org => [org.id, org]));
  const entries = columns(rows, 'Organizations', ['Org ID', 'Innovation organization', 'Org type',
    'Acronym', 'Parent organization', 'Parent Org ID', 'Managing organization', 'Manager Org ID']);
  const organizations = new Map<string, WorkbookOrg>();
  for (const [id, label, orgType, acronym, rawParent, parentId, rawManager, managerId] of entries) {
    if (!id) continue;
    if (!/^IEORG-\d+$/.test(id) || !label || organizations.has(id)) throw Error('Invalid or duplicate organization ID: ' + id);
    const original = originals.get(id);
    organizations.set(id, {
      description: '', location: null, logoAssetKey: null, type: null, website: null, year: null,
      ...original, id, label, orgType: orgType || 'Unclassified', acronym: acronym || null,
      parentId: id === 'IEORG-0240' && parentId === id ? null : parentId || null, rawParent: rawParent || null,
      managerId: managerId || null, rawManager: rawManager || null,
      hierarchyStatus: parentId ? 'internal' : original?.hierarchyStatus === 'internal'
        ? (rawParent ? 'external_parent' : 'root') : original?.hierarchyStatus ?? (rawParent ? 'external_parent' : 'root'),
    });
  }
  if (!organizations.has('IEORG-0240')) throw Error('Organizations is missing the hierarchy root');
  for (const org of organizations.values()) {
    const seen = new Set([org.id]);
    let parentId = org.parentId;
    while (parentId) {
      const parent = organizations.get(parentId);
      if (!parent || seen.has(parentId)) throw Error('Invalid parent chain for ' + org.id);
      seen.add(parentId);
      org.type ??= parent.type === 'Secretary of War' ? null : parent.type;
      parentId = parent.parentId;
    }
  }
  return [...organizations.values()];
}

export function validateWorkbook([fundingSource, ledgerSource, extraSource, organizationSource]: string[][][]) {
  const organizations = readOrganizations(organizationSource);
  const expected = new Set(organizations.map(org => org.id));
  const fundingRows = columns(fundingSource, 'Funding by Organization', ['Organization ID', 'Organization',
    'Selected funding ($M)', 'Selected scopes', 'Funding evidence',
    ...Array.from({length:9}, (_, i) => `BA ${i+1} ($M)`)]);
  const ledgerRows = columns(ledgerSource, 'Selected Funding Ledger', ['Scope ID', 'PE', 'Project',
    'Scope level', 'Selected amount ($M)', 'Selection', 'Original ledger cell', 'Organization ID', 'Budget activity',
    'Source amount ($M)', 'Cross-organization overlap IDs']);
  const extraRows = columns(extraSource, 'Non-RDT&E Funding', ['Organization ID', 'Fiscal Year',
    'Amount (USD millions)', 'Treatment', 'Funding Component', 'Additive to APFIT Total?', 'Source / Basis'])
    .map(([orgId,year,value,treatment,component,apfitAdditive,basis], index) =>
      ({orgId,year,value,treatment,component,apfitAdditive,basis,row:index+1}));
  const index = new Map<string, {row: string[]; index: number}>();
  fundingRows.forEach((row, i) => {
    if (!/^IEORG-\d+$/.test(row[0])) return;
    if (!expected.has(row[0]) || index.has(row[0])) throw Error('Funding by Organization contains an unknown or duplicate ID: ' + row[0]);
    index.set(row[0], {row,index:i+1});
  });
  if (!index.size) throw Error('Funding by Organization has no organization rows');

  const peLevels = ['R2', 'R1-COMBINED-PROGRAM-ENVELOPE', 'R1-COMBINED-MANAGED-PROGRAM-ENVELOPE'];
  const projectLevels = ['R2A-PROJECT', 'R2A-PROJECT-RESIDUAL', 'R2A-PROGRAM', 'R3'];
  const baEnvelope = /^R2-BA([1-9])-(?:MANAGED-)?PROGRAM-ENVELOPE$/;
  const scopeIds = new Set<string>(), locators = new Set<string>();
  const selected = ledgerRows.flatMap((row, i) => {
    if (row[5] !== 'Selected') return [];
    const [id,pe,project,level,value,,locator,orgId,activity,sourceValue,overlaps] = row;
    const envelopeActivity = baEnvelope.exec(level)?.[1];
    const location = 'Selected Funding Ledger row ' + (i + 1) + ' (' + (id || 'missing scope ID') + ')';
    if (!id || !pe || !locator || !expected.has(orgId)) {
      throw Error(location + ': missing scope ID, PE, source locator, or valid organization ID');
    }
    if (scopeIds.has(id)) throw Error(location + ': duplicate scope ID');
    if (locators.has(locator)) throw Error(location + ': duplicate source locator ' + locator);
    if (projectLevels.includes(level)) {
      if (!project) throw Error(location + ': missing project for ' + level);
    } else if (envelopeActivity) {
      if (activity !== envelopeActivity) throw Error(location + ': envelope budget activity does not match the Budget activity column');
    } else if (!peLevels.includes(level)) {
      throw Error(location + ': unsupported scope level ' + level);
    }
    scopeIds.add(id); locators.add(locator);
    const selectedAmount = amount(value);
    const residualLinks = envelopeActivity && amount(sourceValue) > selectedAmount
      ? overlaps.split(/[\s,;]+/).filter(Boolean) : [];
    return [{ledgerRow:i + 1,id,pe,project,level,value:selectedAmount,orgId,activity,envelopeActivity,residualLinks}];
  });
  if (!selected.length) throw Error('Selected ledger is empty');
  const byOrg = grouped(selected, item => item.orgId);
  const originals = new Map(snapshot.funding.map(record => [record.orgId, record]));
  const pendingSummaries: string[] = [];
  const funding = organizations.map(({id:orgId}) => {
    const record = originals.get(orgId);
    const summary = index.get(orgId);
    const row = summary?.row ?? [];
    const scopes = byOrg.get(orgId) ?? [];
    const summaryAmount = row[2]?.trim() ? amount(row[2]) : null;
    const ledgerTotal = rounded(sum(scopes.map(scope => scope.value)));
    const useLedger = !summary || !same(summaryAmount ?? 0, ledgerTotal);
    if (useLedger && summary) {
      // Accept a lagging summary only when its count and dollars match an earlier
      // prefix of this organization's selected scopes. Reject other discrepancies.
      const count = Number(row[3] || 0);
      const prefixTotal = sum(scopes.slice(0, count).map(scope => scope.value));
      if (!Number.isInteger(count) || count < 0 || count >= scopes.length || !same(summaryAmount ?? 0, prefixTotal)) {
        throw Error('Selected ledger does not reconcile for ' + orgId);
      }
    }
    if (useLedger) pendingSummaries.push(orgId);
    const value = useLedger ? (scopes.length ? ledgerTotal : null) : summaryAmount;
    const ba = useLedger ? Array.from({length:9}, (_, i) => {
      const matches = scopes.filter(scope => scope.activity === String(i + 1));
      return matches.length ? rounded(sum(matches.map(scope => scope.value))) : null;
    }) : row.slice(5,14).map(cell => cell ? amount(cell) : null);
    const sourceLocator = useLedger
      ? (scopes.length ? {fileId:workbookId, fingerprint:'', tab:'Selected Funding Ledger', row:scopes[0].ledgerRow} : null)
      : {...record?.sourceLocator, fileId:workbookId, fingerprint:'', tab:'Funding by Organization', row:summary!.index};
    return {basis:'request', confidence:null, evidenceRefs:[], fiscalYear:2026, overlapNote:null, ...record,
      orgId, amountMillionsDecimal:value === null ? null : String(value), ba, sourceLocator,
      status:value === null ? 'no_supported_scope' : 'supported',
      scope:useLedger ? (scopes.length ? 'Selected Funding Ledger: ' + scopes.map(scope => scope.id).join(', ') : 'No selected ledger scope')
        : row[4] || record?.scope || ''};
  });

  const children = grouped(organizations, org => org.parentId ?? '');
  const rollups = new Map<string, {amountMillions:number; ambiguousPools:number} | null>();
  function descendants(id: string): typeof selected {
    return [...(byOrg.get(id) ?? []), ...(children.get(id) ?? []).flatMap(child => descendants(child.id))];
  }
  for (const id of expected) {
    if (!children.has(id)) continue;
    const records = descendants(id);
    if (!records.length) { rollups.set(id, null); continue; }
    let total = 0, ambiguousPools = 0;
    for (const pe of grouped(records, row => row.pe).values()) {
      const full = pe.filter(row => peLevels.includes(row.level)).map(row => row.value);
      if (full.length) {
        total += Math.max(...full);
        ambiguousPools += Number(new Set(full).size > 1);
        continue;
      }
      const envelopes = grouped(pe.filter(row => row.envelopeActivity), row => row.activity);
      const covered = new Set<string>();
      for (const [activity, candidates] of envelopes) {
        const envelope = candidates.reduce((largest, candidate) => candidate.value > largest.value ? candidate : largest);
        total += envelope.value;
        ambiguousPools += Number(new Set(candidates.map(row => row.value)).size > 1);
        // A residual envelope leaves room for the specific selected scopes deducted in the ledger.
        const links = new Set(envelope.residualLinks);
        for (const row of pe) {
          if (row.activity === activity && (row.envelopeActivity || !links.has(row.id))) covered.add(row.id);
        }
      }
      const uncovered = pe.filter(row => !covered.has(row.id));
      for (const project of grouped(uncovered, row => row.project).values()) {
        const whole = project.filter(row => row.level === 'R2A-PROJECT').map(row => row.value);
        if (whole.length) {
          total += Math.max(...whole);
          ambiguousPools += Number(new Set(whole).size > 1);
          continue;
        }
        const program = project.filter(row => row.level === 'R2A-PROGRAM');
        const cost = project.filter(row => row.level === 'R3');
        // A residual is the unallocated part of a project after the selected child scopes.
        const residual = project.filter(row => row.level === 'R2A-PROJECT-RESIDUAL');
        total += sum(residual.map(row => row.value)) +
          Math.max(sum(program.map(row => row.value)), sum(cost.map(row => row.value)));
        ambiguousPools += Number(program.length > 0 && cost.length > 0);
      }
    }
    rollups.set(id,{amountMillions:rounded(total),ambiguousPools});
  }

  const extra = extraRows.filter(row => row.year?.trim() === '2026');
  const apfit = extra.filter(row => row.orgId === 'IEORG-0334');
  const plans = apfit.filter(row => row.component === 'Total FY2026 spend plan');
  const lending = extra.filter(row => row.orgId === 'IEORG-0294' && /cumulative lending authority/i.test(row.component));
  if (plans.length !== 1 || lending.length !== 1) throw Error('APFIT or OSC funding control is missing or duplicated');
  const components = apfit.filter(row => row.apfitAdditive === 'Yes').map(row => ({label:row.component,amount:amount(row.value)}));
  const planAmount = amount(plans[0].value);
  if (!components.length || !same(sum(components.map(c => c.amount)), planAmount)) {
    throw Error('APFIT components do not reconcile to the spend plan');
  }
  const supplemental: typeof nonRdte = {
    procurement:{'IEORG-0334':{amount:planAmount,basis:plans[0].basis,components}},
    authority:{'IEORG-0294':{amount:amount(lending[0].value),basis:lending[0].basis}},
  };

  // Each eligible workbook row is a signed record, even when component descriptions repeat.
  // APFIT and OSC are handled by the controls above.
  const referenceFunding = new Map<string, number>();
  const awardEvidence = new Map<string, {amount:number; basis:string; treatment:string; row:number}[]>();
  for (const {orgId,value,treatment,basis,row} of extra) {
    if (orgId === 'IEORG-0334' || orgId === 'IEORG-0294' ||
        !/\b(?:non[ -]additive|not additive)\b/i.test(treatment)) continue;
    if (!expected.has(orgId)) throw Error('Reference funding has an unknown organization ID: ' + orgId);
    const signedAmount = amount(value, true);
    const displayAuthorized = /\b(?:reference[ -]only|supplemental display (?:candidate|record)|display[ -]only)\b/i.test(treatment);
    const evidenceOnly = /\b(?:award evidence only|evidence[ -]only)\b/i.test(treatment);
    if (displayAuthorized && !evidenceOnly) {
      referenceFunding.set(orgId, rounded((referenceFunding.get(orgId) ?? 0) + signedAmount));
    } else {
      const records = awardEvidence.get(orgId) ?? [];
      records.push({amount:signedAmount,basis,treatment,row});
      awardEvidence.set(orgId,records);
    }
  }
  return {organizations,funding,pendingSummaries,rollups,supplemental,referenceFunding,awardEvidence};
}
