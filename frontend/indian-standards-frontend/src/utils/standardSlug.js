// Standard numbers contain spaces and colons (e.g. "IS 1786 : 2008") and
// need to round-trip through a URL path segment. encodeURIComponent already
// handles that reversibly — no need to hand-roll an encoding scheme.
export function encodeStandardSlug(standardNumber) {
  return encodeURIComponent(standardNumber);
}

export function decodeStandardSlug(slug) {
  return decodeURIComponent(slug);
}
