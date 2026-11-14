import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { crewHealthApi, setApiToken, type ApiSession, type CrewMe } from '@/services/crew-health-api';

type AuthContextValue = {
  session: ApiSession | null;
  signIn: (username: string, password: string) => Promise<ApiSession>;
  enterDemo: () => Promise<ApiSession>;
  signOut: () => void;
  refreshMe: () => Promise<CrewMe | null>;
  setMe: (me: CrewMe | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<ApiSession | null>(null);

  const signIn = useCallback(async (username: string, password: string): Promise<ApiSession> => {
    setApiToken(null);
    const login = await crewHealthApi.login(username.trim(), password);
    setApiToken(login.accessToken);
    try {
      const user = await crewHealthApi.currentUser();
      const me = user.role === 'astronaut' ? await crewHealthApi.me() : undefined;
      const next = { user, me, offlineDemo: false };
      setSession(next);
      return next;
    } catch (error) {
      setApiToken(null);
      throw error;
    }
  }, []);

  const enterDemo = useCallback(async (): Promise<ApiSession> => {
    try {
      return await signIn('astronaut4', 'spaceapps2026');
    } catch {
      setApiToken(null);
      const next: ApiSession = {
        user: { username: 'astronaut4', displayName: 'Astronaut 4', role: 'astronaut', astronautId: 'A004' },
        offlineDemo: true,
      };
      setSession(next);
      return next;
    }
  }, [signIn]);

  const signOut = useCallback(() => {
    setApiToken(null);
    setSession(null);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!session || session.user.role !== 'astronaut' || session.offlineDemo) return session?.me ?? null;
    const me = await crewHealthApi.me();
    setSession((current) => current ? { ...current, me } : current);
    return me;
  }, [session]);

  const setMe = useCallback((me: CrewMe | null) => {
    setSession((current) => current ? { ...current, me: me ?? undefined } : current);
  }, []);

  const value = useMemo(() => ({ session, signIn, enterDemo, signOut, refreshMe, setMe }), [session, signIn, enterDemo, signOut, refreshMe, setMe]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
