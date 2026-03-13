import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProcessBar from '../components/ProcessBar';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const FillInfo = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { cartItems: cartCtxItems, getCartTotals, timeRemaining, hasItems } = useCart();
  const { user: backendUser, loading: authLoading } = useAuth();

  // If user came from OrderSeat with `seats` or `cartItems` in state, use them; otherwise fallback to global cart
  const incomingCart = state?.cartItems || null;
  const seatsFromState = state?.seats || null;
  const event = state?.event || null;

  const cartItems = incomingCart || cartCtxItems || [];
  const totals = getCartTotals();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('email');
  const [phoneError, setPhoneError] = useState('');

  const hasTickets = (cartItems && cartItems.length > 0) || (seatsFromState && seatsFromState.length > 0);

  // Prefill user info (fullName, email) from backend user; phone remains editable
  useEffect(() => {
    if (backendUser) {
      if (!fullName) setFullName(backendUser.fullName || `${backendUser.firstName || ''} ${backendUser.lastName || ''}`.trim());
      if (!email) setEmail(backendUser.email || backendUser.emailAddress || '');
      // Set phone only if backend has it; user can edit it
      if (backendUser.phone) setPhone(backendUser.phone);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUser]);

  // Mark that a purchase flow is in progress (fill step)
  useEffect(() => {
    try {
      const eventId = (cartItems && cartItems[0] && cartItems[0].eventId) || (event && (event._id || event.id)) || '';
      const eventTitle = (cartItems && cartItems[0] && cartItems[0].eventTitle) || event?.name || '';
      if (eventId) sessionStorage.setItem('purchase_progress', JSON.stringify({ eventId, eventTitle, step: 'fill', ts: Date.now() }));
    } catch (e) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When reservation expires or cart becomes empty, redirect back to event detail
  useEffect(() => {
    if (timeRemaining === 0 || !hasItems) {
      const lastEvent = sessionStorage.getItem('fill_last_event');
      const redirectId = lastEvent || (cartItems && cartItems[0] && cartItems[0].eventId) || (event && (event._id || event.id));
      try { sessionStorage.removeItem('fill_last_event'); } catch (e) {}
      if (redirectId) {
        navigate(`/event/${redirectId}`);
      } else {
        navigate('/');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, hasItems]);

  const handleProceedPayment = () => {
    if (!hasTickets || !phone || phone.trim() === '') return;
    navigate('/payment', { state: { cartItems, seats: seatsFromState, event, customer: { fullName, email, phone, idNumber, deliveryMethod } } });
  };

  const isValidPhone = (p) => {
    if (!p) return false;
    const v = p.trim();
    // Vietnamese phone pattern: +84 or 0 followed by 9-10 digits, common prefixes 3,5,7,8,9
    const re = /^(?:\+84|0)(3|5|7|8|9)\d{8}$/;
    return re.test(v);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 pt-16">
      <div className="container mx-auto px-4 py-6">
        <ProcessBar current="fill" />

        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-300 hover:text-white">← Back</button>
          <div className="text-sm text-gray-400">Step 2 / 3</div>
        </div>

        <div className="flex gap-6">
          {/* Left: Event & Ticket summary */}
          <div className="w-2/3">
            <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-4">
                <div className="mb-2 text-sm text-gray-300">Order Summary</div>
              <div className="mt-4 bg-gray-900 border border-gray-800 rounded p-3">
                <h3 className="font-medium mb-2">Ticket recipient information</h3>
                <div className="text-sm text-gray-300">Customer name: <strong className="text-gray-100">{fullName || '—'}</strong></div>
                <div className="text-sm text-gray-300 mt-1">Email: <strong className="text-gray-100">{email || '—'}</strong></div>
                <div className="text-sm text-gray-300 mt-1">Phone: <strong className="text-gray-100">{phone || '—'}</strong></div>
                <div className="text-sm text-gray-300 mt-1">Delivery method: <strong className="text-gray-100">{deliveryMethod === 'email' ? 'Email delivery' : 'Pickup at counter'}</strong></div>
              </div>

              <div className="mt-4 bg-gray-900 border border-gray-800 rounded p-3">
                <h3 className="font-medium mb-2">Seating & Zones</h3>
                {cartItems && cartItems.length > 0 ? (
                  cartItems.map((it) => (
                    <div key={it.id} className="py-2 border-b border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">{it.eventTitle} · {it.eventDate || ''} · {it.eventVenue || ''}</div>
                      <div className="flex justify-between text-sm mb-1">
                        <div>{it.ticketClassName} · {it.seats ? it.seats.length : it.quantity} tickets</div>
                        <div className="font-semibold">{((it.seats && it.seats.reduce((s, x) => s + (x.price || it.price || 0), 0)) || (it.price * (it.quantity || 0))).toLocaleString('en-US')} VND</div>
                      </div>
                      {it.seats && it.seats.map((s) => (
                        <div key={s.id} className="text-xs text-gray-400">Row {s.row} - {s.number} — {(s.price || it.price || 0).toLocaleString('en-US')} VND</div>
                      ))}
                    </div>
                  ))
                ) : seatsFromState && seatsFromState.length > 0 ? (
                  seatsFromState.map((s) => (
                    <div key={s.id} className="py-2 border-b border-gray-800 text-sm flex justify-between">
                      <div>Row {s.row} - {s.number} ({s.ticketClass || '—'})</div>
                      <div className="font-semibold">{(s.price || 0).toLocaleString()} VND</div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400">No seats selected</div>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-gray-800 pt-3">
                  <div className="text-sm text-gray-300">Total</div>
                  <div className="text-lg font-semibold">{totals.total.toLocaleString('en-US')} VND</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Contact form */}
          <div className="w-1/3">
            <div className="bg-gray-800 border border-gray-700 rounded p-4">
              <h3 className="font-semibold mb-3">Recipient Contact Info</h3>

              <label className="text-sm text-gray-300">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full mt-1 mb-3 p-2 bg-gray-900 border border-gray-700 rounded text-white text-sm" />

              <label className="text-sm text-gray-300">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 mb-3 p-2 bg-gray-900 border border-gray-700 rounded text-white text-sm" />

              <label className="text-sm text-gray-300">Phone</label>
              <input value={phone} onChange={(e) => {
                const v = e.target.value;
                setPhone(v);
                if (v.trim() === '') setPhoneError('');
                else if (!isValidPhone(v)) setPhoneError('Invalid phone number format, please try again.');
                else setPhoneError('');
              }} className="w-full mt-1 mb-1 p-2 bg-gray-900 border border-gray-700 rounded text-white text-sm" />
              {phoneError && <div className="text-sm text-red-400 mb-2">{phoneError}</div>}

              <div className="mt-2">
                <div className="text-sm text-gray-300 mb-2">Delivery method</div>
                <div className="flex flex-col gap-2">
                  <label className={`p-2 rounded border ${deliveryMethod === 'email' ? 'border-indigo-500' : 'border-gray-700'} cursor-pointer`}>
                    <input type="radio" name="delivery" value="email" checked={deliveryMethod === 'email'} onChange={() => setDeliveryMethod('email')} className="mr-2" /> Send ticket via email
                  </label>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-400 mb-2">Please enter a phone number to continue (required).</div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => navigate(`/order/${event?._id || (cartItems[0]?.eventId) || ''}`)} className="flex-1 bg-gray-700 text-white py-2 rounded">Change selection</button>
                <button
                  disabled={!(hasTickets && isValidPhone(phone))}
                  onClick={() => {
                    if (!isValidPhone(phone)) {
                      setPhoneError('Invalid phone number format, please try again.');
                      return;
                    }
                    handleProceedPayment();
                  }}
                  className={`flex-1 py-2 rounded ${hasTickets && isValidPhone(phone) ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                >Continue</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FillInfo;
