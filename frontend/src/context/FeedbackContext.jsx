import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { PrimaryButton, GhostButton } from '../components/Button';

const FeedbackContext = createContext(null);
let idSeq = 0;

// App-wide UI feedback: transient toasts + a promise-based confirm dialog that
// replaces the native window.confirm()/alert(). Use via useToast() / useConfirm().
export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null); // { title, message, danger, confirmLabel, cancelLabel, resolve }

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((type, message) => {
    const id = ++idSeq;
    setToasts((list) => [...list, { id, type, message }]);
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  // Stable toast API.
  const toast = useRef({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }).current;

  const confirm = useCallback((opts) => new Promise((resolve) => {
    setDialog({ confirmLabel: 'Confirm', cancelLabel: 'Cancel', danger: false, ...opts, resolve });
  }), []);

  const settle = useCallback((result) => {
    setDialog((d) => { d?.resolve(result); return null; });
  }, []);

  // Esc cancels the dialog.
  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') settle(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, settle]);

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role="status" onClick={() => dismiss(t.id)}>
            {t.message}
          </div>
        ))}
      </div>

      {dialog && (
        <div className="modal-overlay" onClick={() => settle(false)}>
          <div
            className="modal-box"
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head"><span>{dialog.title || 'Please confirm'}</span></div>
            <div className="modal-body">
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
                {dialog.message}
              </p>
              <div className="modal-actions">
                <GhostButton type="button" onClick={() => settle(false)}>{dialog.cancelLabel}</GhostButton>
                <PrimaryButton
                  type="button"
                  autoFocus
                  onClick={() => settle(true)}
                  style={dialog.danger ? { background: 'var(--danger)' } : undefined}
                >
                  {dialog.confirmLabel}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useToast() {
  return useContext(FeedbackContext).toast;
}

export function useConfirm() {
  return useContext(FeedbackContext).confirm;
}
