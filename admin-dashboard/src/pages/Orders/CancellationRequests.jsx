/**
 * Cancellation Requests - Refactored
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCcw, ChevronDown, ChevronUp, DollarSign, User, Ticket, Calendar } from 'lucide-react';
import { PageLoader, EmptyState, SearchInput, Select, Button, Card, Badge, Pagination, Modal, Textarea } from '../../components/ui';
import * as orderService from '../../services/orderService';
import { formatDate, formatCurrency } from '../../services/api';
import { resolvePerformanceDate } from '../../utils/performanceDate';

export default function CancellationRequests() {
  const { authFetch } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [expandedId, setExpandedId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [processModal, setProcessModal] = useState({ open: false, request: null });
  const [processForm, setProcessForm] = useState({ approve: true, refundAmount: 0, adminNote: '' });
  const [processing, setProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await orderService.getCancellationRequests(authFetch, { cancellationStatus: filter, page: pagination.page });
      setRequests(data.data.orders || []);
      setPagination(p => ({ ...p, total: data.data.pagination?.total || 0, pages: data.data.pagination?.pages || 1 }));
      // If URL contains an order id param, expand and open processing modal for it
      const orderParam = searchParams.get('order');
      if (orderParam) {
        const found = (data.data.orders || []).find(r => r._id.toString() === orderParam.toString());
        if (found) {
          setExpandedId(found._id);
          // open process modal but keep default approve=true so admin can choose
          setProcessModal({ open: true, request: found });
          const eventDate = resolvePerformanceDate(found.concert, found.performance) || found.concert?.start_time;
          const refund = orderService.calculateRefund(found.total_amount, eventDate);
          setProcessForm({ approve: true, refundAmount: refund.amount, adminNote: '' });
          // remove the URL param so subsequent filter clicks don't re-open the modal
          try {
            const sp = new URLSearchParams(searchParams);
            sp.delete('order');
            setSearchParams(sp, { replace: true });
          } catch (e) {
            // ignore if unable to clear
          }
        }
      }
    } catch (error) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [authFetch, filter, pagination.page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const openProcessModal = (request, approve) => {
    const eventDate = resolvePerformanceDate(request.concert, request.performance) || request.concert?.start_time;
    const refund = orderService.calculateRefund(request.total_amount, eventDate);
    setProcessForm({ approve, refundAmount: approve ? refund.amount : 0, adminNote: '' });
    setProcessModal({ open: true, request });
  };

  const handleProcess = async () => {
    try {
      setProcessing(true);
      await orderService.processRefund(authFetch, processModal.request._id, processForm);
      toast.success(processForm.approve ? 'Refund approved' : 'Request rejected');
      setProcessModal({ open: false, request: null });
      fetchRequests();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = orderService.CANCELLATION_STATUS_CONFIG[status] || { label: status, color: 'gray' };
    return <Badge variant={config.color}>{config.label}</Badge>;
  };

  if (loading && requests.length === 0) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cancellation Requests</h1>
          <p className="text-gray-400">Process ticket refund requests</p>
        </div>
        <Button variant="ghost" onClick={fetchRequests}><RefreshCcw size={20} /></Button>
      </div>

      {/* Filter */}
      <Card>
        <div className="flex gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', 'all'].map(status => (
            <button key={status} onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card><EmptyState icon={AlertCircle} title="No cancellation requests" /></Card>
        ) : (
          requests.map(request => (
            <Card key={request._id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <Ticket size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Order #{request.order_code || request._id.slice(-8)}</p>
                      <p className="text-sm text-gray-400">{request.concert?.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(request.cancellation_status)}
                    <button onClick={() => setExpandedId(expandedId === request._id ? null : request._id)}
                      className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
                      {expandedId === request._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === request._id && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-gray-500">Customer</span><p className="text-white">{request.customer?.fullName || 'N/A'}</p></div>
                      <div><span className="text-gray-500">Event Date</span><p className="text-white">{formatDate(resolvePerformanceDate(request.concert, request.performance) || request.concert?.start_time)}</p></div>
                      <div><span className="text-gray-500">Amount</span><p className="text-white">{formatCurrency(request.total_amount)}</p></div>
                      <div><span className="text-gray-500">Requested</span><p className="text-white">{formatDate(request.cancellation_requested_at)}</p></div>
                    </div>

                    {request.cancellation_reason && (
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-gray-400 text-sm">Reason: <span className="text-white">{request.cancellation_reason}</span></p>
                      </div>
                    )}

                    {request.cancellation_status === 'PENDING' && (
                      <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => openProcessModal(request, false)} className="flex-1">
                          <XCircle size={16} /> Reject
                        </Button>
                        <Button onClick={() => openProcessModal(request, true)} className="flex-1">
                          <CheckCircle size={16} /> Approve Refund
                        </Button>
                      </div>
                    )}

                    {request.admin_note && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-yellow-400 text-sm">Admin Note: {request.admin_note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <Pagination page={pagination.page} totalPages={pagination.pages} total={pagination.total}
        onPageChange={p => setPagination(prev => ({ ...prev, page: p }))} itemLabel="requests" />

      {/* Process Modal */}
      <Modal isOpen={processModal.open} onClose={() => setProcessModal({ open: false, request: null })}
        title={processForm.approve ? 'Approve Refund' : 'Reject Request'} size="md">
        <div className="space-y-4">
          {processForm.approve && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Refund Amount</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="number" value={processForm.refundAmount}
                  onChange={e => setProcessForm(f => ({ ...f, refundAmount: Number(e.target.value) }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Max: {formatCurrency(processModal.request?.total_amount || 0)}</p>
            </div>
          )}
          <Textarea label="Admin Note" value={processForm.adminNote}
            onChange={e => setProcessForm(f => ({ ...f, adminNote: e.target.value }))} rows={3} placeholder="Add a note..." />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setProcessModal({ open: false, request: null })} className="flex-1">Cancel</Button>
            <Button onClick={handleProcess} loading={processing} variant={processForm.approve ? 'primary' : 'danger'} className="flex-1">
              {processForm.approve ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
