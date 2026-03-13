/**
 * Staff Dashboard - Refactored
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { QrCode, Users, CheckCircle, Clock, Calendar, ArrowRight, UserCheck, UserX, AlertCircle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PageLoader, Card, Badge, Button, StatCard } from '../../components/ui';
import { API_URL, formatDate } from '../../services/api';
import { resolvePerformanceDate } from '../../utils/performanceDate';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.[0]) {
    return <div className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2"><p className="text-gray-400 text-xs">{label}</p><p className="text-white font-semibold">{payload[0].value} people</p></div>;
  }
  return null;
};

export default function StaffDashboard() {
  const { authFetch, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ events: [], stats: { checkedIn: 0, pending: 0, invalid: 0 }, checkInData: [], recentScans: [] });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const eventsRes = await fetch(`${API_URL}/concerts?status=PUB&limit=5`).catch(() => ({ ok: false }));
        let events = [];
        if (eventsRes.ok) { const d = await eventsRes.json(); if (d.success) events = d.data.concerts || []; }

        // Mock check-in data
        const checkInData = ['18:00', '18:30', '19:00', '19:30', '20:00'].map(time => ({ time, count: Math.floor(Math.random() * 150) + 20 }));
        const checkedIn = checkInData.reduce((s, d) => s + d.count, 0);

        setData({
          events: events.slice(0, 3).map(e => ({ ...e, checkedIn: Math.floor(Math.random() * 500), totalTickets: e.total_tickets || 1000 })),
          stats: { checkedIn, pending: 1000 - checkedIn, invalid: Math.floor(Math.random() * 15) },
          checkInData,
          recentScans: [
            { id: 1, ticket: 'QST-VIP-001', name: 'Nguyen Van A', status: 'valid', time: '2 min ago' },
            { id: 2, ticket: 'QST-STD-125', name: 'Tran Thi B', status: 'valid', time: '5 min ago' },
            { id: 3, ticket: 'QST-VIP-032', name: 'Le Van C', status: 'invalid', time: '8 min ago' },
            { id: 4, ticket: 'QST-STD-089', name: 'Pham Thi D', status: 'used', time: '10 min ago' }
          ]
        });
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authFetch]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Staff Dashboard</h1><p className="text-gray-500">Check-in and ticket scanning</p></div>
        <Link to="/staff/scanner"><Button><QrCode size={18} /> Open Scanner</Button></Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={UserCheck} iconColor="emerald" value={data.stats.checkedIn} label="Checked In" subtitle={`out of ${data.stats.checkedIn + data.stats.pending}`} />
        <StatCard icon={Clock} iconColor="yellow" value={data.stats.pending} label="Pending" subtitle="awaiting entry" />
        <StatCard icon={AlertCircle} iconColor="red" value={data.stats.invalid} label="Invalid Scans" subtitle="today" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in Activity */}
        <Card title="Check-in Activity">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.checkInData}>
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#F84565" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Scans */}
        <Card title="Recent Scans">
          <div className="space-y-3">
            {data.recentScans.map(scan => (
              <div key={scan.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  {scan.status === 'valid' ? <CheckCircle className="text-emerald-400" size={18} /> :
                   scan.status === 'invalid' ? <AlertCircle className="text-red-400" size={18} /> :
                   <UserX className="text-yellow-400" size={18} />}
                  <div><p className="text-white text-sm">{scan.name}</p><code className="text-xs text-gray-500">{scan.ticket}</code></div>
                </div>
                <div className="text-right">
                  <Badge variant={scan.status === 'valid' ? 'emerald' : scan.status === 'invalid' ? 'red' : 'yellow'}>{scan.status}</Badge>
                  <p className="text-xs text-gray-500 mt-1">{scan.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Assigned Events */}
      <Card title="Assigned Events">
        <div className="space-y-3">
          {data.events.map(event => (
            <div key={event._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-4">
                <img src={event.banner || 'https://via.placeholder.com/80'} alt="" className="w-16 h-16 rounded-lg object-cover" />
                <div>
                  <h3 className="font-semibold text-white">{event.title}</h3>
                  <p className="text-sm text-gray-500">{formatDate(resolvePerformanceDate(event) || event.start_time)} • {event.venue?.name || 'TBA'}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    <span className="text-gray-400"><UserCheck size={14} className="inline mr-1" />{event.checkedIn}</span>
                    <span className="text-gray-400">/{event.totalTickets}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{Math.round((event.checkedIn / event.totalTickets) * 100)}%</p>
                  <p className="text-xs text-gray-500">checked in</p>
                </div>
                <Link to="/staff/scanner" className="p-3 bg-primary/20 hover:bg-primary/30 rounded-lg text-primary transition-colors">
                  <QrCode size={20} />
                </Link>
              </div>
            </div>
          ))}
          {data.events.length === 0 && <p className="text-gray-500 text-center py-8">No assigned events</p>}
        </div>
      </Card>
    </div>
  );
}
