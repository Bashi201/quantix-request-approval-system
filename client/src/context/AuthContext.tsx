import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isEmployee: boolean;
  isManager: boolean;
  isOperations: boolean;
  login: (email: string, password: string) => Promise<User>;
  setSession: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('quantix_token'));
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('quantix_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setSession = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('quantix_token', newToken);
    localStorage.setItem('quantix_user', JSON.stringify(newUser));
  };

  const login = async (email: string, password: string): Promise<User> => {
    const response = await api.post('/login', {
      email,
      password,
    });
    const { token: newToken, user: newUser } = response.data.data;
    setSession(newToken, newUser);
    return newUser;
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/logout');
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('quantix_token');
      localStorage.removeItem('quantix_user');
      window.location.href = '/login';
    }
  };

  const refreshProfile = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get('/me');
      if (response.data?.data) {
        setUser(response.data.data);
        localStorage.setItem('quantix_user', JSON.stringify(response.data.data));
      }
    } catch {
      setToken(null);
      setUser(null);
      localStorage.removeItem('quantix_token');
      localStorage.removeItem('quantix_user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const role = user?.role ?? null;
  const isEmployee = role === 'employee';
  const isManager = role === 'manager';
  const isOperations = role === 'operations';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: !!token && !!user,
        isLoading,
        isEmployee,
        isManager,
        isOperations,
        login,
        setSession,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
