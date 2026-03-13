/**
 * Ticket Class List - Refactored
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Edit2, Trash2, Ticket, DollarSign, Users, Calendar, Star, Tag } from 'lucide-react';
import { PageLoader, Button, Card, Badge, Modal, Input, ConfirmDialog } from '../../components/ui';
import * as ticketService from '../../services/ticketService';
import * as eventService from '../../services/eventService';
import { formatCurrency, API_URL } from '../../services/api';

export default function TicketClassList() {
  const { concertId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [concert, setConcert] = useState(null);
  const [ticketClasses, setTicketClasses] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ type: null, ticket: null });
  const [form, setForm] = useState(ticketService.DEFAULT_TICKET_FORM);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [concertRes, ticketsRes] = await Promise.all([
        fetch(`${API_URL}/concerts/${concertId}`),
        ticketService.getTicketClasses(authFetch, concertId)
      ]);
      
      const concertData = await concertRes.json();
      if (concertData.success) {
        setConcert(concertData.data.concert);
        setZones(concertData.data.concert.venue?.zones || []);
      }
      
      setTicketClasses(ticketsRes.data.ticketClasses || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [authFetch, concertId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (type, ticket = null) => {
    setModal({ type, ticket });
    if (ticket) {
      const toLocalDateTimeInput = (dateVal) => {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
      };
      setForm({ ...ticket, open_time: toLocalDateTimeInput(ticket.open_time), close_time: toLocalDateTimeInput(ticket.close_time), includeLocked: false });
    } else {
      setForm({ ...ticketService.DEFAULT_TICKET_FORM, concert: concertId });
    }
  };

  const applyPreset = (preset) => {
    setForm(f => ({ ...f, name: preset.name, price: preset.price }));
  };

  // description/benefits removed from form

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Convert datetime-local fields (local) to UTC ISO strings before sending
      const payload = { ...form };
      const toISO = (dt) => {
        if (!dt) return null;
        const parts = dt.split('T');
        if (parts.length !== 2) return new Date(dt).toISOString();
        const [date, time] = parts;
        const [y, m, d] = date.split('-').map(Number);
        const [hh, mm] = time.split(':').map(Number);
        return new Date(y, m - 1, d, hh || 0, mm || 0).toISOString();
      };
      payload.open_time = toISO(form.open_time);
      payload.close_time = toISO(form.close_time);

      if (modal.ticket) {
        const res = await eventService.updateTicketClass(authFetch, concertId, modal.ticket._id, payload);
        const updatedCount = res.data?.updatedSeatCount || 0;
        toast.success(`Ticket class updated${updatedCount ? ` — updated ${updatedCount} seats` : ''}`);
      } else {
        await eventService.addTicketClass(authFetch, concertId, payload);
        toast.success('Ticket class created');
      }
      setModal({ type: null, ticket: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await eventService.deleteTicketClass(authFetch, concertId, modal.ticket._id);
      toast.success('Ticket class deleted');
      setModal({ type: null, ticket: null });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/events" className="p-2 hover:bg-white/5 rounded-lg text-gray-400"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Ticket Classes</h1>
          <p className="text-gray-400">{concert?.title}</p>
        </div>
        <Button onClick={() => openModal('form')}><Plus size={18} /> Add Ticket Class</Button>
      </div>

      {/* Ticket Classes Grid */}
      {ticketClasses.length === 0 ? (
        <Card className="text-center py-12">
          <Ticket size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No ticket classes yet</p>
          <Button onClick={() => openModal('form')} className="mt-4"><Plus size={16} /> Create First Ticket Class</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ticketClasses.map(tc => (
            <Card key={tc._id} className="relative">
              <div className="absolute top-4 right-4 flex gap-1">
                <button onClick={() => openModal('form', tc)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400"><Edit2 size={16} /></button>
                <button onClick={() => openModal('delete', tc)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"><Trash2 size={16} /></button>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/20 rounded-xl"><Ticket size={24} className="text-primary" /></div>
                <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{tc.name}</h3>
                      {(() => {
                        const now = new Date();
                        const open = tc.open_time ? new Date(tc.open_time) : null;
                        const close = tc.close_time ? new Date(tc.close_time) : null;
                        const onSale = (!open || open <= now) && (!close || close >= now);
                        return (
                          <span className={`text-xs px-2 py-0.5 rounded ${onSale ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                            {onSale ? 'On sale' : 'Not on sale'}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-sm text-gray-500">{/* zone removed from ticket class display */}</p>
                </div>
              </div>

              <div className="text-3xl font-bold text-white mb-4">{formatCurrency(tc.price)}</div>

              {/* quota display removed from ticket class card */}

              {/* benefits removed */}
            </Card>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={modal.type === 'form'} onClose={() => setModal({ type: null, ticket: null })}
        title={modal.ticket ? 'Edit Ticket Class' : 'Add Ticket Class'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Presets */}
          {!modal.ticket && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {ticketService.TICKET_PRESETS.map(preset => (
                  <button key={preset.name} type="button" onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300">{preset.name}</button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Name *" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VIP, Regular, etc." />
            <Input label="Price *" type="number" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
          </div>

          {modal.ticket && (
            <div className="flex items-center gap-2 text-sm">
              <input type="checkbox" id="includeLocked" checked={!!form.includeLocked} onChange={e => setForm({ ...form, includeLocked: e.target.checked })} />
              <label htmlFor="includeLocked" className="text-gray-400">Also update LOCKED seats (not recommended if customers are checking out)</label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Sale Opens" type="datetime-local" value={form.open_time} onChange={e => setForm({ ...form, open_time: e.target.value })} />
            <Input label="Sale Closes" type="datetime-local" value={form.close_time} onChange={e => setForm({ ...form, close_time: e.target.value })} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setModal({ type: null, ticket: null })} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">{modal.ticket ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={modal.type === 'delete'} title="Delete Ticket Class?"
        message={`Delete "${modal.ticket?.name}"? This cannot be undone.`}
        confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setModal({ type: null, ticket: null })} variant="danger" />
    </div>
  );
}
