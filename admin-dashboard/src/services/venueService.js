/**
 * Venue Service - API functions for venue and seat management
 * 
 * NEW STRUCTURE:
 * - Venues have Seats directly (no zones)
 * - Seat layouts are physical templates for the venue
 * - TicketClasses are per-event (handled via concert/event service)
 */

import { API_URL, buildQueryString, handleResponse } from './api';

// ========================
// Venue CRUD
// ========================

/**
 * Get all venues
 */
export const getVenues = async (authFetch, { page = 1, limit = 10, search, city } = {}) => {
  const query = buildQueryString({ page, limit, search, city });
  const response = await authFetch(`${API_URL}/venues?${query}`);
  return handleResponse(response);
};

/**
 * Get venue by ID
 */
export const getVenueById = async (authFetch, venueId) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}`);
  return handleResponse(response);
};

/**
 * Get venue capacity info
 */
export const getVenueCapacity = async (authFetch, venueId) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/capacity`);
  return handleResponse(response);
};

/**
 * Create venue
 */
export const createVenue = async (authFetch, venueData) => {
  const response = await authFetch(`${API_URL}/venues`, {
    method: 'POST',
    body: JSON.stringify(venueData),
  });
  return handleResponse(response);
};

/**
 * Update venue
 */
export const updateVenue = async (authFetch, venueId, venueData) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}`, {
    method: 'PUT',
    body: JSON.stringify(venueData),
  });
  return handleResponse(response);
};

/**
 * Delete venue
 */
export const deleteVenue = async (authFetch, venueId) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

// ========================
// Seat Management
// ========================

/**
 * Get all seats for a venue
 */
export const getVenueSeats = async (authFetch, venueId) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/seats`);
  return handleResponse(response);
};

/**
 * Save all seats for a venue (replace existing)
 */
export const saveVenueSeats = async (authFetch, venueId, seats) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/seats`, {
    method: 'PUT',
    body: JSON.stringify({ seats }),
  });
  return handleResponse(response);
};

/**
 * Add seats to venue
 */
export const addSeats = async (authFetch, venueId, seats) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/seats`, {
    method: 'POST',
    body: JSON.stringify({ seats }),
  });
  return handleResponse(response);
};

/**
 * Delete specific seats
 */
export const deleteSeats = async (authFetch, venueId, seatIds) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/seats`, {
    method: 'DELETE',
    body: JSON.stringify({ seatIds }),
  });
  return handleResponse(response);
};

/**
 * Update single seat
 */
export const updateSeat = async (authFetch, venueId, seatId, data) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/seats/${seatId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

/**
 * Generate seats in a grid pattern
 */
export const generateSeats = async (authFetch, venueId, config) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/generate-seats`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
  return handleResponse(response);
};

// ========================
// Zone Management
// ========================

/**
 * Get all zones for a venue
 */
export const getVenueZones = async (authFetch, venueId) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/zones`);
  return handleResponse(response);
};

/**
 * Get complete venue layout (zones and seats)
 */
export const getVenueLayout = async (authFetch, venueId) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/layout`);
  return handleResponse(response);
};

/**
 * Create a new zone
 */
export const createZone = async (authFetch, venueId, zoneData) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/zones`, {
    method: 'POST',
    body: JSON.stringify(zoneData),
  });
  return handleResponse(response);
};

/**
 * Update a zone
 */
export const updateZone = async (authFetch, venueId, zoneId, zoneData) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/zones/${zoneId}`, {
    method: 'PUT',
    body: JSON.stringify(zoneData),
  });
  return handleResponse(response);
};

/**
 * Delete a zone
 */
export const deleteZone = async (authFetch, venueId, zoneId) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/zones/${zoneId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

/**
 * Get zone with seats
 */
export const getZoneWithSeats = async (authFetch, venueId, zoneId) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/zones/${zoneId}`);
  return handleResponse(response);
};

/**
 * Generate seats for a zone
 */
export const generateZoneSeats = async (authFetch, venueId, zoneId, options = {}) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/zones/${zoneId}/generate-seats`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
  return handleResponse(response);
};

/**
 * Save venue layout (canvas, stage, floors, zones)
 */
export const saveVenueLayout = async (authFetch, venueId, layoutData) => {
  const response = await authFetch(`${API_URL}/venues/${venueId}/layout`, {
    method: 'PUT',
    body: JSON.stringify(layoutData),
  });
  return handleResponse(response);
};

// ========================
// Defaults & Constants
// ========================

/**
 * Default venue form
 */
export const DEFAULT_VENUE_FORM = {
  name: '',
  address: '',
  city: '',
  total_capacity: 0,
  google_maps_url: '',
};

/**
 * Seat types (physical seat types, not pricing)
 */
export const SEAT_TYPES = [
  { value: 'NORMAL', label: 'Normal', color: '#3B82F6' },
  { value: 'WHEELCHAIR', label: 'Wheelchair', color: '#22C55E' },
  { value: 'RESTRICTED', label: 'Restricted View', color: '#6B7280' },
];

/**
 * Color presets for ticket classes (used in event setup)
 */
export const TICKET_CLASS_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Gold', value: '#D4AF37' },
  { name: 'Slate', value: '#64748B' },
];
