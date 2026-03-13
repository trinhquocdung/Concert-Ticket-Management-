import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Download, ArrowLeft } from 'lucide-react';
import OrderTicketCard from '../components/OrderTicketCard.jsx';
import api from '../services/api';
import toast from 'react-hot-toast';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.order.getById(id);
        if (mounted && res && res.success) {
          setOrder(res.data.order || res.data);
          setOrderDetails(res.data.orderDetails || res.data.orderDetails || []);
        }
      } catch (e) {
        console.error('Failed to load order', e);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  // Listen for socket event when admin processes cancellation for this order
  useEffect(() => {
    const handler = (e) => {
      const payload = e?.detail;
      if (!payload) return;
      if (payload.orderId && payload.orderId.toString() === id.toString()) {
        toast.success(payload.message || 'Cancellation processed');
        // refresh order
        (async () => {
          try {
            const r = await api.order.getById(id);
            if (r && r.success) setOrder(r.data.order || r.data);
          } catch (err) {
            console.error('Failed to refresh order after cancellation event', err);
          }
        })();
      }
    };

    window.addEventListener('order-cancellation-processed', handler);
    return () => window.removeEventListener('order-cancellation-processed', handler);
  }, [id]);

  const showPolicyAndConfirm = async () => {
    if (!order || !order.concert) {
      toast.error('Order data incomplete');
      return;
    }

    const concertDate = new Date(order.performance?.date || order.concert.start_time);
    const now = new Date();
    const hours = Math.floor((concertDate - now) / (1000*60*60));
    let policy = '';
    if (hours >= 168) policy = '100% refund (>=7 days before event)';
    else if (hours >= 72) policy = '50% refund (>=3 days before event)';
    else if (hours < 48) policy = 'No refund available (<48 hours before event)';
    else policy = 'No refund available (48-72 hours before event)';

    if (!window.confirm(`Refund policy: ${policy}\n\nDo you want to submit a cancellation request for this order?`)) return;

    try {
      setRequesting(true);
      const resp = await api.order.cancel(id, 'Customer requested cancellation via UI');
      if (!resp || !resp.success) {
        toast.error(resp?.message || 'Cancellation request failed');
      } else {
        toast.success(resp.message || 'Cancellation request submitted');
      }

      // refresh order from server to reflect pending/approved status
      const newRes = await api.order.getById(id);
      if (newRes && newRes.success) setOrder(newRes.data.order || newRes.data);
    } catch (e) {
      console.error('Cancellation failed', e);
      toast.error(e.message || 'Cancellation failed');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <div className="min-h-screen pt-32 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div></div>;

  if (!order) return <div className="min-h-screen pt-32 text-center">Order not found</div>;

  return (
    <div className="min-h-screen pt-28 pb-12 px-6 md:px-16 lg:px-24 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="px-2 py-1 bg-gray-800 rounded"><ArrowLeft /></button>
          <h1 className="text-2xl font-bold">Order {order.code}</h1>
        </div>

        <div className="bg-[rgb(37,36,36)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div className="font-semibold">{order.status}</div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-400">Total</p>
              <div className="text-primary font-bold text-lg">{(order.total_amount||0).toLocaleString('en-US')} VND</div>
            </div>
          </div>

          <OrderTicketCard order={order} orderDetails={orderDetails} onDownload={async()=>{ try { const blob = await api.order.downloadTicket(id); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${order.code}.pdf`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);} catch(e){console.error(e); toast.error('Download failed')}}} />

          <div className="mt-6">
            {['PENDING','PAID'].includes(order.status) && (
              <div className="flex gap-3">
                <button onClick={showPolicyAndConfirm} disabled={requesting || (order.cancellation && order.cancellation.status === 'PENDING')} className="px-4 py-2 bg-red-600 rounded text-white">
                  {order.cancellation && order.cancellation.status === 'PENDING' ? 'Cancellation Requested' : 'Request Cancellation'}
                </button>
                <button onClick={async()=>{ try { const blob = await api.order.downloadTicket(id); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${order.code}.pdf`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);} catch(e){console.error(e); toast.error('Download failed')}}} className="px-4 py-2 bg-gray-700 rounded">Download Ticket</button>
              </div>
            )}
            {order.cancellation && (
              <div className="mt-4 bg-red-900/20 p-3 rounded">
                <div className="text-red-300">Cancellation: {order.cancellation.reason}</div>
                <div className="text-gray-300">Refund amount: {(order.cancellation.refund_amount||0).toLocaleString('en-US')} VND</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
