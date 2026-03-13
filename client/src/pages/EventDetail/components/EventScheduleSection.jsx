/**
 * EventScheduleSection Component
 * Displays seat chart (as image) and show schedule with list/calendar view
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  List, 
  CalendarDays, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
};

const formatTime = (dateObj) => {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return 'TBA';
  return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatPrice = (price) => {
  if (!price) return '0';
  return new Intl.NumberFormat('en-US').format(price);
};

const formatDayName = (date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

const formatFullDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

const formatMonthYear = (date) => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const EventScheduleSection = ({ event, onBuyTicket }) => {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [zoom, setZoom] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePanel, setShowDatePanel] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [seatMapImage, setSeatMapImage] = useState(null);
  const imageContainerRef = useRef(null);

  // Use event.performances array for multiple slots
  const shows = (event.performances || []).map((perf, idx) => {
  // Parse perf.date as an instant and combine with perf.startTime/endTime using local components
  const dateObj = perf.date ? new Date(perf.date) : null;
  let startDateTime = null;
  let endDateTime = null;
  if (dateObj) {
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const d = dateObj.getDate();
    if (perf.startTime) {
      const [hh, mm] = perf.startTime.split(':').map(Number);
      startDateTime = new Date(y, m, d, hh || 0, mm || 0);
    }
    if (perf.endTime) {
      const [hh, mm] = perf.endTime.split(':').map(Number);
      endDateTime = new Date(y, m, d, hh || 0, mm || 0);
    }
  }
  const now = new Date();
  const isPast = endDateTime ? (endDateTime < now) : (dateObj ? (new Date(dateObj) < now) : false);
  return {
    id: perf._id || idx + 1,
    _id: perf._id || (idx + 1),
    date: dateObj,
    startTime: startDateTime,
    endTime: endDateTime,
    ticket_classes: perf.ticket_classes || [],
    isPast
  };
});

  // Get ticket classes with availability
  const ticketClasses = event.ticket_classes || [];

  // Fetch seat map image if available
  useEffect(() => {
    if (event.venue?.map_image) {
      setSeatMapImage(event.venue.map_image);
    }
  }, [event]);

  // Get event dates for calendar highlighting
  const eventDates = shows.map(s => {
    if (!s.date) return null;
    const d = new Date(s.date);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }).filter(Boolean);

  // Calendar generation (compact)
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start
    const today = new Date();
    const days = [];

    for (let i = 0; i < (startDay + 1) % 7; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateKey = `${year}-${month}-${d}`;
      const hasEvent = eventDates.includes(dateKey);
      const isToday = date.toDateString() === today.toDateString();
      days.push({ day: d, date, hasEvent, isToday });
    }
    return days;
  };
  const calendarDays = generateCalendarDays();
  const weekHeaders = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  // Count performances in current month
  const performanceCount = shows.filter(s => {
    return s.date.getFullYear() === currentMonth.getFullYear() && s.date.getMonth() === currentMonth.getMonth();
  }).length;

  // Month selector for top of calendar
  const getMonthSelector = () => {
    const months = [];
    for (let i = 0; i < 5; i++) {
      const monthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + i, 1);
      const showCount = shows.filter(s => 
        s.date.getFullYear() === monthDate.getFullYear() && 
        s.date.getMonth() === monthDate.getMonth()
      ).length;
      months.push({
        month: formatMonthYear(monthDate),
        showCount,
        monthDate
      });
    }
    return months;
  };

  const handleDateClick = (dayInfo) => {
    if (dayInfo?.hasEvent) {
      setSelectedDate(dayInfo.date);
      setShowDatePanel(true);
    }
  };

  const getShowsForDate = (date) => {
    return shows.filter(s => {
      const showDate = new Date(s.date);
      return showDate.toDateString() === date.toDateString();
    });
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(Math.min(zoom + 0.25, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <section id="section-schedule" className="px-6 md:px-16 lg:px-24 py-10 border-t border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Schedule</h2>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition ${
              viewMode === 'list' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
            }`}
            title="List view"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-2 rounded-lg transition ${
              viewMode === 'calendar' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
            }`}
            title="Calendar view"
          >
            <CalendarDays className="w-5 h-5" />
          </button>
        </div>
      </div>



      {/* Show Schedule - Full Width Below */}
      <div className="bg-[#252424] rounded-xl p-6">
        {viewMode === 'list' ? (
          <ShowListView 
            shows={shows}
            ticketClasses={ticketClasses}
            onBuyTicket={onBuyTicket}
          />
        ) : (
          <ShowCalendarView
            shows={shows}
            ticketClasses={ticketClasses}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            calendarDays={calendarDays}
            weekHeaders={weekHeaders}
            getMonthSelector={getMonthSelector}
            onDateClick={handleDateClick}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            selectedDate={selectedDate}
            showDatePanel={showDatePanel}
            setShowDatePanel={setShowDatePanel}
            getShowsForDate={getShowsForDate}
            onBuyTicket={onBuyTicket}
          />
        )}
      </div>
    </section>
  );
};

