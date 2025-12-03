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
    }
  }, [visible]);

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
          console.log('Leaflet map initialized successfully');
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
            </View>
          </View>

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
});

