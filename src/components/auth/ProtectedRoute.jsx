import { Navigate, useLocation } from "react-router-dom";
import { securityManager } from "../../utils/security";
import { useAuth } from "../../context/AuthContext";

/**
 * Route protection wrapper component
 * Ensures only authenticated users with valid session tokens can access merchant routes
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const isAuth = securityManager.isAuthenticated();
  const { loading, currentUser } = useAuth();

  if (!isAuth) {
    // Preserve the full requested location for return after login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-sm font-medium text-slate-500 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
