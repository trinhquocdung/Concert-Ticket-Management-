/**
 * EventDetail Page - Redesigned
 * Shows comprehensive event information with sections:
 * 1. Category Bar with filters
 * 2. Event Info Header (blurred banner background)
 * 3. Content Navigation (Introduction, Schedule, Artists, Organizer)
 * 4. Introduction Section
 * 5. Event Schedule with Seat Chart and Show Times
 * 6. Artists Section
 * 7. Organizer Section
 * 8. Recommended Events
 * 9. Footer
 */

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import CategoryBar from "../../components/CategoryBar";
import EventInfoHeader from "./components/EventInfoHeader";
import ContentNavbar from "./components/ContentNavbar";
import IntroductionSection from "./components/IntroductionSection";
import EventScheduleSection from "./components/EventScheduleSection";
import ArtistsSection from "./components/ArtistsSection";
import OrganizerSection from "./components/OrganizerSection";
import RecommendedEvents from "./components/RecommendedEvents";
import SeatSelection from "../../components/SeatSelection";
import api from "../../services/api";
import RestorePurchaseModal from '../../components/RestorePurchaseModal';
import { useCart } from '../../context/CartContext.jsx';

const API_BASE = "http://localhost:5000/api";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  const [event, setEvent] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [selectedShow, setSelectedShow] = useState(null);
  const [selectedTicketClass, setSelectedTicketClass] = useState(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreEventTitle, setRestoreEventTitle] = useState('');
  const { cartItems, removeFromCart } = useCart();
  // Category state (CategoryBar behavior retained)
  const [selectedCategory, setSelectedCategory] = useState("");

  // Refs for section scrolling
  const introRef = useRef(null);
  const scheduleRef = useRef(null);
  const artistsRef = useRef(null);
  const organizerRef = useRef(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${API_BASE}/concerts/${id}`);
        if (res.ok) {
          const response = await res.json();
          const concertData = response.data?.concert || response.data || response;
          const ticketClasses = response.data?.ticketClasses || [];

          setEvent({
            ...concertData,
            ticket_classes: ticketClasses
          });
        } else {
          console.error('Failed to fetch event');
        }

        // Fetch recommended events (8 random events)
        const r = await fetch(`${API_BASE}/concerts?limit=20`);
        const allEventsData = await r.json();
        const allEvents = allEventsData.data?.concerts || allEventsData.data || allEventsData.concerts || [];
        const others = allEvents.filter((e) => e._id !== id);
        // Shuffle and pick 8
        for (let i = others.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [others[i], others[j]] = [others[j], others[i]];
        }
        setRecommended(others.slice(0, 8));
      } catch (err) {
        console.error("Error fetching event detail:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
    // no filter bar on this page; keep CategoryBar only

    // Scroll to top on load
    window.scrollTo(0, 0);
  }, [id]);

  // On mount, check for saved purchase progress and show restore modal when applicable
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('purchase_progress');
      if (!raw) return;
      const progress = JSON.parse(raw);
      if (!progress) return;
      // Only offer restore when the progress was in the fill or payment step (not during order selection)
      if (String(progress.eventId) === String(id) && (progress.step === 'fill' || progress.step === 'payment')) {
        setRestoreEventTitle(progress.eventTitle || 'Your event');
        setRestoreOpen(true);
      }
    } catch (e) {
      // ignore
    }
  }, [id]);

  const handleRepurchase = () => {
    // Clear any cart items for this event and start fresh
    try {
      (cartItems || []).forEach((it) => {
        if (String(it.eventId) === String(id)) removeFromCart(it.id);
      });
    } catch (e) {}
    sessionStorage.removeItem('purchase_progress');
    setRestoreOpen(false);
    navigate(`/order/${id}`);
  };

  const handleContinuePurchase = () => {
    // Continue where left off: navigate to order page and keep purchase_progress so seats/cart remain restored
    setRestoreOpen(false);
    navigate(`/order/${id}`);
  };

  const handleBuyTicket = (ticketClass, showTime) => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    setSelectedTicketClass(ticketClass);
    setSelectedShow(showTime);
    // remember selected performance for API calls (fallback for components that don't pass it)
    try { sessionStorage.setItem('selectedPerformanceId', showTime._id || showTime.id || ''); } catch (e) {}
    // Navigate to order page where user can view seat chart and choose seats
    navigate(`/order/${event._id}`, {
      state: {
        event,
        ticketClass,
        showTime,
      },
    });
  };

  const handleSeatSelect = (selectedSeats) => {
    setShowSeatSelection(false);
    navigate("/payment", {
      state: {
        event,
        ticketClass: selectedTicketClass,
        quantity: selectedSeats.length,
        selectedSeats,
        subtotal: selectedSeats.reduce((s, seat) => s + (seat.price || seat.ticketClass?.price || 0), 0),
      },
    });
  };

  const scrollToSection = (section) => {
    const refs = {
      introduction: introRef,
      schedule: scheduleRef,
      artists: artistsRef,
      organizer: organizerRef,
    };
    refs[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // CategoryBar handlers for event detail page: mirror Home behavior
  const handleCategorySelect = (categorySlug) => {
    if (categorySlug) navigate(`/category/${categorySlug}`);
  };

  const handleHomeClick = () => {
    navigate(`/`);
  };

  // Fetch related events by category when user selects one
  useEffect(() => {
    if (!selectedCategory) return;
    const fetchByCategory = async () => {
      try {
        const res = await api.event.getByCategory(selectedCategory);
        const list = res.data?.concerts || res.concerts || res.data || res;
        const filtered = (Array.isArray(list) ? list : []).filter((e) => e._id !== id);
        setRecommended(filtered.slice(0, 8));
      } catch (err) {
        console.error("Error fetching events by category:", err);
      }
    };
    fetchByCategory();
  }, [selectedCategory, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-3 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center text-white">
        <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Event not found</h2>
            <Link to="/" className="text-primary hover:underline">
              Back to home
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Category Bar */}
      <div className="sticky top-16 z-40 bg-[#1a1a1a] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CategoryBar
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategorySelect}
            onHomeClick={handleHomeClick}
          />
        </div>
      </div>

      {/* Event Info Header with Blurred Background */}
      <EventInfoHeader event={event} onBuyClick={handleBuyTicket} />

      <RestorePurchaseModal
        open={restoreOpen}
        eventTitle={restoreEventTitle || event?.title || event?.name}
        onRepurchase={handleRepurchase}
        onContinue={handleContinuePurchase}
      />

      {/* Content Navigation Bar */}
      <ContentNavbar onNavigate={scrollToSection} />

      {/* Introduction Section */}
      <div ref={introRef}>
        <IntroductionSection event={event} />
      </div>

      {/* Event Schedule Section */}
      <div ref={scheduleRef}>
        <EventScheduleSection 
          event={event} 
          onBuyTicket={handleBuyTicket}
        />
      </div>

      {/* Artists Section */}
      <div ref={artistsRef}>
        <ArtistsSection artists={event.artists} />
      </div>

      {/* Organizer Section */}
      <div ref={organizerRef}>
        <OrganizerSection organizer={event.organizer} />
      </div>

      {/* Recommended Events (filtered by selected category / filters) */}
      <RecommendedEvents
        events={recommended.filter((ev) => {
          if (!selectedCategory) return true;
          const catMatch = (ev.categories && ev.categories.includes(selectedCategory))
            || (ev.category && ev.category.slug === selectedCategory)
            || (ev.category === selectedCategory);
          return !!catMatch;
        })}
      />

      {/* Seat Selection Modal */}
      {showSeatSelection && (
        <SeatSelection
          concert={event}
          zones={event.zones || [
            { name: "VIP", price: 2500000 },
            { name: "Zone A", price: 1500000 },
            { name: "Zone B", price: 800000 },
          ]}
          ticketClasses={event.ticket_classes}
          onSelect={handleSeatSelect}
          onClose={() => setShowSeatSelection(false)}
          maxSeats={10}
        />
      )}
    </div>
  );
};

export default EventDetail;
