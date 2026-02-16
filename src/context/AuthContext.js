// frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── PERMANENT BACKEND URL ─────────────────────────────────────────────────────
const API_URL = 'https://heymatebackend-production.up.railway.app/api';
// ─────────────────────────────────────────────────────────────────────────────

console.log('🌐 API_URL:', API_URL);

const apiFetch = async (endpoint, method = 'GET', body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 20000);

  try {
    console.log(`📤 ${method} → ${API_URL}${endpoint}`);
    const res  = await fetch(`${API_URL}${endpoint}`, { ...opts, signal: controller.signal });
    const text = await res.text();
    clearTimeout(timeout);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log('Non-JSON response:', text.slice(0, 200));
      throw new Error('Server error. Please try again.');
    }

    console.log(`📥 ${res.status}:`, JSON.stringify(data).slice(0, 150));
    return { ok: res.ok, status: res.status, data };

  } catch (e) {
    clearTimeout(timeout);
    console.log('❌ Fetch error:', e.message);
    if (e.name === 'AbortError') throw new Error('Connection timed out. Check your internet.');
    throw e;
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]                       = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => { loadStoredUser(); }, []);

  const loadStoredUser = async () => {
    try {
      const token   = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      if (token && userStr) {
        setUser(JSON.parse(userStr));
        setIsAuthenticated(true);
        console.log('✅ Auto logged in');
      }
    } catch (e) {
      await AsyncStorage.multiRemove(['token', 'user']);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      console.log('📝 Registering:', userData.email);
      const { ok, data } = await apiFetch('/auth/register', 'POST', userData);
      if (ok && data.token && data.data) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user',  JSON.stringify(data.data));
        setUser(data.data);
        setIsAuthenticated(true);
        console.log('✅ Registered successfully');
        return { success: true };
      }
      return { success: false, message: data.message || 'Registration failed' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  const login = async (credentials) => {
    try {
      console.log('🔑 Logging in:', credentials.email || credentials.phone);
      const { ok, data } = await apiFetch('/auth/login', 'POST', credentials);
      if (ok && data.token && data.data) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user',  JSON.stringify(data.data));
        setUser(data.data);
        setIsAuthenticated(true);
        console.log('✅ Login successful');
        return { success: true };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setUser(null);
    setIsAuthenticated(false);
    console.log('✅ Logged out');
  };

  const updateUser = async (updates) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const { ok, data } = await apiFetch('/auth/profile', 'PUT', updates, token);
      const updated = ok ? (data.data || data.user) : null;
      const merged  = { ...user, ...(updated || {}), ...updates };
      await AsyncStorage.setItem('user', JSON.stringify(merged));
      setUser(merged);
      return { success: true };
    } catch (e) {
      const merged = { ...user, ...updates };
      await AsyncStorage.setItem('user', JSON.stringify(merged));
      setUser(merged);
      return { success: true };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, loading,
      login, register, logout, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;