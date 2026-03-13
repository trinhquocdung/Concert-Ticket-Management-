import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { PageLoader, Card, Button } from '../../components/ui';
import * as eventService from '../../services/eventService';
import { formatDate } from '../../services/api';
import { resolvePerformanceDate } from '../../utils/performanceDate';

export default function EventsTickets() {
  const { authFetch } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        // load first 50 events for admin overview
        const res = await eventService.getConcerts(authFetch, { page: 1, limit: 50 });
        if (mounted) setEvents(res.data.concerts || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load events');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [authFetch]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Events & Ticket Classes</h1>
          <p className="text-gray-400">Quick view of events and their ticket classes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(ev => (
          <Card key={ev._id} className="p-4 min-h-[150px] flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-white truncate">{ev.title}</h3>
              <p className="text-sm text-gray-400">{formatDate(resolvePerformanceDate(ev) || ev.start_time)} • {ev.venue?.name || ev.venue}</p>

              <div className="mt-3 text-sm text-gray-300">
                {ev.ticketClasses && ev.ticketClasses.length > 0 ? (
                  <div className="space-y-2">
                    {ev.ticketClasses.map(tc => (
                      <div key={tc._id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div style={{ width: 12, height: 12, background: tc.color || '#3B82F6', borderRadius: 4 }} />
                          <span className="truncate max-w-[220px]">{tc.name}</span>
                        </div>
                        <div className="text-white ml-4 whitespace-nowrap" style={{ minWidth: 88, textAlign: 'right' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tc.price)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">No ticket classes</div>
                )}
              </div>
            </div>

            <div className="mt-4 self-end">
              <Link to={`/events/${ev._id}/tickets`}>
                <Button>Manage tickets</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
