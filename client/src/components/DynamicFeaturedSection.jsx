/**
 * DynamicFeaturedSection Component
 * Fetches categories and events from API, displays them dynamically
 */

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import resolvePerformanceDate from '../utils/performanceDate';
import { useNavigate, Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";

const API_BASE = "http://localhost:5000/api";

// Format helpers
// prefer performance date when available

const formatPrice = (price) => {
  if (!price) return "Contact";
  return price.toLocaleString("en-US") + " VND";
};

// Skeleton Card Component
const SkeletonCard = () => (
  <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="w-full h-48 bg-gray-700"></div>
    <div className="p-3 space-y-2">
      <div className="h-5 bg-gray-600 rounded w-3/4"></div>
      <div className="h-4 bg-gray-600 rounded w-1/2"></div>
    </div>
  </div>
);

// Event Card Component
const EventCard = ({ event, onClick }) => (
  <div
    onClick={onClick}
    className="bg-[rgb(37,36,36)] rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 flex flex-col justify-between h-full"
  >
    <div>
      <img
        src={event.thumbnail || "https://via.placeholder.com/400x300?text=No+Image"}
        alt={event.title}
        className="w-full h-48 sm:h-56 object-cover rounded-lg mb-4"
      />
      <div className="px-3 mb-2">
        <h3 className="text-base md:text-lg font-bold text-white leading-tight line-clamp-2">
          {event.title}
        </h3>
      </div>
    </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between text-white px-3 pb-3 text-sm gap-1 mt-auto">
      <div className="flex items-center text-gray-400">
        <Calendar className="w-4 h-4 mr-2" />
        <span>{(resolvePerformanceDate(event).dateStr) || ''}</span>
      </div>
      <p className="text-primary font-bold">{formatPrice(event.base_price || event.minPrice)}</p>
    </div>
  </div>
);

// Category Section Component
const CategorySection = ({ category, events }) => {
  const navigate = useNavigate();

  if (events.length === 0) return null;

  return (
    <div className="mt-12">
      {/* Section Header */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        <p className="text-xl md:text-2xl font-semibold tracking-wide">
          <span style={{ color: category.color || "#F84565" }}>{category.name}</span>
        </p>

        <motion.button
          whileHover={{ x: 5 }}
          transition={{ type: "spring", stiffness: 200 }}
          onClick={() => navigate(`/category/${category.slug}`)}
          className="flex items-center gap-2 text-sm md:text-base font-semibold cursor-pointer"
          style={{ color: category.color || "#F84565" }}
        >
          See all
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>

      {/* Events Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {events.slice(0, 4).map((event) => (
          <EventCard
            key={event._id}
            event={event}
            onClick={() => navigate(`/event/${event._id}`)}
          />
        ))}
      </div>
    </div>
  );
};

// Trending Section Component
const TrendingSection = ({ events, loading }) => {
  const navigate = useNavigate();

  return (
    <div className="mt-12">
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        {loading ? (
          <div className="mx-auto h-8 w-48 rounded bg-gray-700 animate-pulse"></div>
        ) : (
          <p className="text-xl md:text-3xl font-semibold tracking-wide">
            <span className="text-primary">Featured</span> for you
          </p>
        )}
      </motion.div>

      <div className="relative">
        <button className="tp-prev absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow cursor-pointer hover:bg-primary hover:text-white transition">
          <ion-icon name="arrow-back-outline" size="small"></ion-icon>
        </button>

        <button className="tp-next absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow cursor-pointer hover:bg-primary hover:text-white transition">
          <ion-icon name="arrow-forward-outline" size="small"></ion-icon>
        </button>

        <Swiper
          slidesPerView={1.3}
          spaceBetween={16}
          freeMode={{ enabled: true, momentumRatio: 0.3 }}
          grabCursor={true}
          navigation={{ prevEl: ".tp-prev", nextEl: ".tp-next" }}
          modules={[FreeMode, Navigation]}
          breakpoints={{
            640: { slidesPerView: 2.3 },
            768: { slidesPerView: 3.3 },
            1024: { slidesPerView: 4 },
          }}
        >
          {loading
            ? [...Array(4)].map((_, i) => (
                <SwiperSlide key={i}>
                  <SkeletonCard />
                </SwiperSlide>
              ))
            : events.map((event) => (
                <SwiperSlide key={event._id}>
                  <EventCard event={event} onClick={() => navigate(`/event/${event._id}`)} />
                </SwiperSlide>
              ))}
        </Swiper>
      </div>
    </div>
  );
};

// All Events Section
const AllEventsSection = ({ events, loading }) => {
  const navigate = useNavigate();

  return (
    <div className="mt-12">
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        <p className="text-xl md:text-2xl font-semibold tracking-wide text-white">
          All events
        </p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No events yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {events.map((event) => (
            <EventCard
              key={event._id}
              event={event}
              onClick={() => navigate(`/event/${event._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main Component
const DynamicFeaturedSection = () => {
  const [categories, setCategories] = useState([]);
  const [eventsByCategory, setEventsByCategory] = useState({});
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const catRes = await fetch(`${API_BASE}/categories`);
        const catData = await catRes.json();
        const cats = catData.data?.categories || [];
        setCategories(cats);

        // Fetch all events
        const eventsRes = await fetch(`${API_BASE}/concerts?limit=20&status=ON_SALE`);
        const eventsData = await eventsRes.json();
        const events = eventsData.data?.concerts || [];
        setAllEvents(events);

        // Fetch events for each category
        const eventsByCat = {};
        await Promise.all(
          cats.map(async (cat) => {
            const res = await fetch(`${API_BASE}/concerts?category=${cat.slug}&limit=4`);
            const data = await res.json();
            eventsByCat[cat._id] = data.data?.concerts || [];
          })
        );
        setEventsByCategory(eventsByCat);

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="relative px-6 md:px-16 lg:px-24 xl:px-44 py-8 text-white select-none">
      {/* Trending Section */}
      <TrendingSection events={allEvents.slice(0, 8)} loading={loading} />

      {/* Category Sections */}
      {categories.map((category) => (
        <CategorySection
          key={category._id}
          category={category}
          events={eventsByCategory[category._id] || []}
        />
      ))}

      {/* All Events */}
      {allEvents.length > 8 && (
        <AllEventsSection events={allEvents.slice(8)} loading={loading} />
      )}
    </div>
  );
};

export default DynamicFeaturedSection;
