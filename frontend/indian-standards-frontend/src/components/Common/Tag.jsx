import './Tag.css';

// One consistent colour per allied-relationship type, so allied lists are
// scannable by type at a glance (design.md §1). Falls back to neutral for
// plain category tags or an unrecognised relationship type.
// Group key names as returned by GET /allied/{standard_number}.
const RELATIONSHIP_COLOURS = {
  normative_reference: 'blue',
  test_method: 'teal',
  safety: 'red',
  terminology: 'purple',
  installation: 'green',
};

export function Tag({ label, relationshipType }) {
  const colour = RELATIONSHIP_COLOURS[relationshipType] ?? 'neutral';
  return <span className={`tag tag-${colour}`}>{label}</span>;
}