// Placeholder seat chart when no image
const SeatChartPlaceholder = ({ ticketClasses }) => {
  return (
    <div className="text-center py-8">
      {/* Stage */}
      <div className="mx-auto w-3/4 max-w-md mb-8">
        <div className="bg-gradient-to-b from-gray-700 to-gray-800 h-12 rounded-t-full flex items-center justify-center">
          <span className="text-gray-300 font-semibold tracking-widest text-sm">STAGE</span>
        </div>
      </div>

      {/* Zone boxes */}
      <div className="space-y-4 max-w-lg mx-auto">
        {ticketClasses.length > 0 ? (
          ticketClasses.map((tc, idx) => (
            <div 
              key={tc._id || idx}
              className="p-4 rounded-lg border-2 border-dashed"
              style={{ 
                borderColor: tc.color || '#3B82F6',
                backgroundColor: `${tc.color || '#3B82F6'}20`
              }}
            >
              <span className="text-white font-medium">{tc.name}</span>
              <span className="text-gray-400 ml-2">- {formatPrice(tc.price)} VND</span>
            </div>
          ))
        ) : (
          <div className="text-gray-400">
            Seat map is being updated
          </div>
        )}
      </div>
    </div>
  );
};

// List view component
const ShowListView = ({ shows, ticketClasses, onBuyTicket }) => {
  const [expandedShow, setExpandedShow] = useState(shows[0]?.id);

  return (
    <div className="space-y-4">
      {shows.map((show) => {
        const showDate = new Date(show.date);
        const isExpanded = expandedShow === show.id;

        return (
          <div key={show.id} className="border border-white/10 rounded-lg overflow-hidden">
            {/* Show Header */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition"
              onClick={() => setExpandedShow(isExpanded ? null : show.id)}
            >
              <div className="flex items-center gap-4">
                <div className="text-gray-400">
                  <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
                <div>
                  <p className="text-white font-medium">
                    {formatTime(show.startTime)} - {formatTime(show.endTime)}, {formatFullDayName(showDate)}
                  </p>
                  <p className="text-primary text-sm">
                    {showDate.getDate()} {showDate.toLocaleString('en-US', { month: 'long' })}, {showDate.getFullYear()}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!show.isPast) onBuyTicket(ticketClasses[0], show);
                }}
                className={`px-6 py-2 ${show.isPast ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-black'} font-semibold rounded-lg transition`}
                disabled={show.isPast}
              >
                {show.isPast ? 'Past' : 'Buy Tickets'}
              </button>
            </div>

            {/* Ticket Classes */}
            {isExpanded && (
              <div className="border-t border-white/10">
                <div className="p-4">
                  <h4 className="text-gray-400 text-sm mb-3">Ticket info</h4>
                  <div className="space-y-3">
                    {ticketClasses.map((tc) => {
                      const isAvailable = (tc.seatStats?.available || tc.available_qty || tc.quota - tc.sold_qty) > 0;
                      
                      return (
                        <div 
                          key={tc._id || tc.name}
                          className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tc.color || '#3B82F6' }}
                            />
                            <span className="text-white font-medium">{tc.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-primary font-semibold">
                              {formatPrice(tc.price)} VND
                            </span>
                            {!isAvailable && (
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                                Sold out
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Calendar view component
const ShowCalendarView = ({ 
  shows, 
  ticketClasses, 
  currentMonth,
  setCurrentMonth,
  calendarDays,
  weekHeaders,
  getMonthSelector,
  onDateClick,
  onPrevMonth,
  onNextMonth,
  selectedDate,
  showDatePanel,
  setShowDatePanel,
  getShowsForDate,
  onBuyTicket
}) => {
  const monthSelector = getMonthSelector();

  const today = new Date();
  const currentMonthIndex = monthSelector.findIndex(month => 
    month.monthDate.getFullYear() === currentMonth.getFullYear() && 
    month.monthDate.getMonth() === currentMonth.getMonth()
  );

  return (
    <div className="relative">
      {/* Month Selector */}
      <div className="flex items-center justify-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={onPrevMonth} className="p-1 text-gray-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        {monthSelector.slice(0, 5).map((month, idx) => (
          <div 
            key={idx}
            className={`px-3 py-2 rounded-lg text-center min-w-[80px] cursor-pointer transition ${
              idx === (currentMonthIndex !== -1 ? currentMonthIndex : 0) ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
            onClick={() => setCurrentMonth(month.monthDate)}
          >
            <p className="text-white text-sm font-medium">{month.month}</p>
            <p className="text-gray-400 text-xs">{month.showCount} shows</p>
          </div>
        ))}
        <button onClick={onNextMonth} className="p-1 text-gray-400 hover:text-white">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 max-w-md mx-auto">
        {/* Headers */}
        {weekHeaders.map((day) => (
          <div key={day} className="text-center text-gray-400 text-xs py-1">
            {day}
          </div>
        ))}

        {/* Days */}
        {calendarDays.map((dayInfo, idx) => (
          <div
            key={idx}
            onClick={() => onDateClick(dayInfo)}
            className={`
              h-8 w-8 flex items-center justify-center text-sm rounded-md relative mx-auto
              ${!dayInfo ? 'text-transparent' : ''}
              ${dayInfo?.isToday ? 'bg-white/10 text-white' : ''}
              ${dayInfo?.hasEvent 
                ? 'text-primary cursor-pointer hover:bg-primary/30' 
                : 'text-gray-500'
              }
            `}
          >
            {dayInfo?.day}
            {dayInfo?.hasEvent && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
            )}
          </div>
        ))}
      </div>

      {/* Side Panel for Selected Date */}
      {showDatePanel && selectedDate && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#1e1e1e] shadow-2xl z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-primary rounded" />
                <div>
                  <p className="text-white font-bold">
                    {formatFullDayName(selectedDate)}, {selectedDate.getDate()} tháng {String(selectedDate.getMonth() + 1).padStart(2, '0')}, {selectedDate.getFullYear()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDatePanel(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Shows for this date */}
            {getShowsForDate(selectedDate).map((show) => (
              <div key={show.id} className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white">
                    {formatTime(show.startTime)} - {formatTime(show.endTime)}
                  </p>
                  <button
                    onClick={() => { if (!show.isPast) onBuyTicket(ticketClasses[0], show); }}
                    className={`px-4 py-2 ${show.isPast ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-black'} font-semibold rounded-lg transition`}
                    disabled={show.isPast}
                  >
                    {show.isPast ? 'Past' : 'Buy Tickets'}
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-gray-400 text-sm">Ticket info</h4>
                  {ticketClasses.map((tc) => {
                    const isAvailable = (tc.seatStats?.available || tc.available_qty || tc.quota - tc.sold_qty) > 0;
                    
                    return (
                      <div 
                        key={tc._id || tc.name}
                        className="flex items-center justify-between p-3 bg-[#252424] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tc.color || '#3B82F6' }}
                          />
                          <span className="text-white font-medium">{tc.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-primary font-semibold">
                            {formatPrice(tc.price)} VND
                          </span>
                          {!isAvailable && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                              Sold out
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overlay */}
      {showDatePanel && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowDatePanel(false)}
        />
      )}
    </div>
  );
};

export default EventScheduleSection;
