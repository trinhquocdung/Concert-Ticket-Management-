/**
 * RecommendedEvents Component
 * Displays 2 rows of 4 random events with "See More" button
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import resolvePerformanceDate from '../../../utils/performanceDate';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
};

const formatPrice = (price) => {
  if (!price) return '0';
    return new Intl.NumberFormat('en-US').format(price);
};

const RecommendedEvents = ({ events }) => {
  const navigate = useNavigate();

  if (!events || events.length === 0) {
    return null;
  }

  const handleEventClick = (eventId) => {
    navigate(`/event/${eventId}`);
    window.scrollTo(0, 0);
  };

  const handleSeeMore = () => {
    navigate('/search');
  };

  return (
    <section className="px-6 md:px-16 lg:px-24 py-10 border-t border-white/10">
        <h2 className="text-2xl font-bold text-white mb-6">Recommended Events</h2>

      {/* Events Grid - 2 rows of 4 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {events.slice(0, 8).map((event) => (
          <div
            key={event._id}
            onClick={() => handleEventClick(event._id)}
            className="bg-[#252424] rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group"
          >
            {/* Thumbnail */}
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={event.thumbnail}
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Status Badge */}
              {event.status === 'SOLDOUT' && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                  Sold out
                </div>
              )}
              {/* Price Badge */}
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-primary text-sm font-semibold rounded">
                {event.priceRange?.min > 0 
                  ? `From ${formatPrice(event.priceRange.min)} VND`
                  : 'Free'
                }
              </div>
            </div>

            {/* Event Info */}
            <div className="p-4">
              <h3 className="text-white font-semibold line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              
                <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{(resolvePerformanceDate(event).dateStr) || ''}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {event.venue?.name || event.venue || 'TBA'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* See More Button */}
      <div className="text-center mt-8">
        <button
          onClick={handleSeeMore}
          className="inline-flex items-center gap-2 px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition"
        >
          See more events
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17 8l4 4m0 0l-4 4m4-4H3" 
            />
          </svg>
        </button>
      </div>
    </section>
  );
};

export default RecommendedEvents;
