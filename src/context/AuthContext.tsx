import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  confirmPasswordReset,
  continueAsGuest,
  deleteAccount as deleteAccountService,
  getAuthBackend,
  getAuthSession,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
} from '../services/auth';
import type { AuthSession } from '../types';
import type { AuthBackend } from '../services/auth';

type ActionResult = { ok: boolean; error?: string };

interface AuthContextValue {
  session: AuthSession | null;
  authReady: boolean;
  backend: AuthBackend;
  register: (email: string, password: string) => Promise<ActionResult>;
  login: (email: string, password: string) => Promise<ActionResult>;
  guest: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<ActionResult>;
  sendPasswordResetCode: (email: string) => Promise<ActionResult>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<ActionResult>;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const backend = getAuthBackend();

  useEffect(() => {
    getAuthSession().then((s) => {
      setSession(s);
      setAuthReady(true);
    });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const result = await registerUser(email, password);
    if (result.ok) {
      setSession(result.session);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginUser(email, password);
    if (result.ok) {
      setSession(result.session);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }, []);

  const guest = useCallback(async () => {
    const s = await continueAsGuest();
    setSession(s);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setSession(null);
  }, []);

  const deleteAccount = useCallback(
    async (password: string) => {
      if (!session) return { ok: false, error: 'unknown' };
      const result = await deleteAccountService(session, password);
      if (result.ok) setSession(null);
      return result;
    },
    [session]
  );

  const sendPasswordResetCode = useCallback((email: string) => requestPasswordReset(email), []);

  const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    const result = await confirmPasswordReset(email, code, newPassword);
    if (result.ok) {
      setSession(result.session);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        authReady,
        backend,
        register,
        login,
        guest,
        logout,
        deleteAccount,
        sendPasswordResetCode,
        resetPassword,
        isGuest: session?.isGuest ?? false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
