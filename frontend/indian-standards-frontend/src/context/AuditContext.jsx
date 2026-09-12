import { createContext, useContext, useMemo, useState } from 'react';

// Audit results lifted above the router — same pattern as SearchContext.
// Whether the audit was triggered from the /tender page's build or the
// /audit page's paste box, the result must survive navigating away and
// back within the session (item 12: the user must never lose their place).
// Session-only, in-memory, never persisted to storage.
const AuditContext = createContext(null);

const EMPTY = {
  mode: 'paste', // 'paste' | 'build'
  specText: '',
  result: null,
  error: null,
  hasRun: false,
};

export function AuditProvider({ children }) {
  const [audit, setAudit] = useState(EMPTY);

  const setAuditResult = ({ mode, specText, response }) => {
    setAudit({ mode, specText, result: response, error: null, hasRun: true });
  };

  const setAuditError = ({ mode, specText, error }) => {
    setAudit({ mode, specText, result: null, error, hasRun: true });
  };

  const setAuditMode = (mode) => {
    setAudit((prev) => ({ ...prev, mode }));
  };

  const value = useMemo(
    () => ({ audit, setAuditResult, setAuditError, setAuditMode }),
    [audit]
  );

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAudit() {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAudit must be used within an AuditProvider');
  return ctx;
}
