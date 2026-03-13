import React from 'react';
import { CheckCircle, Calendar, MapPin, Ticket as TicketIcon, Copy } from 'lucide-react';

function AttributeRow({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-800 text-sm">
      <div className="text-gray-400">{label}</div>
      <div className="text-right text-white break-all">{value || '—'}</div>
    </div>
  );
}

export default function OrderTicketCard({ order, orderDetails = [], onDownload }) {
  return (
    <div className="bg-[rgb(255,255,255,0.04)] rounded-xl p-6 shadow-lg border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">{order?.code}</h2>
          <div className="text-sm text-gray-400">{order?.concert?.title || 'Event'}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Total</div>
          <div className="text-2xl font-bold text-green-300">{(order?.total_amount || 0).toLocaleString()} VND</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="col-span-2">
          <div className="bg-[rgba(255,255,255,0.02)] p-3 rounded-md">
            <div className="text-sm text-gray-400">Customer</div>
            <div className="font-semibold text-white">{order?.customer_info?.fullName || order?.customer?.fullName || '—'}</div>
            <div className="text-sm text-gray-400">{order?.customer_info?.email || order?.customer?.email || '—'}</div>
            <div className="text-sm text-gray-400">{order?.customer_info?.phone || order?.customer?.phone || ''}</div>
          </div>
        </div>

        <div>
          <div className="bg-[rgba(255,255,255,0.02)] p-3 rounded-md text-sm">
            <div className="text-gray-400">Order status</div>
            <div className="font-semibold text-white flex items-center gap-2"><CheckCircle className="text-green-400" />{order?.status}</div>
            <div className="text-gray-400 mt-2">Created</div>
            <div className="text-white">{order?.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {orderDetails.length === 0 && <div className="text-sm text-gray-400">No ticket details available.</div>}
        {orderDetails.map((d) => {
          const ticket = d.ticket || {};
          const showSeat = ticket.showSeat || {};
          const seatLabel = showSeat.displayLabel || showSeat.seat?.label || d.ticket_info?.seat_label || '';
          const ticketClass = showSeat.ticketClass?.name || d.ticket_info?.ticket_class || 'General';
          const zoneName = showSeat.ticketClass?.zone?.name || d.ticket_info?.zone_name || '';
          const ticketCode = ticket.ticket_code || d.ticket_info?.ticket_code || '';
          const price = (d.price_snapshot || d.price || 0).toLocaleString();
          return (
            <div key={d._id} className="bg-gradient-to-br from-gray-900 to-gray-800 p-3 rounded-md border border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-400">{order?.concert?.title || d.ticket_info?.concert_title}</div>
                  <div className="text-xl font-bold text-white">{ticketClass} · <span className="text-indigo-400">{seatLabel}</span></div>
                  <div className="text-sm text-gray-400">{zoneName ? `${zoneName}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Price</div>
                  <div className="font-semibold text-white">{price} VND</div>
                </div>
              </div>

              <div className="mt-3 bg-[rgba(255,255,255,0.02)] rounded-md overflow-hidden">
                <AttributeRow label="Ticket code" value={ticketCode} />
                <AttributeRow label="Ticket status" value={ticket.status} />
                <AttributeRow label="Seat label" value={seatLabel} />
                <AttributeRow label="Row/Number" value={`${showSeat.seat?.row || ''} ${showSeat.seat?.number || ''}`.trim()} />
                <AttributeRow label="Ticket class" value={ticketClass} />
                {/* Zone removed as requested */}
                <AttributeRow label="Price snapshot" value={`${d.price_snapshot || d.price || order?.total_amount || 0} VND`} />
                {/* QR hash and internal ids removed from UI */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Buttons removed from card per request - single download button will be rendered by the page */}
    </div>
  );
}
