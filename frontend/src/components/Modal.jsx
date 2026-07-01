import { useEffect, useRef } from 'react';

// Shared modal: dimmed overlay + card, closes on Esc and outside-click, traps
// initial focus, and is labelled as a dialog. Reuses the existing .modal-* CSS.
export default function Modal({ title, onClose, children, maxWidth = 480 }) {
  const boxRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    boxRef.current?.querySelector('input, select, textarea, button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={() => onClose?.()}>
      <div
        className="modal-box"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        ref={boxRef}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span>{title}</span>
          <button type="button" className="icon-button" aria-label="Close" onClick={() => onClose?.()}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
