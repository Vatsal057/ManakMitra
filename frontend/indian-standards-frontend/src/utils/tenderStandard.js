// Shared helpers for turning an API standard/allied record into the shape
// stored in TenderContext, and for answering "is this standard already in
// the build, and where" — used by the add-to-tender modal and the /tender
// page's duplicate-handling UI.

export function toStoredStandard(raw, { provenance = 'user', relationshipType = null, sourceStandardNumber = null } = {}) {
  return {
    standardNumber: raw.standard_number,
    title: raw.title,
    certificationBadge: raw.certification_badge ?? null,
    confidenceBand: raw.confidence ?? null,
    category: raw.category ?? null,
    provenance,
    relationshipType,
    sourceStandardNumber,
  };
}

// The item (if any) that already contains this standard number.
export function findItemContaining(tender, standardNumber, excludeItemId = null) {
  return (
    tender.items.find(
      (item) => item.id !== excludeItemId && item.standards.some((s) => s.standardNumber === standardNumber)
    ) ?? null
  );
}
