/**
 * Event Zone Painter - IMPROVED VERSION
 * 
 * Features:
 * - Rectangle drawing tool (click & drag) for easy zone creation
 * - Polygon tool for complex shapes
 * - Smart row labels: left side for left/middle sections, right side for rightmost section
 * - Auto-save zones to database
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Stage, Layer, Line, Rect, Text, Circle, Group } from 'react-konva';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, Loader2, Plus, X, Palette, Pencil, MousePointer,
  ZoomIn, ZoomOut, RotateCcw, Trash2, Check, Save, Play, Square
} from 'lucide-react';
import { Card, Button, Input } from '../../components/ui';
import { API_URL } from '../../services/api';

// Default colors for ticket classes
const DEFAULT_COLORS = [
  '#22C55E', '#3B82F6', '#8B5CF6', '#EAB308', '#F97316',
  '#EF4444', '#EC4899', '#14B8A6', '#6366F1', '#84CC16',
];

const SEAT_RADIUS = 6;
const POINT_RADIUS = 8;

// Drawing modes
const MODE = {
  SELECT: 'select',
  DRAW_RECT: 'draw_rect',      // Rectangle tool - click & drag
  DRAW_POLYGON: 'draw_polygon'  // Polygon tool - click points
};

// Point-in-polygon algorithm
const isPointInPolygon = (point, polygon) => {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Convert polygon points to Konva Line format
const polygonToLinePoints = (points) => {
  if (!points) return [];
  return points.flatMap(p => [p.x, p.y]);
};

// Convert rectangle bounds to polygon points
const rectToPolygon = (rect) => {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height }
  ];
};

export default function EventZonePainter() {
  const { id: concertId } = useParams();
  const { authFetch } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [concert, setConcert] = useState(null);
  const [venueSeats, setVenueSeats] = useState([]);
  const [eventZones, setEventZones] = useState([]);
  const [ticketClasses, setTicketClasses] = useState([]);
  
  // Drawing state
  const [mode, setMode] = useState(MODE.SELECT);
  const [selectedTicketClass, setSelectedTicketClass] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  
  // Polygon drawing
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState([]);
  
  // Rectangle drawing
  const [isDrawingRect, setIsDrawingRect] = useState(false);
  const [rectStart, setRectStart] = useState(null);
  const [rectEnd, setRectEnd] = useState(null);
  
  // Show row labels toggle
  const [showRowLabels, setShowRowLabels] = useState(true);
  
  // Canvas state
  const [stageSize, setStageSize] = useState({ width: 900, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  
  // Zone config panel
  const [showZoneConfig, setShowZoneConfig] = useState(false);
  const [zoneConfigForm, setZoneConfigForm] = useState({
    name: '',
    rowLabelMappingText: ''
  });
  
  // Ticket class form
  const [showTicketClassForm, setShowTicketClassForm] = useState(false);
  const [ticketClassForm, setTicketClassForm] = useState({
    name: '',
    color: DEFAULT_COLORS[0],
    price: ''
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const concertRes = await authFetch(`${API_URL}/concerts/${concertId}`);
      if (!concertRes.ok) throw new Error('Failed to fetch concert');
      
      const concertData = await concertRes.json();
      if (concertData.success) {
        setConcert(concertData.data.concert);
        const tcs = concertData.data.ticketClasses || [];
        setTicketClasses(tcs);
        if (tcs.length > 0 && !selectedTicketClass) {
          setSelectedTicketClass(tcs[0]);
        }
        
        const venueId = concertData.data.concert.venue?._id;
        if (venueId) {
          const seatsRes = await authFetch(`${API_URL}/venues/${venueId}/seats`);
          if (seatsRes.ok) {
            const seatsData = await seatsRes.json();
            setVenueSeats(seatsData.data?.seats || []);
          }
        }
      }
      
      try {
        const zonesRes = await authFetch(`${API_URL}/concerts/${concertId}/zones`);
        if (zonesRes.ok) {
          const zonesData = await zonesRes.json();
          if (zonesData.success) {
            setEventZones(zonesData.data.eventZones || []);
          }
        }
      } catch (e) {
        console.log('No existing event zones');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load event data');
    } finally {
      setLoading(false);
    }
  }, [concertId, authFetch, selectedTicketClass]);

  useEffect(() => {
    if (concertId) fetchData();
  }, [concertId]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setStageSize({
          width: rect.width,
          height: Math.max(500, window.innerHeight - 280)
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Get seats in polygon
  const getSeatsInZone = useCallback((polygonPoints) => {
    if (!polygonPoints || polygonPoints.length < 3) return [];
    return venueSeats.filter(seat => isPointInPolygon({ x: seat.x, y: seat.y }, polygonPoints));
  }, [venueSeats]);

  // Current rectangle as polygon
  const currentRectPolygon = useMemo(() => {
    if (!rectStart || !rectEnd) return null;
    const x = Math.min(rectStart.x, rectEnd.x);
    const y = Math.min(rectStart.y, rectEnd.y);
    const width = Math.abs(rectEnd.x - rectStart.x);
    const height = Math.abs(rectEnd.y - rectStart.y);
    if (width < 5 || height < 5) return null;
    return rectToPolygon({ x, y, width, height });
  }, [rectStart, rectEnd]);

  // Preview seats for current drawing
  const previewSeats = useMemo(() => {
    if (mode === MODE.DRAW_POLYGON && currentDrawingPoints.length >= 3) {
      return getSeatsInZone(currentDrawingPoints);
    }
    if (mode === MODE.DRAW_RECT && currentRectPolygon) {
      return getSeatsInZone(currentRectPolygon);
    }
    return [];
  }, [mode, currentDrawingPoints, currentRectPolygon, getSeatsInZone]);

  // All seats assigned to zones
  const assignedSeatIds = useMemo(() => {
    const ids = new Set();
    eventZones.forEach(zone => {
      if (zone.seatIds) {
        zone.seatIds.forEach(id => ids.add(id.toString()));
      }
    });
    return ids;
  }, [eventZones]);

  // Helper to get seats in a zone (handles ObjectId vs string comparison)
  const getSeatsInZoneById = useCallback((zone) => {
    if (!zone.seatIds || zone.seatIds.length === 0) return [];
    const seatIdStrings = zone.seatIds.map(id => id.toString ? id.toString() : String(id));
    return venueSeats.filter(s => seatIdStrings.includes(s._id?.toString()));
  }, [venueSeats]);

  // Calculate row labels with smart positioning
  // Left/middle sections: label on left, rightmost section: label on right
  const calculateRowLabels = useCallback((zone, seatsInZone) => {
    // Handle rowLabelMapping - could be Map, object, or serialized object from MongoDB
    let rowLabelMapping = {};
    
    if (zone.rowLabelMapping) {
      if (zone.rowLabelMapping instanceof Map) {
        rowLabelMapping = Object.fromEntries(zone.rowLabelMapping);
      } else if (typeof zone.rowLabelMapping === 'object') {
        // MongoDB Map serializes as plain object in JSON
        rowLabelMapping = zone.rowLabelMapping;
      }
    }
    
    // Debug: log what we received
    console.log('Zone:', zone.name, 'rowLabelMapping:', rowLabelMapping, 'seats:', seatsInZone.length);
    
    if (Object.keys(rowLabelMapping).length === 0) {
      return [];
    }

    if (seatsInZone.length === 0) {
      console.log('No seats in zone for labels');
      return [];
    }

    // Group seats by row (using y coordinate to determine rows)
    const rowGroups = {};
    seatsInZone.forEach(seat => {
      // Round y to group seats in same visual row
      const rowKey = Math.round(seat.y / 20) * 20;
      if (!rowGroups[rowKey]) {
        rowGroups[rowKey] = [];
      }
      rowGroups[rowKey].push(seat);
    });

    // For each row, find all venue seats in that y-range to determine if this is rightmost section
    const labels = [];
    const sortedRowKeys = Object.keys(rowGroups).map(Number).sort((a, b) => a - b);
    
    console.log('Row keys:', sortedRowKeys, 'rowLabelMapping keys:', Object.keys(rowLabelMapping));
    
    sortedRowKeys.forEach((rowY, rowIndex) => {
      const rowSeats = rowGroups[rowY].sort((a, b) => a.x - b.x);
      if (rowSeats.length === 0) return;

      // Get custom label for this row (1-indexed)
      const labelText = rowLabelMapping[String(rowIndex + 1)];
      console.log(`Row ${rowIndex + 1} at y=${rowY}: looking for label "${rowIndex + 1}" -> "${labelText}"`);
      if (!labelText) return;

      // Find all venue seats at this y level
      const allSeatsInRow = venueSeats.filter(s => Math.abs(s.y - rowY) < 15).sort((a, b) => a.x - b.x);
      
      if (allSeatsInRow.length === 0) return;

      // Determine if this zone's seats are the rightmost section
      const zoneMinX = Math.min(...rowSeats.map(s => s.x));
      const zoneMaxX = Math.max(...rowSeats.map(s => s.x));
      const rowMaxX = Math.max(...allSeatsInRow.map(s => s.x));
      const rowMinX = Math.min(...allSeatsInRow.map(s => s.x));
      
      // Check if zone covers the rightmost portion of the row
      const isRightmost = Math.abs(zoneMaxX - rowMaxX) < 20;
      const isLeftmost = Math.abs(zoneMinX - rowMinX) < 20;
      
      // Determine label position
      let labelX, labelY, align;
      
      if (isRightmost && !isLeftmost) {
        // Rightmost section: label on right side
        labelX = zoneMaxX + 15;
        align = 'left';
      } else {
        // Left or middle section: label on left side
        labelX = zoneMinX - 15;
        align = 'right';
      }
      
      labelY = rowY - 4;

      labels.push({
        text: labelText,
        x: labelX,
        y: labelY,
        align,
        color: zone.color || '#FFFFFF'
      });
    });

    console.log('Generated labels:', labels);
    return labels;
  }, [venueSeats]);

  // Compute all row labels for all zones
  const allRowLabels = useMemo(() => {
    if (!showRowLabels) return [];
    
    const labels = [];
    eventZones.forEach(zone => {
      // Use helper function for proper ObjectId comparison
      const seatsInZone = getSeatsInZoneById(zone);
      const zoneLabels = calculateRowLabels(zone, seatsInZone);
      labels.push(...zoneLabels);
    });
    return labels;
  }, [eventZones, venueSeats, showRowLabels, calculateRowLabels, getSeatsInZoneById]);

  // Zoom handlers
  const handleZoom = (delta) => {
    setScale(prev => Math.max(0.2, Math.min(3, prev + delta)));
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Start drawing
  const startDrawing = (drawMode) => {
    if (!selectedTicketClass) {
      toast.error('Please select a ticket class first');
      return;
    }
    setMode(drawMode);
    setCurrentDrawingPoints([]);
    setRectStart(null);
    setRectEnd(null);
    setIsDrawingRect(false);
    
    const toolName = drawMode === MODE.DRAW_RECT ? 'Rectangle' : 'Polygon';
    toast.success(`${toolName} tool: ${selectedTicketClass.name}`, { duration: 2000 });
  };

  // Get pointer position adjusted for scale/position
  const getPointerPosition = (e) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    return {
      x: (pointer.x - position.x) / scale,
      y: (pointer.y - position.y) / scale
    };
  };

  // Handle mouse down for rectangle
  const handleMouseDown = (e) => {
    if (mode === MODE.DRAW_RECT && !isDrawingRect) {
      const point = getPointerPosition(e);
      setRectStart(point);
      setRectEnd(point);
      setIsDrawingRect(true);
    }
  };

  // Handle mouse move for rectangle
  const handleMouseMove = (e) => {
    if (mode === MODE.DRAW_RECT && isDrawingRect) {
      const point = getPointerPosition(e);
      setRectEnd(point);
    }
  };

  // Handle mouse up for rectangle
  const handleMouseUp = () => {
    if (mode === MODE.DRAW_RECT && isDrawingRect && currentRectPolygon) {
      finishDrawing(currentRectPolygon);
    }
    setIsDrawingRect(false);
  };

  // Handle click for polygon
  const handleStageClick = (e) => {
    if (mode === MODE.DRAW_POLYGON) {
      const point = getPointerPosition(e);
      
      // Check if clicking near first point to close
      if (currentDrawingPoints.length >= 3) {
        const firstPoint = currentDrawingPoints[0];
        const distance = Math.sqrt(
          Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
        );
        if (distance < 15 / scale) {
          finishDrawing(currentDrawingPoints);
          return;
        }
      }
      
      setCurrentDrawingPoints(prev => [...prev, point]);
    }
  };

  // Double-click to finish polygon
  const handleStageDoubleClick = () => {
    if (mode === MODE.DRAW_POLYGON && currentDrawingPoints.length >= 3) {
      finishDrawing(currentDrawingPoints);
    }
  };

  // Finish drawing and show config
  const finishDrawing = (polygonPoints) => {
    if (!polygonPoints || polygonPoints.length < 3) {
      toast.error('Shape needs at least 3 points');
      return;
    }
    
    if (!selectedTicketClass) {
      toast.error('No ticket class selected');
      return;
    }

    const seatsInZone = getSeatsInZone(polygonPoints);
    const zoneCount = eventZones.filter(z => 
      z.ticketClass?._id === selectedTicketClass._id || z.ticketClass === selectedTicketClass._id
    ).length;
    
    setZoneConfigForm({
      name: `${selectedTicketClass.name} ${zoneCount + 1}`,
      rowLabelMappingText: '',
      _tempPolygonPoints: polygonPoints,
      _tempSeatCount: seatsInZone.length
    });
    setShowZoneConfig(true);
    setMode(MODE.SELECT);
    setRectStart(null);
    setRectEnd(null);
  };

  // Save zone
  const handleSaveNewZone = async () => {
    if (!zoneConfigForm.name || !selectedTicketClass) {
      toast.error('Please provide a zone name');
      return;
    }

    setSaving(true);
    try {
      // Parse row label mapping
      let rowLabelMapping = {};
      if (zoneConfigForm.rowLabelMappingText) {
        zoneConfigForm.rowLabelMappingText.split('\n').forEach(line => {
          const [rowNum, label] = line.split(':').map(s => s.trim());
          if (rowNum && label) {
            rowLabelMapping[rowNum] = label;
          }
        });
      }

      const zoneData = {
        name: zoneConfigForm.name,
        ticketClassId: selectedTicketClass._id,
        color: selectedTicketClass.color,
        polygonPoints: zoneConfigForm._tempPolygonPoints,
        rowLabelMapping
      };

      const res = await authFetch(`${API_URL}/concerts/${concertId}/zones`, {
        method: 'POST',
        body: JSON.stringify(zoneData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        console.log('Zone saved, data returned:', data.data);
        console.log('rowLabelMapping in response:', data.data.rowLabelMapping);
        console.log('seatIds in response:', data.data.seatIds);
        
        const labelCount = data.data.rowLabelMapping ? Object.keys(data.data.rowLabelMapping).length : 0;
        toast.success(`Zone saved with ${data.data.seatCount} seats, ${labelCount} row labels`);
        setEventZones(prev => [...prev, data.data]);
        setShowZoneConfig(false);
        setCurrentDrawingPoints([]);
      } else {
        throw new Error(data.message || 'Failed to save zone');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save zone');
    } finally {
      setSaving(false);
    }
  };

  // Cancel drawing
  const cancelDrawing = () => {
    setCurrentDrawingPoints([]);
    setRectStart(null);
    setRectEnd(null);
    setIsDrawingRect(false);
    setMode(MODE.SELECT);
    setShowZoneConfig(false);
  };

  // Delete zone
  const handleDeleteZone = async (zoneId) => {
    if (!confirm('Delete this zone?')) return;

    try {
      const res = await authFetch(`${API_URL}/concerts/${concertId}/zones/${zoneId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Zone deleted');
        setEventZones(prev => prev.filter(z => z._id !== zoneId));
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete zone');
    }
  };

  // Generate seats
  const handleGenerateSeats = async () => {
    if (eventZones.length === 0) {
      toast.error('Draw at least one zone first');
      return;
    }

    setGenerating(true);
    try {
      const res = await authFetch(`${API_URL}/concerts/${concertId}/zones/generate-seats`, {
        method: 'POST',
        body: JSON.stringify({ clearExisting: true })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Generated ${data.data.totalSeats} show seats!`);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to generate seats');
    } finally {
      setGenerating(false);
    }
  };

  // Add ticket class
  const handleAddTicketClass = async () => {
    if (!ticketClassForm.name || !ticketClassForm.price) {
      toast.error('Please fill in name and price');
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch(`${API_URL}/concerts/${concertId}/ticket-classes`, {
        method: 'POST',
        body: JSON.stringify({
          name: ticketClassForm.name,
          color: ticketClassForm.color,
          price: parseFloat(ticketClassForm.price)
        })
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success('Ticket class added');
        setTicketClasses(prev => [...prev, data.data]);
        setSelectedTicketClass(data.data);
        setShowTicketClassForm(false);
        setTicketClassForm({ name: '', color: DEFAULT_COLORS[ticketClasses.length % DEFAULT_COLORS.length], price: '' });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add ticket class');
    } finally {
      setSaving(false);
    }
  };

  // Delete ticket class
  const handleDeleteTicketClass = async (tcId) => {
    if (!confirm('Delete this ticket class?')) return;
    try {
      const res = await authFetch(`${API_URL}/concerts/${concertId}/ticket-classes/${tcId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Ticket class deleted');
        setTicketClasses(prev => prev.filter(tc => tc._id !== tcId));
        if (selectedTicketClass?._id === tcId) {
          setSelectedTicketClass(ticketClasses[0] || null);
        }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const getZoneColor = (zone) => zone.color || zone.ticketClass?.color || '#4B5563';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800">
        <div className="flex items-center gap-4">
          <Link to="/events" className="text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-white">Zone Painter</h1>
            <p className="text-sm text-zinc-400">{concert?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode buttons */}
          <Button
            variant={mode === MODE.SELECT ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => { setMode(MODE.SELECT); cancelDrawing(); }}
            title="Select mode"
          >
            <MousePointer className="w-4 h-4" />
          </Button>
          
          {/* Rectangle tool - EASY TO USE */}
          <Button
            variant={mode === MODE.DRAW_RECT ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => startDrawing(MODE.DRAW_RECT)}
            disabled={!selectedTicketClass}
            title="Rectangle tool (click & drag)"
          >
            <Square className="w-4 h-4" />
            <span className="ml-1">Rectangle</span>
          </Button>
          
          {/* Polygon tool for complex shapes */}
          <Button
            variant={mode === MODE.DRAW_POLYGON ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => startDrawing(MODE.DRAW_POLYGON)}
            disabled={!selectedTicketClass}
            title="Polygon tool (click points)"
          >
            <Pencil className="w-4 h-4" />
            <span className="ml-1">Polygon</span>
          </Button>
          
          {/* Current ticket class */}
          {selectedTicketClass && (
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-700 rounded-md ml-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: selectedTicketClass.color }} />
              <span className="text-sm text-white">{selectedTicketClass.name}</span>
            </div>
          )}
          
          <div className="w-px h-6 bg-zinc-600 mx-2" />
          
          {/* Zoom */}
          <Button variant="secondary" size="sm" onClick={() => handleZoom(0.1)}><ZoomIn className="w-4 h-4" /></Button>
          <span className="text-sm text-zinc-400 min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          <Button variant="secondary" size="sm" onClick={() => handleZoom(-0.1)}><ZoomOut className="w-4 h-4" /></Button>
          <Button variant="secondary" size="sm" onClick={resetView}><RotateCcw className="w-4 h-4" /></Button>
          
          <div className="w-px h-6 bg-zinc-600 mx-2" />
          
          {/* Generate */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateSeats}
            disabled={generating || eventZones.length === 0}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span className="ml-1">Generate Seats</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 border-r border-zinc-700 bg-zinc-800 overflow-y-auto">
          {/* Venue Info */}
          <div className="p-4 border-b border-zinc-700">
            <h3 className="font-medium text-white mb-1">Venue</h3>
            <div className="text-sm text-zinc-400">{concert?.venue?.name || 'No venue'}</div>
            <div className="text-xs text-zinc-500">{venueSeats.length} seats</div>
          </div>
          
          {/* Ticket Classes */}
          <div className="p-4 border-b border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-white flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Ticket Classes
              </h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setTicketClassForm({ name: '', color: DEFAULT_COLORS[ticketClasses.length % DEFAULT_COLORS.length], price: '' });
                setShowTicketClassForm(true);
              }}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-xs text-zinc-500 mb-2">Click to select, then draw</p>
            
            <div className="space-y-2">
              {ticketClasses.map((tc) => (
                <div
                  key={tc._id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                    selectedTicketClass?._id === tc._id 
                      ? 'ring-2 ring-white bg-zinc-700' 
                      : 'bg-zinc-700/50 hover:bg-zinc-700'
                  }`}
                  onClick={() => setSelectedTicketClass(tc)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded" style={{ backgroundColor: tc.color }} />
                    <div>
                      <div className="text-sm text-white">{tc.name}</div>
                      <div className="text-xs text-zinc-400">{tc.price?.toLocaleString('vi-VN')}₫</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDeleteTicketClass(tc._id); }}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              
              {ticketClasses.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-zinc-500 mb-2">No ticket classes</p>
                  <Button variant="secondary" size="sm" onClick={() => setShowTicketClassForm(true)}>
                    <Plus className="w-4 h-4 mr-1" />Add Class
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Zones */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-white">Zones ({eventZones.length})</h3>
              <label className="flex items-center gap-1 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={showRowLabels}
                  onChange={(e) => setShowRowLabels(e.target.checked)}
                  className="w-3 h-3"
                />
                Labels
              </label>
            </div>
            
            <div className="space-y-2">
              {eventZones.map((zone) => (
                <div key={zone._id} className="p-2 rounded bg-zinc-700/50 hover:bg-zinc-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: getZoneColor(zone) }} />
                      <span className="text-sm text-white">{zone.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteZone(zone._id)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 ml-6">
                    {zone.seatCount || 0} seats
                  </div>
                </div>
              ))}
              
              {eventZones.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">
                  Select class → Click Rectangle/Polygon → Draw on canvas
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 overflow-hidden bg-zinc-900 relative">
          {/* Drawing instructions */}
          {(mode === MODE.DRAW_RECT || mode === MODE.DRAW_POLYGON) && (
            <div 
              className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white px-4 py-2 rounded-lg shadow-lg"
              style={{ backgroundColor: selectedTicketClass?.color || '#8B5CF6' }}
            >
              <span className="text-sm font-medium">
                {mode === MODE.DRAW_RECT ? 'Click & drag to draw rectangle' : 'Click to add points, double-click to finish'}
                {' • '}
                <button className="underline hover:no-underline" onClick={cancelDrawing}>Cancel</button>
              </span>
              {previewSeats.length > 0 && (
                <span className="ml-3 opacity-80">({previewSeats.length} seats)</span>
              )}
            </div>
          )}

          {/* No seats warning */}
          {venueSeats.length === 0 && !loading && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
              <div className="bg-zinc-800/90 rounded-lg p-6">
                <div className="text-zinc-400 mb-2">No seats found</div>
                <div className="text-sm text-zinc-500">Create seat chart in venue management first</div>
              </div>
            </div>
          )}
          
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            scaleX={scale}
            scaleY={scale}
            x={position.x}
            y={position.y}
            draggable={mode === MODE.SELECT}
            onDragEnd={(e) => setPosition({ x: e.target.x(), y: e.target.y() })}
            onClick={handleStageClick}
            onDblClick={handleStageDoubleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            style={{ cursor: mode === MODE.SELECT ? 'default' : 'crosshair' }}
          >
            <Layer>
              {/* Stage */}
              {concert?.venue?.stage && (
                <Group>
                  <Rect
                    x={concert.venue.stage.x || 300}
                    y={concert.venue.stage.y || 20}
                    width={concert.venue.stage.width || 300}
                    height={concert.venue.stage.height || 60}
                    fill="#1F2937"
                    stroke="#4B5563"
                    strokeWidth={2}
                    cornerRadius={4}
                  />
                  <Text
                    x={(concert.venue.stage.x || 300) + (concert.venue.stage.width || 300) / 2 - 30}
                    y={(concert.venue.stage.y || 20) + (concert.venue.stage.height || 60) / 2 - 8}
                    text="STAGE"
                    fontSize={16}
                    fill="#9CA3AF"
                    fontStyle="bold"
                  />
                </Group>
              )}

              {/* Existing zones - NO ZONE NAME LABELS */}
              {eventZones.map((zone) => (
                <Line
                  key={zone._id}
                  points={polygonToLinePoints(zone.polygonPoints)}
                  fill={getZoneColor(zone)}
                  opacity={0.5}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={1}
                  closed={true}
                />
              ))}

              {/* Current rectangle drawing */}
              {mode === MODE.DRAW_RECT && rectStart && rectEnd && (
                <Rect
                  x={Math.min(rectStart.x, rectEnd.x)}
                  y={Math.min(rectStart.y, rectEnd.y)}
                  width={Math.abs(rectEnd.x - rectStart.x)}
                  height={Math.abs(rectEnd.y - rectStart.y)}
                  fill={selectedTicketClass?.color || '#8B5CF6'}
                  opacity={0.4}
                  stroke={selectedTicketClass?.color || '#8B5CF6'}
                  strokeWidth={2}
                  dash={[5, 5]}
                />
              )}

              {/* Current polygon drawing */}
              {mode === MODE.DRAW_POLYGON && currentDrawingPoints.length > 0 && (
                <Group>
                  {currentDrawingPoints.length >= 3 && (
                    <Line
                      points={polygonToLinePoints(currentDrawingPoints)}
                      fill={selectedTicketClass?.color || '#8B5CF6'}
                      opacity={0.4}
                      stroke={selectedTicketClass?.color || '#8B5CF6'}
                      strokeWidth={2}
                      closed={true}
                      dash={[5, 5]}
                    />
                  )}
                  <Line
                    points={polygonToLinePoints(currentDrawingPoints)}
                    stroke={selectedTicketClass?.color || '#8B5CF6'}
                    strokeWidth={2}
                    closed={false}
                  />
                  {currentDrawingPoints.map((point, idx) => (
                    <Circle
                      key={idx}
                      x={point.x}
                      y={point.y}
                      radius={idx === 0 && currentDrawingPoints.length >= 3 ? POINT_RADIUS + 3 : POINT_RADIUS}
                      fill={idx === 0 ? '#22C55E' : (selectedTicketClass?.color || '#8B5CF6')}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  ))}
                </Group>
              )}

              {/* Venue seats */}
              {venueSeats.map((seat) => {
                const isInPreview = previewSeats.some(s => s._id === seat._id);
                const isAssigned = assignedSeatIds.has(seat._id?.toString());
                
                return (
                  <Circle
                    key={seat._id}
                    x={seat.x}
                    y={seat.y}
                    radius={SEAT_RADIUS}
                    fill={isInPreview ? (selectedTicketClass?.color || '#A855F7') : (isAssigned ? '#6B7280' : '#374151')}
                    stroke={isInPreview ? '#FFFFFF' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={isInPreview ? 2 : 0.5}
                    opacity={isAssigned && !isInPreview ? 0.5 : 1}
                  />
                );
              })}

              {/* Row labels - smart positioning */}
              {showRowLabels && allRowLabels.map((label, idx) => (
                <Text
                  key={idx}
                  x={label.x}
                  y={label.y}
                  text={label.text}
                  fontSize={10}
                  fill={label.color}
                  fontStyle="bold"
                  align={label.align}
                  offsetX={label.align === 'right' ? 0 : 0}
                />
              ))}
            </Layer>
          </Stage>
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-zinc-800/90 rounded-lg p-3">
            <div className="text-xs text-zinc-400 mb-2">{venueSeats.length} seats</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <div className="w-3 h-3 rounded-full bg-zinc-700 border border-zinc-500" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <div className="w-3 h-3 rounded-full bg-zinc-500" />
                <span>In zone</span>
              </div>
            </div>
          </div>

          {/* Help */}
          <div className="absolute bottom-4 right-4 bg-zinc-800/90 rounded-lg p-3 text-xs text-zinc-400 max-w-[200px]">
            <strong className="text-white">Quick Guide:</strong>
            <ol className="mt-1 space-y-0.5 list-decimal list-inside">
              <li>Create ticket classes</li>
              <li>Click a class to select</li>
              <li>Use Rectangle (easy) or Polygon</li>
              <li>Draw on canvas</li>
              <li>Generate Seats when done</li>
            </ol>
          </div>
        </div>

        {/* Zone Config Panel */}
        {showZoneConfig && (
          <div className="w-72 border-l border-zinc-700 bg-zinc-800 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-white">Save Zone</h3>
                <Button variant="ghost" size="sm" onClick={cancelDrawing}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Preview */}
              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: selectedTicketClass?.color + '33' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded" style={{ backgroundColor: selectedTicketClass?.color }} />
                  <span className="text-white font-medium">{selectedTicketClass?.name}</span>
                </div>
                <div className="text-sm" style={{ color: selectedTicketClass?.color }}>
                  {zoneConfigForm._tempSeatCount} seats
                </div>
              </div>

              <div className="space-y-4">
                {/* Zone Name */}
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">Zone Name</label>
                  <Input
                    value={zoneConfigForm.name}
                    onChange={(e) => setZoneConfigForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VIP Left"
                  />
                </div>

                {/* Row Labels */}
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">
                    Custom Row Labels
                  </label>
                  <textarea
                    className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white text-sm"
                    value={zoneConfigForm.rowLabelMappingText}
                    onChange={(e) => setZoneConfigForm(prev => ({ ...prev, rowLabelMappingText: e.target.value }))}
                    placeholder={"1:AT\n2:BT\n3:CT"}
                    rows={4}
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Row 1 = top row in zone. Format: rowNumber:label
                  </p>
                  <p className="text-xs text-zinc-500">
                    Labels auto-position: left for left/middle sections, right for rightmost section.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" className="flex-1" onClick={cancelDrawing}>Cancel</Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleSaveNewZone}
                    disabled={saving || !zoneConfigForm.name}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Class Modal */}
      {showTicketClassForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-4 border-b border-zinc-700">
              <h3 className="font-medium text-white">Add Ticket Class</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Name *</label>
                <Input
                  value={ticketClassForm.name}
                  onChange={(e) => setTicketClassForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VIP, Premium, Standard"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Price (VND) *</label>
                <Input
                  type="number"
                  value={ticketClassForm.price}
                  onChange={(e) => setTicketClassForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="500000"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        ticketClassForm.color === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setTicketClassForm(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-700 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowTicketClassForm(false)}>Cancel</Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleAddTicketClass}
                disabled={saving || !ticketClassForm.name || !ticketClassForm.price}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span className="ml-1">Create</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
