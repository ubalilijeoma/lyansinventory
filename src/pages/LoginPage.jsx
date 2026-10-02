import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getRoleDashboardPath, DEMO_ACCOUNTS, ROLES } from '../context/AuthContext';
import { LogoIcon, ArrowRightIcon } from '../components/Icons';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const redirectAfterLogin = (user) => {
    // Check if there was an attempted destination
    const destination = location.state?.from?.pathname || getRoleDashboardPath(user.role);
    navigate(destination, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setLocalError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setLocalError('');

    const result = await login(email, password);
    setLoading(false);

    if (result.success && result.user) {
      redirectAfterLogin(result.user);
    } else {
      setLocalError(result.error || 'Login failed. Please verify credentials.');
    }
  };

  const handleQuickLogin = async (demoUser) => {
    setEmail(demoUser.email);
    setPassword('••••••••');
    setLoading(true);
    setLocalError('');

    const result = await login(demoUser.email, 'password123');
    setLoading(false);

    if (result.success && result.user) {
      redirectAfterLogin(result.user);
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
          <h2 className="login-heading">Welcome Back</h2>
          <p className="login-desc">Sign in to your role-authorized workspace</p>
        </div>

        {/* Error Messages */}
        {(localError || authError) && (
          <div className="login-error-alert" role="alert">
            <span>⚠</span>
            <span>{localError || authError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Work Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="e.g. superadmin@lyanswoman.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary-action btn-login-submit"
            disabled={loading}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            <ArrowRightIcon size={16} />
          </button>
        </form>

        {/* Quick Test Roles Box */}
        <div className="quick-roles-section">
          <div className="quick-roles-divider">
            <span>Or Quick-Test by Role</span>
          </div>

          <div className="quick-roles-grid">
            {/* Super Admin */}
            <button
              type="button"
              className="quick-role-card role-super-admin"
              onClick={() => handleQuickLogin(DEMO_ACCOUNTS[0])}
            >
              <div className="role-card-badge purple">Super Admin</div>
              <div className="role-card-name">Elena Vance</div>
              <div className="role-card-email">superadmin@lyanswoman.com</div>
              <span className="role-card-cta">Access Executive Hub →</span>
            </button>

            {/* Admin */}
            <button
              type="button"
              className="quick-role-card role-admin"
              onClick={() => handleQuickLogin(DEMO_ACCOUNTS[1])}
            >
              <div className="role-card-badge blue">Store Admin</div>
              <div className="role-card-name">Marcus Adebayo</div>
              <div className="role-card-email">admin@lyanswoman.com</div>
              <span className="role-card-cta">Access Store Admin →</span>
            </button>

            {/* Staff */}
            <button
              type="button"
              className="quick-role-card role-staff"
              onClick={() => handleQuickLogin(DEMO_ACCOUNTS[2])}
            >
              <div className="role-card-badge green">Floor Staff</div>
              <div className="role-card-name">Sarah Jenkins</div>
              <div className="role-card-email">staff@lyanswoman.com</div>
              <span className="role-card-cta">Access Staff Desk →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
