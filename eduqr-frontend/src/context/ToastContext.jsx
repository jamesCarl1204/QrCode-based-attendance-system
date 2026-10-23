import { createContext, useContext, useState, useCallback } from 'react';
import s from '../styles/Portal.module.css';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const show = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={s.toastStack}>
        {toasts.map((t) => (
          <div key={t.id} className={`${s.toast} ${t.type === 'error' ? s.toastError : s.toastSuccess}`}>
            <i className={`fa-solid ${t.type === 'error' ? 'fa-circle-exclamation' : 'fa-check'}`} />
            <span>{t.message}</span>
            <button className={s.toastClose} onClick={() => dismiss(t.id)} aria-label="Dismiss">&times;</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
