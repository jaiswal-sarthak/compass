import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  Dimensions,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import CompassView from './CompassView';
import CompassTopBar from './CompassTopBar';
import LocationSearch from './LocationSearch';
import { 
  DownloadIcon, 
  RecenterIcon, 
  LockIcon, 
  PinIcon, 
  CompassToggleIcon, 
  MapLayerIcon 
} from './svgs';
import {
  latLngToXY,
  xyToLatLng,
  averageCenter,
  sortCornersAsRect,
  createGridLinesXY,
  getCellCenterXY,
  getCellCornersXY,
  create3LayerGridXY,
  interpolate,
} from '../utils/mapUtils';
import {
  VASTU_GRID_9X9,
  getBrahmasthanCells,
} from '../utils/vastuGrid';
import {
  OUTER_LAYER,
  MIDDLE_LAYER,
  CENTER_LAYER,
  getAll45Devtas,
} from '../utils/vastuGrid45';

const getDimensions = () => {
  try {
    return Dimensions.get('window');
  } catch (error) {
    return { width: 375, height: 812 };
  }
};

const getResponsiveSize = (size) => {
  const { width } = getDimensions();
  if (!width || width === 0) return size;
  
  const effectiveWidth = Math.min(width, 600);
  const scale = effectiveWidth / 375;
  return Math.max(size * scale, size * 0.8);
};

const getResponsiveFont = (size) => {
  const { width } = getDimensions();
  if (!width || width === 0) return size;
  
  const effectiveWidth = Math.min(width, 600);
  const scale = effectiveWidth / 375;
  return Math.max(size * scale, size * 0.85);
};

