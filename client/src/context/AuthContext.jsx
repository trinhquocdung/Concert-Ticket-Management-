import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import socketService from '../services/socket';

const AuthContext = createContext(null);

/**
 * Auth Context Provider
 * Bridges Clerk authentication with backend user sync
 */
export const AuthProvider = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  
  const [backendUser, setBackendUser] = useState(null);
  const [backendToken, setBackendToken] = useState(localStorage.getItem('backend_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  /**
   * Sync Clerk user with backend database
   */
  const syncWithBackend = useCallback(async () => {
    if (!clerkUser || !isSignedIn) {
      setBackendUser(null);
      setBackendToken(null);
      localStorage.removeItem('backend_token');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get Clerk token for backend verification
      const clerkToken = await getToken();

      // Sync user with backend
      const response = await fetch(`${API_URL}/auth/clerk-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clerkToken}`,
        },
        body: JSON.stringify({
          clerkId: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress,
          username: clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0],
          fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
          phone: clerkUser.primaryPhoneNumber?.phoneNumber || '',
          avatar: clerkUser.imageUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBackendUser(data.data.user);
        setBackendToken(data.data.token);
        localStorage.setItem('backend_token', data.data.token);
      } else {
        throw new Error(data.message || 'Failed to sync with backend');
      }
    } catch (err) {
      console.error('Backend sync error:', err);
      setError(err.message);
      // Don't clear everything on error - allow retry
    } finally {
      setLoading(false);
    }
  }, [clerkUser, isSignedIn, getToken, API_URL]);

  // Sync when Clerk user changes
  useEffect(() => {
    if (clerkLoaded) {
      syncWithBackend();
    }
  }, [clerkLoaded, clerkUser?.id, isSignedIn, syncWithBackend]);

  // Socket handling: connect when backend user available, join user room
  useEffect(() => {
    let sock = null;
    const setupSocket = async () => {
      if (!backendUser) return;
      sock = socketService.connectSocket();
      try {
        // join user room
        sock.emit('join-user', backendUser._id);

        // forward order cancellation processed events to window so pages can react
        sock.on('order-cancellation-processed', (payload) => {
          try {
            window.dispatchEvent(new CustomEvent('order-cancellation-processed', { detail: payload }));
          } catch (e) {
            console.error('Failed to dispatch socket event', e);
          }
        });
      } catch (e) {
        console.error('Socket setup failed', e);
      }
    };

    setupSocket();

    return () => {
      try {
        if (sock) {
          // leave room
          if (backendUser && sock.connected) sock.emit('leave-user', backendUser._id);
          socketService.disconnectSocket();
        }
      } catch (e) {
        console.error('Socket cleanup failed', e);
      }
    };
  }, [backendUser]);

  /**
   * Get auth headers for API requests
   */
  const getAuthHeaders = useCallback(() => {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (backendToken) {
      headers['Authorization'] = `Bearer ${backendToken}`;
    }
    
    return headers;
  }, [backendToken]);

  /**
   * Make authenticated API request
   */
  const authFetch = useCallback(async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    // Handle token expiry
    if (response.status === 401) {
      // Try to re-sync with backend
      await syncWithBackend();
      // Retry request with new token
      const newToken = localStorage.getItem('backend_token');
      if (newToken) {
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newToken}`,
          },
        });
      }
    }

    return response;
  }, [API_URL, getAuthHeaders, syncWithBackend]);

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback((role) => {
    if (!backendUser) return false;
    if (Array.isArray(role)) {
      return role.includes(backendUser.role);
    }
    return backendUser.role === role;
  }, [backendUser]);

  /**
   * Check if user is admin
   */
  const isAdmin = useCallback(() => hasRole('ADMIN'), [hasRole]);

  /**
   * Check if user is organizer
   */
  const isOrganizer = useCallback(() => hasRole(['ADMIN', 'ORG']), [hasRole]);

  /**
   * Check if user is staff
   */
  const isStaff = useCallback(() => hasRole(['ADMIN', 'STAFF']), [hasRole]);

  const value = {
    // Clerk user (frontend profile)
    clerkUser,
    isSignedIn,
    
    // Backend user (database profile with role)
    user: backendUser,
    token: backendToken,
    
    // State
    loading: !clerkLoaded || loading,
    error,
    
    // Methods
    syncWithBackend,
    getAuthHeaders,
    authFetch,
    
    // Role checks
    hasRole,
    isAdmin,
    isOrganizer,
    isStaff,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
