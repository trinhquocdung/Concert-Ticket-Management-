/**
 * Organizer Dashboard - Refactored
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Ticket, DollarSign, Users, TrendingUp, ArrowUpRight, Eye, Edit, Plus, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageLoader, Card, Badge, Button } from '../../components/ui';
import { API_URL, formatCurrency, formatDate } from '../../services/api';
import { resolvePerformanceDate } from '../../utils/performanceDate';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.[0]) {
    return <div className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2"><p className="text-gray-400 text-xs">{label}</p><p className="text-white font-semibold">₫{(payload[0].value / 1000000).toFixed(0)}M</p></div>;
  }
  return null;
};

export default function OrganizerDashboard() {
  const { authFetch, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ events: [], stats: { totalRevenue: 0, totalTickets: 0, soldTickets: 0 }, salesData: [], recentOrders: [] });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [eventsRes, ordersRes] = await Promise.all([
          fetch(`${API_URL}/concerts?organizer=${user?._id}&limit=10`).catch(() => ({ ok: false })),
          authFetch(`${API_URL}/orders?limit=5`).catch(() => ({ ok: false }))
        ]);

        let events = [], orders = [];
        if (eventsRes.ok) { const d = await eventsRes.json(); if (d.success) events = d.data.concerts || []; }
        if (ordersRes.ok) { const d = await ordersRes.json(); if (d.success) orders = d.data.orders || []; }

        const totalRevenue = events.reduce((s, e) => s + (e.revenue || 0), 0);
        const totalTickets = events.reduce((s, e) => s + (e.total_tickets || 0), 0);
        const soldTickets = events.reduce((s, e) => s + (e.sold_tickets || 0), 0);

        const salesData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(date => ({
          date, sales: Math.floor(Math.random() * 25000000) + 10000000
        }));

        setData({ events, stats: { totalRevenue, totalTickets, soldTickets }, salesData, recentOrders: orders });
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authFetch, user]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Organizer Dashboard</h1><p className="text-gray-500">Manage your events and track sales</p></div>
        <Link to="/events/new"><Button><Plus size={18} /> Create Event</Button></Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: DollarSign, gradient: 'from-emerald-500 to-emerald-600', value: formatCurrency(data.stats.totalRevenue), label: 'Total Revenue' },
          { icon: Ticket, gradient: 'from-blue-500 to-blue-600', value: data.stats.soldTickets.toLocaleString(), label: 'Tickets Sold' },
          { icon: Calendar, gradient: 'from-purple-500 to-purple-600', value: data.events.length.toString(), label: 'Active Events' }
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center`}>
                <stat.icon className="text-white" size={24} />
              </div>
              <div><p className="text-2xl font-bold text-white">{stat.value}</p><p className="text-sm text-gray-500">{stat.label}</p></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2" title="Weekly Sales">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.salesData}>
                <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F84565" stopOpacity={0.3} /><stop offset="95%" stopColor="#F84565" stopOpacity={0} />
                </linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af' }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="sales" stroke="#F84565" strokeWidth={2} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Orders */}
        <Card title="Recent Orders">
          <div className="space-y-3">
            {data.recentOrders.slice(0, 4).map(order => (
              <div key={order._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div><p className="text-white text-sm">{order.customer?.fullName || 'N/A'}</p><p className="text-xs text-gray-500">{order.items?.length || 1} ticket(s)</p></div>
                <div className="text-right"><p className="text-emerald-400 font-medium">{formatCurrency(order.total_amount)}</p></div>
              </div>
            ))}
            {data.recentOrders.length === 0 && <p className="text-gray-500 text-center py-4">No orders yet</p>}
          </div>
        </Card>
      </div>

      {/* My Events */}
      <Card title="My Events">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.events.map(event => (
            <div key={event._id} className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all">
              <img src={event.banner || 'https://via.placeholder.com/300x150'} alt="" className="w-full h-32 object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white truncate">{event.title}</h3>
                  <Badge variant={event.status === 'PUB' ? 'emerald' : event.status === 'DRAFT' ? 'gray' : 'red'}>{event.status}</Badge>
                </div>
                <p className="text-sm text-gray-500 mb-3">{formatDate(resolvePerformanceDate(event) || event.start_time)}</p>
                <div className="flex items-center justify-between">
                  <div className="text-sm"><span className="text-primary font-medium">{event.sold_tickets || 0}</span><span className="text-gray-500">/{event.total_tickets || 0} sold</span></div>
                  <div className="flex gap-1">
                    <Link to={`/events/${event._id}`} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><Eye size={16} /></Link>
                    <Link to={`/events/${event._id}/edit`} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><Edit size={16} /></Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {data.events.length === 0 && (
            <div className="col-span-full text-center py-8"><p className="text-gray-500 mb-4">No events yet</p>
              <Link to="/events/new"><Button><Plus size={16} /> Create Your First Event</Button></Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
