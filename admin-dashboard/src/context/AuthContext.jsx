/**
 * Auth Context for Role-Based Access Control
 * Roles: ADMIN, ORG (Organizer), STAFF
 * 
 * This context handles real authentication with the backend API
 * Only users with ADMIN, ORG, or STAFF roles can access the admin dashboard
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Allowed roles for admin dashboard
const ALLOWED_ROLES = ['ADMIN', 'ORG', 'STAFF'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Clear auth data helper
  const clearAuth = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
    setToken(null);
  }, []);

  // Load user from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('admin_token');
      const savedUser = localStorage.getItem('admin_user');
      
      if (savedToken && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          
          // Verify the token is still valid by calling /auth/me
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && ALLOWED_ROLES.includes(data.data.role)) {
              const verifiedUser = {
                ...data.data,
                name: data.data.fullName || data.data.username,
                avatar: data.data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.data.fullName || data.data.username)}&background=${
                  data.data.role === 'ADMIN' ? 'F84565' : 
                  data.data.role === 'ORG' ? '3b82f6' : '10b981'
                }&color=fff`
              };
              setUser(verifiedUser);
              setToken(savedToken);
              localStorage.setItem('admin_user', JSON.stringify(verifiedUser));
            } else {
              // User doesn't have permission
              clearAuth();
            }
          } else {
            // Token is invalid
            clearAuth();
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          clearAuth();
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, [clearAuth]);

  /**
   * Login with email and password
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{success: boolean, message?: string, user?: object}>}
   */
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Login failed'
        };
      }

      if (!data.success) {
        return {
          success: false,
          message: data.message || 'Login failed'
        };
      }

      const userData = data.data.user;
      const userToken = data.data.token;

      // Check if user has allowed role for admin dashboard
      if (!ALLOWED_ROLES.includes(userData.role)) {
        return {
          success: false,
          message: 'Access denied. Only Admin, Organizer, and Staff accounts can access this dashboard.'
        };
      }

      // Add avatar and name if not present
      const userWithAvatar = {
        ...userData,
        name: userData.fullName || userData.username,
        avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName || userData.username)}&background=${
          userData.role === 'ADMIN' ? 'F84565' : 
          userData.role === 'ORG' ? '3b82f6' : '10b981'
        }&color=fff`
      };

      // Save to state and localStorage
      setUser(userWithAvatar);
      setToken(userToken);
      localStorage.setItem('admin_token', userToken);
      localStorage.setItem('admin_user', JSON.stringify(userWithAvatar));

      return {
        success: true,
        user: userWithAvatar
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.'
      };
    }
  };

  /**
   * Logout and clear all auth data
   */
  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  /**
   * Authenticated fetch helper
   * Automatically adds Authorization header
   */
  const authFetch = useCallback(async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // If unauthorized, clear auth
    if (response.status === 401) {
      clearAuth();
    }

    return response;
  }, [token, clearAuth]);

  /**
   * Permission checks based on role
   */
  const can = (permission) => {
    if (!user) return false;
    
    const permissions = {
      ADMIN: [
        'view_dashboard', 'manage_users', 'manage_all_events', 
        'manage_venues', 'manage_artists', 'view_reports',
        'manage_vouchers', 'system_settings', 'view_logs',
        'manage_orders', 'manage_staff', 'manage_organizers'
      ],
      ORG: [
        'view_dashboard', 'manage_own_events', 'view_own_reports',
        'manage_own_vouchers', 'view_own_orders', 'manage_own_staff',
        'view_customers', 'send_notifications', 'export_checkin'
      ],
      STAFF: [
        'view_dashboard', 'scan_tickets', 'check_in_attendees',
        'view_assigned_events', 'book_tickets', 'process_counter_payment',
        'print_tickets', 'view_own_transactions', 'handle_cancellations'
      ],
    };

    return permissions[user.role]?.includes(permission) || false;
  };

  // Role check helpers
  const isAdmin = () => user?.role === 'ADMIN';
  const isOrganizer = () => user?.role === 'ORG';
  const isStaff = () => user?.role === 'STAFF';

  // Get role display name
  const getRoleDisplayName = () => {
    if (!user) return '';
    switch (user.role) {
      case 'ADMIN': return 'Administrator';
      case 'ORG': return 'Event Organizer';
      case 'STAFF': return 'Staff Member';
      default: return user.role;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      authFetch,
      can,
      isAdmin,
      isOrganizer,
      isStaff,
      getRoleDisplayName,
      API_URL,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
