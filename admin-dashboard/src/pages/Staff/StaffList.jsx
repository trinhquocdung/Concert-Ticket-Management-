/**
 * Staff List - Refactored
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search, Shield, Calendar, Mail, Phone, CheckCircle, XCircle, Lock, Unlock, Users, Key } from 'lucide-react';
import { PageLoader, EmptyState, SearchInput, Button, Card, Badge, Modal, Input, ConfirmDialog } from '../../components/ui';
import * as staffService from '../../services/staffService';
import { formatDate } from '../../services/api';
import { resolvePerformanceDate } from '../../utils/performanceDate';

export default function StaffList() {
  const { authFetch, API_URL } = useAuth();
  const [staff, setStaff] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ type: null, staff: null });
  const [form, setForm] = useState(staffService.DEFAULT_STAFF_FORM);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [staffRes, eventsRes] = await Promise.all([
        staffService.getStaffList(authFetch, { search }),
        authFetch(`${API_URL}/concerts?status=PUB&limit=50`)
      ]);

      setStaff(staffRes.data.users || []);
      const eventsData = await eventsRes.json();
      if (eventsData?.success) setEvents(eventsData.data?.concerts || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [authFetch, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (type, staffMember = null) => {
    setModal({ type, staff: staffMember });
    if (staffMember && type === 'form') {
      setForm({ ...staffMember, password: '', permissions: staffMember.permissions || ['check_in', 'view_attendees'] });
    } else if (staffMember && type === 'assign') {
      setAssignedEvents(staffMember.assignedEvents?.map(e => e._id) || []);
    } else {
      setForm(staffService.DEFAULT_STAFF_FORM);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.staff) {
        await staffService.updateStaff(authFetch, modal.staff._id, form);
        toast.success('Staff updated');
      } else {
        await staffService.createStaff(authFetch, form);
        toast.success('Staff created');
      }
      setModal({ type: null, staff: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await staffService.deleteStaff(authFetch, modal.staff._id);
      toast.success('Staff deleted');
      setModal({ type: null, staff: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleAssignEvents = async () => {
    setSaving(true);
    try {
      await staffService.assignEvents(authFetch, modal.staff._id, assignedEvents);
      toast.success('Events assigned');
      setModal({ type: null, staff: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (perm) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm) ? f.permissions.filter(p => p !== perm) : [...f.permissions, perm]
    }));
  };

  const toggleEvent = (eventId) => {
    setAssignedEvents(prev => prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]);
  };

  const filteredStaff = staff.filter(s => 
    s.fullName?.toLowerCase().includes(search.toLowerCase()) || 
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff Management</h1>
          <p className="text-gray-400">Manage staff members and permissions</p>
        </div>
        <Button onClick={() => openModal('form')}><Plus size={18} /> Add Staff</Button>
      </div>

      {/* Search */}
      <Card>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..." />
      </Card>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <Card><EmptyState icon={Users} title="No staff found" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map(member => (
            <Card key={member._id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src={staffService.getStaffAvatar(member)} alt="" className="w-12 h-12 rounded-full" />
                  <div>
                    <h3 className="font-semibold text-white">{member.fullName || member.username}</h3>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <Badge variant={member.status ? 'emerald' : 'red'}>{member.status ? 'Active' : 'Inactive'}</Badge>
              </div>

              {member.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Phone size={14} /> {member.phone}
                </div>
              )}

              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Permissions</p>
                <div className="flex flex-wrap gap-1">
                  {(member.permissions || []).slice(0, 3).map(p => (
                    <Badge key={p} variant="gray" className="text-xs">{staffService.PERMISSIONS.find(x => x.key === p)?.label || p}</Badge>
                  ))}
                  {(member.permissions?.length || 0) > 3 && <Badge variant="gray" className="text-xs">+{member.permissions.length - 3}</Badge>}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/10">
                <Button variant="outline" size="sm" onClick={() => openModal('assign', member)} className="flex-1">
                  <Calendar size={14} /> Events
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openModal('form', member)}><Edit2 size={14} /></Button>
                <Button variant="ghost" size="sm" onClick={() => openModal('delete', member)}><Trash2 size={14} className="text-red-400" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={modal.type === 'form'} onClose={() => setModal({ type: null, staff: null })}
        title={modal.staff ? 'Edit Staff' : 'Add Staff'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Username *" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} disabled={!!modal.staff} />
            <Input label="Full Name *" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <Input label="Email *" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!modal.staff} />
          <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          {!modal.staff && (
            <Input label="Password *" type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Permissions</label>
            <div className="space-y-2">
              {staffService.PERMISSIONS.map(perm => (
                <label key={perm.key} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10">
                  <input type="checkbox" checked={form.permissions?.includes(perm.key)} onChange={() => togglePermission(perm.key)}
                    className="mt-0.5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary" />
                  <div>
                    <p className="text-white text-sm">{perm.label}</p>
                    <p className="text-xs text-gray-500">{perm.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setModal({ type: null, staff: null })} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">{modal.staff ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Events Modal */}
      <Modal isOpen={modal.type === 'assign'} onClose={() => setModal({ type: null, staff: null })}
        title="Assign Events" size="md">
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Select events for {modal.staff?.fullName}</p>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {events.map(event => (
              <label key={event._id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10">
                <input type="checkbox" checked={assignedEvents.includes(event._id)} onChange={() => toggleEvent(event._id)}
                  className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary" />
                <div>
                  <p className="text-white text-sm">{event.title}</p>
                  <p className="text-xs text-gray-500">{formatDate(resolvePerformanceDate(event) || event.start_time)}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setModal({ type: null, staff: null })} className="flex-1">Cancel</Button>
            <Button onClick={handleAssignEvents} loading={saving} className="flex-1">Save Assignments</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={modal.type === 'delete'} title="Delete Staff?"
        message={`Delete ${modal.staff?.fullName}? This cannot be undone.`}
        confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setModal({ type: null, staff: null })} variant="danger" />
    </div>
  );
}
