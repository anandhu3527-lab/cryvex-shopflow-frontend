import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api/authApi';
import { securityManager } from '../utils/security';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [tenantEmployees, setTenantEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAuthData = async () => {
    if (!securityManager.isAuthenticated()) {
      setLoading(false);
      return;
    }
    
    try {
      const profileRes = await authApi.getProfile().catch((err) => {
        if (err?.status === 401 || err?.details?.status === 401) {
          authApi.logout();
          window.location.href = '/login';
        }
        return null;
      });

      if (!profileRes) {
        setLoading(false);
        return;
      }

      const authData = profileRes?.data || profileRes;
      const user = authData?.user || {};
      const tenant = authData?.tenant || null;
      const role = authData?.role?.name || user?.role || "OWNER";
      
      const normalizedRole = String(role).toUpperCase();
      user.role = normalizedRole; // Normalize to user object for existing components

      setCurrentUser(user);

      if (normalizedRole === "OWNER") {
        const tenantRes = await authApi.getTenant().catch(() => null);
        setCurrentTenant(tenantRes?.data?.shop || tenantRes?.shop || tenant);
        setTenantEmployees(tenantRes?.data?.employees || tenantRes?.employees || []);
      } else {
        setCurrentTenant(tenant);
        setTenantEmployees([]);
      }
    } catch (err) {
      console.error("Auth context error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthData();
    
    const handleSessionChange = (e) => {
      if (e.detail?.reason === 'authenticated') {
        fetchAuthData();
      } else if (e.detail?.reason === 'logout' || e.detail?.reason === 'expired') {
        setCurrentUser(null);
        setCurrentTenant(null);
        setTenantEmployees([]);
      }
    };
    
    window.addEventListener('cryvex:session-change', handleSessionChange);
    return () => window.removeEventListener('cryvex:session-change', handleSessionChange);
  }, []);

  const refreshTenant = async () => {
    // Only OWNER may call /tenants/me
    const role = (currentUser?.role || "").toUpperCase();
    if (role !== "OWNER") return null;

    try {
      const tenantRes = await authApi.getTenant();
      const shop = tenantRes?.data?.shop || tenantRes?.shop || tenantRes;
      const employees = tenantRes?.data?.employees || tenantRes?.employees || [];
      setCurrentTenant(shop);
      setTenantEmployees(employees);
      return shop;
    } catch (error) {
      console.error("Failed to refresh tenant", error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, currentTenant, tenantEmployees, loading, refreshTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
