import React, { useEffect, useState, useRef } from 'react';
import { PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';
import { useUser, useClerk } from '@clerk/clerk-react';
import api from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

const isTicketClassOpenNow = (tc) => {
  if (!tc) return true;
  try {
    const now = new Date();
    if (tc.open_time && new Date(tc.open_time) > now) return false;
    if (tc.close_time && new Date(tc.close_time) < now) return false;
    return true;
  } catch (e) {
    return true;
  }
};

const Seat = ({ seat, isSelected, onClick, statusOverridden }) => {
  const base = {
    width: 28,
    height: 28,
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // allow clicking when the seat is selected by this user OR available
    cursor: (isSelected || seat.status === 'AVAILABLE') ? 'pointer' : 'not-allowed',
    transform: `rotate(${seat.rotation || 0}deg)`,
    boxSizing: 'border-box'
  };

  const status = statusOverridden || seat.status;

  const style = { ...base, position: 'absolute', left: seat.x, top: seat.y };
  // If ticket class exists but is not currently on sale, treat as not available for purchase
  const ticketClassClosed = seat.ticketClass && !isTicketClassOpenNow(seat.ticketClass);

  if (status === 'SOLD' || status === 'UNASSIGNED') {
  if (status === 'SOLD' || status === 'UNASSIGNED' || ticketClassClosed) {
    style.background = '#b91c1c';
    style.border = '1px solid #7f1d1d';
    style.cursor = 'not-allowed';
  } else if (status === 'LOCKED') {
        const allowClick = isSelected || seat.status === 'AVAILABLE' || status === 'AVAILABLE';
        // disallow click if ticket class closed
        if (ticketClassClosed) return;
        if (allowClick) onClick(seat);
      }}
    // If this seat is locked but it's selected by current user, show as selected and allow unselect
    if (isSelected) {
      style.background = '#ffffff';
      style.border = '1px solid #94a3b8';
      style.color = '#000';
      style.cursor = 'pointer';
    } else {
      style.background = '#6b7280';
      style.border = '1px solid #4b5563';
      style.cursor = 'not-allowed';
    }
  } else {
    // AVAILABLE
    const zoneColor = seat.ticketClass?.color || '#ffffff';
    style.background = isSelected ? '#ffffff' : zoneColor;
    style.border = '1px solid #94a3b8';
    style.color = isSelected ? '#000' : '#000';
  }

  return (
    <div
      title={`${seat.row}${seat.number} - ${seat.ticketClass?.name || 'General'}`}
      style={style}
      onClick={(e) => { e.stopPropagation(); const allowClick = isSelected || seat.status === 'AVAILABLE' || status === 'AVAILABLE'; if (allowClick) onClick(seat); }}
    >
      <span style={{ fontSize: 11 }}>{seat.label || seat.number}</span>
    </div>
  );
};

