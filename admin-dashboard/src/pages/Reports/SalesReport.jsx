/**
 * Sales Report - Refactored
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, TrendingUp, Ticket, Users, Download, Filter, RefreshCw } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PageLoader, Card, StatCard, Select, Button } from '../../components/ui';
import { API_URL, formatCurrency } from '../../services/api';

const COLORS = ['#F84565', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 shadow-xl">
        <p className="text-gray-400 text-xs mb-2">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' && entry.value > 10000 ? `₫${(entry.value / 1000000).toFixed(0)}M` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SalesReport() {
  const { authFetch } = useAuth();
  const [dateRange, setDateRange] = useState('6months');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalRevenue: 0, ticketsSold: 0, avgTicketPrice: 0, newCustomers: 0,
    revenueData: [], dailySales: [], topEvents: [], ticketClassData: []
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, usersRes, concertsRes] = await Promise.all([
        authFetch(`${API_URL}/orders?limit=100`).catch(() => ({ ok: false })),
        authFetch(`${API_URL}/users/stats`).catch(() => ({ ok: false })),
        fetch(`${API_URL}/concerts?status=PUB&limit=10`).catch(() => ({ ok: false }))
      ]);

      let orders = [], userStats = { total: 0 }, concerts = [];
      if (ordersRes.ok) { const d = await ordersRes.json(); if (d.success) orders = d.data.orders || []; }
      if (usersRes.ok) { const d = await usersRes.json(); if (d.success) userStats = d.data; }
      if (concertsRes.ok) { const d = await concertsRes.json(); if (d.success) concerts = d.data.concerts || []; }

      const completedOrders = orders.filter(o => o.status === 'COMPLETED' || o.status === 'PAID');
      const totalRevenue = completedOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
      const ticketsSold = completedOrders.reduce((s, o) => s + (o.items?.length || 1), 0);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const revenueData = months.map(month => ({
        month, revenue: Math.floor(Math.random() * 60000000) + 30000000, prevRevenue: Math.floor(Math.random() * 50000000) + 25000000
      }));

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dailySales = days.map(day => ({ day, sales: Math.floor(Math.random() * 30) + 10 }));

      setData({
        totalRevenue, ticketsSold, avgTicketPrice: ticketsSold > 0 ? totalRevenue / ticketsSold : 0,
        newCustomers: userStats.byRole?.CUS || 0, revenueData, dailySales,
        topEvents: concerts.slice(0, 5).map(c => ({ name: c.title, tickets: c.sold_tickets || Math.floor(Math.random() * 5000) + 500, revenue: c.revenue || Math.floor(Math.random() * 10000000000) + 1000000000, growth: (Math.random() * 30 - 5).toFixed(1) })),
        ticketClassData: [{ name: 'VIP', value: 25, color: '#F84565' }, { name: 'Premium', value: 35, color: '#3b82f6' }, { name: 'Standard', value: 40, color: '#10b981' }]
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  }, [authFetch, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Sales Report</h1><p className="text-gray-400">Revenue and sales analytics</p></div>
        <div className="flex gap-3">
          <Select value={dateRange} onChange={e => setDateRange(e.target.value)}
            options={[{ value: '7days', label: 'Last 7 Days' }, { value: '30days', label: 'Last 30 Days' }, { value: '6months', label: 'Last 6 Months' }, { value: '1year', label: 'Last Year' }]} />
          <Button variant="outline"><Download size={18} /> Export</Button>
          <Button variant="ghost" onClick={fetchData}><RefreshCw size={18} /></Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} iconColor="emerald" value={formatCurrency(data.totalRevenue)} label="Total Revenue" change="+15.3%" trend="up" />
        <StatCard icon={Ticket} iconColor="blue" value={data.ticketsSold.toLocaleString()} label="Tickets Sold" change="+8.2%" trend="up" />
        <StatCard icon={TrendingUp} iconColor="purple" value={formatCurrency(data.avgTicketPrice)} label="Avg Ticket Price" change="+2.5%" trend="up" />
        <StatCard icon={Users} iconColor="orange" value={data.newCustomers.toLocaleString()} label="New Customers" change="+12.1%" trend="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2" title="Revenue Trend">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F84565" stopOpacity={0.3} /><stop offset="95%" stopColor="#F84565" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af' }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Current" stroke="#F84565" fill="url(#colorRev)" />
                <Area type="monotone" dataKey="prevRevenue" name="Previous" stroke="#3b82f6" fill="url(#colorPrev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Ticket Class Distribution */}
        <Card title="Ticket Class Distribution">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.ticketClassData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {data.ticketClassData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales */}
        <Card title="Sales by Day">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="sales" fill="#F84565" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Events */}
        <Card title="Top Selling Events">
          <div className="space-y-3">
            {data.topEvents.map((event, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-primary/20 rounded-full text-xs text-primary font-bold">{i + 1}</span>
                  <div><p className="font-medium text-white text-sm truncate max-w-[180px]">{event.name}</p><p className="text-xs text-gray-500">{event.tickets.toLocaleString()} tickets</p></div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-400">{formatCurrency(event.revenue)}</p>
                  <p className={`text-xs ${parseFloat(event.growth) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{parseFloat(event.growth) >= 0 ? '+' : ''}{event.growth}%</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
