import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const show = useCallback((message, type = 'success') => {
    clearTimeout(timer.current);
    setToast({ message, type, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const icon = toast?.type === 'error' ? 'fa-circle-exclamation text-amber-400' : 'fa-check-circle text-rose-400';

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        role="status"
        className={`fixed bottom-6 right-6 z-[60] transition-all duration-300 pointer-events-none bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm border border-slate-700 ${
          toast ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
        }`}
      >
        <i className={`fa-solid ${icon}`} />
        <span>{toast?.message}</span>
      </div>
    </ToastCtx.Provider>
  );
}
