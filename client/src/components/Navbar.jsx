/**
 * Navbar Component - Clean redesign inspired by cticket.vn
 */

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { assets } from "../assets/assets";
import { SearchIcon, ShoppingCart, Menu, X, Ticket, History } from "lucide-react";
import { useClerk, UserButton, useUser } from "@clerk/clerk-react";
import { useCart } from "../context/CartContext";
import ShoppingCartDropdown from './ShoppingCartDropdown';

const API_BASE = "http://localhost:5000/api";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useUser();
  const { openSignIn } = useClerk();
  const { itemCount, isExpiringSoon } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const searchRef = useRef(null);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch search results
  useEffect(() => {
    if (searchTerm.trim()) {
      fetch(`${API_BASE}/concerts?search=${encodeURIComponent(searchTerm)}&limit=5`)
        .then((res) => res.json())
        .then((response) => {
          setSearchResults(response.data?.concerts || []);
        })
        .catch(() => setSearchResults([]));
    } else {
      // Fetch trending when no search term
      fetch(`${API_BASE}/concerts?limit=4&status=ON_SALE`)
        .then((res) => res.json())
        .then((response) => {
          setSearchResults(response.data?.concerts || []);
        })
        .catch(() => setSearchResults([]));
    }
  }, [searchTerm]);

  // Sync navbar search input with URL `q` param so the navbar reflects current search
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || '';
    setSearchTerm(q);
  }, [location.search]);

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      const q = searchTerm.trim();
      if (q) {
        navigate(`/search?q=${encodeURIComponent(q)}`);
      } else {
        navigate(`/search`);
      }
      setIsSearchFocused(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => { navigate('/'); window.scrollTo(0, 0); }}
            className="flex-shrink-0 bg-transparent border-0 p-0"
            aria-label="Go to homepage"
          >
            <img src={assets.logo} alt="QuickShow" className="h-10 w-auto cursor-pointer" />
          </button>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8" ref={searchRef}>
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search events, artists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={handleSearch}
                className="w-full pl-12 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white/15 transition-all"
              />
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

              {/* Search Dropdown */}
              {isSearchFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a2a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="p-3">
                    <p className="text-xs text-gray-400 mb-2 px-2">
                      {searchTerm.trim() ? "Search results" : "Featured events"}
                    </p>
                    {searchResults.length > 0 ? (
                      searchResults.map((event) => (
                        <div
                          key={event._id}
                          onClick={() => {
                            navigate(`/event/${event._id}`);
                            setIsSearchFocused(false);
                            setSearchTerm("");
                          }}
                          className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition"
                        >
                          <img
                            src={event.thumbnail || "https://via.placeholder.com/48"}
                            alt={event.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{event.title}</p>
                            <p className="text-gray-400 text-xs truncate">{event.venue?.name || "TBA"}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">No results found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Search */}
            <button className="md:hidden p-2 text-white hover:text-primary transition">
              <SearchIcon size={22} />
            </button>

            {/* Cart */}
            <div className="relative">
              <button
                onClick={() => setIsCartOpen((s) => !s)}
                className="relative p-2 text-white hover:text-primary transition"
                aria-expanded={isCartOpen}
                aria-label="Open cart"
              >
                <ShoppingCart size={22} />
                {itemCount > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                    isExpiringSoon() ? 'bg-red-500 animate-pulse' : 'bg-primary'
                  } text-white`}>
                    {itemCount}
                  </span>
                )}
              </button>

              {isCartOpen && (
                <div className="absolute right-0 mt-2 z-50">
                  <ShoppingCartDropdown onClose={() => setIsCartOpen(false)} />
                </div>
              )}
            </div>

            {/* Auth */}
            {!user ? (
              <button
                onClick={openSignIn}
                className="hidden sm:flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 rounded-full font-semibold text-white transition"
              >
                Sign in
              </button>
            ) : (
              <div className="hidden sm:block">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: { width: "40px", height: "40px", border: "2px solid #F84565" }
                    }
                  }}
                >
                  <UserButton.MenuItems>
                    <UserButton.Action
                      label="Order history"
                      labelIcon={<History size={16} />}
                      onClick={() => navigate("/orders")}
                    />
                  </UserButton.MenuItems>
                </UserButton>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="sm:hidden p-2 text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-[#1a1a1a] border-t border-white/10 px-4 py-4 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 px-4 rounded-lg transition ${isActive("/") ? "bg-primary text-white" : "text-white hover:bg-white/10"}`}
          >
            Home
          </Link>
          {/* Removed direct 'Vé của tôi' link; users should use Order History */}
          <Link
            to="/orders"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 px-4 rounded-lg transition ${isActive("/orders") ? "bg-primary text-white" : "text-white hover:bg-white/10"}`}
          >
            Order history
          </Link>
          {!user && (
            <button
              onClick={() => {
                openSignIn();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 px-4 bg-primary rounded-lg text-white font-semibold"
            >
              Sign in
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
