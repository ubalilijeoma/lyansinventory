import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getRoleDashboardPath } from '../context/AuthContext';
import { LogoIcon, ArrowRightIcon } from '../components/Icons';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signUp, authError } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('Ijeoma Lilian Uba');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const redirectAfterLogin = (user) => {
    const destination = location.state?.from?.pathname || getRoleDashboardPath(user.role);
    navigate(destination, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setLocalError('Please enter your work email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setLoading(true);
    setLocalError('');
    setSuccessMsg('');

    if (isSignUp) {
      const result = await signUp(email, password, fullName);
      setLoading(false);
      if (result.success) {
        if (result.user) {
          redirectAfterLogin(result.user);
        } else {
          setSuccessMsg(result.message || 'Account registered in Supabase. You can now sign in.');
          setIsSignUp(false);
        }
      } else {
        setLocalError(result.error || 'Registration failed. Please try again.');
      }
    } else {
      const result = await login(email, password);
      setLoading(false);

      if (result.success && result.user) {
        redirectAfterLogin(result.user);
      } else {
        setLocalError(result.error || 'Authentication failed. Please verify your email and password.');
      }
    }
  };

  return (
    <div className="login-page-container animate-fade-in">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-brand-icon">
            <LogoIcon size={28} />
          </div>
          <h1 className="login-brand-title">Inventory Hub</h1>
          <span className="login-brand-sub">Lyans Woman Enterprise</span>
        </div>

        <div className="login-title-group">
          <h2 className="login-heading">{isSignUp ? 'Create Cloud Account' : 'Executive Authentication'}</h2>
          <p className="login-desc">
            {isSignUp
              ? 'Register with your email to link your Super Admin credentials'
              : 'Enter your credentials to access the Lyans Woman inventory console'}
          </p>
        </div>

        {/* Error & Success Messages */}
        {(localError || authError) && (
          <div className="login-error-alert" role="alert">
            <span>⚠</span>
            <span>{localError || authError}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="login-error-alert"
            style={{
              backgroundColor: '#ECFDF5',
              borderColor: '#A7F3D0',
              color: '#059669',
            }}
          >
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Secured Credential Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {isSignUp && (
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                className="form-input"
                placeholder="e.g. Ijeoma Lilian Uba"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Work Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="e.g. ijeomalilianuba@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? 'Hide Password' : 'Show Password'}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary-action btn-login-submit"
            disabled={loading}
          >
            <span>{loading ? 'Authenticating...' : isSignUp ? 'Register Account' : 'Sign In to Dashboard'}</span>
            <ArrowRightIcon size={16} />
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setLocalError('');
                setSuccessMsg('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#1e5bf8',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {isSignUp
                ? 'Already registered? Sign In'
                : 'Need to set up a new password in Supabase? Register Account'}
            </button>
          </div>
        </form>

        {/* Security Baseline Footer Note */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            🔒 256-Bit SSL Encrypted · Role-Based Access Governance Active
          </span>
        </div>
      </div>
    </div>
  );
}
