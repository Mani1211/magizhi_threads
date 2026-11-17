import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../data/api';
import type { User } from '../data/types';
import { clearPhotoCache } from '../ui/PhotoImage';

interface Auth {
  status: 'checking' | 'signed-in' | 'signed-out';
  user: User | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Auth['status']>('checking');

  useEffect(() => {
    api.getUser().then((u) => { setUser(u); setStatus(u ? 'signed-in' : 'signed-out'); });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.login(email, password);
    setUser(u);
    setStatus('signed-in');
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    clearPhotoCache();
    setUser(null);
    setStatus('signed-out');
  }, []);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const a = useContext(Ctx);
  if (!a) throw new Error('useAuth must be used inside <AuthProvider>');
  return a;
}
