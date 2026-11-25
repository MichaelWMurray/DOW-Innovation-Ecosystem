import {applyWorkbookData} from './model';
import {csvRows, validateWorkbook, workbookId, workbookTabs} from './workbook-data';

let status = {revision: 0, loading: false, message: 'Showing bundled workbook data'};
let referenceFunding = new Map<string, number>();
export const getReferenceFunding = (orgId: string) => Math.max(0, referenceFunding.get(orgId) ?? 0);

let awardEvidence: ReturnType<typeof validateWorkbook>['awardEvidence'] = new Map();
export const getAwardEvidence = (orgId: string) => awardEvidence.get(orgId) ?? [];

let pending: Promise<void> | undefined;
const listeners = new Set<() => void>();

export const getWorkbookRefresh = () => status;
export function subscribeWorkbookRefresh(listener: () => void) {
  listeners.add(listener);
  return () => {listeners.delete(listener);};
}

function update(next: typeof status) {
  status = next;
  listeners.forEach(listener => listener());
}

export function refreshWorkbook() {
  if (pending) return pending;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  pending = Promise.all(workbookTabs.map(async gid => {
    const url = `https://docs.google.com/spreadsheets/d/${workbookId}/export?format=csv&gid=${gid}`;
    const response = await fetch(url, {signal: controller.signal, credentials: 'omit', cache: 'no-store'});
    if (!response.ok) throw Error('Workbook export was unavailable');
    return csvRows(await response.text());
  })).then(rows => {
    const validated = validateWorkbook(rows);
    applyWorkbookData(validated);
    referenceFunding = validated.referenceFunding;
    awardEvidence = validated.awardEvidence;
    const time = new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
    const note = validated.pendingSummaries.length ? ' · Funding summary pending for ' + validated.pendingSummaries.join(', ') : '';
    update({revision: status.revision + 1, loading: false, message: 'Workbook refreshed at ' + time + note});
  }).catch(error => {
    console.warn('Workbook refresh failed', error);
    update({...status, loading: false, message: 'Refresh failed. Showing last valid data. ' + (error instanceof Error ? error.message : '')});
  }).finally(() => {
    clearTimeout(timeout);
    controller.abort();
    pending = undefined;
  });
  update({...status, loading: true, message: 'Refreshing workbook…'});
  return pending;
}
