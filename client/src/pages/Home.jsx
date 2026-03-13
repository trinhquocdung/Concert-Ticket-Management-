/**
 * Home Page - Redesigned following cticket.vn style
 * Features: HeroBanner, CategoryBar (fixed), FilterBar (conditional), EventGrid with "Load More"
 */

import React, { useState, useEffect } from "react";
import HeroBanner from "../components/HeroBanner";
import CategoryBar from "../components/CategoryBar";
import FilterBar from "../components/FilterBar";
import EventGrid from "../components/EventGrid";

const API_BASE = "http://localhost:5000/api";

const Home = () => {
  // Category selection state
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Filter state
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    city: "",
    categories: [],
  });

  // Fetch categories for FilterBar
  useEffect(() => {
    fetch(`${API_BASE}/categories`)
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.data?.categories || []);
      })
      .catch(() => setCategories([]));
  }, []);

  // Handle category change from CategoryBar
  const handleCategoryChange = (categorySlug) => {
    setSelectedCategory(categorySlug);
    setShowFilters(true);
  };

  // Handle home/all click - reset everything
  const handleHomeClick = () => {
    setSelectedCategory("");
    setShowFilters(false);
    setFilters({
      startDate: "",
      endDate: "",
      city: "",
      categories: [],
    });
  };

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Close filter bar
  const handleCloseFilters = () => {
    setShowFilters(false);
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Hero Banner - Compact carousel with random events */}
      <HeroBanner />

      {/* Category Bar - Fixed position below navbar */}
      <div className="sticky top-16 z-40 bg-[#1a1a1a] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CategoryBar
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            onHomeClick={handleHomeClick}
            showFilters={showFilters}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-6">
        {/* Filter Bar - Shows when category is selected */}
        {showFilters && (
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClose={handleCloseFilters}
            categories={categories}
          />
        )}

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {selectedCategory
              ? categories.find((c) => c.slug === selectedCategory)?.name || "Events"
              : "All Events"}
          </h1>
          <p className="text-gray-400 mt-1">
            {selectedCategory
              ? "Explore events in this category"
              : "Discover and book tickets for exciting events"}
          </p>
        </div>

        {/* Event Grid with Load More */}
        <EventGrid
          filters={filters}
          selectedCategory={selectedCategory}
        />
      </div>
    </div>
  );
};

export default Home;
