/**
 * CategoryPage Component - Dynamic category events listing
 * Fetches events by category slug from API
 */

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, MapPin, ArrowLeft } from "lucide-react";
import resolvePerformanceDate from '../utils/performanceDate';

const API_BASE = "http://localhost:5000/api";

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatPrice = (price) => {
  if (!price) return "Contact";
  return new Intl.NumberFormat("en-US").format(price) + " VND";
};

const SkeletonCard = () => (
  <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="w-full h-60 bg-gray-700"></div>
    <div className="p-4 space-y-3">
      <div className="h-5 bg-gray-600 rounded w-3/4"></div>
      <div className="h-4 bg-gray-600 rounded w-1/2"></div>
      <div className="h-4 bg-gray-600 rounded w-1/3"></div>
    </div>
  </div>
);

const CategoryPage = () => {
  const { slug } = useParams();
  const [events, setEvents] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    // Fetch category info and events in parallel
    Promise.all([
      fetch(`${API_BASE}/categories/${slug}`).then((res) => res.json()),
      fetch(`${API_BASE}/concerts?category=${slug}`).then((res) => res.json()),
    ])
      .then(([catResponse, eventsResponse]) => {
        setCategory(catResponse.data?.category || null);
        const concerts = eventsResponse.data?.concerts || [];
        setEvents(concerts);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch data:", err);
        setLoading(false);
      });
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#121212] pt-36 pb-16 px-4 md:px-8 lg:px-16">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-4"
        >
          <ArrowLeft size={20} />
          <span>Home</span>
        </Link>

        {loading ? (
          <div className="h-10 w-48 bg-gray-700 rounded animate-pulse"></div>
        ) : (
          <div className="flex items-center gap-3">
              <h1
                className="text-3xl md:text-4xl font-bold"
                style={{ color: category?.color || "#F84565" }}
              >
                {category?.name || "Category"}
              </h1>
            {category?.description && (
              <p className="text-gray-400 mt-2">{category.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No events in this category</p>
            <Link
              to="/"
              className="inline-block mt-4 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/80 transition"
            >
              Explore other events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {events.map((event) => (
              <Link
                key={event._id}
                to={`/event/${event._id}`}
                className="bg-gray-900 rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl group"
              >
                <div className="relative">
                  <img
                    src={event.thumbnail || "https://via.placeholder.com/400x300?text=No+Image"}
                    alt={event.title}
                    className="w-full h-48 sm:h-56 object-cover"
                  />
                  {event.status === "SOLD_OUT" && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">
                        Sold out
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-primary transition">
                    {event.title}
                  </h3>
                  <div className="mt-3 space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>{(resolvePerformanceDate(event).dateStr) || ''}</span>
                      </div>
                    {event.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span className="truncate">{event.venue.name || event.venue}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-primary font-bold">
                      {formatPrice(event.base_price || event.minPrice)}
                    </span>
                    {event.artists?.length > 0 && (
                      <span className="text-xs text-gray-500">{event.artists.length} artists</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
