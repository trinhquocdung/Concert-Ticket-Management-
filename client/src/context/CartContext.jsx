import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'quickshow_cart';
const CART_SNAPSHOT_KEY = 'quickshow_cart_snapshot';
const CART_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Cart Context Provider
 * Manages shopping cart state with automatic expiry
 */
export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [expiryTime, setExpiryTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const { items, expiry } = JSON.parse(savedCart);
        if (expiry && Date.now() < expiry) {
          setCartItems(items);
          setExpiryTime(expiry);
        } else {
          // Cart expired, clear it
          localStorage.removeItem(CART_STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    }
    else {
      // If no persistent cart, check for a temporary snapshot (session storage)
      try {
        const snap = sessionStorage.getItem(CART_SNAPSHOT_KEY);
        if (snap) {
          const { items, expiry } = JSON.parse(snap);
          if (expiry && Date.now() < expiry && items && items.length > 0) {
            // Restore snapshot when user navigates back
            setCartItems(items);
            setExpiryTime(expiry);
            // remove snapshot after restoring
            sessionStorage.removeItem(CART_SNAPSHOT_KEY);
          } else {
            sessionStorage.removeItem(CART_SNAPSHOT_KEY);
          }
        }
      } catch (e) {
        sessionStorage.removeItem(CART_SNAPSHOT_KEY);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cartItems.length > 0 && expiryTime) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
        items: cartItems,
        expiry: expiryTime,
      }));
    } else if (cartItems.length === 0) {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [cartItems, expiryTime]);

  // Countdown timer
  useEffect(() => {
    if (!expiryTime) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, expiryTime - Date.now());
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Cart expired
        clearCart();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  /**
   * Add item to cart
   */
  const addToCart = useCallback((item) => {
    setCartItems((prev) => {
      // Check if same event + ticket class + performance already exists
      const existingIndex = prev.findIndex(
        (i) => i.eventId === item.eventId && i.ticketClassId === item.ticketClassId && (String(i.performanceId || '') === String(item.performanceId || ''))
      );

      if (existingIndex >= 0) {
        // Update existing item
        const updated = [...prev];
        if (item.seats) {
          // Merge seats and deduplicate by seat id
          const existingSeats = updated[existingIndex].seats || [];
          const merged = [...existingSeats, ...item.seats];
          const map = {};
          merged.forEach((s) => {
            if (!s || !s.id) return;
            map[String(s.id)] = s;
          });
          const uniqueSeats = Object.values(map);
          updated[existingIndex].seats = uniqueSeats;
          updated[existingIndex].quantity = uniqueSeats.length;
        } else {
          // Increase quantity
          updated[existingIndex].quantity += item.quantity || 1;
        }
        return updated;
      }

      // Add new item
      return [...prev, {
        id: `${item.eventId}-${item.ticketClassId}-${item.performanceId || 'nop'}-${Date.now()}`,
        eventId: item.eventId,
        eventTitle: item.eventTitle,
        eventThumbnail: item.eventThumbnail,
        eventDate: item.eventDate,
        eventVenue: item.eventVenue,
        ticketClassId: item.ticketClassId,
        ticketClassName: item.ticketClassName,
        performanceId: item.performanceId || null,
        price: item.price,
        quantity: (item.seats && item.seats.length) ? item.seats.length : (item.quantity || 1),
        seats: item.seats || [],
        addedAt: Date.now(),
      }];
    });

    // Set/refresh expiry time
    setExpiryTime(Date.now() + CART_EXPIRY_TIME);
  }, []);

  /**
   * Remove item from cart
   */
  const removeFromCart = useCallback((itemId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  /**
   * Update item quantity
   */
  const updateQuantity = useCallback((itemId, quantity) => {
    if (quantity < 1) {
      removeFromCart(itemId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  /**
   * Remove specific seat from cart item
   */
  const removeSeat = useCallback((itemId, seatId) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newSeats = item.seats.filter((s) => s.id !== seatId);
        if (newSeats.length === 0) {
          return null; // Will be filtered out
        }
        return { ...item, seats: newSeats, quantity: newSeats.length };
      }).filter(Boolean)
    );
  }, []);

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(() => {
    setCartItems([]);
    setExpiryTime(null);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  /**
   * Snapshot the current cart to sessionStorage before redirecting to payment.
   * Allows restoring the cart if the user navigates back from the gateway.
   */
  const snapshotCartForPayment = useCallback(() => {
    try {
      if (!cartItems || cartItems.length === 0) return;
      const expiry = expiryTime || (Date.now() + CART_EXPIRY_TIME);
      sessionStorage.setItem(CART_SNAPSHOT_KEY, JSON.stringify({ items: cartItems, expiry }));
    } catch (e) {
      // ignore
    }
  }, [cartItems, expiryTime]);

  /**
   * Get cart totals
   */
  const getCartTotals = useCallback(() => {
    const subtotal = cartItems.reduce((sum, item) => {
      if (item.seats && item.seats.length > 0) {
        return sum + item.seats.reduce((ss, s) => ss + (s.price || item.price || 0), 0);
      }
      return sum + ((item.price || 0) * (item.quantity || 0));
    }, 0);
    const total = subtotal;
    const itemCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return { subtotal, total, itemCount };
  }, [cartItems]);

  /**
   * Format remaining time as MM:SS
   */
  const formatTimeRemaining = useCallback(() => {
    const seconds = Math.floor(timeRemaining / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  /**
   * Check if cart is expiring soon (< 2 minutes)
   */
  const isExpiringSoon = useCallback(() => {
    return timeRemaining > 0 && timeRemaining < 2 * 60 * 1000;
  }, [timeRemaining]);

  const value = {
    // State
    cartItems,
    timeRemaining,
    
    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    removeSeat,
    clearCart,
    snapshotCartForPayment,
    
    // Computed
    getCartTotals,
    formatTimeRemaining,
    isExpiringSoon,
    hasItems: cartItems.length > 0,
    itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

/**
 * Hook to use cart context
 */
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
