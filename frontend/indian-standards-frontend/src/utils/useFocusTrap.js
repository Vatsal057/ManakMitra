import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Traps Tab within containerRef while active, closes on Escape, and returns
// focus to whatever was focused before opening (e.g. the cart button).
export function useFocusTrap(active, containerRef, onEscape) {
  // Keep the latest callback without re-running the trap effect on every
  // parent render (onEscape is typically a fresh inline function each time).
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;
    const previouslyFocused = document.activeElement;

    const focusables = () =>
      Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => !el.disabled);
    focusables()[0]?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onEscapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [active, containerRef]);
}
