/**
 * Orders List - Refactored
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ShoppingCart, Eye, X, RefreshCw, Calendar, CreditCard, CheckCircle, Clock, XCircle, Download, User, Ticket, AlertCircle } from 'lucide-react';
import { PageLoader, EmptyState, SearchInput, Select, Button, Card, StatCard, Badge, Pagination, Modal } from '../../components/ui';
import * as orderService from '../../services/orderService';
import { formatDate, formatDateTime, formatCurrency } from '../../services/api';
import { resolvePerformanceDate } from '../../utils/performanceDate';

export default function OrdersList() {
  const { authFetch, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', date: '' });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, cancelled: 0, revenue: 0 });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrders(authFetch, { ...filters, page: pagination.page });
      setOrders(data.data.orders || []);
      setPagination(p => ({ ...p, ...data.data.pagination }));
      
      const orders = data.data.orders || [];
      setStats({
        total: data.data.pagination?.total || orders.length,
        completed: orders.filter(o => o.status === 'COMPLETED' || o.status === 'PAID').length,
        pending: orders.filter(o => o.status === 'PENDING').length,
        cancelled: orders.filter(o => o.status === 'CANCELLED').length,
        revenue: orders.reduce((sum, o) => ['COMPLETED', 'PAID'].includes(o.status) ? sum + (o.total_amount || 0) : sum, 0),
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, filters, pagination.page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Open order detail: fetch full order with line items from API
  const openOrder = async (orderId) => {
    try {
      const resp = await orderService.getOrderById(authFetch, orderId);
      if (resp && resp.success) {
        const { order: o, orderDetails, payment } = resp.data;
        setSelectedOrder(Object.assign({}, o, { order_details: orderDetails || [], payment }));
      } else {
        toast.error(resp?.message || 'Failed to load order details');
      }
    } catch (e) {
      toast.error(e.message || 'Failed to load order');
    }
  };

  const getStatusBadge = (status) => {
    const config = orderService.STATUS_CONFIG[status] || { label: status, color: 'gray' };
    return <Badge variant={config.color}>{config.label}</Badge>;
  };

  if (loading && orders.length === 0) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders Management</h1>
          <p className="text-gray-400">View and manage all orders</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={fetchOrders}><RefreshCw size={20} /></Button>
          <Button variant="outline" onClick={() => navigate('/orders/cancellations')}><AlertCircle size={18} /> Cancel Management</Button>
          <Button variant="outline"><Download size={18} /> Export</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <StatCard icon={ShoppingCart} iconColor="primary" value={stats.total} label="Total Orders" />
        <StatCard icon={CheckCircle} iconColor="emerald" value={stats.completed} label="Completed" />
        <StatCard icon={Clock} iconColor="yellow" value={stats.pending} label="Pending" />
        <StatCard icon={XCircle} iconColor="red" value={stats.cancelled} label="Cancelled" />
        <StatCard icon={CreditCard} iconColor="blue" value={formatCurrency(stats.revenue)} label="Revenue" />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search orders..." className="flex-1" />
          <Select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            options={[{ value: '', label: 'All Status' }, ...Object.entries(orderService.STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))]} />
          <Select value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
            options={[{ value: '', label: 'All Time' }, { value: 'today', label: 'Today' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }]} />
        </div>
      </Card>

      {/* Orders Table */}
      <Card className="overflow-hidden">
        {orders.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>{['Order ID', 'Customer', 'Event', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-4">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map(order => (
                    <tr key={order._id} className="hover:bg-white/5">
                      <td className="px-5 py-4 font-mono text-sm text-gray-300">#{order.order_code || order._id.slice(-8)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-500" />
                          <span className="text-gray-300">{order.customer?.fullName || order.customer?.email || 'Guest'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-300">{order.concert?.title || 'N/A'}</td>
                      <td className="px-5 py-4 text-white font-medium">{formatCurrency(order.total_amount || 0)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.status)}
                          {order.cancellation && order.cancellation.status === 'PENDING' && (
                            <button onClick={() => navigate(`/orders/cancellations?order=${order._id}`)} className="ml-1">
                              <Badge variant="yellow">Cancel Req</Badge>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-sm">{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-4">
                        <Button variant="ghost" size="sm" onClick={() => openOrder(order._id)}><Eye size={14} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pagination.page} totalPages={pagination.pages} total={pagination.total}
              onPageChange={p => setPagination(prev => ({ ...prev, page: p }))} itemLabel="orders" />
          </>
        )}
      </Card>

      {/* Order Detail Modal */}
      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} getStatusBadge={getStatusBadge} />
    </div>
  );
}

const OrderDetailModal = ({ order, onClose, getStatusBadge }) => {
  if (!order) return null;

  return (
    <Modal isOpen={!!order} onClose={onClose} title={`Order #${order.order_code || order._id.slice(-8)}`} size="lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <p className="text-gray-400 text-sm">Status</p>
            {getStatusBadge(order.status)}
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Total Amount</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(order.total_amount || 0)}</p>
          </div>
        </div>

          <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-white mb-2">Customer</h4>
            <p className="text-gray-400">{order.customer?.fullName || 'N/A'}</p>
            <p className="text-gray-500 text-sm">{order.customer?.email}</p>
            <p className="text-gray-500 text-sm">{order.customer?.phone}</p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">Event</h4>
            <p className="text-gray-400">{order.concert?.title || 'N/A'}</p>
            {
              (() => {
                const perfDate = resolvePerformanceDate(order.concert, order.performance) || order.concert?.start_time;
                return <p className="text-gray-500 text-sm">{perfDate ? formatDateTime(perfDate) : ''}</p>;
              })()
            }
          </div>
        </div>

        {order.order_details?.length > 0 && (
          <div>
            <h4 className="font-medium text-white mb-2">Tickets</h4>
            <div className="space-y-2">
              {order.order_details.map((detail, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Ticket size={14} className="text-primary" />
                      <span className="text-gray-300">{detail.ticket_info?.ticket_class || detail.ticket_class?.name || 'Ticket'}</span>
                      {detail.ticket_info?.seat_label && <span className="text-gray-500">· {detail.ticket_info.seat_label}</span>}
                    </div>
                    {detail.price_snapshot != null && (
                      <div className="text-gray-400 text-sm mt-1">Price: {formatCurrency(detail.price_snapshot)}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500 text-sm">Qty: {detail.quantity || 1}</div>
                    <div className="text-white font-medium">{formatCurrency((detail.price_snapshot || detail.price || 0) * (detail.quantity || 1))}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-white/10">
          <div className="flex justify-between text-gray-400">
            <span>Order Date</span>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
          {order.payment_method && (
            <div className="flex justify-between text-gray-400 mt-2">
              <span>Payment Method</span>
              <span className="capitalize">{order.payment_method}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
