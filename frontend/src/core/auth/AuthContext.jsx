import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../../shared/api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // checking localStorage on mount

  // On app load, restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      try {
        const parsed = JSON.parse(user);
        // Dynamically add groups based on role for workflow checks
        const groups = [];
        if (parsed.role === 'DEPARTMENT_HEAD') groups.push('department_heads');
        if (parsed.role === 'PROCUREMENT') groups.push('procurement');
        if (parsed.role === 'LEGAL') groups.push('legal');
        parsed.groups = groups;
        
        setCurrentUser(parsed);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    // apiClient interceptor unwraps response.data.data, so response = { token, user }
    const { token, user } = response;
    
    // Dynamically add groups based on role for workflow checks
    const groups = [];
    if (user.role === 'DEPARTMENT_HEAD') groups.push('department_heads');
    if (user.role === 'PROCUREMENT') groups.push('procurement');
    if (user.role === 'LEGAL') groups.push('legal');
    user.groups = groups;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  const hasRole = (...roles) => roles.includes(currentUser?.role);

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
