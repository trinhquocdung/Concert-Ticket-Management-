import React, { useEffect, useState, useRef } from "react";
import { Music, Theater, Trophy, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000/api";

// Icon mapping (kept for future use)
const iconMap = {
  Music: Music,
  Theater: Theater,
  Trophy: Trophy,
  MoreHorizontal: MoreHorizontal,
};

const CategoryBar = ({ 
  selectedCategory, 
  onCategoryChange, 
  onHomeClick,
  showFilters = false 
}) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  useEffect(() => {
    fetch(`${API_BASE}/categories`)
      .then((res) => res.json())
      .then((response) => {
        setCategories(response.data?.categories || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch categories:", err);
        setLoading(false);
      });
  }, []);

  // Check scroll position
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [categories]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -200 : 200,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
    }
  };

  // Handle category selection — stay local on Home, navigate to Search elsewhere
  const handleSelect = (slug) => {
    if (isHome) {
      if (typeof onCategoryChange === "function") {
        onCategoryChange(slug || null);
        return;
      }
      // If no onCategoryChange provided, fallthrough to navigate
    }

    if (!slug) {
      navigate("/search");
    } else {
      navigate(`/search?category=${encodeURIComponent(slug)}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-24 bg-white/10 rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-[#2a2a2a] hover:bg-primary rounded-full shadow-lg transition"
        >
          <ChevronLeft size={18} className="text-white" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-center gap-2 py-4 overflow-x-auto scrollbar-hide"
      >
        <div
          onClick={() => handleSelect(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all cursor-pointer ${
            !selectedCategory
              ? "bg-primary text-white"
              : "bg-white/10 text-white/80 hover:bg-white/20"
          }`}
        >
          <span>Tất cả</span>
        </div>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <div
              key={cat._id}
              onClick={() => handleSelect(isSelected ? null : cat.slug)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(isSelected ? null : cat.slug); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all cursor-pointer ${
                isSelected
                  ? "text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
              style={isSelected ? { backgroundColor: cat.color || "#F84565" } : {}}
            >
              <span>{cat.name}</span>
            </div>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-[#2a2a2a] hover:bg-primary rounded-full shadow-lg transition"
        >
          <ChevronRight size={18} className="text-white" />
        </button>
      )}
    </div>
  );
};

export default CategoryBar;