import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import toast from 'react-hot-toast';
import { Tag, ArrowLeft } from 'lucide-react'; 
import MoMoCheckout from './MoMoCheckout.jsx';
import ProcessBar from '../components/ProcessBar';

const PaymentFlow = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const { clearCart, cartItems: cartCtxItems, getCartTotals, snapshotCartForPayment } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [showMoMoUI, setShowMoMoUI] = useState(false); 
  const popupRef = useRef(null);

  // Read data passed from previous page
  const cartItems = state?.cartItems || cartCtxItems || null;
  const orderId = state?.orderId || null; // assume order id may be provided here
  const customer = state?.customer || {};

  const [voucherCode, setVoucherCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);

  // Calculate subtotal
  const subtotal = useMemo(() => {
    if (!cartItems) return 0;
    return cartItems.reduce((total, it) => {
      const price = (it.seats?.reduce((s, x) => s + (x.price || 0), 0)) || (it.price * it.quantity);
      return total + price;
    }, 0);
  }, [cartItems]);
  const totals = getCartTotals ? getCartTotals() : { total: subtotal };
  const finalTotal = subtotal - discountAmount;

  // --- STEP 1: Show MoMo UI ---
  const handleNextStep = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowMoMoUI(true);
    }, 300);
  };

  // --- STEP 2: Call backend to create real MoMo payment ---
  const handleFinalMoMoPayment = async () => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const eventName = cartItems?.[0]?.eventTitle || "Event ticket";
    const ticketCount = cartItems?.reduce((total, it) => total + (it.seats?.length || it.quantity), 0) || 0;
    const customOrderInfo = `Ticket: ${eventName} (x${ticketCount})`;
    setLoading(true);
    const toastId = toast.loading('Connecting to MoMo...');

    // We will redirect the browser to the gateway (no popup)

    // Immediately navigate to waiting /payment/success page
    // We'll navigate to success page after we get MoMo orderId back

    // Quick health-check: ensure backend reachable before attempting payment
    try {
      const healthResp = await fetch(`${API_BASE}/health`, { method: 'GET' });
      if (!healthResp.ok) {
        toast.error('Server currently unavailable. Please try again later.');
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error('Health check failed', e);
      toast.error('Cannot reach server. Please check your connection or backend service.');
      setLoading(false);
      return;
    }

    try {
      // Create order + payment on server and get payUrl
      const payload = {
        concertId: cartItems?.[0]?.eventId,
        subtotal,
        service_fee: 0,
        discount_amount: discountAmount,
        total_amount: Math.round(finalTotal),
        customer: customer || null,
        customer_info: customer || {},
          orderInfo: customOrderInfo,
          // Include selected showSeat ids so backend can create tickets/orderDetails immediately
          seatIds: (cartItems || []).flatMap(it => (it.seats && Array.isArray(it.seats)) ? it.seats.map(s => s.id || s._id || s.showSeatId).filter(Boolean) : []),
          // Also include alternative key name recognized by backend
          showSeatIds: (cartItems || []).flatMap(it => (it.seats && Array.isArray(it.seats)) ? it.seats.map(s => s.id || s._id || s.showSeatId).filter(Boolean) : [])
      };
      // attach performanceId if present on cart items (all items should share same performance for a single order)
      payload.performanceId = cartItems?.[0]?.performanceId || sessionStorage.getItem('selectedPerformanceId') || null;

      const response = await authFetch('/payment', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!data || !data.success) {
        toast.error(data?.message || 'Payment initialization failed', { id: toastId });
        try { window.__momoPopup?.close(); } catch (e) {}
        setLoading(false);
        return;
      }

      const payUrl = data.data?.payUrl || data.data?.payurl || null;
      const momoOrderId = data.data?.momoOrderId || null;
      const localOrderId = data.data?.localOrderId || null;

      if (payUrl) {
        toast.success('Redirecting to payment gateway...', { id: toastId });
        // Snapshot current cart to sessionStorage so we can restore if user goes back
        try {
          snapshotCartForPayment();
        } catch (e) {
          console.warn('Failed to snapshot cart', e);
        }
        // Clear the visible cart immediately after starting payment flow
        try { clearCart(); } catch (e) {}
        // Directly navigate browser to payUrl. MoMo will redirect back to our success page with localOrderId.
        window.location.href = payUrl;
      } else {
        toast.error('No payment link received from server', { id: toastId });
        try { window.__momoPopup?.close(); } catch (e) {}
      }
    } catch (err) {
      console.error('Payment Error:', err);
      toast.error('Payment server connection error', { id: toastId });
      try { window.__momoPopup?.close(); } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  // Apply voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setIsValidating(true);
    try {
      const res = await authFetch('/vouchers/validate', {
        method: 'POST',
        body: JSON.stringify({ code: voucherCode, totalAmount: subtotal, concertId: cartItems?.[0]?.eventId }),
      });
      const data = await res.json();
      if (data.success && data.valid) {
        setDiscountAmount(data.data.calculated_discount);
        toast.success('Voucher applied successfully');
      } else {
        toast.error(data.message || 'Invalid voucher code');
      }
    } catch (err) {
      toast.error('Voucher error');
    } finally {
      setIsValidating(false);
    }
  };

  if (showMoMoUI) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-md">
          <button onClick={() => setShowMoMoUI(false)} className="mb-4 flex items-center gap-2 text-gray-400">
            <ArrowLeft size={18} /> Back
          </button>
          <MoMoCheckout 
            items={cartItems}
            subtotal={subtotal}
            discountAmount={discountAmount}
            finalTotal={finalTotal}
            voucherCode={voucherCode}
            onVoucherChange={setVoucherCode}
            onApplyVoucher={handleApplyVoucher}
            onConfirm={handleFinalMoMoPayment}
            loading={loading}
            isValidating={isValidating}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 pt-16">
      <div className="container mx-auto px-4 py-6">
        <ProcessBar current="payment" />

          <div className="mb-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-300 hover:text-white">← Back</button>
          <div className="text-sm text-gray-400">Step 3 / 3</div>
        </div>

        <div className="flex gap-6">
          {/* Left: reuse FillInfo summary (readonly) */}
          <div className="w-2/3">
            <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-4">
                <div className="mb-2 text-sm text-gray-300">Order Summary</div>
              <div className="mt-4 bg-gray-900 border border-gray-800 rounded p-3">
                <h3 className="font-medium mb-2">Ticket recipient information</h3>
                <div className="text-sm text-gray-300">Customer name: <strong className="text-gray-100">{customer.fullName || '—'}</strong></div>
                <div className="text-sm text-gray-300 mt-1">Email: <strong className="text-gray-100">{customer.email || '—'}</strong></div>
                <div className="text-sm text-gray-300 mt-1">Phone: <strong className="text-gray-100">{customer.phone || '—'}</strong></div>
                <div className="text-sm text-gray-300 mt-1">Delivery method: <strong className="text-gray-100">{customer.deliveryMethod === 'counter' ? 'Pickup at counter' : 'Email delivery'}</strong></div>
              </div>

              <div className="mt-4 bg-gray-900 border border-gray-800 rounded p-3">
                <h3 className="font-medium mb-2">Area & Seats</h3>
                {cartItems && cartItems.length > 0 ? (
                  cartItems.map((it) => (
                    <div key={it.id} className="py-2 border-b border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">{it.eventTitle} · {it.eventDate || ''} · {it.eventVenue || ''}</div>
                      <div className="flex justify-between text-sm mb-1">
                        <div>{it.ticketClassName} · {it.seats ? it.seats.length : it.quantity} tickets</div>
                        <div className="font-semibold">{((it.seats && it.seats.reduce((s, x) => s + (x.price || it.price || 0), 0)) || (it.price * (it.quantity || 0))).toLocaleString()} VND</div>
                      </div>
                      {it.seats && it.seats.map((s) => (
                        <div key={s.id} className="text-xs text-gray-400">Row {s.row} - {s.number} — {(s.price || it.price || 0).toLocaleString()} VND</div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400">No tickets in cart</div>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-gray-800 pt-3">
                  <div className="text-sm text-gray-300">Total</div>
                  <div className="text-lg font-semibold">{(totals.total || subtotal).toLocaleString()} VND</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: MoMo payment UI */}
          <div className="w-1/3">
            <div className="bg-transparent">
              <MoMoCheckout 
                items={cartItems}
                subtotal={subtotal}
                discountAmount={discountAmount}
                finalTotal={finalTotal}
                voucherCode={voucherCode}
                onVoucherChange={setVoucherCode}
                onApplyVoucher={handleApplyVoucher}
                onConfirm={handleFinalMoMoPayment}
                loading={loading}
                isValidating={isValidating}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
};

export default PaymentFlow;
