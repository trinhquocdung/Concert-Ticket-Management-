/**
 * Order Service - API functions for order management
 */

import { API_URL, buildQueryString, handleResponse } from './api';

/**
 * Get all orders with filters
 */
export const getOrders = async (authFetch, { page = 1, limit = 10, status, concert, customer, startDate, endDate }) => {
  const query = buildQueryString({ page, limit, status, concert, customer, startDate, endDate });
  const response = await authFetch(`${API_URL}/orders/admin/all?${query}`);
  return handleResponse(response);
};

/**
 * Get order by ID
 */
export const getOrderById = async (authFetch, orderId) => {
  const response = await authFetch(`${API_URL}/orders/${orderId}`);
  return handleResponse(response);
};

/**
 * Get order statistics
 */
export const getOrderStats = async (authFetch, { startDate, endDate } = {}) => {
  const query = buildQueryString({ startDate, endDate });
  const response = await authFetch(`${API_URL}/orders/admin/stats?${query}`);
  return handleResponse(response);
};

/**
 * Get cancellation requests
 */
export const getCancellationRequests = async (authFetch, { page = 1, limit = 10, cancellationStatus = 'PENDING' }) => {
  const query = buildQueryString({ page, limit, cancellationStatus });
  const response = await authFetch(`${API_URL}/orders/admin/cancellations?${query}`);
  return handleResponse(response);
};

/**
 * Process refund
 */
export const processRefund = async (authFetch, orderId, { approve, refundAmount, adminNote }) => {
  const response = await authFetch(`${API_URL}/orders/${orderId}/refund`, {
    method: 'PUT',
    body: JSON.stringify({ approve, refundAmount, adminNote }),
  });
  return handleResponse(response);
};

/**
 * Status configuration
 */
export const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'yellow' },
  PAID: { label: 'Paid', color: 'emerald' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
  REFUNDED: { label: 'Refunded', color: 'blue' },
  EXPIRED: { label: 'Expired', color: 'red' },
};

/**
 * Cancellation status config
 */
export const CANCELLATION_STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'yellow' },
  APPROVED: { label: 'Approved', color: 'emerald' },
  REJECTED: { label: 'Rejected', color: 'red' },
};

/**
 * Calculate refund amount based on policy
 * 100% if > 7 days before event
 * 50% if 3-7 days before event
 * 0% if < 3 days before event
 */
export const calculateRefund = (orderTotal, eventDate) => {
  const now = new Date();
  const event = new Date(eventDate);
  const hoursUntilEvent = Math.floor((event - now) / (1000 * 60 * 60));

  // Policy: >=168h (7d) => 100%, >=72h (3d) => 50%, <48h => 0%
  if (hoursUntilEvent >= 168) {
    return { percent: 100, amount: orderTotal };
  } else if (hoursUntilEvent >= 72) {
    return { percent: 50, amount: Math.round(orderTotal * 0.5) };
  } else if (hoursUntilEvent < 48) {
    return { percent: 0, amount: 0 };
  } else {
    // 48-72h window: conservative default to no refund
    return { percent: 0, amount: 0 };
  }
};
