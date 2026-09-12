import { apiClient } from '../api/client';

// Shared by both the /audit page and the /tender page's inline "Audit this
// build" panel, so the two surfaces don't duplicate the fetch/error logic.
export async function runAuditQuery({ mode, specText, setAuditResult, setAuditError }) {
  if (!specText.trim()) return;
  try {
    const response = await apiClient.audit(specText);
    setAuditResult({ mode, specText, response });
  } catch (err) {
    setAuditError({ mode, specText, error: err });
  }
}

export function serializeTenderBuild(tender) {
  return tender.items
    .filter((item) => item.standards.length > 0)
    .map((item) => `${item.name}: specification shall conform to ${item.standards.map((s) => s.standardNumber).join(', ')}.`)
    .join('\n');
}
