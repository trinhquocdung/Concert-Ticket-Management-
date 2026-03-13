/**
 * Vouchers List - Refactored
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Tag, Percent, Calendar, Copy, Edit, Trash2, RefreshCw, ToggleLeft, ToggleRight, CheckCircle, XCircle } from 'lucide-react';
import { PageLoader, EmptyState, SearchInput, Select, Button, Card, Badge, Pagination, Modal, Input, Textarea, ConfirmDialog } from '../../components/ui';
import * as voucherService from '../../services/voucherService';
import { formatDate, formatCurrency } from '../../services/api';

export default function VouchersList() {
  const { authFetch } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', type: '' });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [modal, setModal] = useState({ type: null, voucher: null });
  const [form, setForm] = useState(voucherService.DEFAULT_VOUCHER_FORM);
  const [saving, setSaving] = useState(false);

  const fetchVouchers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await voucherService.getVouchers(authFetch, { ...filters, page });
      setVouchers(data.data.vouchers || []);
      setPagination(prev => ({ 
        ...prev, 
        page,
        total: data.data.pagination?.total || 0,
        pages: data.data.pagination?.pages || 1
      }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, filters]);

  useEffect(() => { fetchVouchers(1); }, [fetchVouchers]);

  const handlePageChange = (newPage) => {
    fetchVouchers(newPage);
  };

  const openModal = (type, voucher = null) => {
    setModal({ type, voucher });
    if (voucher) {
      const toLocalDateInput = (dateVal) => {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      setForm({
        ...voucher,
        valid_from: toLocalDateInput(voucher.valid_from),
        valid_until: toLocalDateInput(voucher.valid_until),
      });
    } else {
      setForm({ ...voucherService.DEFAULT_VOUCHER_FORM, code: voucherService.generateVoucherCode() });
    }
  };

  const handleSave = async (e) => {
  e.preventDefault();
  setSaving(true);

  // Build payload with field names matching API expectations
  const payload = {
    code: form.code,
    discount_type: form.discount_type || 'PERCENTAGE', // Lấy từ form.discount_type
    discount_value: form.discount_value ? parseFloat(form.discount_value) : 0,
    max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
    min_purchase: form.min_purchase ? parseFloat(form.min_purchase) : 0,
    usage_limit: form.max_uses ? parseInt(form.max_uses, 10) : null,
    // Convert date-only inputs (YYYY-MM-DD) to UTC ISO instants for consistent storage
    valid_from: (function() {
      if (!form.valid_from) return null;
      const parts = form.valid_from.split('-').map(Number);
      if (parts.length === 3 && parts.every(p => !Number.isNaN(p))) {
        const [y, m, d] = parts;
        return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
      }
      return new Date(form.valid_from).toISOString();
    })(),
    valid_until: (function() {
      if (!form.valid_until) return null;
      const parts = form.valid_until.split('-').map(Number);
      if (parts.length === 3 && parts.every(p => !Number.isNaN(p))) {
        const [y, m, d] = parts;
        return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
      }
      return new Date(form.valid_until).toISOString();
    })(),
    concerts: form.concerts || [], // Include concerts array (default empty if none)
    description: form.description,
    active: form.active // Keep to control visibility/status
  };

    // IMPORTANT DEBUG STEP: Inspect payload in browser Console
    console.log('Data being sent to API:', payload);

    try {
      if (modal.voucher) {
        await voucherService.updateVoucher(authFetch, modal.voucher._id, payload);
        toast.success('Voucher updated');
      } else {
        await voucherService.createVoucher(authFetch, payload);
        toast.success('Voucher created');
      }
      setModal({ type: null, voucher: null });
      fetchVouchers();
    } catch (error) {
      console.error('API Error:', error);
      toast.error(error.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };



  const handleDelete = async () => {
    try {
      await voucherService.deleteVoucher(authFetch, modal.voucher._id);
      toast.success('Voucher deleted');
      setModal({ type: null, voucher: null });
      fetchVouchers();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleToggle = async (voucher) => {
    try {
      await voucherService.toggleVoucher(authFetch, voucher._id);
      toast.success(`Voucher ${voucher.active ? 'deactivated' : 'activated'}`);
      fetchVouchers();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const getStatusBadge = (voucher) => {
    const now = new Date();
    const validFrom = new Date(voucher.valid_from);
    const validUntil = new Date(voucher.valid_until);
    
    // Note: use 'active' field instead of 'is_active'
    if (!voucher.active) return <Badge variant="gray">Inactive</Badge>;
    
    if (now < validFrom) return <Badge variant="blue">Scheduled</Badge>;
    if (now > validUntil) return <Badge variant="red">Expired</Badge>;
    
    if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
      return <Badge variant="yellow">Depleted</Badge>;
    }
    
    return <Badge variant="emerald">Active</Badge>;
  };


  if (loading && vouchers.length === 0) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vouchers Management</h1>
          <p className="text-gray-400">Manage discount codes and promotions</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={fetchVouchers}><RefreshCw size={20} /></Button>
          <Button onClick={() => openModal('form')}><Plus size={18} /> Add Voucher</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            options={[{ value: '', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'expired', label: 'Expired' }]} className="flex-1" />
          <Select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
            options={[{ value: '', label: 'All Types' }, { value: 'PERCENTAGE', label: 'Percentage' }, { value: 'FIXED', label: 'Fixed Amount' }]} className="flex-1" />
        </div>
      </Card>

      {/* Vouchers Table */}
      <Card className="overflow-hidden">
        {vouchers.length === 0 ? (
          <EmptyState icon={Tag} title="No vouchers found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>{['Code', 'Discount', 'Usage', 'Valid Period', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-4">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {vouchers.map(voucher => (
                    <tr key={voucher._id} className="hover:bg-white/5">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-white/5 rounded text-primary font-mono">{voucher.code}</code>
                          <button onClick={() => copyCode(voucher.code)} className="text-gray-400 hover:text-white"><Copy size={14} /></button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-white">
                          {voucher.discount_type === 'PERCENTAGE' ? (
                            <><Percent size={14} className="text-primary" /> {voucher.discount_value}</>
                          ) : (
                            <>{formatCurrency(voucher.discount_value)}</>
                          )}
                        </div>
                        {voucher.max_discount > 0 && <p className="text-xs text-gray-500">Max: {formatCurrency(voucher.max_discount)}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-white">{voucher.used_count || 0} / {voucher.usage_limit}</p>
                        <div className="w-20 h-1 bg-white/10 rounded-full mt-1">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, ((voucher.used_count || 0) / voucher.max_uses) * 100)}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1"><Calendar size={12} /> {formatDate(voucher.valid_from)}</div>
                        <div className="flex items-center gap-1 text-gray-500">→ {formatDate(voucher.valid_until)}</div>
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(voucher)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleToggle(voucher)} className={`p-2 rounded-lg ${voucher.active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-400 hover:bg-white/5'}`}>
                            {voucher.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button onClick={() => openModal('form', voucher)} className="p-2 text-gray-400 hover:bg-white/5 rounded-lg"><Edit size={16} /></button>
                          <button onClick={() => openModal('delete', voucher)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pagination.page} totalPages={pagination.pages} total={pagination.total}
              onPageChange={handlePageChange} />
          </>
        )}
      </Card>

      {/* Form Modal */}
      <Modal isOpen={modal.type === 'form'} onClose={() => setModal({ type: null, voucher: null })}
        title={modal.voucher ? 'Edit Voucher' : 'Add Voucher'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex gap-4">
            <Input label="Code " required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="flex-1" />
            <Button type="button" variant="outline" onClick={() => setForm({ ...form, code: voucherService.generateVoucherCode() })} className="mt-7">
              Generate
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}
              options={[{ value: 'PERCENTAGE', label: 'Percentage (%)' }, { value: 'FIXED', label: 'Fixed Amount' }]} />
            <Input label="Discount Value " type="number" required value={form.discount_value}
              onChange={e => setForm({ ...form, discount_value: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Max Discount" type="number" value={form.max_discount}
              onChange={e => setForm({ ...form, max_discount: e.target.value })} />
            <Input label="Min Purchase" type="number" value={form.min_purchase}
              onChange={e => setForm({ ...form, min_purchase: e.target.value })} />
          </div>

          <Input label="Max Uses " type="number" required value={form.max_uses}
            onChange={e => setForm({ ...form, max_uses: e.target.value })} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Valid From " type="date" required value={form.valid_from}
              onChange={e => setForm({ ...form, valid_from: e.target.value })} />
            <Input label="Valid Until " type="date" required value={form.valid_until}
              onChange={e => setForm({ ...form, valid_until: e.target.value })} />
          </div>

          <Textarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setModal({ type: null, voucher: null })} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">{modal.voucher ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog isOpen={modal.type === 'delete'} title="Delete Voucher?"
        message={`Are you sure you want to delete voucher "${modal.voucher?.code}"?`}
        confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setModal({ type: null, voucher: null })} variant="danger" />
    </div>
  );
}
