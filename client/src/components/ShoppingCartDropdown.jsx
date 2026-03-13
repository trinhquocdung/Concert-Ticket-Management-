import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

const ShoppingCartDropdown = ({ onClose }) => {
  const { cartItems, removeFromCart, removeSeat, getCartTotals, timeRemaining, formatTimeRemaining, clearCart } = useCart();
  const navigate = useNavigate();

  const totals = getCartTotals();

  const handleContinue = () => {
    // Store last event id for redirect on expiry (use first cart item)
    try { if (cartItems && cartItems.length > 0) sessionStorage.setItem('fill_last_event', cartItems[0].eventId); } catch (e) {}
    // Navigate to fillinfo (FillInfo will read global cart if needed)
    navigate('/fillinfo', { state: { cartItems } });
    if (onClose) onClose();
  };

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="w-80 bg-[#171717] border border-white/10 rounded-md shadow-lg p-3 text-sm text-gray-200">
        <div className="text-center py-6 text-gray-400">Cart is empty</div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-[#171717] border border-white/10 rounded-md shadow-lg p-3 text-sm text-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Cart</div>
        <div className="text-xs text-gray-400">{timeRemaining > 0 ? `Reserved: ${formatTimeRemaining()}` : 'No reservation'}</div>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
        {cartItems.map((item) => (
          <div key={item.id} className="border-b border-white/5 pb-2">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">{item.eventTitle}</div>
                <div className="text-xs text-gray-400">{item.ticketClassName} · {item.quantity} tickets</div>
              </div>
              <div className="text-sm font-semibold">{(item.price * item.quantity).toLocaleString()} VND</div>
            </div>

            <div className="mt-2 text-xs">
              {item.seats && item.seats.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="truncate">Row {s.row} - {s.number}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-gray-300">{(s.price || item.price || 0).toLocaleString()} VND</div>
                    <button onClick={() => removeSeat(item.id, s.id)} className="text-red-400 text-xs">x</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/5 pt-3">
        <div className="flex justify-between text-sm text-gray-300 mb-3">
          <div>Subtotal</div>
          <div className="font-semibold">{totals.total.toLocaleString()} VND</div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleContinue} className="flex-1 bg-indigo-600 text-white py-2 rounded">Continue</button>
          <button onClick={clearCart} className="px-3 py-2 border border-white/10 rounded text-sm">Clear</button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCartDropdown;
