// Loose check for "does this look like a standard identifier" (IS 456,
// IS 732:1989, IS 2720-10:1991, is1786, or just a bare "1786") rather than
// a keyword/spec snippet. Deliberately permissive — the actual resolution
// happens via the API's exact-identifier path, this just decides which
// search flow to use.
const IS_PREFIXED_PATTERN = /^is[\s-]?\d/i;

// A bare number (optionally with the colon/hyphen/dot punctuation real IS
// numbers use, e.g. "2720-10:1991") with no other words — verified against
// the live API that a query like "1786" alone does NOT resolve as an exact
// identifier match (it's scored as an ordinary semantic query, fusion_rank
// ~0.15, abstained) while "IS 1786" does (fusion_rank 1.0). So a bare
// number is normalized to add the "IS " prefix before being used as an
// identifier lookup — see normalizeIdentifier below.
const BARE_NUMBER_PATTERN = /^\d[\d\s:./-]*$/;

export function looksLikeIsIdentifier(text) {
  const trimmed = text.trim();
  return IS_PREFIXED_PATTERN.test(trimmed) || BARE_NUMBER_PATTERN.test(trimmed);
}

// Only call this once looksLikeIsIdentifier has confirmed the input is an
// identifier candidate — it doesn't re-validate.
export function normalizeIdentifier(text) {
  const trimmed = text.trim();
  return IS_PREFIXED_PATTERN.test(trimmed) ? trimmed : `IS ${trimmed}`;
}
