import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const PaymentFailed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const localOrderId = params.get('localOrderId') || params.get('orderId') || null;
  const momoOrderId = params.get('momoOrderId') || params.get('orderId') || null;
  const { authFetch } = useAuth();
  const { clearCart } = useCart();

  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState(params.get('message') || 'Payment was not completed');

  useEffect(() => {
    const cleanupClientCart = () => {
      try {
        sessionStorage.removeItem('quickshow_cart_snapshot');
        localStorage.removeItem('quickshow_cart');
        if (typeof clearCart === 'function') clearCart();
      } catch (e) { /* ignore */ }
    };

    const checkAndCleanup = async () => {
      // Always clear client-side snapshot when payment flow ended here
      cleanupClientCart();

      // Ask backend for canonical payment status
      try {
        if (!localOrderId && !momoOrderId) {
          setStatus('failed');
          return;
        }

        const body = JSON.stringify({ orderId: momoOrderId, localOrderId });
        const resp = await authFetch('/payment/momo/check-status', {
          method: 'POST',
          body
        });
        const payload = await resp.json().catch(() => null);
        const paid = payload?.success || (payload?.data && (payload.data.payment || payload.data.order) && (payload.data.payment?.status === 'SUCCESS' || payload.data.order?.status === 'PAID')) || false;

        if (paid) {
          // Payment actually succeeded (race) — navigate to success which will attach details
          navigate(`/payment/success?localOrderId=${localOrderId}`);
          return;
        }

        // If backend says pending, keep pending; if backend reports not found or failed, try cancel order to release seats
        const isPending = payload && payload.message && String(payload.message).toLowerCase().includes('pending');
        if (!isPending) {
          // Cancel order to free seats (best-effort)
          if (localOrderId) {
            try {
              await authFetch(`/api/orders/${localOrderId}/cancel`, { method: 'POST' });
            } catch (e) {
              // ignore cancel errors
            }
          }
          setStatus('failed');
        } else {
          setStatus('pending');
        }
      } catch (err) {
        console.error('PaymentFailed check error', err);
        setStatus('failed');
      }
    };

    checkAndCleanup();
  }, [localOrderId, momoOrderId, authFetch, clearCart, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-6 py-12">
      <div className="max-w-3xl w-full bg-[rgba(255,255,255,0.03)] p-8 rounded-xl">
        <h1 className="text-2xl font-bold mb-4">Payment not completed</h1>
        <p className="text-gray-300 mb-4">{message}</p>

        {status === 'checking' && <div className="text-gray-400">Checking payment status...</div>}
        {status === 'pending' && (
          <div className="text-gray-300">
            The payment is still pending. If you have completed payment, please wait a moment and refresh this page. You can also check your order in <a onClick={() => navigate('/orders')} className="text-primary cursor-pointer">Order History</a>.
          </div>
        )}
        {status === 'failed' && (
          <div className="text-gray-300">
            Your payment was not completed and we've released the reserved seats. You can try again from the <a onClick={() => navigate('/orders')} className="text-primary cursor-pointer">Order History</a> or reselect seats on the event page.
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-transparent border border-gray-700 rounded-lg text-gray-300">Return Home</button>
          <button onClick={() => navigate('/orders')} className="px-4 py-2 bg-primary text-black rounded-lg font-semibold">Order History</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
