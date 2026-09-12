import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../api/client';
import { useTender } from '../../context/TenderContext';
import { toStoredStandard, findItemContaining } from '../../utils/tenderStandard';
import { Tag } from '../Common/Tag';
import { Spinner } from '../Common/Spinner';
import { Banner } from '../Common/Banner';
import { useFocusTrap } from '../../utils/useFocusTrap';
import './AddToTenderModal.css';

const ALLIED_GROUP_KEYS = ['normative_reference', 'test_method', 'safety', 'terminology', 'installation'];

function flattenAllied(groups) {
  if (!groups) return [];
  return ALLIED_GROUP_KEYS.flatMap((key) => groups[key] ?? []);
}

export function AddToTenderModal({ standard, onClose }) {
  const { tender, dispatch } = useTender();
  const dialogRef = useRef(null);
  useFocusTrap(true, dialogRef, onClose);

  const [itemChoice, setItemChoice] = useState(tender.items[0]?.id ?? 'new');
  const [newItemName, setNewItemName] = useState('');

  const [alliedLoading, setAlliedLoading] = useState(true);
  const [alliedError, setAlliedError] = useState(null);
  const [alliedList, setAlliedList] = useState([]);
  const [selectedAllied, setSelectedAllied] = useState(new Set());
  const [confirmedSummary, setConfirmedSummary] = useState(null);

  const loadAllied = () => {
    setAlliedLoading(true);
    setAlliedError(null);
    apiClient
      .getAllied(standard.standard_number)
      .then((groups) => {
        const list = flattenAllied(groups);
        setAlliedList(list);
        setSelectedAllied(new Set(list.map((a) => a.standard_number)));
      })
      .catch(setAlliedError)
      .finally(() => setAlliedLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off the fetch this effect exists to run
  useEffect(loadAllied, [standard.standard_number]);

  const targetItem = itemChoice === 'new' ? null : tender.items.find((i) => i.id === itemChoice);
  const primaryInTarget = targetItem?.standards.some((s) => s.standardNumber === standard.standard_number);
  const primaryElsewhere = findItemContaining(tender, standard.standard_number, targetItem?.id);

  const toggleAllied = (standardNumber) => {
    setSelectedAllied((prev) => {
      const next = new Set(prev);
      if (next.has(standardNumber)) next.delete(standardNumber);
      else next.add(standardNumber);
      return next;
    });
  };

  const handleConfirm = () => {
    let itemId = itemChoice;
    if (itemChoice === 'new') {
      itemId = crypto.randomUUID();
      dispatch({ type: 'CREATE_ITEM', id: itemId, name: newItemName.trim() || 'Untitled' });
    }

    if (!primaryInTarget) {
      dispatch({ type: 'ADD_STANDARD', itemId, standard: toStoredStandard(standard, { provenance: 'user' }) });
    }

    alliedList
      .filter((a) => selectedAllied.has(a.standard_number))
      .filter((a) => !targetItem?.standards.some((s) => s.standardNumber === a.standard_number))
      .forEach((a) => {
        dispatch({
          type: 'ADD_STANDARD',
          itemId,
          standard: toStoredStandard(a, {
            provenance: 'allied',
            relationshipType: a.relationship_type,
            sourceStandardNumber: standard.standard_number,
          }),
        });
      });

    setConfirmedSummary({ alliedCount: alliedToAdd.length });
    setTimeout(onClose, 900);
  };

  const alliedToAdd = alliedList.filter(
    (a) =>
      selectedAllied.has(a.standard_number) &&
      !targetItem?.standards.some((s) => s.standardNumber === a.standard_number)
  );
  const primaryToAdd = primaryInTarget ? 0 : 1;
  const totalToAdd = primaryToAdd + alliedToAdd.length;

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-tender-title"
        ref={dialogRef}
      >
        <h2 id="add-to-tender-title">Add to tender</h2>
        <p className="modal-standard">
          <strong>{standard.standard_number}</strong> {standard.title}
        </p>

        {confirmedSummary ? (
          <Banner variant="info" title="Added to tender">
            {standard.standard_number}
            {confirmedSummary.alliedCount > 0 ? ` and ${confirmedSummary.alliedCount} allied standard(s)` : ''} added.
          </Banner>
        ) : (
          <>
            <div className="modal-field">
              <label htmlFor="tender-item-choice">Add to</label>
              <select
                id="tender-item-choice"
                value={itemChoice}
                onChange={(e) => setItemChoice(e.target.value)}
              >
                {tender.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
                <option value="new">+ New item…</option>
              </select>
            </div>

            {itemChoice === 'new' && (
              <div className="modal-field">
                <label htmlFor="tender-new-item-name">New item name</label>
                <input
                  id="tender-new-item-name"
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Cement"
                />
              </div>
            )}

            {primaryInTarget && (
              <Banner variant="info">This standard is already in this item — it won't be added again.</Banner>
            )}
            {!primaryInTarget && primaryElsewhere && (
              <Banner variant="info">
                Already used in "{primaryElsewhere.name}". Adding it here too is fine — the same standard can
                apply to multiple tender items.
              </Banner>
            )}

            <div className="modal-allied">
              <h3>Allied standards</h3>
              {alliedLoading && <Spinner label="Checking allied standards…" />}
              {alliedError && (
                <Banner variant="warning">
                  Couldn't check allied standards — only the primary standard will be added.
                </Banner>
              )}
              {!alliedLoading && !alliedError && alliedList.length === 0 && (
                <p className="modal-allied-none">No allied standards mapped for this standard.</p>
              )}
              {!alliedLoading && !alliedError && alliedList.length > 0 && (
                <ul className="modal-allied-list">
                  {alliedList.map((a) => {
                    const alreadyInTarget = targetItem?.standards.some(
                      (s) => s.standardNumber === a.standard_number
                    );
                    return (
                      <li key={a.standard_number}>
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedAllied.has(a.standard_number) && !alreadyInTarget}
                            disabled={alreadyInTarget}
                            onChange={() => toggleAllied(a.standard_number)}
                          />
                          <span className="modal-allied-number">{a.standard_number}</span> {a.title}
                          <Tag label={a.relationship_type} relationshipType={a.relationship_type} />
                          {alreadyInTarget && <span className="modal-allied-note">already in this item</span>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="modal-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="modal-confirm" onClick={handleConfirm} disabled={totalToAdd === 0}>
                {totalToAdd === 0 ? 'Nothing new to add' : `Add ${totalToAdd} standard${totalToAdd === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
