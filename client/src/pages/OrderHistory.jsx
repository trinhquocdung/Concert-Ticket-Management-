import React, { useState, useEffect } from "react";
import api from '../services/api';
import toast from 'react-hot-toast';
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingBag, Calendar, ChevronDown, ChevronUp, 
  Eye, Download, RefreshCw, Search, Filter,
  CheckCircle, XCircle, Clock, CreditCard
} from "lucide-react";

const OrderHistory = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate("/");
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    const fetchOrders = async (page = 1, append = false) => {
      setLoading(true);
      try {
        const res = await api.order.getMyOrders({ page, limit: pagination.limit });
        if (res && res.success) {
          const normalized = (res.data.orders || []).map(o => ({
            ...o,
            items: o.items || [],
            payment: o.payment || null,
            voucher: o.voucher || null,
            cancellation: o.cancellation || null,
          }));
          console.debug('OrderHistory: fetched orders', normalized);
          setOrders(prev => append ? [...prev, ...normalized] : normalized);
          setPagination(p => ({ ...p, page, pages: res.data.pagination?.pages || 1, total: res.data.pagination?.total || normalized.length }));
        } else {
          if (!append) setOrders([]);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        if (!append) setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    if (isSignedIn) fetchOrders(1, false);
    // Refresh pending orders when window regains focus or becomes visible
    const onFocus = () => fetchOrders(1, false);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isSignedIn]);

  const loadMore = async () => {
    if (pagination.page >= pagination.pages) return;
    const next = pagination.page + 1;
    setLoading(true);
    try {
      const res = await api.order.getMyOrders({ page: next, limit: pagination.limit });
      if (res && res.success) {
        const normalized = (res.data.orders || []).map(o => ({
          ...o,
          items: o.items || [],
          payment: o.payment || null,
          voucher: o.voucher || null,
          cancellation: o.cancellation || null,
        }));
        setOrders(prev => [...prev, ...normalized]);
        setPagination(p => ({ ...p, page: next, pages: res.data.pagination?.pages || p.pages, total: res.data.pagination?.total || p.total }));
      }
    } catch (err) {
      console.error('Failed to load more orders', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    let matchFilter = true;
    if (filter !== "all") matchFilter = order.status === filter;

    const q = searchTerm.trim().toLowerCase();
    const matchSearch = !q || (
      (order.code || '').toLowerCase().includes(q) ||
      (order.items || []).some((item) => (item.event?.name || '').toLowerCase().includes(q))
    );

    return matchFilter && matchSearch;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case "PAID":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "PENDING":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "CANCELLED":
      case "CANCEL":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "EXPIRED":
        return <Clock className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PAID: "bg-green-600/30 text-green-400",
      PENDING: "bg-yellow-600/30 text-yellow-400",
      CANCEL: "bg-red-600/30 text-red-400",
      CANCELLED: "bg-red-600/30 text-red-400",
      EXPIRED: "bg-gray-600/30 text-gray-300",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getPaymentMethodIcon = (method) => {
    return <CreditCard className="w-4 h-4" />;
  };

  const handleCompletePayment = async (order) => {
    try {
      toast.loading('Preparing payment...');
      // Use MoMo gateway instead of VNPay
      const resp = await api.payment.createMoMo(order._id);
      if (!resp || !resp.success) {
        toast.error(resp?.message || 'Failed to initiate MoMo payment');
        return;
      }
      const payUrl = resp.data?.payUrl || resp.data?.payurl || resp.data?.paymentUrl || null;
      if (payUrl) {
        // redirect browser to MoMo pay URL
        window.location.href = payUrl;
      } else {
        toast.error('MoMo payment URL not returned');
      }
    } catch (err) {
      console.error('Complete payment error', err);
      toast.error(err.message || 'Payment initiation failed');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString("en-US");
  };

  const formatDateParts = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d)) return { time: '', date: '' };
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('en-US');
    return { time, date };
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-12 px-6 md:px-16 lg:px-24 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Order History</h1>
          <div className="flex items-center gap-2 text-gray-400">
            <ShoppingBag className="w-5 h-5" />
            <span>{pagination.total} orders</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-[rgb(37,36,36)] border border-gray-700 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            {["all", "PAID", "PENDING", "CANCEL"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg capitalize transition ${
                  filter === f
                    ? "bg-primary text-black font-semibold"
                    : "bg-[rgb(37,36,36)] text-gray-400 hover:text-white"
                }`}
              >
                {f === "all" ? "All" : f.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-[rgb(37,36,36)] rounded-xl">
            <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400">No orders found</h3>
            <p className="text-gray-500 mt-2">
              {filter === "all"
                ? "You haven't made any orders yet"
                : `No ${filter.toLowerCase()} orders`}
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 px-6 py-3 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dull"
            >
              Browse Events
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order._id}
                className="bg-[rgb(37,36,36)] rounded-xl overflow-hidden"
              >
                {/* Order Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() =>
                    setExpandedOrder(expandedOrder === order._id ? null : order._id)
                  }
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(order.status)}
                      <span className="font-mono text-sm text-gray-400">
                        {order.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(order.status)}
                      {expandedOrder === order._id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                      <img
                        src={order.items?.[0]?.event?.image || order.concert?.thumbnail || "https://via.placeholder.com/160x120?text=No+Image"}
                        alt={order.items?.[0]?.event?.name || order.concert?.title || "Event"}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    <div className="flex-1">
                      <h3 onClick={() => navigate(`/orders/${order._id}`)} className="font-semibold text-lg cursor-pointer hover:underline">{order.items?.[0]?.event?.name || order.items?.[0]?.name || order.concert?.title || 'Untitled event'}</h3>
                        { (order.items?.length || 0) > 1 && (
                          <p className="text-gray-400 text-sm">
                            +{(order.items?.length || 0) - 1} more item(s)
                          </p>
                        )}
                      <div className="flex items-center gap-4 text-gray-300 mt-2">
                        <Calendar className="w-5 h-5" />
                        {(() => {
                          const parts = formatDateParts(order.createdAt);
                          return (
                            <div className="flex items-center gap-4 text-base">
                              <span className="font-medium text-white">{parts.time}</span>
                              <span className="text-gray-400">{parts.date}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="text-right">
                        <p className="text-primary font-bold text-lg">
                          {(order.total_amount || 0).toLocaleString('en-US')} VND
                        </p>
                      {order.discount_amount > 0 && (
                        <p className="text-green-400 text-sm">
                          -{order.discount_amount.toLocaleString('en-US')} VND
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedOrder === order._id && (
                  <div className="px-4 pb-4 border-t border-gray-700 pt-4">
                    {/* Order Items */}
                    <div className="space-y-3 mb-4">
                      <h4 className="font-semibold text-gray-400">Items</h4>
                      {(order.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-black/20 p-3 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{item?.event?.name || item?.name || 'Ticket'}</p>
                            <p className="text-gray-400 text-sm">
                              {(item?.ticketClass || item?.ticket_class || '')} × {(item?.quantity || 0)}
                            </p>
                          </div>
                          <p className="font-semibold">
                            {(((item?.price || item?.price_snapshot || 0) * (item?.quantity || 0)) || 0).toLocaleString('en-US')} VND
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Payment Info */}
                    {order.payment && (
                      <div className="bg-black/20 p-4 rounded-lg mb-4">
                        <h4 className="font-semibold text-gray-400 mb-2">Payment</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Method</p>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(order.payment.method)}
                              <span>{order.payment.method}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-500">Transaction ID</p>
                            <p className="font-mono">{order.payment.trans_id}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Paid at</p>
                            <p>{formatDate(order.payment.pay_time)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Voucher */}
                    {order.voucher && (
                      <div className="bg-green-900/20 border border-green-700 p-3 rounded-lg mb-4">
                        <p className="text-green-400 text-sm">
                          Voucher applied: <span className="font-semibold">{order.voucher.code}</span> ({order.voucher.discount_percent}% off)
                        </p>
                      </div>
                    )}

                    {/* Cancellation Info */}
                    {order.cancellation && (
                      <div className="bg-red-900/20 border border-red-700 p-3 rounded-lg mb-4">
                        <p className="text-red-400 text-sm">
                          <strong>Cancelled:</strong> {order.cancellation.reason}
                        </p>
                        {order.cancellation.refundAmount && (
                          <p className="text-gray-400 text-sm mt-1">
                            Refunded: {order.cancellation.refundAmount.toLocaleString('en-US')} VND on {order.cancellation.refundedAt}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      {order.status === "PENDING" && (
                        <button onClick={() => handleCompletePayment(order)} className="flex-1 px-4 py-2 bg-yellow-600 text-black font-semibold rounded-lg hover:bg-yellow-500 flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4" />
                          Complete Payment
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {pagination.page < pagination.pages && (
              <div className="text-center mt-4">
                <button onClick={loadMore} disabled={loading} className="px-4 py-2 bg-primary rounded">
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
