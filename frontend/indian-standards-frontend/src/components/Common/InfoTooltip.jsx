import { useState, useRef, useId, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import './InfoTooltip.css';

// Reveals on hover AND on click/focus — hover alone fails keyboard/touch
// users. Dismissible with Escape. The bubble renders in a portal on
// document.body (so an ancestor's overflow:hidden or stacking context can't
// clip it) and flips above/left as needed to stay fully on-screen —
// measured against the trigger's real position each time it opens.
export function InfoTooltip({ label = 'More information', children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const bubbleRef = useRef(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets position measurement, not app state
      setPos(null);
      return;
    }
    const trigger = buttonRef.current;
    const bubble = bubbleRef.current;
    if (!trigger || !bubble) return;

    const triggerRect = trigger.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const gap = 6;
    const margin = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let top = triggerRect.bottom + gap;
    if (top + bubbleRect.height > viewportH - margin) {
      const above = triggerRect.top - gap - bubbleRect.height;
      if (above >= margin) top = above;
    }

    let left = triggerRect.left;
    if (left + bubbleRect.width > viewportW - margin) {
      left = viewportW - bubbleRect.width - margin;
    }
    if (left < margin) left = margin;

    setPos({ top, left });
  }, [open, children]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <span
      className="info-tooltip"
      ref={wrapRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        ref={buttonRef}
        className="info-tooltip-trigger"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      {open &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            ref={bubbleRef}
            className="info-tooltip-bubble"
            style={
              pos
                ? { position: 'fixed', top: pos.top, left: pos.left, visibility: 'visible' }
                : { position: 'fixed', top: 0, left: -9999, visibility: 'hidden' }
            }
          >
            {children}
          </span>,
          document.body
        )}
    </span>
  );
}
