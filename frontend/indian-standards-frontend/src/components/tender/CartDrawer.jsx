import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../Common/EmptyState';
import { useTender } from '../../context/TenderContext';
import { useFocusTrap } from '../../utils/useFocusTrap';
import './CartDrawer.css';

export function CartDrawer({ open, onClose }) {
  const { tender, dispatch, totalCount } = useTender();
  const panelRef = useRef(null);
  useFocusTrap(open, panelRef, onClose);

  if (!open) return null;

  return (
    <div className="cart-drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="cart-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        ref={panelRef}
      >
        <div className="cart-drawer-head">
          <h2 id="cart-drawer-title">Tender cart ({totalCount})</h2>
          <button type="button" className="cart-drawer-close" aria-label="Close cart" onClick={onClose}>
            ✕
          </button>
        </div>

        {tender.items.length === 0 ? (
          <EmptyState
            title="Nothing added yet"
            message="Add standards from a search result or a standard's detail page."
          />
        ) : (
          <div className="cart-drawer-items">
            {tender.items.map((item) => (
              <div key={item.id} className="cart-drawer-item">
                <h3>
                  {item.name} <span className="cart-drawer-item-count">({item.standards.length})</span>
                </h3>
                <ul>
                  {item.standards.map((s) => (
                    <li key={s.standardNumber}>
                      <span>{s.standardNumber}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${s.standardNumber} from ${item.name}`}
                        onClick={() =>
                          dispatch({ type: 'REMOVE_STANDARD', itemId: item.id, standardNumber: s.standardNumber })
                        }
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <Link to="/tender" className="cart-drawer-view" onClick={onClose}>
          View full tender build →
        </Link>
      </div>
    </div>
  );
}
