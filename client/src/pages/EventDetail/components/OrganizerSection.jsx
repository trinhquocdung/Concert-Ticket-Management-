/**
 * OrganizerSection Component
 * Displays event organizer information
 */

import React from "react";
import { Building2, ExternalLink, Mail, Phone } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const OrganizerSection = ({ organizer }) => {
  const navigate = useNavigate();

  if (!organizer) {
    return null;
  }

  const companyName = organizer.organizer?.company_name || organizer.fullName || organizer.username;
  const description = organizer.organizer?.description || "Professional event organizer";
  const organizerLink = `/search?organizer=${organizer._id}`;

  return (
    <section id="section-organizer" className="px-6 md:px-16 lg:px-24 py-10 border-t border-white/10">
      <h2 className="text-2xl font-bold text-white mb-6">Organizer</h2>


      <div className="bg-[#252424] rounded-xl p-6 max-w-2xl">
        <Link to={organizerLink} className="flex items-start gap-6 group hover:bg-white/5 rounded-xl p-2 transition">
          {/* Avatar */}
          {organizer.avatar ? (
            <img 
              src={organizer.avatar} 
              alt={companyName}
              className="w-20 h-20 rounded-xl object-cover group-hover:ring-2 group-hover:ring-primary transition"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:ring-2 group-hover:ring-primary transition">
              <Building2 className="w-10 h-10 text-white" />
            </div>
          )}
          {/* Name and Description */}
          <div className="flex-1 min-w-0">
            <div className="text-xl font-semibold text-white mb-2 group-hover:text-primary transition inline-flex items-center gap-2">
              {companyName}
              <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-gray-400 mb-4 group-hover:text-gray-300 transition truncate">
              {description}
            </p>
            {/* Contact Info (if available) */}
            <div className="space-y-2 mb-2">
              {organizer.email && (
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{organizer.email}</span>
                </div>
              )}
              {organizer.phone && (
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{organizer.phone}</span>
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Verified Badge */}
        {organizer.organizer?.verified && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-blue-400 text-sm font-medium">Verified</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default OrganizerSection;
