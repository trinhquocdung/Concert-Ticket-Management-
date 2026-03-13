/**
 * Category Service - API functions for category management
 */

import { API_URL, buildQueryString, handleResponse } from './api';

/**
 * Get all categories
 */
export const getCategories = async (authFetch, { page = 1, limit = 50, active } = {}) => {
  const query = buildQueryString({ page, limit, active });
  const response = await authFetch(`${API_URL}/categories?${query}`);
  return handleResponse(response);
};

/**
 * Get active categories (for dropdowns)
 */
export const getActiveCategories = async () => {
  const response = await fetch(`${API_URL}/categories?active=true`);
  return handleResponse(response);
};

/**
 * Get category by ID or slug
 */
export const getCategoryById = async (authFetch, idOrSlug) => {
  const response = await authFetch(`${API_URL}/categories/${idOrSlug}`);
  return handleResponse(response);
};

/**
 * Create category
 */
export const createCategory = async (authFetch, categoryData) => {
  const response = await authFetch(`${API_URL}/categories`, {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
  return handleResponse(response);
};

/**
 * Update category
 */
export const updateCategory = async (authFetch, categoryId, categoryData) => {
  const response = await authFetch(`${API_URL}/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(categoryData),
  });
  return handleResponse(response);
};

/**
 * Delete category
 */
export const deleteCategory = async (authFetch, categoryId) => {
  const response = await authFetch(`${API_URL}/categories/${categoryId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

/**
 * Reorder categories
 */
export const reorderCategories = async (authFetch, orders) => {
  const response = await authFetch(`${API_URL}/categories/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ orders }),
  });
  return handleResponse(response);
};

/**
 * Default category form
 */
export const DEFAULT_CATEGORY_FORM = {
  name: '',
  slug: '',
  isActive: true,
  order: 0
};
