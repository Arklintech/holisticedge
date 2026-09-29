import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AdminUser } from '../types/admin.types';
import { sessionStorage_admin, userStorage, seedDemoData } from '../services/adminStorage';
import { loginWithServer, restoreServerSession, clearServerSession } from '../services/adminSession';

interface AdminAuthContextValue {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error: string }>;
  logout: () => void;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string; error: string }>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize: verify existing session with backend or local session
  useEffect(() => {
    seedDemoData();
    userStorage.getAll();

    async function checkAuthSession() {
      // Only a backend-verified token counts as a session; a stale local-only
      // session would leave every admin API call unauthenticated (401).
      const serverUser = await restoreServerSession<AdminUser>(fetch, localStorage);
      setUser(serverUser);
      setIsLoading(false);
    }

    checkAuthSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    const result = await loginWithServer<AdminUser>(fetch, localStorage, email, password);
    setUser(result.user);
    setIsLoading(false);
    return { success: Boolean(result.user), error: result.error };
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.warn('Logout API error:', e);
      }
    }
    clearServerSession(localStorage);
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    sessionStorage_admin.logout();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message || 'Password reset email sent.' };
      }
      return { success: false, error: data.error || 'Failed to send password reset.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send password reset.' };
    }
  }, []);

  return (
    <AdminAuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      resetPassword,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
