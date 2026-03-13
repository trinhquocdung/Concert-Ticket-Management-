import React, { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Info } from "lucide-react";

/**
 * SeatSelection Component
 * Interactive seat map for selecting seats at concerts
 */
const SeatSelection = ({ 
  concert, 
  zones, 
  ticketClasses, 
  onSelect, 
  onClose,
  maxSeats = 10 
}) => {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock generate seats for demo
  useEffect(() => {
    const generateSeats = () => {
      const allSeats = [];
      
      zones?.forEach((zone) => {
        const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
        const seatsPerRow = 12;
        
        rows.forEach((row, rowIdx) => {
          for (let num = 1; num <= seatsPerRow; num++) {
            // Randomly set some seats as sold
            const isSold = Math.random() < 0.3;
            
            allSeats.push({
              id: `${zone._id || zone.name}-${row}${num}`,
              zone: zone._id || zone.name,
              zoneName: zone.name,
              row,
              number: num,
              status: isSold ? "SOLD" : "AVAILABLE",
              price: ticketClasses?.find(tc => tc.zone === zone._id)?.price || zone.price || 500000,
            });
          }
        });
      });

      setSeats(allSeats);
      setLoading(false);
    };

    if (zones?.length > 0) {
      generateSeats();
    }
  }, [zones, ticketClasses]);

  const handleSeatClick = (seat) => {
    if (seat.status === "SOLD" || seat.status === "LOCKED") return;

    const isSelected = selectedSeats.some((s) => s.id === seat.id);

    if (isSelected) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= maxSeats) {
        alert(`You can select maximum ${maxSeats} seats`);
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const getSeatColor = (seat) => {
    if (selectedSeats.some((s) => s.id === seat.id)) {
      return "bg-primary border-primary";
    }
    if (seat.status === "SOLD") {
      return "bg-gray-600 border-gray-600 cursor-not-allowed";
    }
    if (seat.status === "LOCKED") {
      return "bg-yellow-600 border-yellow-600 cursor-not-allowed";
    }
    // Color by zone
    const zoneColors = {
      "VIP": "bg-purple-600 border-purple-600 hover:bg-purple-500",
      "Zone A": "bg-blue-600 border-blue-600 hover:bg-blue-500",
      "Zone B": "bg-green-600 border-green-600 hover:bg-green-500",
      "Zone C": "bg-cyan-600 border-cyan-600 hover:bg-cyan-500",
      "Standing": "bg-orange-600 border-orange-600 hover:bg-orange-500",
    };
    return zoneColors[seat.zoneName] || "bg-green-600 border-green-600 hover:bg-green-500";
  };

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  const filteredSeats = selectedZone 
    ? seats.filter(s => s.zone === selectedZone || s.zoneName === selectedZone)
    : seats;

  const groupedSeats = filteredSeats.reduce((acc, seat) => {
    const key = `${seat.zoneName}-${seat.row}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(seat);
    return acc;
  }, {});

  const handleConfirm = () => {
    if (selectedSeats.length === 0) {
      alert("Please select at least one seat");
      return;
    }
    onSelect(selectedSeats);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="bg-[rgb(37,36,36)] px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Select Your Seats</h2>
          <p className="text-gray-400 text-sm">{concert?.name || concert?.title}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Seat Map */}
        <div className="flex-1 overflow-auto p-6">
          {/* Stage */}
          <div className="mx-auto w-3/4 max-w-xl mb-8">
            <div className="bg-gradient-to-b from-gray-700 to-gray-800 h-16 rounded-t-full flex items-center justify-center">
              <span className="text-gray-300 font-semibold tracking-widest">STAGE</span>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="fixed bottom-24 left-6 flex flex-col gap-2 z-10">
            <button
              onClick={() => setZoom(Math.min(zoom + 0.2, 2))}
              className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
              className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Zone Filter */}
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setSelectedZone(null)}
              className={`px-4 py-2 rounded-full text-sm transition ${
                !selectedZone ? "bg-primary text-black" : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
            >
              All Zones
            </button>
            {zones?.map((zone) => (
              <button
                key={zone._id || zone.name}
                onClick={() => setSelectedZone(zone._id || zone.name)}
                className={`px-4 py-2 rounded-full text-sm transition ${
                  selectedZone === (zone._id || zone.name)
                    ? "bg-primary text-black"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                {zone.name}
              </button>
            ))}
          </div>

          {/* Seats Grid */}
          <div 
            className="transition-transform duration-200"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
          >
            {Object.entries(groupedSeats).map(([key, rowSeats]) => {
              const [zoneName, row] = key.split("-");
              return (
                <div key={key} className="mb-4">
                  {row === "A" && (
                    <div className="text-center text-gray-400 text-sm mb-2 font-semibold">
                      {zoneName}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-6 text-gray-500 text-sm text-right mr-2">{row}</span>
                    {rowSeats
                      .sort((a, b) => a.number - b.number)
                      .map((seat) => (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(seat)}
                          disabled={seat.status === "SOLD" || seat.status === "LOCKED"}
                          className={`w-7 h-7 rounded-sm border-2 text-[10px] font-bold transition ${getSeatColor(seat)}`}
                          title={`${seat.zoneName} - Row ${seat.row}, Seat ${seat.number} - ${seat.price.toLocaleString('en-US')} VND`}
                        >
                          {seat.number}
                        </button>
                      ))}
                    <span className="w-6 text-gray-500 text-sm text-left ml-2">{row}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-600 rounded-sm"></div>
              <span className="text-gray-300">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-sm"></div>
              <span className="text-gray-300">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-600 rounded-sm"></div>
              <span className="text-gray-300">Sold</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-600 rounded-sm"></div>
              <span className="text-gray-300">Reserved</span>
            </div>
          </div>
        </div>

        {/* Sidebar - Selected Seats */}
        <div className="w-80 bg-[rgb(37,36,36)] p-6 overflow-auto">
          <h3 className="text-lg font-semibold text-white mb-4">
            Selected Seats ({selectedSeats.length}/{maxSeats})
          </h3>

          {selectedSeats.length === 0 ? (
            <div className="text-center py-8">
              <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Click on available seats to select</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-6">
                {selectedSeats.map((seat) => (
                  <div
                    key={seat.id}
                    className="flex items-center justify-between bg-black/30 px-3 py-2 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {seat.zoneName} - {seat.row}{seat.number}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {seat.price.toLocaleString('en-US')} VND
                      </p>
                    </div>
                    <button
                      onClick={() => handleSeatClick(seat)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between text-lg font-semibold text-white mb-4">
                  <span>Total</span>
                  <span className="text-primary">{totalPrice.toLocaleString('en-US')} VND</span>
                </div>

                <button
                  onClick={handleConfirm}
                  className="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary-dull transition"
                >
                  Confirm Selection
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;
