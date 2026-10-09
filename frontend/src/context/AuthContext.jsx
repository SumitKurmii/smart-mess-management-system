import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Verify session on initial mount via httpOnly cookie
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authApi.getMe();
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
      } else {
        setUser(null);
      }
    } catch {
      // 401 unauthenticated is expected when not logged in
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login handler
  const login = async (credentials) => {
    setAuthError(null);
    try {
      const res = await authApi.login(credentials);
      const loggedUser = res.data?.data?.user;
      setUser(loggedUser);
      return { success: true, user: loggedUser };
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      return { success: false, message: err.message };
    }
  };

  // Register handler (strictly creates student)
  const register = async (userData) => {
    setAuthError(null);
    try {
      const res = await authApi.register(userData);
      const registeredUser = res.data?.data?.user;
      setUser(registeredUser);
      return { success: true, user: registeredUser };
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      return { success: false, message: err.message, errors: err.errors };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    authError,
    login,
    register,
    logout,
    checkAuth,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
