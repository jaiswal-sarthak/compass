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
      plotOutlineRef.current = null;
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
    try {
      console.log('🎨 drawVastuGrid called');
      if (!googleMapRef.current) {
        console.log('❌ No map reference');
        return;
      }
      if (plotCorners.length !== 4) {
        console.log('❌ Not enough corners:', plotCorners.length);
        return;
      }
      if (!window.L) {
        console.log('❌ Leaflet not loaded');
        return;
      }
      
      console.log('✅ All checks passed, drawing grid...');
      
      // Clear previous grid (except corner markers)
      gridLayersRef.current.forEach(layer => {
        if (googleMapRef.current && layer && !cornerMarkersRef.current.includes(layer)) {
          try {
            googleMapRef.current.removeLayer(layer);
          } catch (e) {
            console.log('⚠️ Error removing layer:', e);
          }
        }
      });
      gridLayersRef.current = gridLayersRef.current.filter(l => cornerMarkersRef.current.includes(l));
      
      const center = averageCenter(plotCorners);
      const xyCorners = plotCorners.map(p => latLngToXY(center, p));
      const rectXY = sortCornersAsRect(xyCorners);
      console.log('📐 Grid calculations done');
      const { verticalLines, horizontalLines } = createGridLinesXY(rectXY);
      
      // 1. Draw plot outline with enhanced styling
      const plotOutline = plotCorners.map(p => [p.latitude, p.longitude]);
      const outline = window.L.polygon([...plotOutline, plotOutline[0]], {
        color: '#FFD700',
        weight: 3,
        fillColor: 'transparent',
        opacity: 0.9,
        dashArray: '12, 6',
        lineCap: 'round',
      }).addTo(googleMapRef.current);
      gridLayersRef.current.push(outline);
      
      // 2. Draw 3-LAYER GRID (divide by 3)
      const [BL, BR, TR, TL] = rectXY;
      const divisions = [0, 1/3, 2/3, 1];
      
      // Draw main 3x3 division lines with improved styling
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
        const vLine = window.L.polyline(vertLatLngs, {
          color: isMainBorder ? '#FFD700' : '#F4C430',
          weight: isMainBorder ? 4 : (isLayerBorder ? 2.5 : 2),
          opacity: isMainBorder ? 0.95 : 0.8,
          lineCap: 'round',
        }).addTo(googleMapRef.current);
        gridLayersRef.current.push(vLine);
        
        // Horizontal lines
        const leftPoint = interpolate(BL, TL, t);
        const rightPoint = interpolate(BR, TR, t);
        const horizLatLngs = [leftPoint, rightPoint].map(p => {
          const coord = xyToLatLng(center, p.x, p.y);
          return [coord.latitude, coord.longitude];
        });
        const hLine = window.L.polyline(horizLatLngs, {
          color: isMainBorder ? '#FFD700' : '#F4C430',
          weight: isMainBorder ? 4 : (isLayerBorder ? 2.5 : 2),
          opacity: isMainBorder ? 0.95 : 0.8,
          lineCap: 'round',
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
          const subLine = window.L.polyline([topBottom, topTop].map(p => {
            const coord = xyToLatLng(center, p.x, p.y);
            return [coord.latitude, coord.longitude];
          }), {
            color: '#F4C430',
            weight: 1,
            opacity: 0.5,
          }).addTo(googleMapRef.current);
          gridLayersRef.current.push(subLine);
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
        
        // Draw Brahmasthan rectangle with improved styling
        const brahmasthanPoly = window.L.polygon(centerLatLngs, {
          color: '#FF8C00',
          fillColor: 'rgba(255, 165, 0, 0.35)',
          fillOpacity: 1,
          weight: 3,
        }).addTo(googleMapRef.current);
        gridLayersRef.current.push(brahmasthanPoly);
        
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
            fillColor: 'rgba(255, 165, 0, 0.35)',
            fillOpacity: 1,
            weight: 1.5,
          }).addTo(googleMapRef.current);
          gridLayersRef.current.push(polygon);
        });
        
        // Add sacred geometry SVG icon in center of Brahmasthan
        const brahmasthanCenter = getCellCenterXY(rectXY, 4, 4);
        const centerCoord = xyToLatLng(center, brahmasthanCenter.x, brahmasthanCenter.y);
        
        // Calculate cell dimensions dynamically for responsive icon sizing
        const cellCorners = getCellCornersXY(rectXY, 4, 4);
        
        // Convert cell corners to lat/lng for pixel calculation
        const cellCornersLatLng = cellCorners.map(p => {
          const coord = xyToLatLng(center, p.x, p.y);
          return [coord.latitude, coord.longitude];
        });
        
        // Get pixel coordinates using Leaflet's projection
        const cellBLPixel = googleMapRef.current.latLngToContainerPoint(cellCornersLatLng[0]);
        const cellBRPixel = googleMapRef.current.latLngToContainerPoint(cellCornersLatLng[1]);
        const cellTRPixel = googleMapRef.current.latLngToContainerPoint(cellCornersLatLng[2]);
        const cellTLPixel = googleMapRef.current.latLngToContainerPoint(cellCornersLatLng[3]);
        
        // Calculate cell width and height in pixels
        const cellWidthPixels = Math.sqrt(
          Math.pow(cellBRPixel.x - cellBLPixel.x, 2) + Math.pow(cellBRPixel.y - cellBLPixel.y, 2)
        );
        const cellHeightPixels = Math.sqrt(
          Math.pow(cellTLPixel.x - cellBLPixel.x, 2) + Math.pow(cellTLPixel.y - cellBLPixel.y, 2)
        );
        
        // Calculate icon size - need to leave significant room for surrounding labels
        // Devta labels can be 50-100px wide, so icon must be much smaller
        const minCellDimension = Math.min(cellWidthPixels, cellHeightPixels);
        
        // Labels are positioned at cell centers around the center cell
        // They can extend significantly, so we need a large buffer
        const labelBuffer = 40; // Space needed for labels (they can be 40-50px wide)
        const availableSpace = Math.max(0, minCellDimension - (labelBuffer * 2));
        
        // Use a conservative percentage (25-30%) to ensure no overlap
        // For very small cells, use even smaller percentage
        let iconSizePercent = 0.3;
        if (minCellDimension < 100) {
          iconSizePercent = 0.25; // Even smaller for tiny cells
        } else if (minCellDimension < 150) {
          iconSizePercent = 0.28;
        }
        
        const iconSizePixels = Math.max(15, Math.min(availableSpace * iconSizePercent, minCellDimension * iconSizePercent));
        
        // Clamp icon size between reasonable bounds (15px minimum, 60px maximum)
        const containerSize = Math.max(15, Math.min(60, Math.round(iconSizePixels)));
        
        // Calculate SVG size (70% of container for proper padding)
        const svgSize = Math.round(containerSize * 0.7);
        const anchorOffset = Math.round(containerSize / 2);
        
        console.log(`📏 Cell: ${cellWidthPixels.toFixed(0)}x${cellHeightPixels.toFixed(0)}px, Min: ${minCellDimension.toFixed(0)}px, Available: ${availableSpace.toFixed(0)}px, Icon: ${containerSize}px`);
        
        // Create a simpler, more stable SVG icon with dynamic sizing
        const gradientId = `sacredGrad${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sacredIcon = window.L.divIcon({
          className: 'brahmasthan-icon',
          html: `<div style="width:${containerSize}px;height:${containerSize}px;display:flex;align-items:center;justify-content:center;position:relative;background:radial-gradient(circle, rgba(255,215,0,0.9) 0%, rgba(255,165,0,0.9) 50%, rgba(255,140,0,0.9) 100%);border-radius:50%;box-shadow:0 4px 16px rgba(255,140,0,0.6);">
            <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 50 50">
              <defs>
                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
                  <stop offset="100%" stop-color="#FFD700" stop-opacity="1" />
                </linearGradient>
                <filter id="dropShadow${gradientId}">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
                  <feOffset dx="0" dy="2" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.3"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <circle cx="25" cy="25" r="22" fill="url(#${gradientId})" opacity="0.95" filter="url(#dropShadow${gradientId})"/>
              
              <circle cx="25" cy="25" r="16" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.8"/>
              <circle cx="25" cy="25" r="10" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.7"/>
              
              <path d="M25 8 L27 18 L33 15 L29 22 L38 25 L29 28 L33 35 L27 32 L25 42 L23 32 L17 35 L21 28 L12 25 L21 22 L17 15 L23 18 Z" 
                fill="#FFFFFF" opacity="0.9"/>
              
              <circle cx="25" cy="25" r="3" fill="#FFFFFF" opacity="1"/>
            </svg>
          </div>`,
          iconSize: [containerSize, containerSize],
          iconAnchor: [anchorOffset, anchorOffset],
        });
        
        // Only add icon if cell is large enough to avoid overlap
        if (containerSize >= 20 && minCellDimension > 60) {
          const sacredMarker = window.L.marker([centerCoord.latitude, centerCoord.longitude], {
            icon: sacredIcon,
            zIndexOffset: 3000, // Lower z-index so labels drawn later appear above
            interactive: false, // Make it non-interactive to reduce overlap issues
          }).addTo(googleMapRef.current);
          
          gridLayersRef.current.push(sacredMarker);
          
          // Bind tooltip after marker is created
          try {
            // Make tooltip size responsive to icon size and cell size
            // For smaller cells, make tooltip much smaller or hide it
            const shouldShowTooltip = minCellDimension > 80; // Only show if cell is large enough
            
            if (shouldShowTooltip) {
              const tooltipFontSize = containerSize < 30 ? '11px' : (containerSize < 45 ? '12px' : '13px');
              const tooltipTitleSize = containerSize < 30 ? '14px' : (containerSize < 45 ? '15px' : '16px');
              const tooltipSubSize = containerSize < 30 ? '9px' : '10px';
              const tooltipPadding = containerSize < 30 ? '8px 12px' : (containerSize < 45 ? '9px 13px' : '10px 14px');
              
              // Position tooltip offset to avoid overlapping with labels
              const tooltipOffset = containerSize < 30 ? [0, -containerSize - 10] : [0, -containerSize - 15];
              
              sacredMarker.bindTooltip(`
                <div style="
                  background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%);
                  color: white;
                  padding: ${tooltipPadding};
                  border-radius: 10px;
                  font-weight: bold;
                  font-size: ${tooltipFontSize};
                  box-shadow: 0 4px 12px rgba(255,140,0,0.5);
                  text-align: center;
                  border: none;
                  max-width: 180px;
                ">
                  <div style="font-size: ${tooltipTitleSize}; margin-bottom: 4px; font-weight: 900; letter-spacing: 0.5px;">✦ BRAHMASTHAN ✦</div>
                  <div style="font-size: ${tooltipSubSize}; opacity: 0.95; font-weight: 600;">Sacred Center • Keep Open & Light</div>
                </div>
              `, { 
                permanent: true, 
                direction: 'top', 
                offset: tooltipOffset,
                className: 'brahmasthan-tooltip',
                interactive: false
              });
            } else {
              // For very small cells, use a minimal tooltip or none
              console.log('⚠️ Cell too small for tooltip, hiding to avoid overlap');
            }
          } catch (tooltipError) {
            console.log('⚠️ Error binding tooltip:', tooltipError);
          }
        } else {
          console.log(`⚠️ Cell too small (${minCellDimension.toFixed(0)}px) - hiding Brahmasthan icon to avoid overlap`);
        }
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
      
      // Helper function to create devta marker with improved styling
      function createDevtaMarker(devta, coord, layer) {
        const layerSizes = {
          outer: { fontSize: 8, padding: '4px 7px', borderWidth: 1.5, borderRadius: '8px' },
          middle: { fontSize: 10, padding: '5px 9px', borderWidth: 2, borderRadius: '10px' },
          center: { fontSize: 13, padding: '7px 11px', borderWidth: 2.5, borderRadius: '12px' },
        };
        
        const size = layerSizes[layer];
        
        const icon = window.L.divIcon({
          className: `devta-label-${layer}`,
          html: `<div style="
            background: linear-gradient(135deg, ${devta.color}F8, ${devta.color}E0);
            color: white;
            padding: ${size.padding};
            border-radius: ${size.borderRadius};
            font-size: ${size.fontSize}px;
            font-weight: ${layer === 'center' ? '900' : '700'};
            white-space: nowrap;
            border: ${size.borderWidth}px solid rgba(255, 255, 255, 0.85);
            box-shadow: 0 ${layer === 'center' ? '4' : '2'}px ${layer === 'center' ? '12' : '8'}px rgba(0,0,0,0.5);
            text-align: center;
            text-shadow: 0 1px 2px rgba(0,0,0,0.4);
            line-height: 1.3;
            letter-spacing: 0.3px;
          ">
            <div style="font-weight: 900;">${devta.devta}</div>
            <div style="font-size: ${size.fontSize - 1.5}px; opacity: 0.85; margin-top: 1px;">${devta.zone}</div>
          </div>`,
          iconSize: [null, null],
          iconAnchor: [0, 0]
        });
        
        const marker = window.L.marker([coord.latitude, coord.longitude], {
          icon
        }).addTo(googleMapRef.current);
        
        marker.bindTooltip(`
          <div style="
            background: linear-gradient(135deg, ${devta.color}F5, ${devta.color}DD);
            color: white;
            padding: 12px 16px;
            border-radius: 12px;
            font-weight: bold;
            font-size: 13px;
            border: 2px solid rgba(255, 255, 255, 0.9);
            box-shadow: 0 6px 18px rgba(0,0,0,0.5);
            text-align: center;
          ">
            <div style="font-size: 16px; margin-bottom: 6px; font-weight: 900; letter-spacing: 0.5px;">${devta.devta}</div>
            <div style="font-size: 11px; opacity: 0.95; margin: 4px 0;">Zone: ${devta.zone}</div>
            <div style="font-size: 10px; opacity: 0.9; margin: 3px 0;">Energy: ${devta.energy}</div>
            <div style="font-size: 9px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.3); opacity: 0.85; text-transform: uppercase;">${layer} Layer</div>
          </div>
        `, { direction: 'top', offset: [0, -8], className: 'devta-tooltip' });
        
        gridLayersRef.current.push(marker);
      }
      
      setShowVastuGrid(true);
      setShowGridBanner(true);
      console.log('✅ Vastu grid drawn with enhanced UI!');
    } catch (error) {
      console.error('❌ CRITICAL Grid error:', error);
      console.error('Error stack:', error.stack);
      // Don't let the error crash the component - show error to user
      alert('Error drawing grid: ' + error.message);
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
    console.log('🔍 Grid draw useEffect triggered');
    console.log('  - plotCorners.length:', plotCorners.length);
    console.log('  - googleMapRef.current:', !!googleMapRef.current);
    console.log('  - cornerSelectionMode:', cornerSelectionMode);
    
    if (plotCorners.length === 4 && googleMapRef.current && !cornerSelectionMode) {
      console.log('🎨 All conditions met - Drawing grid with layers:', { 
        outer: showOuterLayer, 
        middle: showMiddleLayer, 
        center: showCenterLayer 
      });
      
      // Small delay to ensure corner markers are removed first
      const timer = setTimeout(() => {
        try {
          // Verify map still exists
          if (!googleMapRef.current) {
            console.error('❌ Map reference lost!');
            return;
          }
          
          // Remove plot outline before drawing grid
          if (plotOutlineRef.current) {
            try {
              googleMapRef.current.removeLayer(plotOutlineRef.current);
              console.log('🧹 Removed plot outline');
            } catch (e) {
              console.log('⚠️ Error removing plot outline:', e);
            }
            plotOutlineRef.current = null;
          }
          
          // Draw grid with error handling
          try {
            drawVastuGrid();
          } catch (gridError) {
            console.error('❌ Error in drawVastuGrid:', gridError);
            alert('Error drawing grid. Please try again.');
          }
        } catch (error) {
          console.error('❌ Critical error in grid drawing useEffect:', error);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      console.log('⏸️ Not drawing grid - conditions not met');
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
            <div style="position: relative; width: 75px; height: 90px; cursor: grab;">
              <svg width="75" height="75" viewBox="0 0 75 75">
                <defs>
                  <radialGradient id="grad${i}" cx="40%" cy="40%">
                    <stop offset="0%" stop-color="#FF6B6B" stop-opacity="1" />
                    <stop offset="50%" stop-color="#FF3333" stop-opacity="1" />
                    <stop offset="100%" stop-color="#E60000" stop-opacity="1" />
                  </radialGradient>
                  <filter id="glow${i}" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="shadow${i}">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
                  </filter>
                </defs>
                
                <!-- Pulsing outer ring -->
                <circle cx="37.5" cy="37.5" r="34" fill="none" stroke="#FF3333" stroke-width="2" opacity="0.5">
                  <animate attributeName="r" from="30" to="36" dur="2.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="0.7" to="0" dur="2.5s" repeatCount="indefinite"/>
                </circle>
                
                <!-- Main circle with gradient -->
                <circle cx="37.5" cy="37.5" r="30" fill="url(#grad${i})" stroke="white" stroke-width="4" filter="url(#glow${i})"/>
                
                <!-- Inner highlight circles -->
                <circle cx="37.5" cy="37.5" r="25" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                <circle cx="37.5" cy="37.5" r="20" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
                
                <!-- Corner marker icon -->
                <path d="M30 30h-7v7M45 30h7v7M45 45h7v-7M30 45h-7v-7" stroke="white" stroke-width="2.5" opacity="0.6" stroke-linecap="round"/>
                
                <!-- Number with enhanced shadow -->
                <text x="37.5" y="43" text-anchor="middle" fill="white" 
                  font-size="26" font-weight="900" font-family="Arial, sans-serif"
                  style="paint-order: stroke; stroke: rgba(0,0,0,0.6); stroke-width: 4px;"
                  filter="url(#shadow${i})">${i + 1}</text>
              </svg>
              
              <!-- Enhanced label tag -->
              <div style="
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #FF3333 0%, #E60000 100%);
                color: white;
                padding: 5px 12px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 800;
                white-space: nowrap;
                border: 2.5px solid white;
                box-shadow: 0 4px 12px rgba(255,0,0,0.5);
                letter-spacing: 1px;
                text-transform: uppercase;
              ">${corner.label}</div>
            </div>
          `,
          iconSize: [75, 90],
          iconAnchor: [37.5, 37.5],
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
            background: linear-gradient(135deg, #FF3333 0%, #E60000 100%);
            color: white;
            padding: 10px 16px;
            border-radius: 10px;
            font-weight: 800;
            font-size: 13px;
            border: 2px solid white;
            box-shadow: 0 6px 16px rgba(255,0,0,0.4);
            text-align: center;
            letter-spacing: 0.5px;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 6px;">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${corner.name}
          </div>
        `, {
          permanent: true,
          direction: 'top',
          offset: [0, -28],
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
          // Only clear if we're initializing for the first time
          if (mapContainerRef.current.innerHTML && !googleMapRef.current) {
            mapContainerRef.current.innerHTML = '';
          }
          
          // Double check map doesn't exist
          if (googleMapRef.current) {
            console.log('Map already exists, skipping initialization');
            return;
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
              key="map-container"
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                backgroundColor: '#E5E5E5',
                position: 'relative',
                zIndex: 1,
              }}
              onError={(e) => {
                console.error('Map container error:', e);
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
                    console.log('✅ Apply button clicked');
                    console.log('📍 Plot corners:', plotCorners);
                    console.log('🗺️ Map ref exists:', !!googleMapRef.current);
                    setCornerSelectionMode(false);
                    console.log('🔄 Corner selection mode set to false');
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
                    console.log('🗑️ Clearing grid - removing', gridLayersRef.current.length, 'layers');
                    
                    // Remove all tracked grid layers
                    gridLayersRef.current.forEach(l => {
                      try {
                        if (l && googleMapRef.current) {
                          googleMapRef.current.removeLayer(l);
                        }
                      } catch (e) {
                        console.log('⚠️ Error removing layer:', e);
                      }
                    });
                    
                    // Also remove any orphaned layers by checking all map layers
                    if (googleMapRef.current && window.L) {
                      googleMapRef.current.eachLayer((layer) => {
                        // Remove any polylines or polygons that look like grid lines
                        if (layer instanceof window.L.Polyline || layer instanceof window.L.Polygon) {
                          try {
                            // Check if it's a grid-related layer (yellow/golden colors)
                            const options = layer.options;
                            if (options && (
                              options.color === '#FFD700' || 
                              options.color === '#F4C430' ||
                              options.fillColor === '#FFA500' ||
                              options.fillColor === 'rgba(255, 165, 0, 0.35)'
                            )) {
                              googleMapRef.current.removeLayer(layer);
                              console.log('🗑️ Removed orphaned grid layer');
                            }
                          } catch (e) {
                            // Ignore errors for layers that might not have options
                          }
                        }
                      });
                    }
                    
                    gridLayersRef.current = [];
                    setPlotCorners([]);
                    setShowVastuGrid(false);
                    console.log('✅ Grid cleared successfully');
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
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <defs>
                    <filter id="cornerGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  <rect x="6" y="6" width="20" height="20" rx="2" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.15)" opacity="0.9"/>
                  
                  <circle cx="6" cy="6" r="3.5" fill="white" filter="url(#cornerGlow)">
                    <animate attributeName="r" values="3.5;4.2;3.5" dur="2s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="26" cy="6" r="3.5" fill="white" filter="url(#cornerGlow)">
                    <animate attributeName="r" values="3.5;4.2;3.5" dur="2s" begin="0.5s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="26" cy="26" r="3.5" fill="white" filter="url(#cornerGlow)">
                    <animate attributeName="r" values="3.5;4.2;3.5" dur="2s" begin="1s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="6" cy="26" r="3.5" fill="white" filter="url(#cornerGlow)">
                    <animate attributeName="r" values="3.5;4.2;3.5" dur="2s" begin="1.5s" repeatCount="indefinite"/>
                  </circle>
                  
                  <path d="M10 16h12M16 10v12" stroke="white" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.4"/>
                  
                  <path d="M16 12l-2-2 2-2M16 20l-2 2 2 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
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
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <defs>
                    <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                      <stop offset="100%" stopColor="#E3F2FD" stopOpacity="1" />
                    </linearGradient>
                    <linearGradient id="brahmaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
                      <stop offset="50%" stopColor="#FFA500" stopOpacity="1" />
                      <stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  
                  <rect x="4" y="4" width="24" height="24" rx="2" fill="url(#gridGrad)" stroke="white" strokeWidth="1.5"/>
                  
                  <path d="M4 12h24M4 20h24M12 4v24M20 4v24" stroke="#2196F3" strokeWidth="2" opacity="0.8"/>
                  
                  <rect x="12" y="12" width="8" height="8" fill="url(#brahmaGrad)" rx="1">
                    <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite"/>
                  </rect>
                  
                  <circle cx="16" cy="16" r="2" fill="white" opacity="0.9">
                    <animate attributeName="r" values="2;2.5;2" dur="2s" repeatCount="indefinite"/>
                  </circle>
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
    gap: getResponsiveSize(12),
    zIndex: 1001,
  },
  mapControlButton: {
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
    borderRadius: getResponsiveSize(24),
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  mapControlButtonActive: {
    backgroundColor: '#FFD54F',
    elevation: 8,
    shadowColor: '#F4C430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
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
    bottom: getResponsiveSize(85),
    left: getResponsiveSize(15),
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: getResponsiveSize(12),
    borderWidth: 0,
    padding: getResponsiveSize(12),
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  infoBox: {
    gap: getResponsiveSize(2),
  },
  infoLabel: {
    fontSize: getResponsiveFont(10),
    color: '#F4C430',
    fontWeight: '800',
    marginBottom: getResponsiveSize(4),
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: getResponsiveFont(10),
    color: '#424242',
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: getResponsiveSize(20),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(15),
    zIndex: 600,
  },
  bottomButton: {
    width: getResponsiveSize(54),
    height: getResponsiveSize(54),
    borderRadius: getResponsiveSize(27),
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  bottomButtonActive: {
    backgroundColor: '#FFD54F',
    elevation: 8,
    shadowColor: '#F4C430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  applyButton: {
    backgroundColor: '#4CAF50',
    borderWidth: 0,
    width: getResponsiveSize(60),
    height: getResponsiveSize(60),
    borderRadius: getResponsiveSize(30),
    elevation: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
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
    background: 'linear-gradient(135deg, #FF5722 0%, #FF7043 100%)',
    borderRadius: getResponsiveSize(14),
    paddingVertical: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(16),
    borderWidth: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(12),
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 15,
  },
  cornerIconContainer: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBannerTitle: {
    fontSize: getResponsiveFont(14),
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.3,
  },
  cornerBannerText: {
    fontSize: getResponsiveFont(11),
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
  cornerCloseButton: {
    width: getResponsiveSize(30),
    height: getResponsiveSize(30),
    borderRadius: getResponsiveSize(15),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFont(20),
    fontWeight: '700',
    lineHeight: getResponsiveFont(20),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gridBanner: {
    position: 'absolute',
    top: getResponsiveSize(145),
    left: getResponsiveSize(15),
    right: getResponsiveSize(145),
    background: 'linear-gradient(135deg, #2196F3 0%, #42A5F5 100%)',
    borderRadius: getResponsiveSize(14),
    paddingVertical: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(16),
    borderWidth: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(12),
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 15,
  },
  gridIconContainer: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridBannerTitle: {
    fontSize: getResponsiveFont(14),
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.3,
  },
  gridCloseButton: {
    width: getResponsiveSize(30),
    height: getResponsiveSize(30),
    borderRadius: getResponsiveSize(15),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  layerDivider: {
    height: 1,
    backgroundColor: 'rgba(244, 196, 48, 0.4)',
    marginVertical: getResponsiveSize(10),
    width: getResponsiveSize(48),
    borderRadius: getResponsiveSize(0.5),
  },
  layerButton: {
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
    borderRadius: getResponsiveSize(24),
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  layerButtonActive: {
    backgroundColor: '#FFD54F',
    elevation: 6,
    shadowColor: '#F4C430',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  layerButtonText: {
    fontSize: getResponsiveFont(16),
    fontWeight: '900',
    color: '#2C2C2C',
  },
});

