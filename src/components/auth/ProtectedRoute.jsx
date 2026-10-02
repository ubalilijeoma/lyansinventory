import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ForbiddenPage from '../../pages/ForbiddenPage';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  // 1. Unauthenticated -> Redirect to Login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Unauthorized Role -> 403 Forbidden Request
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return (
      <ForbiddenPage
        attemptedPath={location.pathname}
        requiredRoles={allowedRoles}
        userRole={currentUser.role}
      />
    );
  }

  // 3. Authorized -> Render protected dashboard/page
  return children;
}
