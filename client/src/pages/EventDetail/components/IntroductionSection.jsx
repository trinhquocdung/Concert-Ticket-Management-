/**
 * IntroductionSection Component
 * Displays event description/introduction
 */

import React from "react";

const IntroductionSection = ({ event }) => {
  return (
    <section id="section-introduction" className="px-6 md:px-16 lg:px-24 py-10">
      <div className="max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-6">Overview</h2>
        <div className="bg-[#252424] rounded-xl p-6">
          {event.description ? (
            <div 
              className="text-gray-300 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ 
                __html: event.description.replace(/\n/g, '<br/>') 
              }}
            />
          ) : (
            <p className="text-gray-400 italic">
              No introduction information available for this event.
            </p>
          )}

          {/* Policies if available */}
          {event.policies && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Policies</h3>
              
              {event.policies.minAge > 0 && (
                <p className="text-gray-300 mb-2">
                  Minimum age: {event.policies.minAge} years
                </p>
              )}

              {event.policies.refundPolicy && (
                <p className="text-gray-300 mb-2">
                  Refund policy: {event.policies.refundPolicy}
                </p>
              )}

              {event.policies.rules && event.policies.rules.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-300 mb-2">Other notes:</p>
                  <ul className="ml-4 text-gray-400 space-y-1">
                    {event.policies.rules.map((rule, idx) => (
                      <li key={idx}>- {rule}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default IntroductionSection;
