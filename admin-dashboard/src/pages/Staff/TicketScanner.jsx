/**
 * Ticket Scanner - Refactored
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { QrCode, CheckCircle, XCircle, AlertCircle, User, Ticket, Clock, Camera, Keyboard, List, RefreshCw } from 'lucide-react';
import { Button, Card, StatCard, Select, Input, Badge } from '../../components/ui';
import { API_URL, formatDate } from '../../services/api';
import { resolvePerformanceDate } from '../../utils/performanceDate';

export default function TicketScanner() {
  const { authFetch } = useAuth();
  const [concerts, setConcerts] = useState([]);
  const [selectedConcert, setSelectedConcert] = useState('');
  const [stats, setStats] = useState({ checkedIn: 0, pending: 0, total: 0 });
  const [manualMode, setManualMode] = useState(true);
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

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

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!selectedConcert) return;
    try {
      const res = await authFetch(`${API_URL}/tickets/concert/${selectedConcert}/check-in-list?limit=1`);
      const data = await res.json();
      if (data.success && data.data.stats) setStats(data.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [selectedConcert, authFetch]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const verifyAndCheckIn = async (code) => {
    if (!code.trim() || !selectedConcert) return;
    
    setLoading(true);
    try {
      // Verify ticket
      const verifyRes = await authFetch(`${API_URL}/tickets/verify`, {
        method: 'POST',
        body: JSON.stringify({ ticketCode: code })
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        setLastScan({ success: false, message: verifyData.message || 'Invalid ticket' });
        addToHistory({ code, success: false, message: verifyData.message });
        return;
      }

      const ticket = verifyData.data.ticket;
      
      // Check if already checked in
      if (ticket.checked_in) {
        setLastScan({ success: false, message: 'Already checked in', ticket });
        addToHistory({ code, success: false, message: 'Already checked in' });
        return;
      }

      // Check-in
      const checkInRes = await authFetch(`${API_URL}/tickets/${ticket._id}/check-in`, { method: 'POST' });
      const checkInData = await checkInRes.json();

      if (checkInData.success) {
        setLastScan({ success: true, message: 'Check-in successful!', ticket });
        addToHistory({ code, success: true, ticket });
        fetchStats();
        toast.success('Check-in successful!');
      } else {
        setLastScan({ success: false, message: checkInData.message });
        addToHistory({ code, success: false, message: checkInData.message });
      }
    } catch (error) {
      setLastScan({ success: false, message: 'Check-in failed' });
      toast.error('Check-in failed');
    } finally {
      setLoading(false);
      setTicketCode('');
    }
  };

  const addToHistory = (scan) => {
    setScanHistory(prev => [{ ...scan, time: new Date() }, ...prev].slice(0, 10));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    verifyAndCheckIn(ticketCode);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ticket Scanner</h1>
          <p className="text-gray-400">Scan tickets for check-in</p>
        </div>
        <div className="flex gap-3">
          <Link to="/staff/check-in"><Button variant="outline"><List size={18} /> View List</Button></Link>
          <Button variant="ghost" onClick={fetchStats}><RefreshCw size={20} /></Button>
        </div>
      </div>

      {/* Concert Selection */}
      <Card>
          <Select label="Select Event" value={selectedConcert} onChange={e => setSelectedConcert(e.target.value)}
          options={concerts.map(c => ({ value: c._id, label: `${c.title} - ${formatDate(resolvePerformanceDate(c) || c.start_time)}` }))} />
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Ticket} iconColor="primary" value={stats.total} label="Total Tickets" />
        <StatCard icon={CheckCircle} iconColor="emerald" value={stats.checkedIn} label="Checked In" />
        <StatCard icon={Clock} iconColor="yellow" value={stats.pending} label="Pending" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner */}
        <Card>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setManualMode(false)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${!manualMode ? 'bg-primary text-white' : 'bg-white/5 text-gray-400'}`}>
              <Camera size={18} /> Camera
            </button>
            <button onClick={() => setManualMode(true)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${manualMode ? 'bg-primary text-white' : 'bg-white/5 text-gray-400'}`}>
              <Keyboard size={18} /> Manual
            </button>
          </div>

          {manualMode ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Ticket Code" value={ticketCode} onChange={e => setTicketCode(e.target.value.toUpperCase())}
                placeholder="Enter ticket code" autoFocus />
              <Button type="submit" loading={loading} className="w-full" disabled={!ticketCode.trim()}>
                <QrCode size={18} /> Verify & Check-in
              </Button>
            </form>
          ) : (
            <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Camera size={48} className="mx-auto text-gray-600 mb-2" />
                <p className="text-gray-400">Camera scanner coming soon</p>
                <p className="text-gray-500 text-sm">Use manual mode for now</p>
              </div>
            </div>
          )}
        </Card>

        {/* Result */}
        <div className="space-y-4">
          {/* Last Scan Result */}
          {lastScan && (
            <Card className={`border-2 ${lastScan.success ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-full ${lastScan.success ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  {lastScan.success ? <CheckCircle size={32} className="text-emerald-400" /> : <XCircle size={32} className="text-red-400" />}
                </div>
                <div>
                  <p className={`text-lg font-semibold ${lastScan.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {lastScan.success ? 'Success!' : 'Failed'}
                  </p>
                  <p className="text-gray-400">{lastScan.message}</p>
                  {lastScan.ticket && (
                    <div className="mt-2 text-sm text-gray-500">
                      <p>{lastScan.ticket.customer?.fullName}</p>
                      <p>{lastScan.ticket.ticket_class?.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Scan History */}
          <Card title="Recent Scans">
            {scanHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No scans yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {scanHistory.map((scan, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      {scan.success ? <CheckCircle size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
                      <div>
                        <code className="text-sm text-gray-300">{scan.code}</code>
                        {scan.ticket && <p className="text-xs text-gray-500">{scan.ticket.customer?.fullName}</p>}
                        {!scan.success && <p className="text-xs text-red-400">{scan.message}</p>}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{scan.time.toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
