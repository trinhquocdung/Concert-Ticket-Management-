/**
 * User Service - API functions for user management
 */

import { API_URL, buildQueryString, handleResponse } from './api';

/**
 * Get users list with pagination and filters
 */
export const getUsers = async (authFetch, { page = 1, limit = 10, search, role, status }) => {
  const query = buildQueryString({ page, limit, search, role, status });
  const response = await authFetch(`${API_URL}/users?${query}`);
  return handleResponse(response);
};

/**
 * Get user statistics
 */
export const getUserStats = async (authFetch) => {
  const response = await authFetch(`${API_URL}/users/stats`);
  return handleResponse(response);
};

/**
 * Create new user
 */
export const createUser = async (authFetch, userData) => {
  const response = await authFetch(`${API_URL}/users`, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  return handleResponse(response);
};

/**
 * Update user
 */
export const updateUser = async (authFetch, userId, userData) => {
  const response = await authFetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
  return handleResponse(response);
};

/**
 * Delete user
 */
export const deleteUser = async (authFetch, userId) => {
  const response = await authFetch(`${API_URL}/users/${userId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

/**
 * Toggle user status (lock/unlock)
 */
export const toggleUserStatus = async (authFetch, userId) => {
  const response = await authFetch(`${API_URL}/users/${userId}/status`, {
    method: 'PUT',
  });
  return handleResponse(response);
};

/**
 * Reset user password
 */
export const resetUserPassword = async (authFetch, userId, newPassword) => {
  const response = await authFetch(`${API_URL}/users/${userId}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify({ newPassword }),
  });
  return handleResponse(response);
};

/**
 * Get user avatar URL
 */
export const getUserAvatar = (user) => {
  if (user.avatar) return user.avatar;
  const name = user.fullName || user.username;
  const bg = user.role === 'ADMIN' ? 'F84565' : 
             user.role === 'ORG' ? '3b82f6' : 
             user.role === 'STAFF' ? '10b981' : 'f59e0b';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff`;
};

/**
 * Role configuration
 */
export const ROLE_CONFIG = {
  ADMIN: { label: 'Admin', color: 'red' },
  ORG: { label: 'Organizer', color: 'blue' },
  STAFF: { label: 'Staff', color: 'emerald' },
  CUS: { label: 'Customer', color: 'gray' },
};

/**
 * Default form data
 */
export const DEFAULT_USER_FORM = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  phone: '',
  role: 'CUS',
  status: true,
};
