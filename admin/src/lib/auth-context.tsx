"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS } from './api-config';
import { setupFetchInterceptor } from './auth-fetch';


interface User {
  id: number;
  username: string;
  is_superuser: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Install the fetch interceptor once on the client side
    setupFetchInterceptor();

    const token = localStorage.getItem('commercehub_access_token');
    const storedUser = localStorage.getItem('commercehub_user');

    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
    setIsInitialLoading(false);
  }, []);

  const login = async (username: string, pass: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password: pass }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      // Store tokens and user info
      localStorage.setItem('commercehub_access_token', data.access);
      localStorage.setItem('commercehub_refresh_token', data.refresh);
      localStorage.setItem('commercehub_user', JSON.stringify(data.user));
      
      setIsAuthenticated(true);
      setUser(data.user);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const refreshToken = async () => {
    const refresh = localStorage.getItem('commercehub_refresh_token');
    if (!refresh) return false;

    try {
      const response = await fetch(API_ENDPOINTS.TOKEN_REFRESH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) {
        logout();
        return false;
      }

      const data = await response.json();
      localStorage.setItem('commercehub_access_token', data.access);
      // If rotation is enabled, we get a new refresh token too
      if (data.refresh) {
        localStorage.setItem('commercehub_refresh_token', data.refresh);
      }
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  };

  const logout = async () => {
    const refresh = localStorage.getItem('commercehub_refresh_token');
    const access = localStorage.getItem('commercehub_access_token');
    
    // Attempt backend logout (blacklist token)
    if (refresh && access) {
      try {
        await fetch(API_ENDPOINTS.LOGOUT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access}`
          },
          body: JSON.stringify({ refresh }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('commercehub_access_token');
    localStorage.removeItem('commercehub_refresh_token');
    localStorage.removeItem('commercehub_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, refreshToken }}>
      {!isInitialLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