const SeatingChart = ({ concertId, initialSelected = [], onChange, scale = 1, performanceId = null }) => {
  const [seats, setSeats] = useState([]);
  // store selected as array of showSeatIds (backend ShowSeat._id)
  const [selected, setSelected] = useState((initialSelected || []).map(s => s.showSeatId || s._id));
  const [remoteSelecting, setRemoteSelecting] = useState([]);
  const socketRef = useRef(null);
  const [localScale, setLocalScale] = useState(scale);
  const scrollRef = useRef(null);
  const { isSignedIn, isLoaded } = useUser();
  const { openSignIn } = useClerk();

  useEffect(() => {
    let mounted = true;
    const fetchSeats = async () => {
      try {
        const res = await api.ticket.getSeats(concertId, performanceId || sessionStorage.getItem('selectedPerformanceId'));
        if (mounted && res?.data?.seats) {
          // ensure each seat object exposes both venue seat _id and showSeatId and lockedByCurrentUser
          setSeats(res.data.seats.map(s => ({
            ...s,
            x: (s.x || 0) + 20,
            y: (s.y || 0) + 20,
            showSeatId: s.showSeatId || s.showSeat || null,
            lockedByCurrentUser: s.lockedByCurrentUser || false
          })));
        }
      } catch (err) {
        console.error('Failed to load seats', err);
      }
    };

    fetchSeats();

    // Socket connection
    const socket = connectSocket();
    socketRef.current = socket;
    socket.emit('join-concert', concertId);

    socket.on('seats-being-selected', (data) => {
      const { seatIds } = data;
      setRemoteSelecting(prev => Array.from(new Set([...prev, ...seatIds])));
      // remove after short timeout
      setTimeout(() => {
        setRemoteSelecting(prev => prev.filter(id => !seatIds.includes(id)));
      }, 4000);
    });

    socket.on('seats-status-changed', (data) => {
      const { seatIds, status } = data;
      // seatIds are showSeatIds (ShowSeat._id). Update seats and selections accordingly.
      setSeats(prev => prev.map(s => (seatIds.includes(s.showSeatId) || seatIds.includes(s._id)) ? ({ ...s, status }) : s));
      // If seats changed to AVAILABLE, remove from selected
      if (status === 'AVAILABLE') {
        setSelected(prev => prev.filter(id => !seatIds.includes(id)));
      }
    });

    // Listen for price updates (when admin updates ticket class price)
    socket.on('seats-price-updated', (data) => {
      const { seatIds = [], ticketClassId, price } = data || {};
      setSeats(prev => prev.map(s => {
        // update by showSeatId or by ticketClass reference
        const matchesSeat = seatIds.includes(s.showSeatId) || seatIds.includes(s._id);
        const matchesClass = s.ticketClass && (s.ticketClass._id === ticketClassId || s.ticketClass === ticketClassId);
        if (matchesSeat || matchesClass) {
          return {
            ...s,
            price,
            ticketClass: s.ticketClass ? { ...s.ticketClass, price } : s.ticketClass
          };
        }
        return s;
      }));
    });

    socket.on('seats-sale-window-updated', (data) => {
      const { seatIds = [], ticketClassId, open_time, close_time } = data || {};
      setSeats(prev => prev.map(s => {
        const matchesSeat = seatIds.includes(s.showSeatId) || seatIds.includes(s._id);
        const matchesClass = s.ticketClass && (s.ticketClass._id === ticketClassId || s.ticketClass === ticketClassId);
        if (matchesSeat || matchesClass) {
          return {
            ...s,
            ticketClass: s.ticketClass ? { ...s.ticketClass, open_time, close_time } : s.ticketClass
          };
        }
        return s;
      }));
    });

    return () => {
      mounted = false;
      try { socket.emit('leave-concert', concertId); } catch (e) { }
      disconnectSocket();
    };
  }, [concertId]);

  useEffect(() => {
    const selectedSeats = selected.map(id => seats.find(s => s.showSeatId === id || s._id === id)).filter(Boolean);
    onChange && onChange(selectedSeats);
  }, [selected, seats, onChange]);

  // keep localScale in sync with incoming prop
  useEffect(() => {
    setLocalScale(scale);
  }, [scale]);

  // prevent page scroll when interacting with the seating area (mouse wheel)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const wheelHandler = (e) => {
      // prevent the page from scrolling when wheel is used over seating area
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      doZoom(delta);
    };

    el.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      el.removeEventListener('wheel', wheelHandler);
    };
  }, []);

  const handleSelect = async (seat) => {
    // If Clerk hasn't finished loading session info, don't prompt yet
    if (!isLoaded) return;

    if (!isSignedIn) {
      // prompt sign in
      openSignIn();
      return;
    }
    const sid = seat.showSeatId || seat._id;
    // toggle
    if (selected.includes(sid)) {
      // release
      try {
        await api.ticket.releaseSeats(concertId, [sid]);
        getSocket() && getSocket().emit('seats-released', { concertId, seatIds: [sid] });
        setSeats(prev => prev.map(s => (s.showSeatId === sid || s._id === sid) ? ({ ...s, status: 'AVAILABLE' }) : s));
        setSelected(prev => prev.filter(id => id !== sid));
      } catch (err) {
        console.error('Failed to release', err);
        alert(err.message || 'Failed to release seat');
      }
      return;
    }

    // Inform others that we're selecting
    getSocket() && getSocket().emit('seat-selecting', { concertId, seatIds: [sid] });

    // Try to lock via API (include performanceId if available)
    try {
      const perf = performanceId || sessionStorage.getItem('selectedPerformanceId') || null;
      const res = await api.ticket.lockSeats(concertId, [sid], perf);
      // On success, server should return lockedUntil
      if (res && res.success) {
        const lockedUntil = res.data?.lockedUntil || null;
        getSocket() && getSocket().emit('seats-locked', { concertId, seatIds: [sid], lockedUntil });
        setSeats(prev => prev.map(s => (s.showSeatId === sid || s._id === sid) ? ({ ...s, status: 'LOCKED' }) : s));
        setSelected(prev => [...prev, sid]);
      } else {
        alert((res && res.message) || 'Seat could not be locked. It may be unavailable.');
      }
    } catch (err) {
      console.error('Lock API error', err);
      // If error message indicates authentication, prompt sign-in
      const msg = err.message || '';
      if (/(unauthori|please login|token)/i.test(msg)) {
        openSignIn();
        return;
      }
      alert(msg || 'Failed to lock seat');
    }
  };

  // compute bounding box
  const width = Math.max(800, ...seats.map(s => s.x + 60));
  const height = Math.max(400, ...seats.map(s => s.y + 60));

  // zoom handlers
  const doZoom = (delta) => {
    setLocalScale(prev => {
      const next = Math.max(0.5, Math.min(2, +(prev + delta).toFixed(2)));
      return next;
    });
  };

  const handleWheel = (e) => {
    // Use wheel for zoom (no modifier required). Prevent default to stop page scroll when zooming.
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    doZoom(delta);
  };

  return (
    <div className="bg-[rgb(28,27,27)] rounded-lg p-4">
      <div ref={scrollRef} style={{ overflow: 'auto' }}>
      <div style={{ transform: `scale(${localScale})`, transformOrigin: 'top left', width: width, height: height, position: 'relative', background: 'linear-gradient(180deg,#0b1320,#071022)', borderRadius: 8 }}>
        {seats.map(seat => {
          const id = seat.showSeatId || seat._id;
          return (
            <Seat
              key={seat._id}
              seat={seat}
              isSelected={selected.includes(id) || seat.lockedByCurrentUser}
              statusOverridden={remoteSelecting.includes(id) ? 'LOCKED' : undefined}
              onClick={handleSelect}
            />
          );
        })}
      </div>
      </div>

      <div className="mt-3 text-sm text-gray-300">
        <div className="flex gap-4 items-center">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-green-500 border rounded-sm" /> <span>Available (by zone)</span>
          <div className="w-4 h-4 bg-white border rounded-sm" /> <span>Selected</span>
          <div className="w-4 h-4 bg-gray-500 rounded-sm" /> <span>Reserved / Locked</span>
        </div>
        <div className="mt-2">Selected: {selected.length} seats</div>
      </div>
    </div>
  );
};

export default SeatingChart;
