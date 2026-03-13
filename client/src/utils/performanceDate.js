// Resolve a display date/time for an event or ticket, preferring a selected performance when available
export function resolvePerformanceDate(event = {}, performanceId = null) {
  if (!event) return {};

  const findPerf = (id) => {
    if (!event.performances || !Array.isArray(event.performances)) return null;
    return event.performances.find(p => String(p._1d) === String(id) || String(p.id) === String(id) || String(p._id) === String(id));
  };

  let perf = null;
  if (performanceId) perf = findPerf(performanceId);
  if (!perf && event.performances && event.performances.length) {
    // choose the next upcoming performance if available, else first
    const now = new Date();
    const upcoming = event.performances.find(p => {
      try {
        const d = new Date(p.date);
        if (p.startTime) {
          const parts = String(p.startTime).split(':').map(Number);
          d.setHours(parts[0]||0, parts[1]||0, 0, 0);
        }
        return d >= now;
      } catch (e) { return false; }
    });
    perf = upcoming || event.performances[0];
  }

  // Build date/time strings
  const buildDateObj = (dStr) => { try { return dStr ? new Date(dStr) : null; } catch (e) { return null; } };
  const dateObj = perf ? buildDateObj(perf.date) : buildDateObj(event.start_time || event.date);

  const fmtDate = (d) => d ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const fmtTime = (d) => d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

  let startStr = '';
  let endStr = '';
  if (perf) {
    if (perf.startTime) {
      const sd = new Date(perf.date || event.start_time);
      const p = String(perf.startTime).split(':').map(Number);
      sd.setHours(p[0]||0, p[1]||0, 0, 0);
      startStr = fmtTime(sd);
    } else if (event.start_time) startStr = fmtTime(new Date(event.start_time));

    if (perf.endTime) {
      const ed = new Date(perf.date || event.end_time || event.start_time);
      const p = String(perf.endTime).split(':').map(Number);
      ed.setHours(p[0]||0, p[1]||0, 0, 0);
      endStr = fmtTime(ed);
    } else if (event.end_time) endStr = fmtTime(new Date(event.end_time));
  } else {
    startStr = event.start_time ? fmtTime(new Date(event.start_time)) : '';
    endStr = event.end_time ? fmtTime(new Date(event.end_time)) : '';
  }

  return {
    performance: perf || null,
    dateObj,
    dateStr: fmtDate(dateObj),
    startStr,
    endStr
  };
}

export default resolvePerformanceDate;
