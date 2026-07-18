import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/**
 * ProtectedRoute — wraps authenticated pages.
 * Redirects to /login if no user session exists.
 */
const ProtectedRoute = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-family)',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem',
      }}>
        Loading session...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
