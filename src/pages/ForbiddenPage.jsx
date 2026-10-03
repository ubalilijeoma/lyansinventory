import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getRoleDashboardPath } from '../context/AuthContext';
import { AlertTriangleIcon, ArrowRightIcon } from '../components/Icons';

export default function ForbiddenPage({
  attemptedPath = '',
  requiredRoles = [],
  userRole = '',
}) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const activeRole = userRole || currentUser?.role || 'Guest';
  const homePath = getRoleDashboardPath(currentUser?.role);

  const handleReturnHome = () => {
    navigate(homePath, { replace: true });
  };

  return (
    <div className="forbidden-page-container animate-fade-in">
      <div className="forbidden-card">
        {/* Shield / Alert Icon */}
        <div className="forbidden-icon-wrapper">
          <div className="forbidden-icon-pulse"></div>
          <AlertTriangleIcon size={38} className="forbidden-icon" />
        </div>

        {/* HTTP 403 Badge */}
        <div className="forbidden-status-pill">
          <span className="dot red"></span>
          <span>HTTP 403 · Forbidden Request</span>
        </div>

        <h1 className="forbidden-title">Access Denied</h1>
        <p className="forbidden-subtitle">
          Your account is authenticated, but does not possess the authorization privileges required to access this console.
        </p>

        {/* Security Diagnostic Box */}
        <div className="forbidden-diagnostic-box">
          <div className="diagnostic-row">
            <span className="diag-label">Attempted Resource:</span>
            <span className="diag-val font-mono">{attemptedPath || window.location.pathname}</span>
          </div>
          <div className="diagnostic-row">
            <span className="diag-label">Your Current Role:</span>
            <span className={`diag-role-tag ${activeRole}`}>
              {activeRole.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="diagnostic-row">
            <span className="diag-label">Required Authorization:</span>
            <span className="diag-val">
              {requiredRoles.length > 0
                ? requiredRoles.map((r) => r.replace('_', ' ').toUpperCase()).join(' or ')
                : 'Elevated Administrator Privilege'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="forbidden-actions">
          <button
            type="button"
            className="btn-primary-action btn-return-home"
            onClick={handleReturnHome}
          >
            <span>Return to My Authorized Dashboard</span>
            <ArrowRightIcon size={16} />
          </button>

          <button
            type="button"
            className="btn-secondary-action"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Sign Out / Switch Account
          </button>
        </div>
      </div>
    </div>
  );
}
