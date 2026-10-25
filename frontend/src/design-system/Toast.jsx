import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// Toast.jsx — bottom-right notification stack, auto-dismiss

const ToastContext = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]); // max 5
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  const ICONS = {
    success: <CheckCircle size={16} />,
    error:   <AlertCircle size={16} />,
    warning: <AlertTriangle size={16} />,
    info:    <Info size={16} />,
  };

  const contextValue = useMemo(() => {
    const success = (msg, dur) => add(msg, 'success', dur);
    const error   = (msg, dur) => add(msg, 'error',   dur ?? 6000);
    const warning = (msg, dur) => add(msg, 'warning', dur);
    const info    = (msg, dur) => add(msg, 'info',    dur);

    const addToast = (optsOrMsg, type = 'info', dur) => {
      if (typeof optsOrMsg === 'object' && optsOrMsg !== null) {
        const fullMsg = optsOrMsg.title && optsOrMsg.message
          ? `${optsOrMsg.title}: ${optsOrMsg.message}`
          : optsOrMsg.title || optsOrMsg.message || '';
        return add(fullMsg, optsOrMsg.type || 'info', optsOrMsg.duration);
      }
      return add(optsOrMsg, type, dur);
    };

    return {
      add,
      remove,
      dismiss: remove,
      success,
      error,
      warning,
      info,
      addToast,
    };
  }, [add, remove]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {ICONS[t.type]}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 2, display: 'flex' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
