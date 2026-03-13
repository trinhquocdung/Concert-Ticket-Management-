/**
 * EventGrid Component - Displays events in a 4x4 grid with "Load More" functionality
 * Events are displayed randomly, with ability to filter by category, date, city
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Clock } from "lucide-react";
import resolvePerformanceDate from '../utils/performanceDate';

const API_BASE = "http://localhost:5000/api";
const EVENTS_PER_ROW = 4;
const INITIAL_ROWS = 4;
const ROWS_TO_LOAD = 4;

const EventGrid = ({ filters = {}, selectedCategory = "", search = "" }) => {
  const [allEvents, setAllEvents] = useState([]);
  const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch events from API, re-run when filters/search/selectedCategory change
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        // Request more items so client has enough to filter/paginate
        params.set('limit', '1000');

        if (search && search.trim()) params.set('search', search.trim());

        // category param: prefer explicit multi-select from filters, otherwise selectedCategory
        const catParam = (filters.categories && filters.categories.length > 0)
          ? filters.categories.join(',')
          : selectedCategory;
        if (catParam) params.set('category', catParam);

        if (filters.city) params.set('city', filters.city);
        if (filters.startDate) params.set('startDate', filters.startDate);
        if (filters.endDate) params.set('endDate', filters.endDate);

        const url = `${API_BASE}/concerts?${params.toString()}`;
        const res = await fetch(url);
        const data = await res.json();
        const events = data.data?.concerts || [];

        // Shuffle events for random display
        const shuffled = [...events].sort(() => Math.random() - 0.5);
        setAllEvents(shuffled);
        } catch (err) {
        console.error('Error fetching events:', err);
        setError('Unable to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [filters, selectedCategory, search]);

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    let events = [...allEvents];

    // Text search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      events = events.filter((e) => {
        const title = (e.title || e.name || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    // Filter by selected category from CategoryBar
    if (selectedCategory) {
      events = events.filter(
        (e) => e.category?.slug === selectedCategory || e.category?._id === selectedCategory
      );
    }

    // Filter by additional categories from FilterBar
    if (filters.categories?.length > 0) {
      events = events.filter((e) =>
        filters.categories.includes(e.category?.slug) || 
        filters.categories.includes(e.category?._id)
      );
    }

    // Filter by city
    if (filters.city) {
      events = events.filter((e) => e.venue?.city === filters.city);
    }

    // Date filtering: normalize to local date-only (avoid timezone parsing differences)
    const parseInputDate = (dateStr) => {
      if (!dateStr) return null;
      // Expecting YYYY-MM-DD from <input type="date">
      const parts = String(dateStr).split('-').map(Number);
      if (parts.length !== 3) return null;
      const [y, m, d] = parts;
      return new Date(y, m - 1, d);
    };

    const toDateOnlyMs = (dt) => {
      if (!dt) return null;
      const d = new Date(dt);
      if (isNaN(d)) return null;
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };

    const getEventDatesMs = (ev) => {
      const ms = [];
      if (Array.isArray(ev.performances) && ev.performances.length) {
        ev.performances.forEach(p => { if (p?.date) ms.push(toDateOnlyMs(p.date)); });
      }
      if (ev.start_time) ms.push(toDateOnlyMs(ev.start_time));
      if (Array.isArray(ev.shows) && ev.shows.length) {
        ev.shows.forEach(s => { if (s?.date) ms.push(toDateOnlyMs(s.date)); });
      }
      if (ev.date) ms.push(toDateOnlyMs(ev.date));
      return ms.filter(Boolean);
    };

    if (filters.startDate) {
      const startDt = parseInputDate(filters.startDate);
      const startMs = startDt ? toDateOnlyMs(startDt) : null;
      if (startMs !== null) {
        events = events.filter((e) => {
          const dates = getEventDatesMs(e);
          return dates.some(dMs => dMs >= startMs);
        });
      }
    }

    if (filters.endDate) {
      const endDt = parseInputDate(filters.endDate);
      const endMs = endDt ? toDateOnlyMs(endDt) : null;
      if (endMs !== null) {
        events = events.filter((e) => {
          const dates = getEventDatesMs(e);
          return dates.some(dMs => dMs <= endMs);
        });
      }
    }

    return events;
  }, [allEvents, selectedCategory, filters, search]);

  // Calculate visible events based on current rows
  const visibleEvents = useMemo(() => {
    const totalVisible = visibleRows * EVENTS_PER_ROW;
    return filteredEvents.slice(0, totalVisible);
  }, [filteredEvents, visibleRows]);

  // Check if there are more events to load
  const hasMore = visibleEvents.length < filteredEvents.length;

  // Load more events
  const handleLoadMore = () => {
    setVisibleRows((prev) => prev + ROWS_TO_LOAD);
  };

  // Reset visible rows when filters change
  useEffect(() => {
    setVisibleRows(INITIAL_ROWS);
  }, [selectedCategory, filters, search]);

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format time
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get lowest price from ticket classes
  const getLowestPrice = (event) => {
    const prices = event.ticketClasses?.map((tc) => tc.price).filter((p) => p > 0) || [];
    if (prices.length === 0) return null;
    const min = Math.min(...prices);
    return new Intl.NumberFormat("en-US").format(min);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(16)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[3/4] bg-white/10 rounded-xl"></div>
            <div className="mt-3 h-4 bg-white/10 rounded w-3/4"></div>
            <div className="mt-2 h-3 bg-white/10 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>{error}</p>
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎭</div>
        <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
        <p className="text-gray-400">Try changing filters or select a different category</p>
      </div>
    );
  }

  return (
    <div>
      {/* Results count */}
      <div className="mb-4 text-gray-400 text-sm">
        Showing {visibleEvents.length} / {filteredEvents.length} events
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {visibleEvents.map((event) => {
          const pd = resolvePerformanceDate(event);
          const eventDate = pd.dateObj || event.start_time || event.shows?.[0]?.date || event.date;
          const eventDateStr = pd.dateStr || '';
          const eventTimeStr = pd.startStr || '';
          const lowestPrice = getLowestPrice(event);
          
          return (
            <Link
              key={event._id}
              to={`/event/${event._id}`}
              className="group block"
            >
              <div className="relative overflow-hidden rounded-xl aspect-[3/4] bg-white/5">
                {/* Event Image */}
                <img
                  src={event.thumbnail || "/placeholder-event.jpg"}
                  alt={event.title || event.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.target.src = "/placeholder-event.jpg";
                  }}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Category Badge */}
                {event.category && (
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 text-xs font-medium bg-primary/90 text-white rounded-full">
                      {event.category.name}
                    </span>
                  </div>
                )}
                
                {/* Price Badge */}
                {lowestPrice && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 text-xs font-medium bg-black/60 text-white rounded-full">
                      From {lowestPrice} VND
                    </span>
                  </div>
                )}
                
                {/* Hover Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                  <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                    <Calendar size={12} />
                    <span>{eventDateStr}</span>
                    {eventTimeStr && (
                      <>
                        <Clock size={12} />
                        <span>{eventTimeStr}</span>
                      </>
                    )}
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-2 text-white/80 text-xs">
                      <MapPin size={12} />
                      <span className="truncate">{event.venue.name}, {event.venue.city}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Event Info */}
              <div className="mt-3">
                <h3 className="font-semibold text-white group-hover:text-primary transition line-clamp-2">
                  {event.title || event.name}
                </h3>
                  <div className="mt-1 flex items-center gap-2 text-gray-400 text-sm">
                    <Calendar size={14} />
                    <span>{eventDateStr}</span>
                  </div>
                {event.venue?.city && (
                  <div className="mt-1 flex items-center gap-2 text-gray-400 text-sm">
                    <MapPin size={14} />
                    <span>{event.venue.city}</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={handleLoadMore}
            className="px-8 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
          >
            Load more ({filteredEvents.length - visibleEvents.length} events remaining)
          </button>
        </div>
      )}
    </div>
  );
};

export default EventGrid;
