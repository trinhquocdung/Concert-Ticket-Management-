/**
 * HeroBanner Component - Mini carousel banner
 * Shows random 5-10 featured events in a compact slider
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const API_BASE = "http://localhost:5000/api";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const HeroBanner = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const swiperRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/concerts?limit=10&status=ON_SALE`)
      .then((res) => res.json())
      .then((response) => {
        const concerts = response.data?.concerts || [];
        // Shuffle and take 5-10 random events
        const shuffled = concerts.sort(() => Math.random() - 0.5);
        setEvents(shuffled.slice(0, Math.min(10, shuffled.length)));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch events:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[300px] md:h-[400px] bg-gradient-to-r from-gray-800 to-gray-900 animate-pulse rounded-2xl" />
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="relative group">
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        spaceBetween={0}
        slidesPerView={1}
        loop={events.length > 1}
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        pagination={{ clickable: true, dynamicBullets: true }}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        className="rounded-2xl overflow-hidden"
      >
        {events.map((event) => (
          <SwiperSlide key={event._id}>
            <div
              onClick={() => navigate(`/event/${event._id}`)}
              className="relative h-[300px] md:h-[400px] cursor-pointer overflow-hidden"
            >
              {/* Background Image */}
              <img
                src={event.thumbnail || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1920&q=80"}
                alt={event.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom Navigation Arrows */}
      {events.length > 1 && (
        <>
          <button
            onClick={() => swiperRef.current?.slidePrev()}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 hover:bg-primary rounded-full text-white opacity-0 group-hover:opacity-100 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => swiperRef.current?.slideNext()}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 hover:bg-primary rounded-full text-white opacity-0 group-hover:opacity-100 transition-all"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>
  );
};

export default HeroBanner;
