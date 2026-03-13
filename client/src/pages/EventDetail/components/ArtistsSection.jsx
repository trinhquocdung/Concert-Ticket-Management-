/**
 * ArtistsSection Component
 * Displays artists/performers for the event
 */

import React from "react";
import { User } from "lucide-react";

const ArtistsSection = ({ artists }) => {
  if (!artists || artists.length === 0) {
    return null;
  }

  return (
    <section id="section-artists" className="px-6 md:px-16 lg:px-24 py-10 border-t border-white/10">
      <h2 className="text-2xl font-bold text-white mb-6">Nghệ sĩ</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {artists.map((artist, index) => (
          <div 
            key={artist._id || index}
            className="bg-[#252424] rounded-xl p-6 hover:bg-[#2a2a2a] transition"
          >
            <div className="flex items-start gap-4">
              {/* Artist Avatar */}
              <div className="flex-shrink-0">
                {artist.avatar ? (
                  <img 
                    src={artist.avatar} 
                    alt={artist.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>

              {/* Artist Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate">
                  {artist.name}
                </h3>
                {artist.bio && (
                  <p className="text-gray-400 text-sm mt-2 line-clamp-3">
                    {artist.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ArtistsSection;
