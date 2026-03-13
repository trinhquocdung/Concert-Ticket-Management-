/**
 * Base API Service
 * Centralized API configuration and helper functions
 */

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Build query string from params object
 */
export const buildQueryString = (params) => {
  const filtered = Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined);
  return new URLSearchParams(filtered).toString();
};

/**
 * Handle API response
 */
export const handleResponse = async (response) => {
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
};

/**
 * Format date for display
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format date and time for display
 */
export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format currency
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};
