/**
 * Artist Service - API functions for artist management
 */

import { API_URL, buildQueryString, handleResponse } from './api';

/**
 * Get artists list
 */
export const getArtists = async (authFetch, { page = 1, limit = 10, search }) => {
  const query = buildQueryString({ page, limit, search });
  const response = await authFetch(`${API_URL}/artists?${query}`);
  return handleResponse(response);
};

/**
 * Get artist by ID
 */
export const getArtistById = async (authFetch, artistId) => {
  const response = await authFetch(`${API_URL}/artists/${artistId}`);
  return handleResponse(response);
};

/**
 * Create artist
 */
export const createArtist = async (authFetch, artistData) => {
  const response = await authFetch(`${API_URL}/artists`, {
    method: 'POST',
    body: JSON.stringify(artistData),
  });
  return handleResponse(response);
};

/**
 * Update artist
 */
export const updateArtist = async (authFetch, artistId, artistData) => {
  const response = await authFetch(`${API_URL}/artists/${artistId}`, {
    method: 'PUT',
    body: JSON.stringify(artistData),
  });
  return handleResponse(response);
};

/**
 * Delete artist
 */
export const deleteArtist = async (authFetch, artistId) => {
  const response = await authFetch(`${API_URL}/artists/${artistId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

/**
 * Default artist form - simplified
 */
export const DEFAULT_ARTIST_FORM = {
  name: '',
  bio: ''
};

/**
 * Get artist initials for avatar placeholder
 */
export const getArtistInitials = (artist) => {
  if (!artist?.name) return '?';
  return artist.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};
