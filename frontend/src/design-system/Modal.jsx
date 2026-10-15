import { useEffect, useRef } from 'react';
import { Button } from './Button';
import { X } from 'lucide-react';

// Modal.jsx — centered overlay with light backdrop blur
// On mobile renders as a bottom sheet.

export function Modal({
  open, onClose, title, children, footer,
  size = 'md', // 'sm' | 'md' | 'lg'
  closeOnBackdrop = true,
}) {
  const sizeMap = { sm: 380, md: 480, lg: 640 };

  // Trap focus + close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal"
        style={{ maxWidth: sizeMap[size] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'none', cursor: 'pointer',
              color: 'var(--color-text-secondary)', padding: 4, borderRadius: '50%',
              display: 'flex', transition: 'var(--transition-base)',
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ConfirmModal — destructive action confirmation
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-base)' }}>
        {message}
      </p>
    </Modal>
  );
}
