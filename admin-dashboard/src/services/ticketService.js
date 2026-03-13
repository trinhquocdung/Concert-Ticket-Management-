/**
 * Ticket Service - API functions for ticket class management
 */

import { API_URL, buildQueryString, handleResponse } from './api';

/**
 * Get ticket classes for concert
 */
export const getTicketClasses = async (authFetch, concertId) => {
  // Backend exposes ticket classes as part of the concert payload
  const response = await authFetch(`${API_URL}/concerts/${concertId}`);
  const data = await handleResponse(response);
  // normalize to previous shape: { data: { ticketClasses: [...] } }
  return { data: { ticketClasses: data.data.ticketClasses || [] } };
};

/**
 * Create ticket class
 */
export const createTicketClass = async (authFetch, ticketData) => {
  const response = await authFetch(`${API_URL}/ticket-classes`, {
    method: 'POST',
    body: JSON.stringify(ticketData),
  });
  return handleResponse(response);
};

/**
 * Update ticket class
 */
export const updateTicketClass = async (authFetch, ticketId, ticketData) => {
  const response = await authFetch(`${API_URL}/ticket-classes/${ticketId}`, {
    method: 'PUT',
    body: JSON.stringify(ticketData),
  });
  return handleResponse(response);
};

/**
 * Delete ticket class
 */
export const deleteTicketClass = async (authFetch, ticketId) => {
  const response = await authFetch(`${API_URL}/ticket-classes/${ticketId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

// ========================
// Check-in API
// ========================

/**
 * Verify ticket
 */
export const verifyTicket = async (authFetch, { ticketCode, qrHash }) => {
  const response = await authFetch(`${API_URL}/tickets/verify`, {
    method: 'POST',
    body: JSON.stringify({ ticketCode, qrHash }),
  });
  return handleResponse(response);
};

/**
 * Check-in ticket by ID
 */
export const checkInTicket = async (authFetch, ticketId) => {
  const response = await authFetch(`${API_URL}/tickets/${ticketId}/check-in`, {
    method: 'POST',
  });
  return handleResponse(response);
};

/**
 * Check-in by QR
 */
export const checkInByQR = async (authFetch, qrHash) => {
  const response = await authFetch(`${API_URL}/tickets/check-in-qr`, {
    method: 'POST',
    body: JSON.stringify({ qrHash }),
  });
  return handleResponse(response);
};

/**
 * Get check-in list for concert
 */
export const getCheckInList = async (authFetch, concertId, { page = 1, status }) => {
  const query = buildQueryString({ page, status });
  const response = await authFetch(`${API_URL}/tickets/concert/${concertId}/check-in-list?${query}`);
  return handleResponse(response);
};

/**
 * Ticket class presets
 */
export const TICKET_PRESETS = [
  { name: 'VIP', price: 2000000 },
  { name: 'Premium', price: 1500000 },
  { name: 'Standard', price: 800000 },
  { name: 'Early Bird', price: 600000 },
  { name: 'Student', price: 400000 },
  { name: 'Group (5+)', price: 3500000 },
];

/**
 * Default ticket class form
 */
export const DEFAULT_TICKET_FORM = {
  concert: '',
  name: '',
  price: 0,
  open_time: '',
  close_time: '',
  // zone/quota/description/benefits removed from editable form per admin request
};
