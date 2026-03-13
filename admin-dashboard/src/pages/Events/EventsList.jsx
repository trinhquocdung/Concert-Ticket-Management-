/**
 * Events List Page - Refactored
 * Uses shared UI components and services
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Calendar, MapPin, Users, Eye, Edit, Trash2, LayoutGrid, List, RefreshCw, MoreVertical, Palette } from 'lucide-react';
import { PageLoader, EmptyState, SearchInput, Select, Button, Card, Badge, Pagination, ActionMenu } from '../../components/ui';
import * as eventService from '../../services/eventService';
import * as categoryService from '../../services/categoryService';
import { formatDate } from '../../services/api';
import { resolvePerformanceDate } from '../../utils/performanceDate';

export default function EventsList() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showMenu, setShowMenu] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', category: '' });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoryService.getActiveCategories(authFetch);
        setCategories(data.data.categories || []);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, [authFetch]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eventService.getConcerts(authFetch, { ...filters, page: pagination.page, limit: 12 });
      setEvents(data.data.concerts.map(c => ({
        ...c, id: c._id,
        venue: c.venue?.name || 'TBA',
        city: c.venue?.city || '',
      })));
      setPagination(p => ({ ...p, ...data.data.pagination }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, filters, pagination.page]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    try {
      await eventService.deleteConcert(authFetch, id);
      toast.success('Event deleted');
      fetchEvents();
    } catch (error) {
      toast.error(error.message);
    }
    setShowMenu(null);
  };

  const getStatusBadge = (status) => {
    const config = eventService.STATUS_CONFIG[status] || { label: status, color: 'gray' };
    return <Badge variant={config.color}>{config.label}</Badge>;
  };

  if (loading && events.length === 0) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Events Management</h1>
          <p className="text-gray-400">Manage concerts and events</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={fetchEvents}><RefreshCw size={20} /></Button>
          <Link to="/events/create"><Button><Plus size={18} /> Add Event</Button></Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search events..." className="flex-1" />
          <Select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
            options={[{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: c._id, label: c.name }))]} />
          <Select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            options={[{ value: '', label: 'All Status' }, ...Object.entries(eventService.STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))]} />
        </div>
      </Card>

      {/* Events */}
      {events.length === 0 ? (
        <EmptyState icon={Calendar} title="No events found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => <EventCard key={event.id} event={event} getStatusBadge={getStatusBadge} onDelete={() => handleDelete(event.id)} />)}
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.pages} total={pagination.total}
        onPageChange={p => setPagination(prev => ({ ...prev, page: p }))} itemLabel="events" />
    </div>
  );
}

// Sub-components
const EventCard = ({ event, getStatusBadge, onDelete }) => (
  <Card className="overflow-hidden group">
    <div className="relative h-48">
      <img src={event.thumbnail || 'https://via.placeholder.com/400x250'} alt={event.title} className="w-full h-full object-cover" />
      <div className="absolute top-3 right-3">{getStatusBadge(event.status)}</div>
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-white truncate">{event.title}</h3>
      <div className="mt-2 space-y-1 text-sm text-gray-400">
        <div className="flex items-center gap-2"><Calendar size={14} /> {formatDate(resolvePerformanceDate(event) || event.start_time)}</div>
        <div className="flex items-center gap-2"><MapPin size={14} /> {event.venue}</div>
        <div className="flex items-center gap-2"><Users size={14} /> {event.sold_tickets || 0} / {event.total_tickets || 0} sold</div>
      </div>
      <div className="mt-4 flex gap-2">
        <Link to={`/events/${event.id}/zones`} className="flex-1">
          <Button variant="primary" size="sm" className="w-full"><Palette size={14} /> Zones</Button>
        </Link>
        <Link to={`/events/${event.id}/edit`}><Button variant="ghost" size="sm"><Edit size={14} /></Button></Link>
        <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 size={14} className="text-red-400" /></Button>
      </div>
    </div>
  </Card>
);

const EventRow = ({ event, getStatusBadge, showMenu, setShowMenu, onDelete, navigate }) => {
  return (
    <tr className="hover:bg-white/5">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <img src={event.thumbnail || 'https://via.placeholder.com/50'} alt="" className="w-12 h-12 rounded-lg object-cover" />
          <div>
            <p className="font-medium text-white">{event.title}</p>
            <p className="text-xs text-gray-500">{event.category?.name || event.category}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-gray-400">{formatDate(resolvePerformanceDate(event) || event.start_time)}</td>
      <td className="px-5 py-4 text-gray-400">{event.venue}</td>
      <td className="px-5 py-4">{getStatusBadge(event.status)}</td>
      <td className="px-5 py-4 text-gray-400">{event.sold_tickets || 0} / {event.total_tickets || 0}</td>
      <td className="px-5 py-4">
        <div className="flex gap-1">
          <button onClick={() => navigate(`/events/${event.id}`)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><Eye size={16} /></button>
          <button onClick={() => navigate(`/events/${event.id}/edit`)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><Edit size={16} /></button>
          <button onClick={onDelete} className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"><Trash2 size={16} /></button>
        </div>
      </td>
    </tr>
  );
};
