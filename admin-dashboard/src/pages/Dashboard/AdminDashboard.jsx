/**
 * Admin Dashboard - Refactored
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, Calendar, Ticket, DollarSign, ArrowUpRight, ArrowDownRight, ShoppingCart, Building2, Music, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageLoader, Card, Badge } from '../../components/ui';
import { API_URL, formatCurrency, formatDate } from '../../services/api';
import { resolvePerformanceDate } from '../../utils/performanceDate';

const COLORS = ['#F84565', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.[0]) {
    return (
      <div className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-gray-400 text-xs">{label}</p>
        <p className="text-white font-semibold">₫{(payload[0].value / 1000000).toFixed(1)}M</p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalUsers: 0, totalEvents: 0, totalOrders: 0, totalRevenue: 0,
    usersByRole: {}, recentOrders: [], upcomingEvents: [], revenueData: [],
    topConcerts: [], notifications: [], pendingCancellations: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, eventsRes, ordersRes, statsRes] = await Promise.all([
        authFetch(`${API_URL}/users/stats`).catch(() => ({ ok: false })),
        fetch(`${API_URL}/concerts?limit=10&status=PUB`).catch(() => ({ ok: false })),
        authFetch(`${API_URL}/orders?limit=5`).catch(() => ({ ok: false })),
        authFetch(`${API_URL}/orders/admin/stats`).catch(() => ({ ok: false }))
      ]);

      let userData = { total: 0, byRole: {} }, eventsData = { concerts: [], pagination: { total: 0 } };
      let ordersData = { orders: [], pagination: { total: 0 } }, orderStats = { summary: {}, topConcerts: [], revenueByDay: [] };

      if (usersRes.ok) { const d = await usersRes.json(); if (d.success) userData = d.data; }
      if (eventsRes.ok) { const d = await eventsRes.json(); if (d.success) eventsData = d.data; }
      if (ordersRes.ok) { const d = await ordersRes.json(); if (d.success) ordersData = d.data; }
      if (statsRes.ok) { const d = await statsRes.json(); if (d.success) orderStats = d.data; }

      // Pending cancellations
      let pendingCancellations = 0;
      try {
        const cancelRes = await authFetch(`${API_URL}/orders/admin/cancellations?cancellationStatus=PENDING&limit=1`);
        if (cancelRes.ok) { const d = await cancelRes.json(); pendingCancellations = d.data?.pagination?.total || 0; }
      } catch {}

      // Notifications
      const notifications = [];
      if (pendingCancellations > 0) {
        notifications.push({ type: 'warning', title: 'Pending Cancellations', message: `${pendingCancellations} request(s) need review`, link: '/orders/cancellations', icon: AlertCircle });
      }
      const soonEvents = (eventsData.concerts || []).filter(e => { const ed = resolvePerformanceDate(e) || new Date(e.start_time); const h = (new Date(ed) - new Date()) / 3600000; return h > 0 && h < 48; });
      if (soonEvents.length > 0) {
        notifications.push({ type: 'info', title: 'Events Starting Soon', message: `${soonEvents.length} event(s) within 48 hours`, link: '/events', icon: Calendar });
      }

      const totalRevenue = orderStats.summary?.totalRevenue || (ordersData.orders || []).filter(o => o.status === 'PAID').reduce((s, o) => s + (o.total_amount || 0), 0);
      const revenueData = (orderStats.revenueByDay || []).length > 0
        ? orderStats.revenueByDay.map(d => ({ name: new Date(d._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: d.revenue }))
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(name => ({ name, revenue: Math.floor(Math.random() * 50000000) + 20000000 }));

      setData({
        totalUsers: userData.total || 0, usersByRole: userData.byRole || {},
        totalEvents: eventsData.pagination?.total || 0, totalOrders: ordersData.pagination?.total || 0,
        totalRevenue, recentOrders: ordersData.orders || [], upcomingEvents: eventsData.concerts || [],
        revenueData, topConcerts: (orderStats.topConcerts || []).slice(0, 5).map(tc => ({ title: tc.concert?.title || 'Unknown', revenue: tc.revenue, ticketsSold: tc.ticketsSold })),
        notifications, pendingCancellations
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const statCards = [
    { title: 'Total Revenue', value: formatCurrency(data.totalRevenue), change: '+12.5%', trend: 'up', icon: DollarSign, gradient: 'from-emerald-500 to-emerald-600', link: '/orders' },
    { title: 'Total Orders', value: data.totalOrders.toLocaleString(), change: '+8.2%', trend: 'up', icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600', link: '/orders' },
    { title: 'Active Events', value: data.totalEvents.toString(), change: '+3', trend: 'up', icon: Calendar, gradient: 'from-purple-500 to-purple-600', link: '/events' },
    { title: 'Total Users', value: data.totalUsers.toLocaleString(), change: '+156', trend: 'up', icon: Users, gradient: 'from-orange-500 to-orange-600', link: '/users' },
  ];

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Dashboard</h1><p className="text-gray-500">Welcome back! Here's what's happening.</p></div>
        <button onClick={fetchData} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"><RefreshCw size={20} /></button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Link key={i} to={stat.link} className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                <stat.icon className="text-white" size={24} />
              </div>
              <span className={`flex items-center gap-1 text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                {stat.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}{stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-white group-hover:text-primary transition-colors">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.title}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Notifications */}
      {data.notifications.length > 0 && (
        <div className="space-y-3">
          {data.notifications.map((notif, i) => (
            <Link key={i} to={notif.link}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.01] ${notif.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
              <div className={`p-2 rounded-lg ${notif.type === 'warning' ? 'bg-yellow-500/20' : 'bg-blue-500/20'}`}>
                <notif.icon className={`w-5 h-5 ${notif.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`} />
              </div>
              <div className="flex-1"><p className="font-medium text-white">{notif.title}</p><p className="text-sm text-gray-400">{notif.message}</p></div>
              <ArrowUpRight className="w-5 h-5 text-gray-500" />
            </Link>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[{ icon: Users, color: 'red', value: data.usersByRole?.ADMIN || 0, label: 'Admins' },
          { icon: Building2, color: 'blue', value: data.usersByRole?.ORG || 0, label: 'Organizers' },
          { icon: Music, color: 'emerald', value: data.usersByRole?.STAFF || 0, label: 'Staff' },
          { icon: Ticket, color: 'orange', value: data.usersByRole?.CUS || 0, label: 'Customers' }
        ].map((s, i) => (
          <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-${s.color}-500/20 rounded-lg`}><s.icon size={18} className={`text-${s.color}-400`} /></div>
              <div><p className="text-lg font-bold text-white">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2" title="Revenue Overview">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueData}>
                <defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F84565" stopOpacity={0.3} /><stop offset="95%" stopColor="#F84565" stopOpacity={0} />
                </linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af' }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#F84565" strokeWidth={2} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Concerts */}
        <Card title="Top Events">
          <div className="space-y-3">
            {data.topConcerts.map((concert, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-primary/20 rounded-full text-xs text-primary font-bold">{i + 1}</span>
                  <div><p className="font-medium text-white text-sm truncate max-w-[150px]">{concert.title}</p><p className="text-xs text-gray-500">{concert.ticketsSold} tickets</p></div>
                </div>
                <p className="text-sm font-semibold text-emerald-400">{formatCurrency(concert.revenue)}</p>
              </div>
            ))}
            {data.topConcerts.length === 0 && <p className="text-gray-500 text-center py-4">No data available</p>}
          </div>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card title="Recent Orders">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>{['Order ID', 'Customer', 'Amount', 'Status', 'Date'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.recentOrders.map(order => (
                <tr key={order._id} className="hover:bg-white/5">
                  <td className="px-4 py-3"><code className="text-xs text-gray-400">#{order._id?.slice(-8)}</code></td>
                  <td className="px-4 py-3 text-white">{order.customer?.fullName || 'N/A'}</td>
                  <td className="px-4 py-3 text-emerald-400">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3"><Badge variant={order.status === 'PAID' ? 'emerald' : order.status === 'PENDING' ? 'yellow' : 'gray'}>{order.status}</Badge></td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pt-4 text-center"><Link to="/orders" className="text-primary hover:underline text-sm">View All Orders →</Link></div>
      </Card>
    </div>
  );
}
