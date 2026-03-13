/**
 * Helpers to resolve a performance-specific Date for a concert/event
 */
export function resolvePerformanceDate(concert = {}, performanceId = null) {
  if (!concert) return null;
  const performances = Array.isArray(concert.performances) ? concert.performances : [];
  const now = new Date();

  const findById = (id) => performances.find(p => String(p._id) === String(id) || String(p.id) === String(id));

  let perf = null;
  if (performanceId) perf = findById(performanceId);

  if (!perf && performances.length > 0) {
    // Prefer the next upcoming performance
    const upcoming = performances
      .map(p => {
        try {
          const d = new Date(p.date);
          if (p.startTime) {
            const parts = String(p.startTime).split(':').map(Number);
            d.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
          }
          return { p, d };
        } catch (e) {
          return { p, d: new Date(p.date) };
        }
      })
      .filter(x => x.d && x.d >= now)
      .sort((a, b) => a.d - b.d);
    if (upcoming.length > 0) perf = upcoming[0].p;
  }

  if (perf) {
    try {
      const d = new Date(perf.date);
      if (perf.startTime) {
        const parts = String(perf.startTime).split(':').map(Number);
        d.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
      }
      return d;
    } catch (e) {
      return new Date(perf.date);
    }
  }

  // Fallback to top-level concert start_time
  if (concert.start_time) return new Date(concert.start_time);
  return null;
}

export default resolvePerformanceDate;
