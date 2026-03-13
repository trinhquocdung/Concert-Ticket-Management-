import React, { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, Download, Home, Ticket } from 'lucide-react'
import OrderTicketCard from '../components/OrderTicketCard.jsx'
import api from '../services/api'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx';

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const stateLocalOrderId = location.state?.localOrderId || null;
  const stateMomoOrderId = location.state?.momoOrderId || null;
  // Support query param 'localOrderId' (we set this as redirect query), or fallback to common MoMo params
  const localOrderId = stateLocalOrderId || params.get('localOrderId') || params.get('orderId') || params.get('session_id') || null;
  // momoOrderId may be returned as 'orderId' by MoMo; prefer explicit state value first
  const momoOrderId = stateMomoOrderId || params.get('momoOrderId') || params.get('orderId') || null;

  const pollRef = useRef(null);
  const messageHandlerRef = useRef(null);
  const { authFetch } = useAuth();
  const { clearCart } = useCart();

  const [orderData, setOrderData] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchOrder = async () => {
      try {
        if (!localOrderId) return null;
        const res = await api.order.getById(localOrderId);
        if (!cancelled && res && res.success) {
          setOrderData(res.data.order);
          const details = res.data.orderDetails || [];
          setOrderDetails(details);
          const isWaiting = res.data.order?.status !== 'PAID';
          setWaiting(isWaiting);

          // If payment already confirmed but order has no details, try to attach locked seats (best-effort)
          if (!isWaiting && details.length === 0) {
            try {
              const attachResp = await authFetch(`/api/orders/${localOrderId}/attach-locked-seats`, { method: 'POST' });
              const attachPayload = await attachResp.json().catch(() => null);
              if (attachPayload && attachPayload.success && attachPayload.data && attachPayload.data.orderDetails) {
                setOrderDetails(attachPayload.data.orderDetails);
              }
            } catch (e) {
              // ignore attach errors
            }
          }

          // Payment finalised (either paid or failed) -> clear client-side cart snapshot
          try {
            // remove any temporary snapshot used during redirect-to-gateway
            sessionStorage.removeItem('quickshow_cart_snapshot');
            // Also remove persistent cart if any (safety)
            localStorage.removeItem('quickshow_cart');
            // Clear in-memory cart context
            if (typeof clearCart === 'function') clearCart();
          } catch (e) {
            // ignore storage errors
          }
        }
        return res && res.success ? res.data.order : null;
      } catch (e) {
        console.error('Failed to load order', e);
        return null;
      }
    };

    if (!localOrderId && !momoOrderId) {
      setLoading(false);
      return;
    }

    // initial fetch
    fetchOrder();

    // fast-path: listen for postMessage from popup
    const onMessage = async (ev) => {
      if (!ev.data) return;
      try {
        const { type, orderId: msgOrderId, status } = ev.data;
        if (type === 'MOMO_PAYMENT' && msgOrderId === momoOrderId) {
          if (status === 'PAID' || status === 'COMPLETED') {
            if (pollRef.current) clearInterval(pollRef.current);
            window.removeEventListener('message', messageHandlerRef.current);
            await fetchOrder();
          }
        }
      } catch (e) { /* ignore */ }
    };

    messageHandlerRef.current = onMessage;
    window.addEventListener('message', onMessage);

    // immediate one-time check and fallback polling: call momo check-status endpoint
    const checkOnce = async () => {
      try {
        const resp = await authFetch('/payment/momo/check-status', {
          method: 'POST',
          body: JSON.stringify({ orderId: momoOrderId || localOrderId })
        });
        const payload = await resp.json().catch(() => null);
        setPaymentData(payload?.data || null);
        const paid = payload?.success || (payload?.resultCode === 0);
        if (paid) {
          await fetchOrder();
          setLoading(false);
          return true;
        }
      } catch (e) {
        // ignore
      }
      return false;
    };

    const startPolling = () => {
      const start = Date.now();
      const maxMs = 2 * 60 * 1000; // 2 minutes
      pollRef.current = setInterval(async () => {
        try {
          const resp = await authFetch('/payment/momo/check-status', {
            method: 'POST',
            body: JSON.stringify({ orderId: momoOrderId || localOrderId })
          });
          const payload = await resp.json().catch(() => null);
          setPaymentData(payload?.data || null);
          const resultCode = payload?.resultCode ?? payload?.data?.resultCode ?? (payload?.success ? 0 : 1);
          if (resultCode === 0) {
            clearInterval(pollRef.current);
            window.removeEventListener('message', messageHandlerRef.current);
            await fetchOrder();
            return;
          }
        } catch (err) {
          // ignore transient errors
        }
        if (Date.now() - start > maxMs) {
          if (pollRef.current) clearInterval(pollRef.current);
          window.removeEventListener('message', messageHandlerRef.current);
        }
      }, 3000);
    };

    // Do an immediate check; if not paid, start polling
    (async () => {
      const ok = await checkOnce();
      if (!ok) startPolling();
    })();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      try { window.removeEventListener('message', messageHandlerRef.current); } catch (e) {}
    };
  }, [localOrderId, momoOrderId, authFetch]);

  const handleDownload = async () => {
    const idToDownload = localOrderId || momoOrderId;
    if (!idToDownload) return;
    try {
      setDownloading(true);
      const blob = await api.order.downloadTicket(idToDownload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${orderData?.code || 'tickets'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
      alert('Failed to download ticket. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-6 py-12">
      <div className="max-w-6xl w-full flex flex-col md:flex-row gap-8 items-stretch">
        {/* Left - stylized success area or waiting */}
        <div className="flex-1 bg-black rounded-xl p-10 flex flex-col items-start justify-center gap-6 min-h-[60vh]">
          {waiting || loading ? (
            <>
              <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <svg className="w-12 h-12 text-yellow-400 animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h1 className="text-2xl font-bold">Waiting for payment confirmation</h1>
              <p className="text-gray-400">We've opened the payment gateway. This page will update when payment is confirmed.</p>
              <div className="mt-4 w-full bg-[rgba(255,255,255,0.03)] p-4 rounded-lg text-sm text-gray-300">Order: <span className="font-semibold">{orderData?.code || localOrderId || momoOrderId || '—'}</span></div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => navigate('/')} className="px-4 py-3 bg-transparent border border-gray-700 rounded-lg text-gray-300">Close</button>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-green-600/10 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
              <h1 className="text-3xl font-bold">Payment successful!</h1>
              <p className="text-gray-400">The order confirmation has been sent to your email.</p>

              <div className="mt-4 w-full bg-[rgba(255,255,255,0.03)] p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5 text-gray-300" />
                  <div>
                    <p className="text-sm text-gray-400">Order</p>
                    <p className="font-semibold">{orderData?.code || localOrderId || momoOrderId || '—'}</p>
                  </div>
                </div>
              </div>

              {paymentData && (
                <div className="mt-4 w-full bg-[rgba(255,255,255,0.02)] p-3 rounded-lg text-sm text-gray-300">
                  <div className="flex justify-between">
                    <div>Payment status</div>
                    <div className="font-medium text-white">{paymentData.payment?.status || (paymentData.payment && paymentData.payment.status) || (paymentData?.momo?.transStatus) || (paymentData?.momo?.resultCode === 0 ? 'PAID' : 'PENDING')}</div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">MoMo trans: {(paymentData.payment && paymentData.payment.trans_id) || (paymentData.momo && (paymentData.momo.orderId || paymentData.momo.transId)) || momoOrderId}</div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => navigate('/')} className="px-4 py-3 bg-transparent border border-gray-700 rounded-lg text-gray-300 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Return to Homepage
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right - order summary and ticket list */}
        <div className="flex-1 bg-[rgb(255,255,255,0.04)] rounded-xl p-6 min-h-[60vh] flex flex-col">
          {loading ? (
            <div className="py-12 text-center">Loading order...</div>
          ) : !orderData ? (
            <div className="py-12 text-center">Order not found.</div>
          ) : waiting ? (
            <div className="py-12 text-center">Waiting for payment confirmation...</div>
          ) : (
            <div>
              <OrderTicketCard order={orderData} orderDetails={orderDetails} onDownload={handleDownload} />
              <div className="mt-4">
                <button onClick={handleDownload} disabled={!(localOrderId || momoOrderId) || downloading} className="px-4 py-2 bg-green-600 rounded-lg text-black font-semibold">Download Ticket</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccess;
