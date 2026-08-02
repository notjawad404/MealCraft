import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext';
import { authApi } from '../lib/api';
import { isTokenExpired, millisUntilExpiry } from '../lib/token';

const STORAGE_KEY = 'mealcraft-auth';

/** Restore a session from storage, discarding anything malformed or expired. */
function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const stored = JSON.parse(raw);
    if (!stored?.token || !stored?.user || isTokenExpired(stored.token)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  // Mirror the session into storage so a refresh keeps the user signed in.
  useEffect(() => {
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* storage unavailable — the session just won't survive a refresh */
    }
  }, [session]);

  // Drop the session the moment the token expires, rather than letting the
  // user discover it on their next failed request.
  useEffect(() => {
    if (!session?.token) return undefined;

    const remaining = millisUntilExpiry(session.token);
    if (remaining === null) return undefined;
    if (remaining <= 0) {
      setSession(null);
      return undefined;
    }

    // setTimeout caps out around 24.8 days; our tokens live 7 days.
    const timer = setTimeout(() => setSession(null), remaining);
    return () => clearTimeout(timer);
  }, [session]);

  // Keep other tabs in sync when someone logs in or out.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setSession(readStoredSession());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setSession({ token: data.token, user: data.user });
    return data.user;
  }, []);

  const register = useCallback(async (details) => {
    const data = await authApi.register(details);
    setSession({ token: data.token, user: data.user });
    return data.user;
  }, []);

  const logout = useCallback(() => setSession(null), []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      login,
      register,
      logout,
    }),
    [session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
