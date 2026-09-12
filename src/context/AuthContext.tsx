import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types.ts';
import { authApi, profileApi, getStoredToken, setStoredToken } from '../api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; bio?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await profileApi.get();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setUser(null);
        setStoredToken(null);
        setToken(null);
      }
    } catch {
      setUser(null);
      setStoredToken(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [refreshProfile]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, pass);
      if (res.token && res.user) {
        setStoredToken(res.token);
        setToken(res.token);
        setUser(res.user);
      } else {
        throw new Error('Authentication failed: missing token.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, pass: string, role: UserRole = 'user') => {
    setIsLoading(true);
    try {
      const res = await authApi.signup(name, email, pass, role);
      if (res.token && res.user) {
        setStoredToken(res.token);
        setToken(res.token);
        setUser(res.user);
      } else {
        throw new Error('Registration failed: missing token.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: { name?: string; bio?: string }) => {
    const res = await profileApi.update(data);
    if (res.success && res.data) {
      setUser((prev) => (prev ? { ...prev, ...res.data } : res.data!));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
