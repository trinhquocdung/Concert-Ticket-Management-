/**
 * FilterBar Component - Advanced filtering options
 * Shows when a category is selected, includes date, city, and multi-category filters
 */

import React, { useState, useEffect, useRef } from "react";
import { Calendar, MapPin, Tag, X, ChevronDown, Check } from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const FilterBar = ({ 
  filters, 
  onFilterChange, 
  onClose,
  categories = []
}) => {
  const [cities, setCities] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  const dateRef = useRef(null);
  const cityRef = useRef(null);
  const categoryRef = useRef(null);

  // Fetch cities from venues
  useEffect(() => {
    fetch(`${API_BASE}/venues`)
      .then((res) => res.json())
      .then((response) => {
        const venues = response.data?.venues || [];
        const uniqueCities = [...new Set(venues.map((v) => v.city).filter(Boolean))];
        setCities(uniqueCities.sort());
      })
      .catch(() => setCities([]));
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) setShowDatePicker(false);
      if (cityRef.current && !cityRef.current.contains(e.target)) setShowCityPicker(false);
      if (categoryRef.current && !categoryRef.current.contains(e.target)) setShowCategoryPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateChange = (type, value) => {
    onFilterChange({ ...filters, [type]: value });
    if (type === "startDate" && !filters.endDate) {
      // Auto-close after selecting start date
    } else if (type === "endDate") {
      setShowDatePicker(false);
    }
  };

  const handleCityChange = (city) => {
    onFilterChange({ ...filters, city: filters.city === city ? "" : city });
    setShowCityPicker(false);
  };

  const handleCategoryToggle = (slug) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(slug)
      ? currentCategories.filter((c) => c !== slug)
      : [...currentCategories, slug];
    onFilterChange({ ...filters, categories: newCategories });
  };

  const clearFilters = () => {
    onFilterChange({ startDate: "", endDate: "", city: "", categories: [] });
  };

  const hasActiveFilters = filters.startDate || filters.endDate || filters.city || (filters.categories?.length > 0);

  const formatDateDisplay = () => {
    if (filters.startDate && filters.endDate) {
      return `${new Date(filters.startDate).toLocaleDateString("en-US")} - ${new Date(filters.endDate).toLocaleDateString("en-US")}`;
    }
    if (filters.startDate) {
      return `From ${new Date(filters.startDate).toLocaleDateString("en-US")}`;
    }
    return "Choose date";
  };

  return (
    <div className="bg-[#252525] rounded-xl p-4 mb-6 animate-fadeIn">
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Filter */}
        <div className="relative" ref={dateRef}>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              filters.startDate || filters.endDate
                ? "border-primary bg-primary/10 text-primary"
                : "border-white/20 text-white/80 hover:border-white/40"
            }`}
          >
            <Calendar size={16} />
            <span className="text-sm">{formatDateDisplay()}</span>
            <ChevronDown size={16} className={`transition ${showDatePicker ? "rotate-180" : ""}`} />
          </button>
          
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-2 p-4 bg-[#2a2a2a] border border-white/10 rounded-xl shadow-xl z-50 min-w-[280px]">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">From date</label>
                  <input
                    type="date"
                    value={filters.startDate || ""}
                    onChange={(e) => handleDateChange("startDate", e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">End date</label>
                  <input
                    type="date"
                    value={filters.endDate || ""}
                    onChange={(e) => handleDateChange("endDate", e.target.value)}
                    min={filters.startDate}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* City Filter */}
        <div className="relative" ref={cityRef}>
          <button
            onClick={() => setShowCityPicker(!showCityPicker)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              filters.city
                ? "border-primary bg-primary/10 text-primary"
                : "border-white/20 text-white/80 hover:border-white/40"
            }`}
          >
            <MapPin size={16} />
            <span className="text-sm">{filters.city || "All cities"}</span>
            <ChevronDown size={16} className={`transition ${showCityPicker ? "rotate-180" : ""}`} />
          </button>
          
          {showCityPicker && (
            <div className="absolute top-full left-0 mt-2 bg-[#2a2a2a] border border-white/10 rounded-xl shadow-xl z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
              <div className="p-2">
                <button
                  onClick={() => handleCityChange("")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    !filters.city ? "bg-primary text-white" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  Tất cả thành phố
                </button>
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => handleCityChange(city)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      filters.city === city ? "bg-primary text-white" : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category Filter (Multi-select) */}
        <div className="relative" ref={categoryRef}>
          <button
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              filters.categories?.length > 0
                ? "border-primary bg-primary/10 text-primary"
                : "border-white/20 text-white/80 hover:border-white/40"
            }`}
          >
            <Tag size={16} />
            <span className="text-sm">
              {filters.categories?.length > 0 
                ? `${filters.categories.length} categories` 
                : "Categories"}
            </span>
            <ChevronDown size={16} className={`transition ${showCategoryPicker ? "rotate-180" : ""}`} />
          </button>
          
          {showCategoryPicker && (
            <div className="absolute top-full left-0 mt-2 bg-[#2a2a2a] border border-white/10 rounded-xl shadow-xl z-50 min-w-[220px]">
              <div className="p-2">
                {categories.map((cat) => {
                  const isSelected = filters.categories?.includes(cat.slug);
                  return (
                    <button
                      key={cat._id}
                      onClick={() => handleCategoryToggle(cat.slug)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                        isSelected ? "bg-primary/10 text-primary" : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <span>{cat.name}</span>
                      {isSelected && <Check size={16} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Clear & Close Buttons */}
        {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
        >
          Clear filters
        </button>
        )}
        
        <button
          onClick={onClose}
          className="ml-auto p-2 text-gray-400 hover:text-white transition"
          title="Close filters"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
