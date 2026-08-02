import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

/**
 * Gate for routes that need a signed-in user. Sends guests to the login page
 * and remembers where they were headed so they land there afterwards.
 */
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
