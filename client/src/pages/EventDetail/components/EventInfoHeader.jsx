/**
 * EventInfoHeader Component
 * Displays event banner with blurred background, event details, and buy button
 */

import React from "react";
import { Calendar, Clock, MapPin, ExternalLink } from "lucide-react";
import resolvePerformanceDate from '../../../utils/performanceDate';

const formatPrice = (price) => {
  if (!price) return '0';
    return new Intl.NumberFormat('en-US').format(price);
};

const getStatusConfig = (status) => {
  const configs = {
    'PUB': { text: 'On sale', bgColor: 'bg-green-500', textColor: 'text-green-500' },
    'SOLDOUT': { text: 'Sold out', bgColor: 'bg-red-500', textColor: 'text-red-500' },
    'DRAFT': { text: 'Coming soon', bgColor: 'bg-yellow-500', textColor: 'text-yellow-500' },
    'CANCEL': { text: 'Cancelled', bgColor: 'bg-gray-500', textColor: 'text-gray-500' },
    'COMPLETED': { text: 'Completed', bgColor: 'bg-gray-500', textColor: 'text-gray-500' },
  };
  return configs[status] || configs['DRAFT'];
};

const EventInfoHeader = ({ event, onBuyClick }) => {
  const statusConfig = getStatusConfig(event.status);
  
  // Calculate cheapest ticket price
  const cheapestPrice = event.ticket_classes?.length > 0 
    ? Math.min(...event.ticket_classes.map(tc => tc.price))
    : event.priceRange?.min || 0;

  const highestPrice = event.ticket_classes?.length > 0 
    ? Math.max(...event.ticket_classes.map(tc => tc.price))
    : event.priceRange?.max || 0;

  // Build Google Maps URL from venue
  const getMapUrl = () => {
    if (event.venue?.google_maps_url) {
      return event.venue.google_maps_url;
    }
    const address = event.venue?.address || '';
    const city = event.venue?.city || '';
    const query = encodeURIComponent(`${address}, ${city}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  // share handlers removed — replaced by direct Buy CTA below

  return (
    <div className="relative">
      {/* Blurred Background Banner */}
      <div className="absolute inset-0 h-[450px] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center scale-110 blur-xl opacity-50"
          style={{ backgroundImage: `url(${event.thumbnail})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a1a1a]/60 to-[#1a1a1a]" />
      </div>

      {/* Content */}
      <div className="relative px-6 md:px-16 lg:px-24 py-10">
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Event Thumbnail */}
          <div className="flex-shrink-0 w-full lg:w-auto">
            <div className="relative group">
              <img 
                src={event.thumbnail} 
                alt={event.title} 
                className="w-full lg:w-[400px] h-auto rounded-xl shadow-2xl object-cover"
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            </div>
          </div>

          {/* Event Info */}
          <div className="flex-1 text-white lg:pt-4">
            {/* Status Badge */}
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${statusConfig.bgColor} text-white mb-4`}>
              {statusConfig.text}
            </span>

            {/* Event Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8">{event.title}</h1>

            {/* Event Details */}
            <div className="space-y-5">
              {/* Date */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                  <div>
                    {(() => {
                      const pd = resolvePerformanceDate(event);
                      return (
                        <>
                          <p className="font-medium">{pd.dateStr || ''}</p>
                          <p className="text-gray-400 text-sm">{pd.startStr ? `From ${pd.startStr}${pd.endStr ? ` - ${pd.endStr}` : ''}` : ''}</p>
                        </>
                      );
                    })()}
                  </div>
                </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <a 
                    href={getMapUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-primary transition inline-flex items-center gap-1"
                  >
                    {event.venue?.name || 'TBA'}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <p className="text-gray-400 text-sm">
                    {event.venue?.address}
                    {event.venue?.city && `, ${event.venue.city}`}
                  </p>
                </div>
              </div>

              {/* Ticket Price */}
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0 flex items-center justify-center font-bold">₫</span>
                <div>
                  <p className="font-medium">Ticket Price</p>
                  <p className="text-gray-400 text-sm">
                    {cheapestPrice > 0 ? (
                      cheapestPrice === highestPrice 
                        ? `${formatPrice(cheapestPrice)} VND`
                        : `From ${formatPrice(cheapestPrice)} VND to ${formatPrice(highestPrice)} VND`
                    ) : (
                      'TBA'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Buy CTA (replaces social share buttons) */}
            <div className="mt-6">
              <button
                onClick={() => onBuyClick(event.ticket_classes?.[0])}
                disabled={event.status !== 'PUB'}
                className={`px-20 py-5 rounded-full font-semibold transition ${
                  event.status === 'PUB' ? 'bg-primary text-black hover:bg-primary/90' : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                }`}
              >
                  Buy Tickets
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventInfoHeader;
