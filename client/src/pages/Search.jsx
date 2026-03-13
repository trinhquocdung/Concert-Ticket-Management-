import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Search as SearchIcon, Filter, Calendar, MapPin, X } from "lucide-react";
import CategoryBar from "../components/CategoryBar";
import FilterBar from "../components/FilterBar";
import EventGrid from "../components/EventGrid";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatPrice = (price) => {
  if (!price) return '0';
  return new Intl.NumberFormat('vi-VN').format(price);
};

const Search = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const resultsQuery = new URLSearchParams(location.search).get("q") || "";
  const categoryParam = new URLSearchParams(location.search).get("category") || "";

  const [results, setResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    categories: [],
    city: '',
    startDate: '',
    endDate: '',
    sortBy: 'start_time'
  });

  const [searchTerm, setSearchTerm] = useState(resultsQuery);

  // keep searchTerm in sync when URL query changes externally
  useEffect(() => {
    setSearchTerm(resultsQuery);
  }, [resultsQuery]);

  // When the URL has a category param, set filters accordingly
  useEffect(() => {
    if (categoryParam) {
      setFilters(f => ({...f, category: categoryParam, categories: [categoryParam]}));
      setShowFilters(true);
    } else {
      setFilters(f => ({...f, category: '', categories: []}));
      setShowFilters(false);
    }
  }, [categoryParam]);

  // If user clears the navbar search (no q param), reset filters so Search shows all events
  useEffect(() => {
    // Only reset filters when there's no search query AND no category param
    if (resultsQuery === "" && !categoryParam) {
      setFilters({
        category: '',
        categories: [],
        city: '',
        startDate: '',
        endDate: '',
        sortBy: 'start_time'
      });
      setShowFilters(false);
    }
  }, [resultsQuery, categoryParam]);

  // Fetch categories on mount
  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then((res) => res.json())
      .then((response) => {
        const cats = response.data?.categories || [];
        setCategories(cats);
      })
      .catch((err) => console.error("Failed to fetch categories:", err));
  }, []);

  // Fetch venues to populate city list
  const [cities, setCities] = useState([]);
  useEffect(() => {
    fetch(`${API_URL}/venues?limit=100`)
      .then((res) => res.json())
      .then((response) => {
        const venues = response.data?.venues || [];
        const uniqueCities = Array.from(new Set(venues.map(v => v.city).filter(Boolean)));
        setCities(uniqueCities);
      })
      .catch((err) => console.error('Failed to fetch venues for cities:', err));
  }, []);

  const getCategoryLabel = (slug) => {
    const cat = categories.find(c => c.slug === slug || c._id === slug);
    return cat?.name || 'Tất cả';
  };

  return (
    <div className="px-6 md:px-16 lg:px-24 py-8 min-h-screen">
      <div className="mb-8">
        {/* Sticky CategoryBar like Home */}
        <div className="sticky top-16 z-40 bg-[#1a1a1a]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CategoryBar
              selectedCategory={filters.category}
              onCategoryChange={(cat) => {
                // local handler if CategoryBar calls it (usually on Home)
                setFilters(f => ({...f, category: cat || '', categories: cat ? [cat] : []}));
                setShowFilters(Boolean(cat));
                // ensure URL reflects selection so refresh / share works
                if (!cat) navigate("/search", { replace: true });
                else navigate(`/search?category=${encodeURIComponent(cat)}`, { replace: true });
              }}
              onHomeClick={() => { setFilters(f => ({...f, category: '', categories: []})); setShowFilters(false); }}
              showFilters={showFilters}
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 min-w-0" />

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                  showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <Filter size={18} />
                Filters
              </button>

              {filters.categories && filters.categories.length > 0 && (
                <span className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-300">
                  {filters.categories.map(slug => (getCategoryLabel(slug))).join(', ')}
                  <X size={16} className="cursor-pointer hover:text-primary" onClick={() => {
                    setFilters(f => ({...f, category: '', categories: []}));
                    navigate("/search", { replace: true });
                  }} />
                </span>
              )}
            </div>
          </div>
        </div>

        {showFilters && (
          <FilterBar
            filters={filters}
            onFilterChange={(newFilters) => setFilters(f => ({...f, ...newFilters}))}
            onClose={() => setShowFilters(false)}
            categories={categories}
          />
        )}
      </div>

      {/* Use shared EventGrid which applies the same client-side filters as Home */}
      <EventGrid
        filters={filters}
        selectedCategory={filters.category}
        search={resultsQuery}
      />
    </div>
  );
};

export default Search;