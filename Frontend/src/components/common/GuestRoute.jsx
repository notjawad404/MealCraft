import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

/** Keeps signed-in users off the login and register pages. */
export default function GuestRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  }

  return <Outlet />;
}
