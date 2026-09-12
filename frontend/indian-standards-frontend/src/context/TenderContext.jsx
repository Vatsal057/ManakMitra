import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

// The core state of the app: a working tender build. Session-only —
// deliberately not persisted to storage, so closing the tab loses the build.

const TenderContext = createContext(null);

function newItem(name, id) {
  return { id: id ?? crypto.randomUUID(), name, standards: [] };
}

function reducer(state, action) {
  switch (action.type) {
    case 'CREATE_ITEM':
      return { ...state, items: [...state.items, newItem(action.name, action.id)] };

    case 'RENAME_ITEM':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.itemId ? { ...item, name: action.name } : item
        ),
      };

    case 'DELETE_ITEM':
      return { ...state, items: state.items.filter((item) => item.id !== action.itemId) };

    case 'ADD_STANDARD':
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.id !== action.itemId) return item;
          const alreadyThere = item.standards.some(
            (s) => s.standardNumber === action.standard.standardNumber
          );
          if (alreadyThere) return item;
          return { ...item, standards: [...item.standards, action.standard] };
        }),
      };

    case 'REMOVE_STANDARD':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.itemId
            ? { ...item, standards: item.standards.filter((s) => s.standardNumber !== action.standardNumber) }
            : item
        ),
      };

    case 'MOVE_STANDARD': {
      const fromItem = state.items.find((item) => item.id === action.fromItemId);
      const standard = fromItem?.standards.find((s) => s.standardNumber === action.standardNumber);
      if (!standard) return state;
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.id === action.fromItemId) {
            return { ...item, standards: item.standards.filter((s) => s.standardNumber !== action.standardNumber) };
          }
          if (item.id === action.toItemId && !item.standards.some((s) => s.standardNumber === action.standardNumber)) {
            return { ...item, standards: [...item.standards, standard] };
          }
          return item;
        }),
      };
    }

    case 'CLEAR_ALL':
      return { items: [] };

    default:
      return state;
  }
}

export function TenderProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });

  const totalCount = useMemo(
    () => state.items.reduce((sum, item) => sum + item.standards.length, 0),
    [state.items]
  );

  useEffect(() => {
    const handler = (e) => {
      if (totalCount === 0) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [totalCount]);

  // Dev-only console access for manual testing (e.g. the Phase 1
  // verification gate's "dispatch a test add from the console").
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__tender = { state, dispatch };
    }
  }, [state, dispatch]);

  const value = useMemo(() => ({ tender: state, dispatch, totalCount }), [state, totalCount]);

  return <TenderContext.Provider value={value}>{children}</TenderContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTender() {
  const ctx = useContext(TenderContext);
  if (!ctx) throw new Error('useTender must be used within a TenderProvider');
  return ctx;
}
