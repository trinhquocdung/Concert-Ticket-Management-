/**
 * Staff Service - API functions for staff management
 */

import { API_URL, buildQueryString, handleResponse } from './api';

/**
 * Get staff list
 */
export const getStaffList = async (authFetch, { page = 1, limit = 10, search }) => {
  const query = buildQueryString({ page, limit, search, role: 'STAFF' });
  const response = await authFetch(`${API_URL}/users?${query}`);
  return handleResponse(response);
};

/**
 * Create staff user
 */
export const createStaff = async (authFetch, staffData) => {
  const response = await authFetch(`${API_URL}/users/staff`, {
    method: 'POST',
    body: JSON.stringify({ ...staffData, role: 'STAFF' }),
  });
  return handleResponse(response);
};

/**
 * Update staff
 */
export const updateStaff = async (authFetch, staffId, staffData) => {
  const response = await authFetch(`${API_URL}/users/${staffId}`, {
    method: 'PUT',
    body: JSON.stringify(staffData),
  });
  return handleResponse(response);
};

/**
 * Delete staff
 */
export const deleteStaff = async (authFetch, staffId) => {
  const response = await authFetch(`${API_URL}/users/${staffId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

/**
 * Assign events to staff
 */
export const assignEvents = async (authFetch, staffId, eventIds) => {
  const response = await authFetch(`${API_URL}/users/${staffId}/assign-events`, {
    method: 'POST',
    body: JSON.stringify({ eventIds }),
  });
  return handleResponse(response);
};

/**
 * Update staff permissions
 */
export const updatePermissions = async (authFetch, staffId, permissions) => {
  const response = await authFetch(`${API_URL}/users/${staffId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
  return handleResponse(response);
};

/**
 * Permission configuration
 */
export const PERMISSIONS = [
  { key: 'check_in', label: 'Check-in Tickets', description: 'Scan and validate tickets at events' },
  { key: 'view_attendees', label: 'View Attendees', description: 'See list of event attendees' },
  { key: 'manage_guests', label: 'Manage Guests', description: 'Add/remove guests from guest list' },
  { key: 'view_reports', label: 'View Reports', description: 'Access event reports and statistics' },
  { key: 'cancel_tickets', label: 'Cancel Tickets', description: 'Cancel tickets for customers' },
];

/**
 * Default staff form
 */
export const DEFAULT_STAFF_FORM = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  phone: '',
  permissions: ['check_in', 'view_attendees'],
  assignedEvents: [],
};

/**
 * Get staff avatar
 */
export const getStaffAvatar = (staff) => {
  if (staff.avatar) return staff.avatar;
  const name = staff.fullName || staff.username;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff`;
};
