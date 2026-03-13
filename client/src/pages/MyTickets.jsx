import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Ticket, Calendar, MapPin, Clock, QrCode, Download, 
  ChevronDown, ChevronUp, Filter, Search, RefreshCw
} from "lucide-react";
import QRCode from "react-qr-code";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const MyTickets = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { authFetch, isAuthenticated } = useAuth();
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, upcoming, past, used
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTicket, setExpandedTicket] = useState(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate("/");
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Show toast for new purchase
  useEffect(() => {
    if (location.state?.newPurchase) {
      toast.success("Payment successful! Your tickets are ready.");
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchTickets = async () => {
    if (!isSignedIn || !isAuthenticated) return;
    
    setLoading(true);
    try {
      const response = await authFetch(`${API_URL}/tickets`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Transform backend data to match component structure
        const transformedTickets = data.data.tickets.map(ticket => ({
          _id: ticket._id,
          ticket_code: ticket.ticket_code,
          qr_hash: ticket.qr_hash,
          status: ticket.status,
          event: {
            _id: ticket.concert?._id,
            name: ticket.concert?.title || "Unknown Event",
            // prefer ticket.performance if available
            date: ticket.performance?.date || ticket.concert?.start_time,
            time: ticket.performance?.startTime ? new Date((ticket.performance?.date) || ticket.concert?.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : (ticket.concert?.start_time ? new Date(ticket.concert.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""),
            venue: ticket.concert?.venue?.name || "TBA",
            image: ticket.concert?.thumbnail || "https://via.placeholder.com/400x300?text=Event",
          },
          ticketClass: ticket.ticketClass ? {
            name: ticket.ticketClass.name,
            price: ticket.ticketClass.base_price
          } : null,
          seat: ticket.showSeat?.seat ? {
            row: ticket.showSeat.seat.row,
            number: ticket.showSeat.seat.number,
            zone: ticket.ticketClass?.zone?.name || "General"
          } : null,
          purchasedAt: ticket.createdAt
        }));
        
        setTickets(transformedTickets);
      } else {
        console.error("Failed to fetch tickets:", data.message);
        // Show empty state instead of error for no tickets
        setTickets([]);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn && isAuthenticated) {
      fetchTickets();
    }
  }, [isSignedIn, isAuthenticated]);

  const filteredTickets = tickets.filter((ticket) => {
    const eventDate = new Date(ticket.event.date);
    const now = new Date();
    
    let matchFilter = true;
    if (filter === "upcoming") matchFilter = eventDate >= now && ticket.status === "VALID";
    if (filter === "past") matchFilter = eventDate < now;
    if (filter === "used") matchFilter = ticket.status === "USED";

    const matchSearch = ticket.event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        ticket.ticket_code.toLowerCase().includes(searchTerm.toLowerCase());

    return matchFilter && matchSearch;
  });

  const getStatusBadge = (status, eventDate) => {
    const isPast = new Date(eventDate) < new Date();
    
    if (status === "USED") {
      return <span className="px-3 py-1 rounded-full text-xs bg-gray-600 text-gray-300">Used</span>;
    }
    if (status === "REFUNDED") {
      return <span className="px-3 py-1 rounded-full text-xs bg-red-600/30 text-red-400">Refunded</span>;
    }
    if (isPast) {
      return <span className="px-3 py-1 rounded-full text-xs bg-yellow-600/30 text-yellow-400">Expired</span>;
    }
    return <span className="px-3 py-1 rounded-full text-xs bg-green-600/30 text-green-400">Valid</span>;
  };

  const handleDownload = (ticket) => {
    // In real app, generate PDF ticket
    alert(`Downloading ticket ${ticket.ticket_code}...`);
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-12 px-6 md:px-16 lg:px-24 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Tickets</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchTickets}
              disabled={loading}
              className="p-2 rounded-lg bg-[rgb(37,36,36)] hover:bg-gray-700 transition disabled:opacity-50"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-2 text-gray-400">
              <Ticket className="w-5 h-5" />
              <span>{tickets.length} tickets</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-[rgb(37,36,36)] border border-gray-700 focus:border-primary focus:outline-none"
            />
          </div>
          
          <div className="flex gap-2">
            {["all", "upcoming", "past", "used"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg capitalize transition ${
                  filter === f
                    ? "bg-primary text-black font-semibold"
                    : "bg-[rgb(37,36,36)] text-gray-400 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets List */}
        {filteredTickets.length === 0 ? (
          <div className="text-center py-16 bg-[rgb(37,36,36)] rounded-xl">
            <Ticket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400">No tickets found</h3>
            <p className="text-gray-500 mt-2">
              {filter === "all"
                ? "You haven't purchased any tickets yet"
                : `No ${filter} tickets`}
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 px-6 py-3 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dull"
            >
              Browse Events
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket._id}
                className="bg-[rgb(37,36,36)] rounded-xl overflow-hidden"
              >
                {/* Ticket Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() =>
                    setExpandedTicket(expandedTicket === ticket._id ? null : ticket._id)
                  }
                >
                  <div className="flex gap-4">
                    <img
                      src={ticket.event.image}
                      alt={ticket.event.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{ticket.event.name}</h3>
                          <p className="text-primary font-medium">{ticket.ticketClass.name}</p>
                        </div>
                        {getStatusBadge(ticket.status, ticket.event.date)}
                      </div>
                      
                      <div className="flex flex-wrap gap-4 mt-2 text-gray-400 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{ticket.event.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{ticket.event.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">{ticket.event.venue}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button className="self-center">
                      {expandedTicket === ticket._id ? (
                        <ChevronUp className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTicket === ticket._id && (
                  <div className="px-4 pb-4 border-t border-gray-700 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* QR Code */}
                      <div className="flex flex-col items-center bg-white p-6 rounded-lg">
                        <QRCode
                          value={JSON.stringify({
                            code: ticket.ticket_code,
                            hash: ticket.qr_hash,
                          })}
                          size={160}
                        />
                        <p className="mt-4 font-mono text-black font-semibold">
                          {ticket.ticket_code}
                        </p>
                      </div>

                      {/* Ticket Details */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-gray-400 text-sm">Ticket Type</p>
                          <p className="font-semibold">{ticket.ticketClass.name}</p>
                        </div>
                        
                        {ticket.seat && (
                          <div>
                            <p className="text-gray-400 text-sm">Seat</p>
                            <p className="font-semibold">
                              {ticket.seat.zone} - Row {ticket.seat.row}, Seat {ticket.seat.number}
                            </p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-gray-400 text-sm">Price</p>
                          <p className="font-semibold text-primary">
                            {ticket.ticketClass.price.toLocaleString('en-US')} VND
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-400 text-sm">Purchased</p>
                          <p className="font-semibold">{ticket.purchasedAt}</p>
                        </div>

                        <button
                          onClick={() => handleDownload(ticket)}
                          className="w-full mt-4 px-4 py-3 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dull flex items-center justify-center gap-2"
                        >
                          <Download className="w-5 h-5" />
                          Download Ticket
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