export default function MapViewModal({ visible, onClose, mode, compassType, selectedLocation }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  
  // Use Classic Compass as default fallback if no compass type specified
  const effectiveCompassType = compassType || 'classic';
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('satellite');
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [mapLocation, setMapLocation] = useState(null);
  const [showCompass, setShowCompass] = useState(true);
  const [isMapLocked, setIsMapLocked] = useState(false);
  const [pressedButton, setPressedButton] = useState(null);
  const mapContainerRef = useRef(null);
  const googleMapRef = useRef(null);
  
  // VASTU GRID STATE
  const [plotCorners, setPlotCorners] = useState([]);
  const [cornerSelectionMode, setCornerSelectionMode] = useState(false);
  const [showVastuGrid, setShowVastuGrid] = useState(false);
  const [showCornerBanner, setShowCornerBanner] = useState(true);
  const [showGridBanner, setShowGridBanner] = useState(true);
  
  // 3 LAYER TOGGLES
  const [showOuterLayer, setShowOuterLayer] = useState(true);
  const [showMiddleLayer, setShowMiddleLayer] = useState(true);
  const [showCenterLayer, setShowCenterLayer] = useState(true);
  const gridLayersRef = useRef([]);
  const plotCornersRef = useRef([]);
  const cornerSelectionModeRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const cornerMarkersRef = useRef([]);

  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    } else {
      // Clean up map when modal closes
      if (googleMapRef.current && window.L) {
        try {
          googleMapRef.current.remove();
          console.log('Map removed successfully');
        } catch (error) {
          console.log('Error removing map:', error);
        }
        googleMapRef.current = null;
      }
      // Reset states
      setShowLocationSearch(false);
      setMapLocation(null);
      setLoading(true);
      setMapReady(false);
      setPlotCorners([]);
      setShowVastuGrid(false);
      setCornerSelectionMode(false);
      cornerMarkersRef.current = [];
      gridLayersRef.current = [];
    }
  }, [visible]);

  // Sync refs with state
  useEffect(() => {
    plotCornersRef.current = plotCorners;
  }, [plotCorners]);

  useEffect(() => {
    cornerSelectionModeRef.current = cornerSelectionMode;
    console.log('📌 Corner selection mode:', cornerSelectionMode);
    // Reset banner visibility when mode changes
    if (cornerSelectionMode) {
      setShowCornerBanner(true);
    }
  }, [cornerSelectionMode]);

  // Load Leaflet script dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.L) {
      // Load Leaflet JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.async = true;
      script.onload = () => {
        console.log('Leaflet script loaded');
      };
      document.head.appendChild(script);

      // Load Leaflet CSS
      const link = document.createElement('link');
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (visible && !loading && locationToUse && mapContainerRef.current && !googleMapRef.current) {
      const timer = setTimeout(() => {
        initializeLeafletMap();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible, loading, currentLocation, selectedLocation]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              latitudeDelta: 0.001,
              longitudeDelta: 0.001,
            });
            setLoading(false);
          },
          (error) => {
            console.log('Error getting web location:', error);
            const fallbackLat = selectedLocation?.latitude || 12.8690724;
            const fallbackLng = selectedLocation?.longitude || 77.6933333;
            setCurrentLocation({
              latitude: fallbackLat,
              longitude: fallbackLng,
              latitudeDelta: 0.001,
              longitudeDelta: 0.001,
            });
            setLoading(false);
          },
          { 
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      } else {
        setCurrentLocation({
          latitude: selectedLocation?.latitude || 12.8690724,
          longitude: selectedLocation?.longitude || 77.6933333,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001,
        });
        setLoading(false);
      }
    } catch (error) {
      console.log('Error getting location:', error);
      setCurrentLocation({
        latitude: selectedLocation?.latitude || 12.8690724,
        longitude: selectedLocation?.longitude || 77.6933333,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      });
      setLoading(false);
    }
  };

  // Draw Vastu Grid - ENHANCED UI
  const drawVastuGrid = () => {
    if (!googleMapRef.current || plotCorners.length !== 4 || !window.L) return;
    
    // Clear previous grid (except corner markers)
    gridLayersRef.current.forEach(layer => {
      if (googleMapRef.current && layer && !cornerMarkersRef.current.includes(layer)) {
        try {
          googleMapRef.current.removeLayer(layer);
        } catch (e) {}
      }
    });
    gridLayersRef.current = gridLayersRef.current.filter(l => cornerMarkersRef.current.includes(l));
    
    try {
      const center = averageCenter(plotCorners);
      const xyCorners = plotCorners.map(p => latLngToXY(center, p));
      const rectXY = sortCornersAsRect(xyCorners);
      const { verticalLines, horizontalLines } = createGridLinesXY(rectXY);
      
      // 1. Draw plot outline with gradient border
      const plotOutline = plotCorners.map(p => [p.latitude, p.longitude]);
      const outline = window.L.polygon([...plotOutline, plotOutline[0]], {
        color: '#FFD700',
        weight: 4,
        fillColor: 'transparent',
        opacity: 1,
        dashArray: '10, 5',
      }).addTo(googleMapRef.current);
      gridLayersRef.current.push(outline);
      
      // 2. Draw 3-LAYER GRID (divide by 3)
      const [BL, BR, TR, TL] = rectXY;
      const divisions = [0, 1/3, 2/3, 1];
      
      // Draw main 3x3 division lines (THICK GOLDEN)
      divisions.forEach((t, idx) => {
        // Vertical lines
        const bottomPoint = interpolate(BL, BR, t);
        const topPoint = interpolate(TL, TR, t);
        const vertLatLngs = [bottomPoint, topPoint].map(p => {
          const coord = xyToLatLng(center, p.x, p.y);
          return [coord.latitude, coord.longitude];
        });
        const isMainBorder = idx === 0 || idx === 3;
        const isLayerBorder = idx === 1 || idx === 2;
        window.L.polyline(vertLatLngs, {
          color: isMainBorder ? '#FFD700' : '#F4C430',
          weight: isMainBorder ? 5 : (isLayerBorder ? 3 : 2),
          opacity: isMainBorder ? 1 : 0.85,
        }).addTo(googleMapRef.current);
        
        // Horizontal lines
        const leftPoint = interpolate(BL, TL, t);
        const rightPoint = interpolate(BR, TR, t);
        const horizLatLngs = [leftPoint, rightPoint].map(p => {
          const coord = xyToLatLng(center, p.x, p.y);
          return [coord.latitude, coord.longitude];
        });
        const hLine = window.L.polyline(horizLatLngs, {
          color: isMainBorder ? '#FFD700' : '#F4C430',
          weight: isMainBorder ? 5 : (isLayerBorder ? 3 : 2),
          opacity: isMainBorder ? 1 : 0.85,
        }).addTo(googleMapRef.current);
        gridLayersRef.current.push(hLine);
      });
      
      // OPTIONAL: Add finer subdivisions for outer layer (9 cells per side)
      if (showOuterLayer) {
        // Subdivide outer strip into 9 cells
        for (let i = 0; i <= 9; i++) {
          const t = i / 9 / 3; // Within first third
          
          // Top strip subdivisions
          const topBottom = interpolate(BL, BR, i/9);
          const topTop = interpolate(interpolate(BL, TL, 1/3), interpolate(BR, TR, 1/3), i/9);
          window.L.polyline([topBottom, topTop].map(p => {
            const coord = xyToLatLng(center, p.x, p.y);
            return [coord.latitude, coord.longitude];
          }), {
            color: '#F4C430',
            weight: 1,
            opacity: 0.5,
          }).addTo(googleMapRef.current);
        }
      }
      
      // 3. Highlight CENTER LAYER (Brahmasthan) - Middle third of middle third
      if (showCenterLayer) {
        // Calculate center 1/3 of the plot
        const centerBL = interpolate(interpolate(BL, BR, 1/3), interpolate(BL, TL, 1/3), 0);
        const centerBR = interpolate(interpolate(BL, BR, 2/3), interpolate(BL, TL, 1/3), 0);
        const centerTR = interpolate(interpolate(BL, BR, 2/3), interpolate(BL, TL, 2/3), 0);
        const centerTL = interpolate(interpolate(BL, BR, 1/3), interpolate(BL, TL, 2/3), 0);
        
        const centerCorners = [centerBL, centerBR, centerTR, centerTL];
        const centerLatLngs = centerCorners.map(p => {
          const coord = xyToLatLng(center, p.x, p.y);
          return [coord.latitude, coord.longitude];
        });
        
        // Draw Brahmasthan rectangle
        window.L.polygon(centerLatLngs, {
          color: '#FF8C00',
          fillColor: '#FFA500',
          fillOpacity: 0.5,
          weight: 4,
        }).addTo(googleMapRef.current);
        
        const brahmasthanCells = getBrahmasthanCells();
        
        // First, draw all Brahmasthan cells with orange fill
        brahmasthanCells.forEach(({ row, col }) => {
          const corners = getCellCornersXY(rectXY, row, col);
          const latLngs = corners.map(p => {
            const coord = xyToLatLng(center, p.x, p.y);
            return [coord.latitude, coord.longitude];
          });
          const polygon = window.L.polygon(latLngs, {
            color: '#FF8C00',
            fillColor: '#FFA500',
            fillOpacity: 0.5,
            weight: 2,
          }).addTo(googleMapRef.current);
          gridLayersRef.current.push(polygon);
        });
        
        // Add OM symbol in center of Brahmasthan
        const brahmasthanCenter = getCellCenterXY(rectXY, 4, 4);
        const centerCoord = xyToLatLng(center, brahmasthanCenter.x, brahmasthanCenter.y);
        
        const omIcon = window.L.divIcon({
          className: 'om-symbol',
          html: `<div style="
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, #FFA500, #FF8C00);
            border: 4px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
            font-weight: 900;
            box-shadow: 0 4px 16px rgba(255,165,0,0.8), 0 0 0 4px rgba(255,165,0,0.3);
            animation: brahmaPulse 3s ease-in-out infinite;
          ">ॐ</div>
          <style>
            @keyframes brahmaPulse {
              0%, 100% { transform: scale(1); box-shadow: 0 4px 16px rgba(255,165,0,0.8), 0 0 0 4px rgba(255,165,0,0.3); }
              50% { transform: scale(1.1); box-shadow: 0 6px 20px rgba(255,165,0,1), 0 0 0 8px rgba(255,165,0,0.5); }
            }
          </style>`,
          iconSize: [60, 60],
          iconAnchor: [30, 30],
        });
        
        const omMarker = window.L.marker([centerCoord.latitude, centerCoord.longitude], {
          icon: omIcon,
          zIndexOffset: 5000,
        }).addTo(googleMapRef.current);
        
        omMarker.bindTooltip(`
          <div style="
            background: linear-gradient(135deg, #FFA500, #FF8C00);
            color: white;
            padding: 10px 14px;
            border-radius: 10px;
            font-weight: bold;
            font-size: 13px;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            text-align: center;
          ">
            <div style="font-size: 16px; margin-bottom: 4px;">🕉️ Brahmasthan</div>
            <div style="font-size: 11px; opacity: 0.95;">Sacred Center • Keep Open & Light</div>
          </div>
        `, { permanent: true, direction: 'center' });
        
        gridLayersRef.current.push(omMarker);
      }
      
      // 4. Draw 45 DEVTA LABELS (3-Layer System)
      const all45Devtas = getAll45Devtas();
      
      // OUTER LAYER (Perimeter - 28 devtas)
      if (showOuterLayer) {
        let outerIndex = 0;
        
        // Top row (9 devtas)
        OUTER_LAYER.north.forEach((devta, i) => {
          const cellCenter = getCellCenterXY(rectXY, 0, i);
          const coord = xyToLatLng(center, cellCenter.x, cellCenter.y);
          createDevtaMarker(devta, coord, 'outer');
        });
        
        // Right column (7 devtas)
        OUTER_LAYER.east.forEach((devta, i) => {
          const cellCenter = getCellCenterXY(rectXY, i + 1, 8);
          const coord = xyToLatLng(center, cellCenter.x, cellCenter.y);
          createDevtaMarker(devta, coord, 'outer');
        });
        
        // Bottom row (9 devtas)
        OUTER_LAYER.south.forEach((devta, i) => {
          const cellCenter = getCellCenterXY(rectXY, 8, 8 - i);
          const coord = xyToLatLng(center, cellCenter.x, cellCenter.y);
          createDevtaMarker(devta, coord, 'outer');
        });
        
        // Left column (7 devtas)
        OUTER_LAYER.west.forEach((devta, i) => {
          const cellCenter = getCellCenterXY(rectXY, 7 - i, 0);
          const coord = xyToLatLng(center, cellCenter.x, cellCenter.y);
          createDevtaMarker(devta, coord, 'outer');
        });
      }
      
      // MIDDLE LAYER (8 devtas)
      if (showMiddleLayer) {
        MIDDLE_LAYER.forEach((devta, i) => {
          // Position around the center
          const positions = [
            {row: 2, col: 4}, // N
            {row: 4, col: 6}, // E
            {row: 6, col: 4}, // S
            {row: 4, col: 2}, // W
            {row: 2, col: 2}, // NW
            {row: 2, col: 6}, // NE
            {row: 6, col: 2}, // SW
            {row: 6, col: 6}, // SE
          ];
          const pos = positions[i];
          const cellCenter = getCellCenterXY(rectXY, pos.row, pos.col);
          const coord = xyToLatLng(center, cellCenter.x, cellCenter.y);
          createDevtaMarker(devta, coord, 'middle');
        });
      }
      
      // Helper function to create devta marker
      function createDevtaMarker(devta, coord, layer) {
        const layerSizes = {
          outer: { fontSize: 9, padding: '3px 6px', borderWidth: 2 },
          middle: { fontSize: 11, padding: '4px 8px', borderWidth: 2.5 },
          center: { fontSize: 14, padding: '6px 10px', borderWidth: 3 },
        };
        
        const size = layerSizes[layer];
        
        const icon = window.L.divIcon({
          className: `devta-label-${layer}`,
          html: `<div style="
            background: linear-gradient(135deg, ${devta.color}F5, ${devta.color}D0);
            color: white;
            padding: ${size.padding};
            border-radius: ${layer === 'center' ? '8px' : '6px'};
            font-size: ${size.fontSize}px;
            font-weight: ${layer === 'center' ? '900' : 'bold'};
            white-space: nowrap;
            border: ${size.borderWidth}px solid ${layer === 'center' ? '#FFD700' : 'white'};
            box-shadow: 0 ${layer === 'center' ? '4' : '3'}px ${layer === 'center' ? '10' : '8'}px rgba(0,0,0,0.6);
            text-align: center;
            text-shadow: 0 1px 3px rgba(0,0,0,0.5);
            ${layer === 'center' ? 'animation: centerGlow 2s ease-in-out infinite;' : ''}
          ">
            ${devta.devta}
            <br/>
            <span style="font-size: ${size.fontSize - 2}px; opacity: 0.9;">${devta.zone}</span>
          </div>
          ${layer === 'center' ? `
            <style>
              @keyframes centerGlow {
                0%, 100% { box-shadow: 0 4px 10px rgba(255,215,0,0.6); }
                50% { box-shadow: 0 6px 16px rgba(255,215,0,1), 0 0 0 4px rgba(255,215,0,0.3); }
              }
            </style>
          ` : ''}`,
          iconSize: [null, null],
          iconAnchor: [0, 0]
        });
        
        const marker = window.L.marker([coord.latitude, coord.longitude], {
          icon
        }).addTo(googleMapRef.current);
        
        marker.bindTooltip(`
          <div style="
            background: linear-gradient(135deg, ${devta.color}, ${devta.color}DD);
            color: white;
            padding: 10px 14px;
            border-radius: 10px;
            font-weight: bold;
            font-size: 13px;
            border: 3px solid white;
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
            text-align: center;
          ">
            <div style="font-size: 15px; margin-bottom: 5px; font-weight: 900;">${devta.devta}</div>
            <div style="font-size: 11px; opacity: 0.95; margin: 3px 0;">Zone: ${devta.zone}</div>
            <div style="font-size: 10px; opacity: 0.9;">Energy: ${devta.energy}</div>
            <div style="font-size: 9px; margin-top: 5px; padding-top: 5px; border-top: 1px solid rgba(255,255,255,0.3); opacity: 0.85;">Layer: ${layer.toUpperCase()}</div>
          </div>
        `, { direction: 'top', offset: [0, -5] });
        
        gridLayersRef.current.push(marker);
      }
      
      setShowVastuGrid(true);
      setShowGridBanner(true);
      console.log('✅ Vastu grid drawn with enhanced UI!');
    } catch (error) {
      console.error('Grid error:', error);
    }
  };

  // Draw connecting lines between corners while adjusting
  const plotOutlineRef = useRef(null);
  
  useEffect(() => {
    if (!googleMapRef.current || !window.L) return;
    
    // Remove old outline
    if (plotOutlineRef.current) {
      try {
        googleMapRef.current.removeLayer(plotOutlineRef.current);
      } catch (e) {}
      plotOutlineRef.current = null;
    }
    
    // Draw connecting lines when we have corners
    if (plotCorners.length >= 2 && cornerSelectionMode) {
      const coords = plotCorners.map(p => [p.latitude, p.longitude]);
      
      // Create polygon if 4 corners, polyline if less
      if (plotCorners.length === 4) {
        plotOutlineRef.current = window.L.polygon([...coords, coords[0]], {
          color: '#FFD700',
          weight: 3,
          fillColor: '#FFD700',
          fillOpacity: 0.1,
          dashArray: '8, 4',
          opacity: 0.8,
        }).addTo(googleMapRef.current);
      } else {
        plotOutlineRef.current = window.L.polyline(coords, {
          color: '#FFD700',
          weight: 3,
          dashArray: '8, 4',
          opacity: 0.7,
        }).addTo(googleMapRef.current);
      }
    }
  }, [plotCorners, cornerSelectionMode]);

  // Effect to draw grid
  useEffect(() => {
    if (plotCorners.length === 4 && googleMapRef.current && !cornerSelectionMode) {
      console.log('🎨 Drawing grid with layers:', { outer: showOuterLayer, middle: showMiddleLayer, center: showCenterLayer });
      // Remove plot outline before drawing grid
      if (plotOutlineRef.current) {
        try {
          googleMapRef.current.removeLayer(plotOutlineRef.current);
        } catch (e) {}
        plotOutlineRef.current = null;
      }
      drawVastuGrid();
    }
  }, [plotCorners, showOuterLayer, showMiddleLayer, showCenterLayer, cornerSelectionMode]);

  // AUTO-PLACE DRAGGABLE CORNERS
  useEffect(() => {
    if (!mapReady || !googleMapRef.current || !window.L) return;
    
    if (!cornerSelectionMode) {
      cornerMarkersRef.current.forEach(m => {
        try {
          googleMapRef.current.removeLayer(m);
        } catch (e) {}
      });
      cornerMarkersRef.current = [];
      return;
    }
    
    setTimeout(() => {
      const map = googleMapRef.current;
      const center = map.getCenter();
      const offset = 0.0008;
      
      const autoCorners = [
        { lat: center.lat - offset, lng: center.lng - offset, label: 'BL', name: 'Bottom-Left' },
        { lat: center.lat - offset, lng: center.lng + offset, label: 'BR', name: 'Bottom-Right' },
        { lat: center.lat + offset, lng: center.lng + offset, label: 'TR', name: 'Top-Right' },
        { lat: center.lat + offset, lng: center.lng - offset, label: 'TL', name: 'Top-Left' },
      ];
      
      console.log('🔴 PLACING RED DOTS:', autoCorners);
      
      const colors = ['#FF0000', '#FF4444', '#FF6666', '#FF8888'];
      
      autoCorners.forEach((corner, i) => {
        const icon = window.L.divIcon({
          className: `corner-marker-${i}`,
          html: `
            <div style="position: relative; width: 70px; height: 85px; cursor: grab;">
              <svg width="70" height="70" viewBox="0 0 70 70">
                <defs>
                  <radialGradient id="grad${i}" cx="35%" cy="35%">
                    <stop offset="0%" style="stop-color:#FF9999;stop-opacity:1" />
                    <stop offset="40%" style="stop-color:#FF3333;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#CC0000;stop-opacity:1" />
                  </radialGradient>
                  <filter id="glow${i}">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                <!-- Pulsing outer ring -->
                <circle cx="35" cy="35" r="32" fill="none" stroke="#FF0000" stroke-width="2" opacity="0.4">
                  <animate attributeName="r" from="28" to="34" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/>
                </circle>
                
                <!-- Main circle -->
                <circle cx="35" cy="35" r="28" fill="url(#grad${i})" stroke="white" stroke-width="5" filter="url(#glow${i})"/>
                
                <!-- Inner highlight -->
                <circle cx="35" cy="35" r="24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
                
                <!-- Corner marker icon -->
                <path d="M28 28h-8v8M42 28h8v8M42 42h8v-8M28 42h-8v-8" stroke="white" stroke-width="2" opacity="0.5"/>
                
                <!-- Number with shadow -->
                <text x="35" y="42" text-anchor="middle" fill="white" 
                  font-size="24" font-weight="900" font-family="Arial, sans-serif"
                  style="paint-order: stroke; stroke: rgba(0,0,0,0.5); stroke-width: 3px;">${i + 1}</text>
              </svg>
              
              <!-- Enhanced label tag -->
              <div style="
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%);
                color: white;
                padding: 4px 10px;
                border-radius: 10px;
                font-size: 10px;
                font-weight: 900;
                white-space: nowrap;
                border: 3px solid white;
                box-shadow: 0 3px 10px rgba(0,0,0,0.6);
                letter-spacing: 0.8px;
                text-transform: uppercase;
              ">${corner.label}</div>
            </div>
          `,
          iconSize: [70, 85],
          iconAnchor: [35, 35],
        });
        
        const marker = window.L.marker([corner.lat, corner.lng], {
          icon,
          draggable: true,
          zIndexOffset: 10000,
        }).addTo(map);
        
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const updated = [...plotCornersRef.current];
          updated[i] = { latitude: pos.lat, longitude: pos.lng };
          setPlotCorners(updated);
        });
        
        marker.bindTooltip(`
          <div style="
            background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%);
            color: white;
            padding: 8px 14px;
            border-radius: 8px;
            font-weight: 900;
            font-size: 12px;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            text-align: center;
            letter-spacing: 0.5px;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 4px;">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${corner.name}
          </div>
        `, {
          permanent: true,
          direction: 'top',
          offset: [0, -25],
          className: 'corner-tooltip'
        });
        
        cornerMarkersRef.current.push(marker);
      });
      
      setPlotCorners(autoCorners.map(c => ({ latitude: c.lat, longitude: c.lng })));
      console.log('🎉 RED DOTS PLACED!');
    }, 500);
  }, [mapReady, cornerSelectionMode]);

  const initializeLeafletMap = () => {
    let retryCount = 0;
    const maxRetries = 100;
    
    const checkLeaflet = () => {
      if (retryCount === 0) {
        console.log('Starting Leaflet initialization check...');
      }
      
      if (typeof window !== 'undefined' && window.L && mapContainerRef.current && !googleMapRef.current) {
        try {
          if (mapContainerRef.current.innerHTML) {
            mapContainerRef.current.innerHTML = '';
          }
          
          const map = window.L.map(mapContainerRef.current, {
            zoomControl: false,
          }).setView([locationToUse.latitude, locationToUse.longitude], 18);

          let tileLayer;
          if (mapType === 'satellite') {
            tileLayer = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
              attribution: 'Tiles &copy; Esri',
              maxZoom: 19,
            });
          } else {
            tileLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 19,
            });
          }
          tileLayer.addTo(map);

          window.L.control.zoom({
            position: 'bottomright'
          }).addTo(map);

          const goldIcon = window.L.divIcon({
            className: 'custom-marker',
            html: `<div style="
              width: 30px;
              height: 30px;
              background-color: #F4C430;
              border: 3px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          });

          const marker = window.L.marker([locationToUse.latitude, locationToUse.longitude], {
            icon: goldIcon
          }).addTo(map);
          
          marker.bindPopup('Current Location').openPopup();

          googleMapRef.current = map;
          setMapReady(true);
          console.log('✅ Map ready, setMapReady(true) called');
        } catch (error) {
          console.error('Error initializing Leaflet:', error);
        }
      } else if (retryCount < maxRetries) {
        retryCount++;
        if (retryCount % 10 === 0) {
          console.log(`Waiting for Leaflet to load... (attempt ${retryCount}/${maxRetries})`);
        }
        setTimeout(checkLeaflet, 100);
      }
    };
    
    checkLeaflet();
  };

  const changeMapType = () => {
    const newType = mapType === 'satellite' ? 'standard' : 'satellite';
    setMapType(newType);
    
    if (googleMapRef.current && window.L) {
      googleMapRef.current.eachLayer((layer) => {
        if (layer instanceof window.L.TileLayer) {
          googleMapRef.current.removeLayer(layer);
        }
      });
      
      let tileLayer;
      if (newType === 'satellite') {
        tileLayer = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 19,
        });
      } else {
        tileLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        });
      }
      tileLayer.addTo(googleMapRef.current);
    }
  };

  const locationToUse = selectedLocation || currentLocation;
  const effectiveLocation = mapLocation || selectedLocation || currentLocation;

  useEffect(() => {
    if (googleMapRef.current && effectiveLocation && window.L) {
      googleMapRef.current.setView([effectiveLocation.latitude, effectiveLocation.longitude], 18);
    }
  }, [mapLocation]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#F4C430" />
        <View style={styles.container}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F4C430" />
              <Text style={styles.loadingText}>Loading Map...</Text>
            </View>
          ) : locationToUse ? (
            <div
              ref={mapContainerRef}
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                backgroundColor: '#E5E5E5',
              }}
            />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Unable to load map</Text>
            </View>
          )}

          {showCompass && locationToUse && (
            <View style={styles.compassOverlay}>
              <CompassView
                mode={mode}
                compassType={effectiveCompassType}
                capturedImage={null}
                onClearImage={() => {}}
                onHeadingChange={setHeading}
              />
            </View>
          )}

          <View style={styles.topBarContainer}>
            <CompassTopBar
              onMenuPress={() => {}}
              onSearchPress={() => setShowLocationSearch(!showLocationSearch)}
              onBackPress={onClose}
            />
            
            <View style={styles.mapControls}>
              <TouchableOpacity
                style={[styles.mapControlButton, showCompass && styles.mapControlButtonActive]}
                onPress={() => setShowCompass(!showCompass)}
                onPressIn={() => setPressedButton('compass')}
                onPressOut={() => setPressedButton(null)}
                activeOpacity={0.6}
              >
                <CompassToggleIcon 
                  size={getResponsiveSize(24)} 
                  color={pressedButton === 'compass' ? "#5D4037" : "#F4C430"} 
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mapControlButton}
                onPress={changeMapType}
                onPressIn={() => setPressedButton('maptype')}
                onPressOut={() => setPressedButton(null)}
                activeOpacity={0.6}
              >
                <Text style={[styles.mapControlButtonText, pressedButton === 'maptype' && { opacity: 0.7 }]}>
                  {mapType === 'satellite' ? '🗺️' : '🛰️'}
                </Text>
              </TouchableOpacity>
              
              {/* VASTU GRID BUTTON */}
              {!showVastuGrid && (
                <TouchableOpacity
                  style={[styles.mapControlButton, cornerSelectionMode && styles.mapControlButtonActive]}
                  onPress={() => {
                    console.log('🔄 Toggle corner mode');
                    setCornerSelectionMode(!cornerSelectionMode);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.mapControlButtonText}>
                    {cornerSelectionMode ? '📍' : '⬜'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* APPLY BUTTON */}
              {cornerSelectionMode && plotCorners.length === 4 && (
                <TouchableOpacity
                  style={[styles.mapControlButton, styles.applyButton]}
                  onPress={() => {
                    console.log('✅ Applying grid');
                    setCornerSelectionMode(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.applyButtonText}>✓</Text>
                </TouchableOpacity>
              )}
              
              {/* CLEAR BUTTON */}
              {showVastuGrid && (
                <TouchableOpacity
                  style={styles.mapControlButton}
                  onPress={() => {
                    gridLayersRef.current.forEach(l => {
                      try {
                        googleMapRef.current.removeLayer(l);
                      } catch (e) {}
                    });
                    gridLayersRef.current = [];
                    setPlotCorners([]);
                    setShowVastuGrid(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.mapControlButtonText}>🗑️</Text>
                </TouchableOpacity>
              )}
              
              {/* LAYER TOGGLES - Show when grid is active */}
              {showVastuGrid && (
                <>
                  <View style={styles.layerDivider} />
                  
                  {/* Outer Layer Toggle */}
                  <TouchableOpacity
                    style={[styles.layerButton, showOuterLayer && styles.layerButtonActive]}
                    onPress={() => setShowOuterLayer(!showOuterLayer)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.layerButtonText}>O</Text>
                  </TouchableOpacity>
                  
                  {/* Middle Layer Toggle */}
                  <TouchableOpacity
                    style={[styles.layerButton, showMiddleLayer && styles.layerButtonActive]}
                    onPress={() => setShowMiddleLayer(!showMiddleLayer)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.layerButtonText}>M</Text>
                  </TouchableOpacity>
                  
                  {/* Center Layer Toggle */}
                  <TouchableOpacity
                    style={[styles.layerButton, showCenterLayer && styles.layerButtonActive]}
                    onPress={() => setShowCenterLayer(!showCenterLayer)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.layerButtonText}>C</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          
          {/* CORNER SELECTION BANNER */}
          {cornerSelectionMode && showCornerBanner && (
            <View style={styles.cornerBanner}>
              <View style={styles.cornerIconContainer}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="3" y="3" width="22" height="22" rx="2" stroke="white" strokeWidth="2.5" fill="rgba(255,255,255,0.1)"/>
                  <path d="M3 14h22M14 3v22" stroke="white" strokeWidth="1" strokeDasharray="2,2" opacity="0.5"/>
                  <circle cx="3" cy="3" r="3" fill="white"/>
                  <circle cx="25" cy="3" r="3" fill="white"/>
                  <circle cx="25" cy="25" r="3" fill="white"/>
                  <circle cx="3" cy="25" r="3" fill="white"/>
                  <path d="M14 10l-2-2 2-2M14 18l-2 2 2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                </svg>
              </View>
              <Text style={styles.cornerBannerTitle}>Adjust Plot Corners - Drag 4 red dots</Text>
              <TouchableOpacity
                style={styles.cornerCloseButton}
                onPress={() => {
                  console.log('❌ Hiding instruction banner only');
                  setShowCornerBanner(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* GRID ACTIVE BANNER */}
          {showVastuGrid && showGridBanner && (
            <View style={styles.gridBanner}>
              <View style={styles.gridIconContainer}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="3" y="3" width="22" height="22" rx="2" fill="white" opacity="0.9"/>
                  <path d="M3 10.33h22M3 17.67h22M10.33 3v22M17.67 3v22" stroke="#4169E1" strokeWidth="1.8"/>
                  <rect x="10.33" y="10.33" width="7.34" height="7.34" fill="#FFA500" opacity="0.7"/>
                  <text x="14" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">ॐ</text>
                </svg>
              </View>
              <Text style={styles.gridBannerTitle}>Vastu Grid Active - 81 Padas • Brahmasthan shown</Text>
              <TouchableOpacity
                style={styles.gridCloseButton}
                onPress={() => {
                  console.log('✓ Dismissing grid info banner only');
                  setShowGridBanner(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {showLocationSearch && (
            <View style={styles.locationSearchOverlay}>
              <TouchableOpacity
                style={styles.locationSearchOverlayBackdrop}
                activeOpacity={1}
                onPress={() => setShowLocationSearch(false)}
              />
              <View style={styles.locationSearchContainer}>
                <LocationSearch
                  onLocationSelect={(location) => {
                    setMapLocation(location);
                    setShowLocationSearch(false);
                  }}
                />
              </View>
            </View>
          )}

          {locationToUse && (
            <View style={styles.bottomInfo}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Geo-Coordinate:</Text>
                <Text style={styles.infoValue}>
                  Latitude: {locationToUse.latitude.toFixed(7)}
                </Text>
                <Text style={styles.infoValue}>
                  Longitude: {locationToUse.longitude.toFixed(7)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={styles.bottomButton}
              onPress={async () => {
                try {
                  const html2canvas = (await import('html2canvas')).default;
                  const containerElement = document.querySelector('.leaflet-container')?.parentElement?.parentElement || document.body;
                  const canvas = await html2canvas(containerElement, {
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#000000',
                  });
                  
                  canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const filename = showCompass 
                      ? `map-with-compass-${timestamp}.png`
                      : `map-${timestamp}.png`;
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  });
                } catch (error) {
                  console.error('Error downloading map:', error);
                  alert('Failed to download map. Please try again.');
                }
              }}
              onPressIn={() => setPressedButton('download')}
              onPressOut={() => setPressedButton(null)}
              activeOpacity={0.6}
            >
              <DownloadIcon 
                size={getResponsiveSize(24)} 
                color={pressedButton === 'download' ? "#5D4037" : "#F4C430"} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomButton}
              onPress={() => {
                if (googleMapRef.current && currentLocation) {
                  googleMapRef.current.setView([currentLocation.latitude, currentLocation.longitude], 18);
                  setMapLocation(null);
                }
              }}
              onPressIn={() => setPressedButton('recenter')}
              onPressOut={() => setPressedButton(null)}
              activeOpacity={0.6}
            >
              <RecenterIcon 
                size={getResponsiveSize(24)} 
                color={pressedButton === 'recenter' ? "#5D4037" : "#F4C430"} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomButton, isMapLocked && styles.bottomButtonActive]}
              onPress={() => {
                setIsMapLocked(!isMapLocked);
                if (googleMapRef.current && window.L) {
                  if (!isMapLocked) {
                    googleMapRef.current.dragging.disable();
                    googleMapRef.current.touchZoom.disable();
                    googleMapRef.current.doubleClickZoom.disable();
                    googleMapRef.current.scrollWheelZoom.disable();
                  } else {
                    googleMapRef.current.dragging.enable();
                    googleMapRef.current.touchZoom.enable();
                    googleMapRef.current.doubleClickZoom.enable();
                    googleMapRef.current.scrollWheelZoom.enable();
                  }
                }
              }}
              onPressIn={() => setPressedButton('lock')}
              onPressOut={() => setPressedButton(null)}
              activeOpacity={0.6}
            >
              <LockIcon 
                size={getResponsiveSize(24)} 
                color={pressedButton === 'lock' ? "#5D4037" : "#F4C430"} 
                locked={isMapLocked} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomButton}
              onPress={() => {
                if (googleMapRef.current && mapLocation) {
                  googleMapRef.current.setView([mapLocation.latitude, mapLocation.longitude], 18);
                }
              }}
              onPressIn={() => setPressedButton('pin')}
              onPressOut={() => setPressedButton(null)}
              activeOpacity={0.6}
              disabled={!mapLocation}
            >
              <PinIcon 
                size={getResponsiveSize(24)} 
                color={pressedButton === 'pin' && mapLocation ? "#5D4037" : (mapLocation ? "#F4C430" : "#CCCCCC")} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4C430',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: getResponsiveSize(16),
    fontSize: getResponsiveFont(16),
    color: '#8B7355',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: getResponsiveFont(16),
    color: '#8B7355',
    fontWeight: '600',
  },
  compassOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -getResponsiveSize(150) },
      { translateY: -getResponsiveSize(150) }
    ],
    width: getResponsiveSize(300),
    height: getResponsiveSize(300),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 500,
    pointerEvents: 'none',
    opacity: 0.6,
  },
  topBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  mapControls: {
    position: 'absolute',
    top: getResponsiveSize(90),
    right: getResponsiveSize(15),
    flexDirection: 'column',
    gap: getResponsiveSize(10),
    zIndex: 1001,
  },
  mapControlButton: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    borderRadius: getResponsiveSize(22),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B8860B',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  mapControlButtonActive: {
    borderColor: '#F4C430',
    backgroundColor: '#FFE082',
  },
  mapControlButtonText: {
    fontSize: getResponsiveFont(22),
  },
  locationSearchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  locationSearchOverlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  locationSearchContainer: {
    position: 'absolute',
    top: getResponsiveSize(90),
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingTop: getResponsiveSize(10),
    paddingBottom: getResponsiveSize(20),
    maxHeight: '80%',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: getResponsiveSize(80),
    left: getResponsiveSize(15),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: '#F4C430',
    padding: getResponsiveSize(10),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  infoBox: {
    gap: getResponsiveSize(2),
  },
  infoLabel: {
    fontSize: getResponsiveFont(10),
    color: '#8B7355',
    fontWeight: '700',
    marginBottom: getResponsiveSize(2),
  },
  infoValue: {
    fontSize: getResponsiveFont(10),
    color: '#2C2C2C',
    fontWeight: '500',
  },
  bottomControls: {
    position: 'absolute',
    bottom: getResponsiveSize(20),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(15),
    zIndex: 600,
  },
  bottomButton: {
    width: getResponsiveSize(50),
    height: getResponsiveSize(50),
    borderRadius: getResponsiveSize(25),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B8860B',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bottomButtonActive: {
    borderColor: '#F4C430',
    backgroundColor: '#FFE082',
  },
  applyButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.98)',
    borderColor: '#4CAF50',
    borderWidth: 4,
    width: getResponsiveSize(56),
    height: getResponsiveSize(56),
    borderRadius: getResponsiveSize(28),
  },
  applyButtonText: {
    fontSize: getResponsiveFont(32),
    color: '#FFFFFF',
    fontWeight: '900',
  },
  cornerBanner: {
    position: 'absolute',
    top: getResponsiveSize(145),
    left: getResponsiveSize(15),
    right: getResponsiveSize(145),
    background: 'linear-gradient(135deg, #FF4500 0%, #FF6347 100%)',
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(14),
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(10),
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 15,
  },
  cornerIconContainer: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBannerTitle: {
    fontSize: getResponsiveFont(14),
    fontWeight: '900',
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  cornerBannerText: {
    fontSize: getResponsiveFont(11),
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
  cornerCloseButton: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(16),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFont(22),
    fontWeight: '900',
    lineHeight: getResponsiveFont(22),
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gridBanner: {
    position: 'absolute',
    top: getResponsiveSize(145),
    left: getResponsiveSize(15),
    right: getResponsiveSize(145),
    background: 'linear-gradient(135deg, #4169E1 0%, #1E90FF 100%)',
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(14),
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(10),
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 15,
  },
  gridIconContainer: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridBannerTitle: {
    fontSize: getResponsiveFont(14),
    fontWeight: '900',
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  gridCloseButton: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(16),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  layerDivider: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: getResponsiveSize(8),
    width: getResponsiveSize(44),
  },
  layerButton: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    borderRadius: getResponsiveSize(22),
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#999999',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  layerButtonActive: {
    backgroundColor: 'rgba(244, 196, 48, 0.95)',
    borderColor: '#F4C430',
    borderWidth: 3,
  },
  layerButtonText: {
    fontSize: getResponsiveFont(16),
    fontWeight: '900',
    color: '#2C2C2C',
  },
});

