import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { encodeStandardSlug } from '../../utils/standardSlug';
import './StandardChip.css';

// Some audit fields are just a standard number (cited_standards,
// missing_normative_refs), others are full result objects
// (suggested_standards). "Add to tender" needs the full object, so we
// fetch it on demand when only the number is available — never fabricate
// title/category/etc. for a standard we haven't actually looked up.
export function StandardChip({ standardNumber, standard, onAddToTender }) {
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (standard) {
      onAddToTender(standard);
      return;
    }
    setLoading(true);
    try {
      const full = await apiClient.getStandardByNumber(standardNumber);
      if (full) onAddToTender(full);
    } catch {
      // Silent — the standard link still works, user can add it from there.
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="standard-chip">
      <Link to={`/standard/${encodeStandardSlug(standardNumber)}`}>{standardNumber}</Link>
      <button type="button" onClick={handleAdd} disabled={loading}>
        {loading ? '…' : 'Add to tender'}
      </button>
    </span>
  );
}
