/**
 * Voucher Service - API functions for voucher management
 */

import { API_URL, buildQueryString, handleResponse } from './api';

/**
 * Get vouchers list
 */
export const getVouchers = async (authFetch, { page = 1, limit = 10, active }) => {
  const query = buildQueryString({ page, limit, active });
  const response = await authFetch(`${API_URL}/vouchers?${query}`);
  return handleResponse(response);
};

/**
 * Get voucher by ID
 */
export const getVoucherById = async (authFetch, voucherId) => {
  const response = await authFetch(`${API_URL}/vouchers/${voucherId}`);
  return handleResponse(response);
};

/**
 * Create voucher
 */
export const createVoucher = async (authFetch, voucherData) => {
  const response = await authFetch(`${API_URL}/vouchers`, {
    method: 'POST',
    body: JSON.stringify(voucherData),
  });
  return handleResponse(response);
};

/**
 * Update voucher
 */
export const updateVoucher = async (authFetch, voucherId, voucherData) => {
  const response = await authFetch(`${API_URL}/vouchers/${voucherId}`, {
    method: 'PUT',
    body: JSON.stringify(voucherData),
  });
  return handleResponse(response);
};

/**
 * Delete voucher
 */
export const deleteVoucher = async (authFetch, voucherId) => {
  const response = await authFetch(`${API_URL}/vouchers/${voucherId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

/**
 * Toggle voucher status
 */
export const toggleVoucher = async (authFetch, voucherId) => {
  const response = await authFetch(`${API_URL}/vouchers/${voucherId}/toggle`, {
    method: 'PATCH',
  });
  return handleResponse(response);
};

/**
 * Validate voucher code
 */
export const validateVoucher = async (authFetch, code, orderAmount) => {
  const response = await authFetch(`${API_URL}/vouchers/validate`, {
    method: 'POST',
    body: JSON.stringify({ code, orderAmount }),
  });
  return handleResponse(response);
};

/**
 * Default voucher form
 */
export const DEFAULT_VOUCHER_FORM = {
  code: '',
  discount_percent: 10,
  max_uses: 100,
  min_order_amount: 0,
  max_discount_amount: 0,
  valid_from: '',
  valid_to: '',
  description: '',
  active: true,
};

/**
 * Generate random voucher code
 */
export const generateVoucherCode = (prefix = 'QS') => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
