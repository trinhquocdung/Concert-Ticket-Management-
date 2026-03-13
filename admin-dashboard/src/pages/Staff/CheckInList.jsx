/**
 * Check-In List - Refactored
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, Download, CheckCircle, XCircle, Clock, User, Ticket, RefreshCw, Calendar } from 'lucide-react';
import { PageLoader, EmptyState, SearchInput, Select, Button, Card, StatCard, Badge, Pagination } from '../../components/ui';
import { API_URL, formatDate } from '../../services/api';

export default function CheckInList() {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [concerts, setConcerts] = useState([]);
  const [selectedConcert, setSelectedConcert] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, checkedIn: 0, pending: 0 });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  // Fetch concerts
  useEffect(() => {
    const fetchConcerts = async () => {
      try {
        const res = await fetch(`${API_URL}/concerts?status=PUB`);
        const data = await res.json();
        if (data.success && data.data.concerts?.length > 0) {
          setConcerts(data.data.concerts);
          setSelectedConcert(data.data.concerts[0]._id);
        }
      } catch (error) {
        console.error('Error fetching concerts:', error);
      }
    };
    fetchConcerts();
  }, []);

  // Fetch check-in list
  const fetchCheckInList = useCallback(async () => {
    if (!selectedConcert) { setLoading(false); return; }
    
    setLoading(true);
    try {
      let url = `${API_URL}/tickets/concert/${selectedConcert}/check-in-list?page=${pagination.page}&limit=20`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;

      const res = await authFetch(url);
      const data = await res.json();

      if (data.success) {
        setAttendees(data.data.tickets || []);
        setStats(data.data.stats || { total: 0, checkedIn: 0, pending: 0 });
        setPagination(p => ({ ...p, total: data.data.pagination?.total || 0, pages: data.data.pagination?.pages || 1 }));
      }
    } catch (error) {
      toast.error('Failed to load check-in list');
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedConcert, statusFilter, pagination.page]);

  useEffect(() => { fetchCheckInList(); }, [fetchCheckInList]);

  const handleCheckIn = async (ticketId) => {
    try {
      const res = await authFetch(`${API_URL}/tickets/${ticketId}/check-in`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Checked in successfully');
        fetchCheckInList();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Check-in failed');
    }
  };

  const filteredAttendees = attendees.filter(a => 
    !search || a.customer?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    a.ticket_code?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (ticket) => {
    if (ticket.checked_in) return <Badge variant="emerald"><CheckCircle size={12} /> Checked In</Badge>;
    if (ticket.status === 'CANCELLED') return <Badge variant="red"><XCircle size={12} /> Cancelled</Badge>;
    return <Badge variant="yellow"><Clock size={12} /> Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/staff/scanner" className="p-2 hover:bg-white/5 rounded-lg text-gray-400"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Check-In List</h1>
          <p className="text-gray-400">View and manage attendees</p>
        </div>
        <Button variant="outline" onClick={fetchCheckInList}><RefreshCw size={18} /></Button>
        <Button variant="outline"><Download size={18} /> Export</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Ticket} iconColor="primary" value={stats.total} label="Total Tickets" />
        <StatCard icon={CheckCircle} iconColor="emerald" value={stats.checkedIn} label="Checked In" />
        <StatCard icon={Clock} iconColor="yellow" value={stats.pending} label="Pending" />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedConcert} onChange={e => { setSelectedConcert(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            options={concerts.map(c => ({ value: c._id, label: c.title }))} className="flex-1" />
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ticket code..." className="flex-1" />
          <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            options={[{ value: 'all', label: 'All Status' }, { value: 'checked-in', label: 'Checked In' }, { value: 'pending', label: 'Pending' }]} />
        </div>
      </Card>

      {/* Attendees Table */}
      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : filteredAttendees.length === 0 ? (
          <EmptyState icon={User} title="No attendees found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>{['Attendee', 'Ticket', 'Class', 'Status', 'Check-in Time', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-4">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAttendees.map(ticket => (
                    <tr key={ticket._id} className="hover:bg-white/5">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                            <User size={18} className="text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{ticket.customer?.fullName || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{ticket.customer?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <code className="px-2 py-1 bg-white/5 rounded text-sm text-gray-300">{ticket.ticket_code}</code>
                      </td>
                      <td className="px-5 py-4 text-gray-400">{ticket.ticket_class?.name || 'N/A'}</td>
                      <td className="px-5 py-4">{getStatusBadge(ticket)}</td>
                      <td className="px-5 py-4 text-sm text-gray-400">
                        {ticket.checked_in_at ? formatDate(ticket.checked_in_at) : '-'}
                      </td>
                      <td className="px-5 py-4">
                        {!ticket.checked_in && ticket.status !== 'CANCELLED' && (
                          <Button size="sm" onClick={() => handleCheckIn(ticket._id)}>
                            <CheckCircle size={14} /> Check In
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pagination.page} totalPages={pagination.pages} total={pagination.total}
              onPageChange={p => setPagination(prev => ({ ...prev, page: p }))} itemLabel="attendees" />
          </>
        )}
      </Card>
    </div>
  );
}
