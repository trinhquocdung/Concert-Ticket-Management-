/**
 * Visual Seat Chart Designer
 * A drag-and-drop canvas-based seat chart designer using react-konva
 * 
 * This component designs the PHYSICAL seat layout for a venue.
 * Seats are just positions - no pricing here.
 * Pricing (TicketClasses) are assigned per-event via the Event Zone Painter.
 * 
 * Features:
 * - Add/remove seats visually
 * - Drag seats to position them
 * - Multi-select with box selection and move multiple seats
 * - Copy/paste seats
 * - Generate rows of seats (straight or curved)
 * - Set physical seat types (Normal, Wheelchair, Restricted)
 * - Row labels displayed on canvas
 * - Gap/split tool for creating aisle spaces
 * - Capacity validation against venue total
 * - Save seat layout to database
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stage, Layer, Rect, Text, Group, Line } from 'react-konva';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, Plus, Trash2, Grid3X3, 
  MousePointer, Move, ZoomIn, ZoomOut, RotateCcw,
  AlertTriangle, Rows3, Undo2, Download, Settings2,
  Copy, Clipboard, Scissors, SplitSquareHorizontal,
  Tag
} from 'lucide-react';
import { PageLoader, Button, Card, Modal, Input } from '../../components/ui';
import * as venueService from '../../services/venueService';

// Constants
const SEAT_SIZE = 28;
const SEAT_SPACING = 35;
const ROW_LABEL_WIDTH = 40;

const SEAT_TYPES = [
  { value: 'NORMAL', label: 'Normal', color: '#3B82F6' },
  { value: 'WHEELCHAIR', label: 'Wheelchair', color: '#22C55E' },
  { value: 'RESTRICTED', label: 'Restricted', color: '#6B7280' },
];

const TOOLS = [
  { id: 'select', label: 'Select', icon: MousePointer, hint: 'Click or drag to select' },
  { id: 'move', label: 'Pan', icon: Move, hint: 'Drag to pan canvas' },
  { id: 'addSeat', label: 'Add Seat', icon: Plus, hint: 'Click to add seats' },
  { id: 'delete', label: 'Delete', icon: Trash2, hint: 'Click seats to delete' },
  { id: 'split', label: 'Split/Gap', icon: SplitSquareHorizontal, hint: 'Add gap in row' },
];

export default function VisualSeatDesigner() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const stageRef = useRef(null);
  const containerRef = useRef(null);

  // Data states
  const [venue, setVenue] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UI states
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [tool, setTool] = useState('select');
  const [currentSeatType, setCurrentSeatType] = useState('NORMAL');
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [hasChanges, setHasChanges] = useState(false);

  // Row generation
  const [showRowModal, setShowRowModal] = useState(false);
  const [rowConfig, setRowConfig] = useState({
    rowLabel: 'A',
    seatCount: 10,
    startNumber: 1,
    startX: 100,
    startY: 100,
    spacing: SEAT_SPACING,
    curved: false,
    curveRadius: 300,
    curveAngle: 90
  });

  // Grid generation modal
  const [showGridModal, setShowGridModal] = useState(false);
  const [gridConfig, setGridConfig] = useState({
    rows: 10,
    seatsPerRow: 15,
    startRow: 'A',
    startNumber: 1,
    spacing: SEAT_SPACING,
    startX: 100,
    startY: 100,
    clearExisting: true
  });

  // History for undo
  const [history, setHistory] = useState([]);

  // Box selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);
  const selectionStartRef = useRef(null);

  // Clipboard for copy/paste
  const [clipboard, setClipboard] = useState([]);

  // Multi-drag state
  const [isDraggingMultiple, setIsDraggingMultiple] = useState(false);
  const dragStartPosRef = useRef(null);
  const originalPositionsRef = useRef({});

  // Split/Gap modal
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitConfig, setSplitConfig] = useState({
    targetRow: 'A',
    afterSeatNumber: 5,
    gapSize: SEAT_SPACING * 2
  });

  // Relabel modal for selected seats
  const [showRelabelModal, setShowRelabelModal] = useState(false);
  const [relabelConfig, setRelabelConfig] = useState({
    newRowLabel: 'A',
    startNumber: 1,
    renumberSeats: true
  });

  // Row label visibility
  const [showRowLabels, setShowRowLabels] = useState(true);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [venueRes, seatsRes] = await Promise.all([
        venueService.getVenueById(authFetch, venueId),
        venueService.getVenueSeats(authFetch, venueId)
      ]);

      const venueData = venueRes.data?.venue || venueRes.venue;
      if (!venueData) {
        toast.error('Venue not found');
        navigate('/venues');
        return;
      }

      setVenue(venueData);

      // Load seats
      const seatsData = seatsRes.data?.seats || [];
      const formattedSeats = seatsData.map(seat => ({
        id: seat._id,
        row: seat.row,
        number: seat.number,
        label: seat.label || `${seat.row}${seat.number}`,
        seatType: seat.seatType || 'NORMAL',
        isActive: seat.isActive !== false,
        x: seat.x || 0,
        y: seat.y || 0,
        rotation: seat.rotation || 0
      }));

      setSeats(formattedSeats);
      setHistory([formattedSeats]);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load venue data');
    } finally {
      setLoading(false);
    }
  }, [authFetch, venueId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handle container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setStageSize({ width: rect.width, height: rect.height - 20 });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      const isCtrl = e.ctrlKey || e.metaKey;

      // Copy (Ctrl+C)
      if (isCtrl && key === 'c') {
        e.preventDefault();
        handleCopy();
      }
      // Paste (Ctrl+V)
      else if (isCtrl && key === 'v') {
        e.preventDefault();
        handlePaste();
      }
      // Cut (Ctrl+X)
      else if (isCtrl && key === 'x') {
        e.preventDefault();
        handleCut();
      }
      // Select All (Ctrl+A)
      else if (isCtrl && key === 'a') {
        e.preventDefault();
        setSelectedSeats(seats.map(s => s.id));
      }
      // Undo (Ctrl+Z)
      else if (isCtrl && key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      // Delete (Delete or Backspace)
      else if ((key === 'delete' || key === 'backspace') && selectedSeats.length > 0) {
        e.preventDefault();
        deleteSelectedSeats();
      }
      // Escape to deselect
      else if (key === 'escape') {
        setSelectedSeats([]);
        setIsSelecting(false);
        setSelectionRect(null);
      }
      // Arrow keys to move selected seats
      else if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) && selectedSeats.length > 0) {
        e.preventDefault();
        const moveAmount = e.shiftKey ? 10 : 5;
        let dx = 0, dy = 0;
        if (key === 'arrowup') dy = -moveAmount;
        if (key === 'arrowdown') dy = moveAmount;
        if (key === 'arrowleft') dx = -moveAmount;
        if (key === 'arrowright') dx = moveAmount;
        moveSelectedSeats(dx, dy);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSeats, seats, clipboard]);

  // Move selected seats by delta
  const moveSelectedSeats = (dx, dy) => {
    const newSeats = seats.map(s => 
      selectedSeats.includes(s.id) ? { ...s, x: s.x + dx, y: s.y + dy } : s
    );
    setSeats(newSeats);
    pushHistory(newSeats);
    setHasChanges(true);
  };

  // Copy selected seats to clipboard
  const handleCopy = () => {
    if (selectedSeats.length === 0) {
      toast.error('No seats selected');
      return;
    }
    const seatsToCopy = seats.filter(s => selectedSeats.includes(s.id));
    // Calculate centroid for relative positioning
    const avgX = seatsToCopy.reduce((sum, s) => sum + s.x, 0) / seatsToCopy.length;
    const avgY = seatsToCopy.reduce((sum, s) => sum + s.y, 0) / seatsToCopy.length;
    
    const clipboardData = seatsToCopy.map(s => ({
      ...s,
      relX: s.x - avgX,
      relY: s.y - avgY
    }));
    setClipboard(clipboardData);
    toast.success(`Copied ${seatsToCopy.length} seats`);
  };

  // Cut selected seats
  const handleCut = () => {
    if (selectedSeats.length === 0) {
      toast.error('No seats selected');
      return;
    }
    handleCopy();
    deleteSelectedSeats();
  };

  // Paste from clipboard
  const handlePaste = (pasteX = null, pasteY = null) => {
    if (clipboard.length === 0) {
      toast.error('Clipboard is empty');
      return;
    }
    
    if (seats.length + clipboard.length > venue.total_capacity) {
      toast.error(`Cannot paste ${clipboard.length} seats. Only ${venue.total_capacity - seats.length} remaining.`);
      return;
    }

    // Default paste position is offset from original
    const offsetX = pasteX !== null ? pasteX : 50;
    const offsetY = pasteY !== null ? pasteY : 50;

    const newSeats = clipboard.map((s, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      row: s.row,
      number: s.number,
      label: s.label,
      seatType: s.seatType,
      isActive: s.isActive,
      x: Math.round((s.relX + offsetX + 200) / 5) * 5,
      y: Math.round((s.relY + offsetY + 200) / 5) * 5,
      rotation: s.rotation || 0,
      isNew: true
    }));

    const allSeats = [...seats, ...newSeats];
    setSeats(allSeats);
    pushHistory(allSeats);
    setHasChanges(true);
    setSelectedSeats(newSeats.map(s => s.id));
    toast.success(`Pasted ${newSeats.length} seats`);
  };

  // Get unique rows for labels
  const getRowLabels = useCallback(() => {
    const rowMap = new Map();
    seats.forEach(seat => {
      if (!rowMap.has(seat.row)) {
        rowMap.set(seat.row, { row: seat.row, minY: seat.y, seats: [] });
      }
      const rowData = rowMap.get(seat.row);
      rowData.minY = Math.min(rowData.minY, seat.y);
      rowData.seats.push(seat);
    });
    return Array.from(rowMap.values()).sort((a, b) => a.minY - b.minY);
  }, [seats]);

  // Add gap/split in row
  const addGapInRow = () => {
    const { targetRow, afterSeatNumber, gapSize } = splitConfig;
    const rowSeats = seats.filter(s => s.row === targetRow);
    
    if (rowSeats.length === 0) {
      toast.error(`Row ${targetRow} not found`);
      return;
    }

    const newSeats = seats.map(s => {
      if (s.row === targetRow && s.number > afterSeatNumber) {
        return { ...s, x: s.x + gapSize };
      }
      return s;
    });

    setSeats(newSeats);
    pushHistory(newSeats);
    setHasChanges(true);
    setShowSplitModal(false);
    toast.success(`Added gap in row ${targetRow} after seat ${afterSeatNumber}`);
  };

  // Relabel selected seats (change row label and optionally renumber)
  const relabelSelectedSeats = () => {
    if (selectedSeats.length === 0) {
      toast.error('No seats selected');
      return;
    }

    const { newRowLabel, startNumber, renumberSeats } = relabelConfig;
    
    // Sort selected seats by position (left to right)
    const selectedSeatObjs = seats
      .filter(s => selectedSeats.includes(s.id))
      .sort((a, b) => a.x - b.x);

    const newSeats = seats.map(s => {
      if (selectedSeats.includes(s.id)) {
        const idx = selectedSeatObjs.findIndex(sel => sel.id === s.id);
        const newNumber = renumberSeats ? startNumber + idx : s.number;
        return {
          ...s,
          row: newRowLabel,
          number: newNumber,
          label: `${newRowLabel}${newNumber}`
        };
      }
      return s;
    });

    setSeats(newSeats);
    pushHistory(newSeats);
    setHasChanges(true);
    setShowRelabelModal(false);
    toast.success(`Relabeled ${selectedSeats.length} seats to row ${newRowLabel}`);
  };

  // Get all unique row labels for dropdown
  const getUniqueRows = useCallback(() => {
    return [...new Set(seats.map(s => s.row))].sort();
  }, [seats]);

  // Save changes to history
  const pushHistory = (newSeats) => {
    setHistory(prev => [...prev.slice(-19), newSeats]);
  };

  // Undo
  const handleUndo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      setSeats(newHistory[newHistory.length - 1]);
      setHistory(newHistory);
      setHasChanges(true);
    }
  };

  // Add single seat at position
  const addSeatAt = (x, y) => {
    if (seats.length >= venue.total_capacity) {
      toast.error(`Cannot add more seats. Venue capacity (${venue.total_capacity}) reached.`);
      return;
    }

    // Find next available seat number in the selected row
    const rowSeats = seats.filter(s => s.row === rowConfig.rowLabel);
    const maxNumber = rowSeats.length > 0 
      ? Math.max(...rowSeats.map(s => s.number)) 
      : 0;

    const newSeat = {
      id: `temp-${Date.now()}-${Math.random()}`,
      row: rowConfig.rowLabel,
      number: maxNumber + 1,
      label: `${rowConfig.rowLabel}${maxNumber + 1}`,
      seatType: currentSeatType,
      isActive: true,
      x: Math.round(x / 5) * 5,
      y: Math.round(y / 5) * 5,
      rotation: 0,
      isNew: true
    };

    const newSeats = [...seats, newSeat];
    setSeats(newSeats);
    pushHistory(newSeats);
    setHasChanges(true);
  };

  // Generate row of seats
  const generateRow = () => {
    const { rowLabel, seatCount, startNumber, startX, startY, spacing, curved, curveRadius, curveAngle } = rowConfig;
    
    if (seats.length + seatCount > venue.total_capacity) {
      toast.error(`Cannot add ${seatCount} seats. Only ${venue.total_capacity - seats.length} remaining.`);
      return;
    }

    const newSeats = [];
    
    if (curved) {
      const angleStep = curveAngle / (seatCount - 1 || 1);
      const startAngle = -curveAngle / 2;
      
      for (let i = 0; i < seatCount; i++) {
        const angle = (startAngle + angleStep * i) * (Math.PI / 180);
        const x = startX + curveRadius * Math.sin(angle);
        const y = startY - curveRadius * Math.cos(angle) + curveRadius;
        
        newSeats.push({
          id: `temp-${Date.now()}-${i}`,
          row: rowLabel,
          number: startNumber + i,
          label: `${rowLabel}${startNumber + i}`,
          seatType: currentSeatType,
          isActive: true,
          x: Math.round(x),
          y: Math.round(y),
          rotation: angle * (180 / Math.PI),
          isNew: true
        });
      }
    } else {
      for (let i = 0; i < seatCount; i++) {
        newSeats.push({
          id: `temp-${Date.now()}-${i}`,
          row: rowLabel,
          number: startNumber + i,
          label: `${rowLabel}${startNumber + i}`,
          seatType: currentSeatType,
          isActive: true,
          x: startX + i * spacing,
          y: startY,
          rotation: 0,
          isNew: true
        });
      }
    }

    const allSeats = [...seats, ...newSeats];
    setSeats(allSeats);
    pushHistory(allSeats);
    setHasChanges(true);
    setShowRowModal(false);
    
    // Increment row label for next row
    const nextLabel = String.fromCharCode(rowLabel.charCodeAt(0) + 1);
    setRowConfig(prev => ({ ...prev, rowLabel: nextLabel, startY: prev.startY + SEAT_SPACING }));
    
    toast.success(`Added ${seatCount} seats in row ${rowLabel}`);
  };

  // Generate grid of seats
  const generateGrid = async () => {
    const { rows, seatsPerRow, startRow, startNumber, spacing, startX, startY, clearExisting } = gridConfig;
    const totalSeats = rows * seatsPerRow;

    if (!clearExisting && seats.length + totalSeats > venue.total_capacity) {
      toast.error(`Cannot add ${totalSeats} seats. Only ${venue.total_capacity - seats.length} remaining.`);
      return;
    }

    if (totalSeats > venue.total_capacity) {
      toast.error(`Cannot generate ${totalSeats} seats. Venue capacity is ${venue.total_capacity}.`);
      return;
    }

    const newSeats = [];
    const startCharCode = startRow.charCodeAt(0);

    for (let r = 0; r < rows; r++) {
      const rowLabel = String.fromCharCode(startCharCode + r);
      for (let n = 0; n < seatsPerRow; n++) {
        const seatNumber = startNumber + n;
        newSeats.push({
          id: `temp-${Date.now()}-${r}-${n}`,
          row: rowLabel,
          number: seatNumber,
          label: `${rowLabel}${seatNumber}`,
          seatType: 'NORMAL',
          isActive: true,
          x: startX + n * spacing,
          y: startY + r * spacing,
          rotation: 0,
          isNew: true
        });
      }
    }

    const allSeats = clearExisting ? newSeats : [...seats, ...newSeats];
    setSeats(allSeats);
    pushHistory(allSeats);
    setHasChanges(true);
    setShowGridModal(false);
    
    toast.success(`Generated ${totalSeats} seats`);
  };

  // Delete selected seats
  const deleteSelectedSeats = () => {
    if (selectedSeats.length === 0) return;
    const newSeats = seats.filter(s => !selectedSeats.includes(s.id));
    setSeats(newSeats);
    pushHistory(newSeats);
    setSelectedSeats([]);
    setHasChanges(true);
  };

  // Handle stage click
  const handleStageClick = (e) => {
    // Don't handle click if we just finished a box selection
    if (selectionStartRef.current?.wasBoxSelect) {
      selectionStartRef.current = null;
      return;
    }

    if (tool === 'addSeat') {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      const x = (pos.x - stagePos.x) / scale;
      const y = (pos.y - stagePos.y) / scale;
      addSeatAt(x, y);
    } else if (tool === 'select') {
      if (e.target === e.target.getStage()) {
        setSelectedSeats([]);
      }
    } else if (tool === 'split') {
      // Open split modal with nearest row
      setShowSplitModal(true);
    }
  };

  // Handle mouse down for box selection
  const handleStageMouseDown = (e) => {
    if (tool !== 'select') return;
    if (e.target !== e.target.getStage()) return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const x = (pos.x - stagePos.x) / scale;
    const y = (pos.y - stagePos.y) / scale;

    selectionStartRef.current = { x, y, wasBoxSelect: false };
  };

  // Handle mouse move for box selection
  const handleStageMouseMove = (e) => {
    if (!selectionStartRef.current) return;
    if (tool !== 'select') return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const x = (pos.x - stagePos.x) / scale;
    const y = (pos.y - stagePos.y) / scale;

    const start = selectionStartRef.current;
    const dx = Math.abs(x - start.x);
    const dy = Math.abs(y - start.y);

    // Only start box selection after dragging at least 10px (prevents accidental triggers)
    if (dx > 10 || dy > 10 || isSelecting) {
      if (!isSelecting) {
        setIsSelecting(true);
        selectionStartRef.current.wasBoxSelect = true;
      }
      
      setSelectionRect({
        x: Math.min(start.x, x),
        y: Math.min(start.y, y),
        width: Math.abs(x - start.x),
        height: Math.abs(y - start.y)
      });
    }
  };

  // Handle mouse up for box selection
  const handleStageMouseUp = (e) => {
    // Always clear selection state on mouse up
    const wasSelecting = isSelecting;
    const currentRect = selectionRect;
    
    // Immediately reset all selection state
    setIsSelecting(false);
    setSelectionRect(null);
    
    if (!wasSelecting || !currentRect) {
      selectionStartRef.current = null;
      return;
    }

    // Minimum size threshold for valid selection
    const MIN_SELECTION_SIZE = 15;
    if (currentRect.width < MIN_SELECTION_SIZE && currentRect.height < MIN_SELECTION_SIZE) {
      selectionStartRef.current = null;
      return;
    }

    // Find seats within selection rectangle (check if seat bounds overlap with selection)
    const halfSeat = SEAT_SIZE / 2;
    const selected = seats.filter(seat => {
      // Seat bounding box
      const seatLeft = seat.x - halfSeat;
      const seatRight = seat.x + halfSeat;
      const seatTop = seat.y - halfSeat;
      const seatBottom = seat.y + halfSeat;
      
      // Selection bounding box
      const selLeft = currentRect.x;
      const selRight = currentRect.x + currentRect.width;
      const selTop = currentRect.y;
      const selBottom = currentRect.y + currentRect.height;
      
      // Check for overlap (any part of seat inside selection)
      return seatRight >= selLeft && 
             seatLeft <= selRight && 
             seatBottom >= selTop && 
             seatTop <= selBottom;
    });

    if (selected.length > 0) {
      if (e.evt?.shiftKey) {
        // Add to existing selection
        setSelectedSeats(prev => [...new Set([...prev, ...selected.map(s => s.id)])]);
      } else {
        setSelectedSeats(selected.map(s => s.id));
      }
      toast.success(`Selected ${selected.length} seat${selected.length > 1 ? 's' : ''}`);
    }
    
    // Clear the ref after a short delay to allow click handler to check it
    setTimeout(() => {
      selectionStartRef.current = null;
    }, 50);
  };

  // Handle seat click
  const handleSeatClick = (seat, e) => {
    e.cancelBubble = true;
    
    if (tool === 'select') {
      if (e.evt.shiftKey) {
        setSelectedSeats(prev => 
          prev.includes(seat.id) 
            ? prev.filter(id => id !== seat.id)
            : [...prev, seat.id]
        );
      } else {
        setSelectedSeats([seat.id]);
      }
    } else if (tool === 'delete') {
      const newSeats = seats.filter(s => s.id !== seat.id);
      setSeats(newSeats);
      pushHistory(newSeats);
      setHasChanges(true);
    }
  };

  // Handle seat drag - supports multi-select dragging
  const handleSeatDragStart = (seat, e) => {
    // If dragging a selected seat, move all selected seats together
    if (selectedSeats.includes(seat.id) && selectedSeats.length > 1) {
      setIsDraggingMultiple(true);
      dragStartPosRef.current = { x: e.target.x(), y: e.target.y() };
      
      // Store original positions of all selected seats
      const positions = {};
      seats.forEach(s => {
        if (selectedSeats.includes(s.id)) {
          positions[s.id] = { x: s.x, y: s.y };
        }
      });
      originalPositionsRef.current = positions;
    }
  };

  const handleSeatDrag = (seat, e) => {
    const newX = Math.round(e.target.x() / 5) * 5;
    const newY = Math.round(e.target.y() / 5) * 5;
    
    if (isDraggingMultiple && selectedSeats.includes(seat.id)) {
      // Calculate delta from drag start
      const dx = newX - dragStartPosRef.current.x;
      const dy = newY - dragStartPosRef.current.y;
      
      // Move all selected seats by the same delta
      const newSeats = seats.map(s => {
        if (selectedSeats.includes(s.id)) {
          const orig = originalPositionsRef.current[s.id];
          return { 
            ...s, 
            x: Math.round((orig.x + dx) / 5) * 5, 
            y: Math.round((orig.y + dy) / 5) * 5 
          };
        }
        return s;
      });
      setSeats(newSeats);
    } else {
      const newSeats = seats.map(s => 
        s.id === seat.id ? { ...s, x: newX, y: newY } : s
      );
      setSeats(newSeats);
    }
    setHasChanges(true);
  };

  const handleSeatDragEnd = () => {
    if (isDraggingMultiple) {
      setIsDraggingMultiple(false);
      dragStartPosRef.current = null;
      originalPositionsRef.current = {};
    }
    pushHistory(seats);
  };

  // Handle stage drag (pan)
  const handleStageDrag = (e) => {
    if (tool === 'move') {
      setStagePos({ x: e.target.x(), y: e.target.y() });
    }
  };

  // Zoom controls
  const handleZoom = (direction) => {
    const newScale = direction === 'in' 
      ? Math.min(scale * 1.2, 3) 
      : Math.max(scale / 1.2, 0.3);
    setScale(newScale);
  };

  const resetView = () => {
    setScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  // Set type for selected seats
  const setSelectedSeatsType = (seatType) => {
    const newSeats = seats.map(s => 
      selectedSeats.includes(s.id) ? { ...s, seatType } : s
    );
    setSeats(newSeats);
    pushHistory(newSeats);
    setHasChanges(true);
  };

  // Save seats to database
  const handleSave = async () => {
    setSaving(true);
    try {
      const seatsToSave = seats.map(s => ({
        row: s.row,
        number: s.number,
        label: s.label,
        seatType: s.seatType,
        isActive: s.isActive,
        x: s.x,
        y: s.y,
        rotation: s.rotation || 0
      }));

      await venueService.saveVenueSeats(authFetch, venueId, seatsToSave);
      toast.success(`Saved ${seats.length} seats`);
      setHasChanges(false);
      
      // Refresh to get proper IDs
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to save seats');
    } finally {
      setSaving(false);
    }
  };

  // Render seat on canvas
  const renderSeat = (seat) => {
    const isSelected = selectedSeats.includes(seat.id);
    const seatType = SEAT_TYPES.find(t => t.value === seat.seatType) || SEAT_TYPES[0];
    
    return (
      <Group
        key={seat.id}
        x={seat.x}
        y={seat.y}
        rotation={seat.rotation || 0}
        draggable={tool === 'select'}
        onDragStart={(e) => handleSeatDragStart(seat, e)}
        onDragMove={(e) => handleSeatDrag(seat, e)}
        onDragEnd={handleSeatDragEnd}
        onClick={(e) => handleSeatClick(seat, e)}
        onTap={(e) => handleSeatClick(seat, e)}
      >
        <Rect
          width={SEAT_SIZE}
          height={SEAT_SIZE}
          offsetX={SEAT_SIZE / 2}
          offsetY={SEAT_SIZE / 2}
          fill={seatType.color}
          cornerRadius={4}
          stroke={isSelected ? '#ffffff' : 'transparent'}
          strokeWidth={isSelected ? 3 : 0}
          shadowColor={isSelected ? '#ffffff' : 'transparent'}
          shadowBlur={isSelected ? 10 : 0}
          opacity={seat.isActive ? 1 : 0.4}
        />
        <Text
          text={String(seat.number)}
          fontSize={10}
          fill="#ffffff"
          align="center"
          verticalAlign="middle"
          width={SEAT_SIZE}
          height={SEAT_SIZE}
          offsetX={SEAT_SIZE / 2}
          offsetY={SEAT_SIZE / 2}
        />
      </Group>
    );
  };

  if (loading) return <PageLoader />;
  if (!venue) return <div className="text-center py-12"><p className="text-gray-400">Venue not found</p></div>;

  const remainingCapacity = venue.total_capacity - seats.length;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/venues')} className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Seat Layout Designer</h1>
            <p className="text-gray-400">{venue.name} - {venue.city}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Capacity Info */}
          <div className="flex items-center gap-3 text-sm bg-white/5 px-4 py-2 rounded-lg">
            <span className="text-gray-400">
              Seats: <span className={seats.length > venue.total_capacity ? 'text-red-400' : 'text-white font-medium'}>
                {seats.length}
              </span> / {venue.total_capacity}
            </span>
            {remainingCapacity <= 0 && (
              <span className="text-red-400 flex items-center gap-1">
                <AlertTriangle size={14} /> Full
              </span>
            )}
          </div>
          <Button variant="outline" onClick={handleUndo} disabled={history.length <= 1}>
            <Undo2 size={16} /> Undo
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!hasChanges}>
            <Save size={16} /> Save {hasChanges && '*'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Sidebar */}
        <div className="w-64 flex flex-col gap-4">
          {/* Tools */}
          <Card title="Tools" className="flex-shrink-0">
            <div className="grid grid-cols-2 gap-2">
              {TOOLS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  title={t.hint}
                  className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                    tool === t.id
                      ? 'bg-primary text-black'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <t.icon size={18} />
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
              <Button size="sm" variant="outline" className="w-full" onClick={() => setShowRowModal(true)}>
                <Rows3 size={14} /> Add Row
              </Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => setShowGridModal(true)}>
                <Grid3X3 size={14} /> Generate Grid
              </Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => setShowSplitModal(true)}>
                <SplitSquareHorizontal size={14} /> Add Gap/Split
              </Button>
            </div>
          </Card>

          {/* Edit Actions (Copy/Paste/Align) */}
          <Card title="Edit Actions" className="flex-shrink-0">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleCopy}
                disabled={selectedSeats.length === 0}
                title="Copy (Ctrl+C)"
                className="p-2 rounded-lg flex flex-col items-center gap-1 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Copy size={16} />
                <span className="text-[10px]">Copy</span>
              </button>
              <button
                onClick={handleCut}
                disabled={selectedSeats.length === 0}
                title="Cut (Ctrl+X)"
                className="p-2 rounded-lg flex flex-col items-center gap-1 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Scissors size={16} />
                <span className="text-[10px]">Cut</span>
              </button>
              <button
                onClick={() => handlePaste()}
                disabled={clipboard.length === 0}
                title="Paste (Ctrl+V)"
                className="p-2 rounded-lg flex flex-col items-center gap-1 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Clipboard size={16} />
                <span className="text-[10px]">Paste</span>
              </button>
            </div>
            
            {clipboard.length > 0 && (
              <p className="text-[10px] text-gray-500 mt-2">📋 {clipboard.length} seats in clipboard</p>
            )}
          </Card>

          {/* Seat Type */}
          <Card title="Seat Type" className="flex-shrink-0">
            <p className="text-xs text-gray-500 mb-2">Physical type (for new seats)</p>
            <div className="space-y-2">
              {SEAT_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setCurrentSeatType(type.value)}
                  className={`w-full p-2 rounded-lg flex items-center gap-2 transition-colors ${
                    currentSeatType === type.value
                      ? 'ring-2 ring-white bg-white/10'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="w-5 h-5 rounded" style={{ backgroundColor: type.color }} />
                  <span className="text-sm text-white">{type.label}</span>
                </button>
              ))}
            </div>
            {selectedSeats.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-gray-400 mb-2">{selectedSeats.length} selected</p>
                <div className="flex gap-1 flex-wrap">
                  {SEAT_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedSeatsType(type.value)}
                      className="px-2 py-1 text-xs rounded text-white"
                      style={{ backgroundColor: type.color }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => {
                  // Pre-fill with first selected seat's row
                  const firstSeat = seats.find(s => selectedSeats.includes(s.id));
                  if (firstSeat) {
                    setRelabelConfig(prev => ({ ...prev, newRowLabel: firstSeat.row }));
                  }
                  setShowRelabelModal(true);
                }}>
                  <Tag size={12} /> Relabel Row
                </Button>
                <Button size="sm" variant="danger" className="w-full mt-2" onClick={deleteSelectedSeats}>
                  <Trash2 size={12} /> Delete Selected
                </Button>
              </div>
            )}
          </Card>

          {/* View Controls */}
          <Card title="View" className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <button onClick={() => handleZoom('out')} className="p-2 bg-white/5 rounded hover:bg-white/10">
                <ZoomOut size={16} />
              </button>
              <span className="text-sm text-gray-400">{Math.round(scale * 100)}%</span>
              <button onClick={() => handleZoom('in')} className="p-2 bg-white/5 rounded hover:bg-white/10">
                <ZoomIn size={16} />
              </button>
              <button onClick={resetView} className="p-2 bg-white/5 rounded hover:bg-white/10" title="Reset View">
                <RotateCcw size={16} />
              </button>
            </div>
            <label className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showRowLabels} 
                onChange={(e) => setShowRowLabels(e.target.checked)} 
                className="w-4 h-4 rounded"
              />
              <span className="text-xs text-gray-400">Show Row Labels</span>
            </label>
          </Card>

          {/* Instructions */}
          <Card className="flex-shrink-0">
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-400 mb-2">Shortcuts:</p>
              <p>• <kbd className="px-1 bg-white/10 rounded">Drag</kbd> Box select</p>
              <p>• <kbd className="px-1 bg-white/10 rounded">Shift+Click</kbd> Multi-select</p>
              <p>• <kbd className="px-1 bg-white/10 rounded">Ctrl+C/V/X</kbd> Copy/Paste/Cut</p>
              <p>• <kbd className="px-1 bg-white/10 rounded">Arrows</kbd> Move selected</p>
              <p>• <kbd className="px-1 bg-white/10 rounded">Delete</kbd> Remove selected</p>
              <p>• <kbd className="px-1 bg-white/10 rounded">Ctrl+A</kbd> Select all</p>
              <p>• <kbd className="px-1 bg-white/10 rounded">Esc</kbd> Deselect</p>
            </div>
          </Card>
        </div>

        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 bg-zinc-900 rounded-xl overflow-hidden relative">
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            scaleX={scale}
            scaleY={scale}
            x={stagePos.x}
            y={stagePos.y}
            draggable={tool === 'move'}
            onDragEnd={handleStageDrag}
            onClick={handleStageClick}
            onTap={handleStageClick}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onMouseLeave={handleStageMouseUp}
            style={{ cursor: tool === 'move' ? 'grab' : tool === 'addSeat' ? 'crosshair' : tool === 'split' ? 'col-resize' : isSelecting ? 'crosshair' : 'default' }}
          >
            <Layer>
              {/* Grid */}
              {Array.from({ length: Math.ceil(2000 / SEAT_SPACING) }).map((_, i) => (
                <Line key={`h-${i}`} points={[0, i * SEAT_SPACING, 2000, i * SEAT_SPACING]} stroke="#333" strokeWidth={0.5} />
              ))}
              {Array.from({ length: Math.ceil(2000 / SEAT_SPACING) }).map((_, i) => (
                <Line key={`v-${i}`} points={[i * SEAT_SPACING, 0, i * SEAT_SPACING, 2000]} stroke="#333" strokeWidth={0.5} />
              ))}

              {/* Stage/Screen indicator */}
              <Rect x={200} y={20} width={400} height={40} fill="#1f1f1f" cornerRadius={8} />
              <Text x={200} y={20} width={400} height={40} text="STAGE" fontSize={16} fill="#666" align="center" verticalAlign="middle" />

              {/* Row Labels */}
              {showRowLabels && getRowLabels().map(rowData => {
                // Find the leftmost seat in this row
                const leftmostSeat = rowData.seats.reduce((min, s) => s.x < min.x ? s : min, rowData.seats[0]);
                return (
                  <Group key={`label-${rowData.row}`}>
                    <Rect
                      x={leftmostSeat.x - ROW_LABEL_WIDTH - 15}
                      y={rowData.minY - SEAT_SIZE / 2}
                      width={ROW_LABEL_WIDTH}
                      height={SEAT_SIZE}
                      fill="#374151"
                      cornerRadius={4}
                    />
                    <Text
                      x={leftmostSeat.x - ROW_LABEL_WIDTH - 15}
                      y={rowData.minY - SEAT_SIZE / 2}
                      width={ROW_LABEL_WIDTH}
                      height={SEAT_SIZE}
                      text={rowData.row}
                      fontSize={14}
                      fontStyle="bold"
                      fill="#F3F4F6"
                      align="center"
                      verticalAlign="middle"
                    />
                  </Group>
                );
              })}

              {/* Seats */}
              {seats.map(seat => renderSeat(seat))}

              {/* Selection Rectangle - Draw on top of seats */}
              {selectionRect && selectionRect.width > 5 && selectionRect.height > 5 && (
                <Rect
                  x={selectionRect.x}
                  y={selectionRect.y}
                  width={selectionRect.width}
                  height={selectionRect.height}
                  fill="rgba(59, 130, 246, 0.15)"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dash={[8, 4]}
                  shadowColor="#3B82F6"
                  shadowBlur={8}
                  shadowOpacity={0.5}
                />
              )}
            </Layer>
          </Stage>
          
          {/* Selection hint overlay */}
          {isSelecting && selectionRect && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600/90 text-white text-sm px-3 py-1.5 rounded-lg pointer-events-none">
              Drag to select seats
            </div>
          )}
          
          {/* Selection info overlay */}
          {selectedSeats.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-black/80 text-white text-sm px-3 py-2 rounded-lg">
              {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
      </div>

      {/* Row Generation Modal */}
      <Modal isOpen={showRowModal} onClose={() => setShowRowModal(false)} title="Add Row of Seats" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Row Label" value={rowConfig.rowLabel} onChange={(e) => setRowConfig({ ...rowConfig, rowLabel: e.target.value.toUpperCase() })} maxLength={2} />
            <Input label="Number of Seats" type="number" min={1} max={100} value={rowConfig.seatCount} onChange={(e) => setRowConfig({ ...rowConfig, seatCount: parseInt(e.target.value) || 1 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Number" type="number" min={1} value={rowConfig.startNumber} onChange={(e) => setRowConfig({ ...rowConfig, startNumber: parseInt(e.target.value) || 1 })} />
            <Input label="Spacing (px)" type="number" min={25} max={100} value={rowConfig.spacing} onChange={(e) => setRowConfig({ ...rowConfig, spacing: parseInt(e.target.value) || SEAT_SPACING })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start X" type="number" value={rowConfig.startX} onChange={(e) => setRowConfig({ ...rowConfig, startX: parseInt(e.target.value) || 0 })} />
            <Input label="Start Y" type="number" value={rowConfig.startY} onChange={(e) => setRowConfig({ ...rowConfig, startY: parseInt(e.target.value) || 0 })} />
          </div>
          
          {/* Curved row option */}
          <div className="border-t border-white/10 pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rowConfig.curved} onChange={(e) => setRowConfig({ ...rowConfig, curved: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm text-white">Curved Row</span>
            </label>
            
            {rowConfig.curved && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <Input label="Curve Radius (px)" type="number" min={100} value={rowConfig.curveRadius} onChange={(e) => setRowConfig({ ...rowConfig, curveRadius: parseInt(e.target.value) || 300 })} />
                <Input label="Arc Angle (degrees)" type="number" min={10} max={180} value={rowConfig.curveAngle} onChange={(e) => setRowConfig({ ...rowConfig, curveAngle: parseInt(e.target.value) || 90 })} />
              </div>
            )}
          </div>

          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-sm text-gray-400">
              Adding <span className="text-white font-medium">{rowConfig.seatCount}</span> seats in row <span className="text-white font-medium">{rowConfig.rowLabel}</span>
            </p>
            {remainingCapacity < rowConfig.seatCount && (
              <p className="text-sm text-red-400 mt-1 flex items-center gap-1"><AlertTriangle size={14} /> Only {remainingCapacity} seats available</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowRowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={generateRow} className="flex-1" disabled={remainingCapacity < rowConfig.seatCount}>Add Row</Button>
          </div>
        </div>
      </Modal>

      {/* Grid Generation Modal */}
      <Modal isOpen={showGridModal} onClose={() => setShowGridModal(false)} title="Generate Seat Grid" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Rows" type="number" min={1} max={50} value={gridConfig.rows} onChange={(e) => setGridConfig({ ...gridConfig, rows: parseInt(e.target.value) || 1 })} />
            <Input label="Seats per Row" type="number" min={1} max={100} value={gridConfig.seatsPerRow} onChange={(e) => setGridConfig({ ...gridConfig, seatsPerRow: parseInt(e.target.value) || 1 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Row Label" value={gridConfig.startRow} onChange={(e) => setGridConfig({ ...gridConfig, startRow: e.target.value.toUpperCase() })} maxLength={1} />
            <Input label="Spacing (px)" type="number" min={25} max={100} value={gridConfig.spacing} onChange={(e) => setGridConfig({ ...gridConfig, spacing: parseInt(e.target.value) || SEAT_SPACING })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start X" type="number" value={gridConfig.startX} onChange={(e) => setGridConfig({ ...gridConfig, startX: parseInt(e.target.value) || 0 })} />
            <Input label="Start Y" type="number" value={gridConfig.startY} onChange={(e) => setGridConfig({ ...gridConfig, startY: parseInt(e.target.value) || 0 })} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={gridConfig.clearExisting} onChange={(e) => setGridConfig({ ...gridConfig, clearExisting: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm text-white">Clear existing seats first</span>
          </label>

          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-sm text-gray-400">
              Will generate <span className="text-white font-medium">{gridConfig.rows * gridConfig.seatsPerRow}</span> seats ({gridConfig.rows} rows × {gridConfig.seatsPerRow} seats)
            </p>
            {gridConfig.rows * gridConfig.seatsPerRow > venue.total_capacity && (
              <p className="text-sm text-red-400 mt-1 flex items-center gap-1"><AlertTriangle size={14} /> Exceeds venue capacity ({venue.total_capacity})</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowGridModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={generateGrid} className="flex-1" disabled={gridConfig.rows * gridConfig.seatsPerRow > venue.total_capacity}>Generate Grid</Button>
          </div>
        </div>
      </Modal>

      {/* Split/Gap Modal */}
      <Modal isOpen={showSplitModal} onClose={() => setShowSplitModal(false)} title="Add Gap/Split in Row" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Create a gap (aisle) in a row by moving seats after a specific position to the right.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Target Row</label>
              <select
                value={splitConfig.targetRow}
                onChange={(e) => setSplitConfig({ ...splitConfig, targetRow: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {[...new Set(seats.map(s => s.row))].sort().map(row => (
                  <option key={row} value={row}>{row}</option>
                ))}
              </select>
            </div>
            <Input 
              label="After Seat #" 
              type="number" 
              min={1} 
              value={splitConfig.afterSeatNumber} 
              onChange={(e) => setSplitConfig({ ...splitConfig, afterSeatNumber: parseInt(e.target.value) || 1 })} 
            />
          </div>
          
          <Input 
            label="Gap Size (px)" 
            type="number" 
            min={SEAT_SPACING} 
            step={5}
            value={splitConfig.gapSize} 
            onChange={(e) => setSplitConfig({ ...splitConfig, gapSize: parseInt(e.target.value) || SEAT_SPACING })} 
          />

          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-sm text-gray-400">
              This will shift all seats in row <span className="text-white font-medium">{splitConfig.targetRow}</span> after seat #{splitConfig.afterSeatNumber} by <span className="text-white font-medium">{splitConfig.gapSize}px</span> to the right.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowSplitModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={addGapInRow} className="flex-1">Add Gap</Button>
          </div>
        </div>
      </Modal>

      {/* Relabel Modal */}
      <Modal isOpen={showRelabelModal} onClose={() => setShowRelabelModal(false)} title="Relabel Selected Seats" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Change the row label for {selectedSeats.length} selected seat{selectedSeats.length !== 1 ? 's' : ''}.
            The new label will be available in the Gap/Split tool.
          </p>
          
          <Input 
            label="New Row Label" 
            value={relabelConfig.newRowLabel} 
            onChange={(e) => setRelabelConfig({ ...relabelConfig, newRowLabel: e.target.value.toUpperCase() })} 
            maxLength={2}
            placeholder="e.g. A, B, AA"
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={relabelConfig.renumberSeats} 
              onChange={(e) => setRelabelConfig({ ...relabelConfig, renumberSeats: e.target.checked })} 
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-white">Renumber seats sequentially</span>
          </label>

          {relabelConfig.renumberSeats && (
            <Input 
              label="Start Number" 
              type="number" 
              min={1} 
              value={relabelConfig.startNumber} 
              onChange={(e) => setRelabelConfig({ ...relabelConfig, startNumber: parseInt(e.target.value) || 1 })} 
            />
          )}

          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-sm text-gray-400">
              Selected seats will become: <span className="text-white font-medium">{relabelConfig.newRowLabel}1</span>, <span className="text-white font-medium">{relabelConfig.newRowLabel}2</span>, ...
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Seats are numbered left to right based on their X position.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowRelabelModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={relabelSelectedSeats} className="flex-1">Relabel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
