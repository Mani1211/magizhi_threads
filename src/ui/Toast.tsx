import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

const Ctx = createContext<(message: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [shown, setShown] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback((m: string) => {
    setMessage(m);
    setShown(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(false), Math.min(7000, 2600 + m.length * 30));
  }, []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className={`toast${shown ? ' show' : ''}`} role="status" aria-live="polite">{message}</div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
