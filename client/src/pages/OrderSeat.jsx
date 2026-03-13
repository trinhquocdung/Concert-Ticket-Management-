import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext.jsx';
import ProcessBar from '../components/ProcessBar';

const getContrastColor = (hex) => {
  try {
    if (!hex || !hex.startsWith('#')) return '#fff';
    const c = hex.substring(1);
    const r = parseInt(c.substring(0,2),16);
    const g = parseInt(c.substring(2,4),16);
    const b = parseInt(c.substring(4,6),16);
    const brightness = (r*299 + g*587 + b*114) / 1000;
    return brightness > 186 ? '#000' : '#fff';
  } catch (e) {
    return '#fff';
  }
};

const Seat = ({ seat, size = 8, onToggle, isSelected, color, scale = 1 }) => {
  const baseClass = 'rounded-full cursor-pointer border flex items-center justify-center';

  // color from API may be hex ("#ffd700") or a tailwind bg class like "bg-yellow-200"
  const useBgClass = typeof color === 'string' && color.startsWith('bg-');
  const inlineStyle = { width: size, height: size };

  // Selected seats should be white
  if (isSelected) {
    inlineStyle.backgroundColor = '#ffffff';
    inlineStyle.borderColor = '#d1d5db'; // lighter border when selected
  } else if (seat.status === 'locked') {
    // locked / unavailable
    inlineStyle.backgroundColor = '#4b5563'; // gray-600
  } else {
    // available: prefer explicit hex color from API, otherwise apply tailwind bg class if provided
    if (typeof color === 'string' && color.startsWith('#')) {
      inlineStyle.backgroundColor = color;
    } else if (useBgClass) {
      // leave background to the tailwind class; inline style fallback will be used if class missing
    } else {
      inlineStyle.backgroundColor = '#374151'; // gray-700 default
    }
  }

  const className = `${baseClass} border-gray-600 ${useBgClass && !isSelected ? color : ''}`;

  // determine text color for seat number
  let textColor = '#fff';
  if (isSelected) textColor = '#000';
  else if (typeof color === 'string' && color.startsWith('#')) textColor = getContrastColor(color);

  return (
    <div
      title={`Row ${seat.row} - ${seat.number} (${seat.status})`}
      onClick={() => seat.status !== 'locked' && onToggle(seat)}
      className={className}
      style={inlineStyle}
    >
      {(isSelected || (scale && scale >= 1.1)) && (
        <span style={{ fontSize: Math.max(10, size / 1.6), color: textColor, fontWeight: 600 }}>{seat.label || seat.number}</span>
      )}
    </div>
  );
};

