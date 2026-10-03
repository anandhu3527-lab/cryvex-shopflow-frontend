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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-6">
        <img
          src="/cryvex-shopflow-logo.jpeg"
          alt="CRYVEX SHOPFLOW"
          style={{ width: "min(70vw, 280px)", height: "auto" }}
          className="object-contain animate-pulse"
        />
      </div>
    );
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
