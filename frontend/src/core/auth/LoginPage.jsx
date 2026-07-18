import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-family)',
    }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '1rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px', height: '52px',
            borderRadius: '12px',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '1rem',
          }}>C</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>CMS Enterprise</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Contract Management Platform</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Sign in to your account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
            Enter your credentials to continue
          </p>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#b91c1c',
              fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                placeholder="you@company.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-control"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.75rem' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick-fill demo credentials */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: 'var(--bg-color)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Demo Accounts (password: password123)
            </p>
            {[
              { label: 'Business User', email: 'alice@cms.com' },
              { label: 'Department Head', email: 'bob@cms.com' },
              { label: 'Procurement', email: 'carol@cms.com' },
              { label: 'Legal', email: 'david@cms.com' },
              { label: 'Super Admin', email: 'eva@cms.com' },
            ].map(({ label, email }) => (
              <button
                key={email}
                type="button"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.3rem 0.5rem',
                  fontSize: '0.8rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--primary-color)',
                  borderRadius: '4px',
                }}
                onMouseEnter={e => e.target.style.backgroundColor = '#eff6ff'}
                onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                onClick={() => setFormData({ email, password: 'password123' })}
              >
                → {label} — <span style={{ color: 'var(--text-secondary)' }}>{email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