const SeatChart = ({ layout, zones, onToggleSeat, selectedSeatIds }) => {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      // only affect seat chart panel when pointer is inside
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.1 : 0.9;
      setScale((s) => Math.min(3, Math.max(0.5, s * factor)));
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="relative bg-gray-800 border border-gray-700 rounded p-3 h-[560px] overflow-hidden" ref={containerRef}>
      <div className="absolute top-2 left-2 bg-gray-700/70 px-2 py-1 rounded text-xs text-gray-100 shadow">
        Zoom: {(scale * 100).toFixed(0)}%
      </div>

      <div className="h-full w-full flex items-center justify-center">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
          <div className="space-y-2">
            {layout.map((row) => (
              <div key={row.row} className="flex items-center space-x-2">
                <div className="w-6 text-right text-sm text-gray-300">{row.row}</div>
                <div className="flex items-center space-x-2">
                  {row.seats.map((s) => {
                    const zone = zones.find((z) => String(z.id) === String(s.zone)) || {};
                    const color = s.status === 'empty' ? 'bg-gray-700' : s.status === 'locked' ? 'bg-gray-600' : 'bg-gray-700';
                    return (
                      <Seat
                        key={s.id}
                        seat={s}
                        size={14}
                        onToggle={onToggleSeat}
                        isSelected={selectedSeatIds.includes(String(s.id))}
                        color={zone.color || s.color}
                        scale={scale}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TicketInfo = ({ eventData, selectedSeats, ticketClasses = [], onContinue }) => {
  const subtotal = selectedSeats.reduce((s, seat) => s + (seat.price || 0), 0);
  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-4 h-[560px] flex flex-col text-gray-100">
      <div className="overflow-y-auto pr-2">
        <h2 className="text-lg font-semibold mb-2">Ticket Information</h2>
        <div className="text-sm text-gray-200 space-y-1">
          <div> {eventData?.name || '—'}</div>
          <div><strong>Date:</strong> {eventData?.date || '—'}</div>
          <div><strong>Start:</strong> {eventData?.start || '—'}</div>
          <div><strong>End:</strong> {eventData?.end || '—'}</div>
          <div><strong>Venue:</strong> {eventData?.venue || '—'}</div>
        </div>
        {ticketClasses && ticketClasses.length > 0 && (
          <div className="mt-3">
            <h3 className="font-medium">Ticket Prices</h3>
            <div className="mt-2 text-sm">
              {ticketClasses.map((tc) => (
                <div key={tc.id} className="flex justify-between py-1 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ background: tc.color || '#374151', border: '1px solid rgba(148,163,184,0.3)' }} />
                    <div className="text-sm">{tc.name}</div>
                  </div>
                  <div className="font-medium">{(tc.price || 0).toLocaleString('en-US')} VND</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <h3 className="font-medium">Tickets</h3>
          <div className="mt-2 text-sm space-y-1">
            {selectedSeats.length === 0 && <div className="text-gray-400">No seats selected</div>}
            {selectedSeats.map((s) => (
              <div key={s.id} className="flex justify-between py-1 border-b border-gray-700">
                <div className="text-sm">Row {s.row} - {s.number} ({s.ticketClass || 'General'})</div>
                <div className="font-medium">{(s.price || 0).toLocaleString('en-US')} VND</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-sm pb-3 border-t border-gray-700 pt-3">
          <div>Subtotal</div>
          <div className="font-semibold">{subtotal.toLocaleString('en-US')} VND</div>
        </div>
        <button
          onClick={onContinue}
          disabled={selectedSeats.length === 0}
          className="w-full mt-3 bg-indigo-600 text-white py-2 rounded disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const OrderSeat = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [eventData, setEventData] = useState(null);
  const [layout, setLayout] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const location = useLocation();
  const passedPerformanceId = location?.state?.showTime?._id || location?.state?.showTime?.id || sessionStorage.getItem('selectedPerformanceId') || null;

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    const fetchData = async () => {
      try {
        const [eventRes, seatsRes] = await Promise.all([
          api.event.getById(id),
          api.ticket.getSeats(id, passedPerformanceId)
        ]);

        // Normalize event data
        const concert = eventRes?.data?.concert || eventRes?.data || eventRes?.data?.concert || eventRes;
        if (mounted) {
          // Prefer selected performance details when available (passed via navigation state or performanceId)
          const navPerf = location?.state?.showTime || null;
          let perfDoc = null;
          if (navPerf) perfDoc = navPerf;
          else if (passedPerformanceId && concert && Array.isArray(concert.performances)) {
            perfDoc = concert.performances.find(p => String(p._id) === String(passedPerformanceId));
          }

          if (perfDoc) {
            const dateObj = perfDoc.date ? new Date(perfDoc.date) : (concert?.start_time ? new Date(concert.start_time) : null);
            let startStr = '';
            let endStr = '';
            try {
              if (perfDoc.startTime) {
                const parts = String(perfDoc.startTime).split(':').map(Number);
                const sd = new Date(perfDoc.date);
                sd.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
                startStr = sd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              } else if (concert?.start_time) {
                startStr = new Date(concert.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              }
              if (perfDoc.endTime) {
                const parts = String(perfDoc.endTime).split(':').map(Number);
                const ed = new Date(perfDoc.date);
                ed.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
                endStr = ed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              } else if (concert?.end_time) {
                endStr = new Date(concert.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              }
            } catch (e) {
              // fall back to concert-level times
              startStr = concert?.start_time ? new Date(concert.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
              endStr = concert?.end_time ? new Date(concert.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
            }

            setEventData({
              name: concert?.title || concert?.name || concert?._id || 'Event',
              date: dateObj ? dateObj.toLocaleDateString('en-US') : (concert?.start_time ? new Date(concert.start_time).toLocaleDateString('en-US') : ''),
              start: startStr || '',
              end: endStr || '',
              venue: concert?.venue?.name || (concert?.venue || ''),
              performanceId: perfDoc._id || perfDoc.id || null
            });
          } else {
            setEventData({
              name: concert?.title || concert?.name || concert?._id || 'Event',
              date: concert?.start_time ? new Date(concert.start_time).toLocaleDateString('en-US') : concert?.date,
              start: concert?.start_time ? new Date(concert.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : concert?.start,
              end: concert?.end_time ? new Date(concert.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : concert?.end,
              venue: concert?.venue?.name || (concert?.venue || '')
            });
          }
        }

        const seatsData = seatsRes?.data?.seats || seatsRes?.data || [];
        // Group seats by row
        const rows = {};
        seatsData.forEach((s) => {
          const rowKey = s.row || s.row;
          if (!rows[rowKey]) rows[rowKey] = { row: rowKey, seats: [] };

          // prefer showSeatId (assignment id) for selection/locking; fallback to venue seat _id
          const idForClient = String(s.showSeatId || s.showSeat || s._id || s.id);

          // Map backend status to UI status used by this component
          const statusMap = (st) => {
            if (!st) return 'locked';
            if (st === 'AVAILABLE') return 'empty';
            if (st === 'LOCKED') return 'locked';
            if (st === 'SOLD') return 'locked';
            if (st === 'UNASSIGNED') return 'locked';
            return 'locked';
          };

          rows[rowKey].seats.push({
            id: idForClient,
            row: s.row,
            number: s.number,
            status: statusMap(s.status),
            zone: s.ticketClass?._id || s.ticketClass?.name || null,
            price: s.price || s.ticketClass?.price || 0,
            ticketClass: s.ticketClass?.name || null,
            color: s.ticketClass?.color || null
          });
        });

        // Sort seats within each row by seat number, and sort rows alphabetically
        const layoutArray = Object.values(rows)
          .map(row => ({
            ...row,
            seats: row.seats.sort((a, b) => a.number - b.number)
          }))
          .sort((a, b) => a.row.localeCompare(b.row));
        console.debug('OrderSeat: loaded layout rows', layoutArray.length, layoutArray.slice(0,3));
        if (mounted) setLayout(layoutArray);

        const ticketClasses = seatsRes?.data?.ticketClasses || seatsRes?.data?.ticketClasses || [];
        console.debug('OrderSeat: ticketClasses', ticketClasses);
        if (mounted) setZones((ticketClasses || []).map(tc => ({ id: tc._id || tc._id, name: tc.name, color: tc.color, price: tc.price })));

      } catch (err) {
        console.error('Failed to load event or seats', err);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [id]);

  // Mark that a purchase flow for this event is in progress (used to restore on accidental navigation)
  useEffect(() => {
    try {
      if (id) sessionStorage.setItem('purchase_progress', JSON.stringify({ eventId: id, eventTitle: eventData?.name || '', step: 'order', ts: Date.now() }));
    } catch (e) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, eventData]);

  const onToggleSeat = (seat) => {
    const sid = String(seat.id);
    console.debug('OrderSeat: toggle seat', sid, seat);
    setSelectedSeatIds((s) => {
      if (s.includes(sid)) return s.filter((id) => id !== sid);
      return [...s, sid];
    });
  };

  const selectedSeats = [];
  layout.forEach((row) => row.seats.forEach((s) => { if (selectedSeatIds.includes(s.id)) selectedSeats.push(s); }));

  // Sync selected seats with global cart so the corner cart updates automatically
  const { addToCart, cartItems, removeSeat, removeFromCart } = useCart();

  useEffect(() => {
    if (!id) return;

    // If no seats selected for this event, remove cart items for this event
    if (selectedSeats.length === 0) {
      // remove any cart items belonging to this event
      (cartItems || []).forEach((it) => {
        if (String(it.eventId) === String(id)) removeFromCart(it.id);
      });
      return;
    }

    // Group seats by ticketClass (ticketClassId stored in zone)
    const groups = {};
    selectedSeats.forEach((s) => {
      const tcId = s.zone || s.ticketClass || 'default';
      if (!groups[tcId]) groups[tcId] = { ticketClassId: tcId, ticketClassName: s.ticketClass || tcId, price: s.price || 0, seats: [], performanceId: passedPerformanceId };
      groups[tcId].seats.push({ id: s.id, row: s.row, number: s.number, price: s.price });
    });

    // Add each group to cart (addToCart will merge seats)
    Object.values(groups).forEach((g) => {
      addToCart({
        eventId: id,
        eventTitle: eventData?.name || '',
        eventDate: eventData?.date || '',
        eventVenue: eventData?.venue || '',
        ticketClassId: g.ticketClassId,
        ticketClassName: g.ticketClassName,
        performanceId: g.performanceId || null,
        price: g.price,
        seats: g.seats,
      });
    });

    // Remove seats from cart that are no longer selected
    (cartItems || []).forEach((it) => {
      if (String(it.eventId) !== String(id)) return;
      (it.seats || []).forEach((s) => {
        const stillSelected = selectedSeats.find((ss) => String(ss.id) === String(s.id));
        if (!stillSelected) removeSeat(it.id, s.id);
      });
    });
  // Only run when selection or event data changes. Avoid including `cartItems` to prevent update loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeatIds, eventData]);

  return (
    <div className="container mx-auto px-4 pt-4 pb-6 bg-gray-900 text-gray-100 min-h-screen">
      <ProcessBar current="order" />

      <div className="mb-3 relative">
        <button onClick={() => navigate(-1)} className="absolute left-0 text-gray-300 hover:text-white">← Back</button>
        <h1 className="text-2xl font-semibold text-center">Select Seats</h1>
      </div>

      <div className="flex items-start gap-6">
        <div className="w-1/2">
          <SeatChart layout={layout} zones={zones} onToggleSeat={onToggleSeat} selectedSeatIds={selectedSeatIds} />

          <div className="mt-3 p-3 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200">
            <div className="mb-2">Select tickets:</div>
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-white border border-gray-300" /> Selected</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-gray-600" /> Locked</div>
            </div>

            <div className="mt-2 text-xs text-gray-400">Tip: Zoom with mouse wheel to reveal seat numbers.</div>
          </div>
        </div>

        <div className="w-1/2">
          <TicketInfo
            eventData={eventData}
            selectedSeats={selectedSeats}
            ticketClasses={zones}
            onContinue={() => {
              // store last event id so FillInfo can redirect back if reservation expires
              try { sessionStorage.setItem('fill_last_event', id); } catch (e) {}
              navigate('/fillinfo');
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderSeat;
