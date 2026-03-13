/**
 * ContentNavbar Component
 * Sticky navigation bar for event detail sections
 */

import React, { useState, useEffect } from "react";

const ContentNavbar = ({ onNavigate }) => {
  const [activeSection, setActiveSection] = useState('introduction');

  const sections = [
    { id: 'introduction', label: 'Overview' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'artists', label: 'Artists' },
    { id: 'organizer', label: 'Organizer' },
  ];

  const handleClick = (sectionId) => {
    setActiveSection(sectionId);
    onNavigate(sectionId);
  };

  // Track scroll position to highlight active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      
      const sectionElements = sections.map(section => ({
        id: section.id,
        element: document.getElementById(`section-${section.id}`)
      }));

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const { id, element } = sectionElements[i];
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="sticky top-[112px] z-30 bg-[#1a1a1a] border-b border-white/10">
      <div className="px-6 md:px-16 lg:px-24">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleClick(section.id)}
              className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeSection === section.id
                  ? 'bg-primary text-black'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default ContentNavbar;
