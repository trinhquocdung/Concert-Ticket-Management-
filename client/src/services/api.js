/**
 * API Service Layer
 * Centralized API calls for the client application
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Helper function for API calls
const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  // Add auth token if available (support backend_token from AuthContext and legacy 'token')
  const token = localStorage.getItem("backend_token") || localStorage.getItem("token");
  if (token) {
    defaultOptions.headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Something went wrong" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// ==================== CATEGORIES ====================
export const categoryAPI = {
  // Get all active categories
  getAll: () => fetchAPI("/categories"),

  // Get category by ID or slug
  getByIdOrSlug: (idOrSlug) => fetchAPI(`/categories/${idOrSlug}`),
};

// ==================== EVENTS / CONCERTS ====================
export const eventAPI = {
  // Get all events (concerts)
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchAPI(`/concerts${queryString ? `?${queryString}` : ""}`);
  },

  // Get single event by ID
  getById: (id) => fetchAPI(`/concerts/${id}`),

  // Get events by category
  getByCategory: (category) => fetchAPI(`/concerts?category=${category}`),

  // Search events
  search: (query) => fetchAPI(`/concerts/search?q=${encodeURIComponent(query)}`),

  // Get featured events
  getFeatured: () => fetchAPI(`/concerts/featured`),

  // Get upcoming events
  getUpcoming: (limit = 10) => fetchAPI(`/concerts?limit=${limit}`),
};

// ==================== TICKETS ====================
export const ticketAPI = {
  // Get ticket classes for an event
  getByEvent: (eventId) => fetchAPI(`/concerts/${eventId}/tickets`),

  // Get available seats for an event. Optionally pass `performanceId` to retrieve per-performance seats.
  getSeats: (eventId, performanceId = null) => {
    const qs = performanceId ? `?performanceId=${encodeURIComponent(performanceId)}` : '';
    return fetchAPI(`/concerts/${eventId}/seats${qs}`);
  },

  // Lock seats (temporary reservation)
  // `performanceId` is required by backend for events with multiple performances.
  // If not passed, we try to read `selectedPerformanceId` from sessionStorage as a fallback.
  lockSeats: (concertId, seatIds, performanceId) => {
    const perf = performanceId || sessionStorage.getItem('selectedPerformanceId') || null;
    return fetchAPI(`/orders/lock-seats`, {
      method: "POST",
      body: JSON.stringify({ concertId, seatIds, performanceId: perf }),
    });
  },

  // Release locked seats
  releaseSeats: (concertId, seatIds) =>
    fetchAPI(`/orders/release-seats`, {
      method: "POST",
      body: JSON.stringify({ concertId, seatIds }),
    }),
};

// ==================== ORDERS ====================
export const orderAPI = {
  // Create new order
  create: (orderData) =>
    fetchAPI("/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    }),

  // Get user's orders
  getMyOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/orders${query ? `?${query}` : ''}`);
  },

  // Get single order by ID
  getById: (orderId) => fetchAPI(`/orders/${orderId}`),

  // Download ticket PDF (returns blob when used directly)
  downloadTicket: async (orderId) => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const token = localStorage.getItem("backend_token") || localStorage.getItem("token");
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/orders/${orderId}/ticket`, {
      method: 'GET',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(err.message || 'Failed to download ticket');
    }

    const blob = await res.blob();
    return blob;
  },

  // Cancel order
  cancel: (orderId, reason) =>
    fetchAPI(`/orders/${orderId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

// ==================== PAYMENTS ====================
export const paymentAPI = {
  // Initialize payment
  initiate: (orderId, method) =>
    fetchAPI("/payments/create", {
      method: "POST",
      body: JSON.stringify({ orderId, paymentMethod: method }),
    }),

  // Create MoMo payment (legacy endpoint in backend expects POST /api/payment)
  createMoMo: (orderId) =>
    fetchAPI("/payment", {
      method: "POST",
      body: JSON.stringify({ orderId }),
    }),

  // Verify payment (callback from gateway)
  verify: (transactionData) =>
    fetchAPI("/payments/verify", {
      method: "POST",
      body: JSON.stringify(transactionData),
    }),

  // Get payment status
  getStatus: (transactionId) => fetchAPI(`/payments/${transactionId}/status`),
};

// ==================== USER ====================
export const userAPI = {
  // Get current user profile
  getProfile: () => fetchAPI("/users/me"),

  // Update profile
  updateProfile: (data) =>
    fetchAPI("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Get user's tickets
  getMyTickets: () => fetchAPI("/users/me/tickets"),

  // Get user's wishlist
  getWishlist: () => fetchAPI("/users/me/wishlist"),

  // Add to wishlist
  addToWishlist: (eventId) =>
    fetchAPI("/users/me/wishlist", {
      method: "POST",
      body: JSON.stringify({ eventId }),
    }),

  // Remove from wishlist
  removeFromWishlist: (eventId) =>
    fetchAPI(`/users/me/wishlist/${eventId}`, {
      method: "DELETE",
    }),
};

// ==================== VOUCHERS ====================
export const voucherAPI = {
  // Validate voucher code
  validate: (code, eventId) =>
    fetchAPI("/vouchers/validate", {
      method: "POST",
      body: JSON.stringify({ code, eventId }),
    }),

  // Apply voucher to order
  apply: (code, orderId) =>
    fetchAPI("/vouchers/apply", {
      method: "POST",
      body: JSON.stringify({ code, orderId }),
    }),
};

// ==================== AUTH (if not using Clerk) ====================
export const authAPI = {
  // Login
  login: (email, password) =>
    fetchAPI("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Register
  register: (userData) =>
    fetchAPI("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  // Logout
  logout: () =>
    fetchAPI("/auth/logout", {
      method: "POST",
    }),

  // Refresh token
  refresh: () =>
    fetchAPI("/auth/refresh", {
      method: "POST",
    }),
};

export default {
  category: categoryAPI,
  event: eventAPI,
  ticket: ticketAPI,
  order: orderAPI,
  payment: paymentAPI,
  user: userAPI,
  voucher: voucherAPI,
  auth: authAPI,
};
