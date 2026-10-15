import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { PageSpinner } from '../design-system';

export function PrivateRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect user to their own role's primary landing page
    if (user.role === 'owner') {
      return <Navigate to="/owner/dashboard" replace />;
    } else if (user.role === 'repairer') {
      return <Navigate to="/repairer/queue" replace />;
    } else if (user.role === 'counter_staff') {
      return <Navigate to="/counter/receipt" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
