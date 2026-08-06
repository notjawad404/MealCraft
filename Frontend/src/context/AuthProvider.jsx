import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext';
import { authApi } from '../lib/api';
import { isTokenExpired, millisUntilExpiry } from '../lib/token';

const STORAGE_KEY = 'mealcraft-auth';

/** Restores a session from storage, discarding anything malformed or expired. */
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

  // Mirrored into storage so a refresh keeps the user signed in.
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

  // Dropped the moment the token expires.
  useEffect(() => {
    if (!session?.token) return undefined;

    const remaining = millisUntilExpiry(session.token);
    if (remaining === null) return undefined;
    if (remaining <= 0) {
      setSession(null);
      return undefined;
    }

    // Within setTimeout's ~24.8 day ceiling.
    const timer = setTimeout(() => setSession(null), remaining);
    return () => clearTimeout(timer);
  }, [session]);

  // Keeps other tabs in sync.
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

  const updateProfile = useCallback(
    async (details) => {
      const data = await authApi.updateProfile(details, session?.token);
      setSession((prev) => (prev ? { ...prev, user: { ...prev.user, ...data.user } } : null));
      return data.user;
    },
    [session?.token],
  );

  const changePassword = useCallback(
    async (passwords) => {
      return await authApi.changePassword(passwords, session?.token);
    },
    [session?.token],
  );

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [session, login, register, logout, updateProfile, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
