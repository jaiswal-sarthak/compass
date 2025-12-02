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
import * as Location from 'expo-location';

// Conditional imports for native vs web
let MapView, Marker;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
}

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
  
  if (Platform.OS === 'web') {
    const effectiveWidth = Math.min(width, 600);
    const scale = effectiveWidth / 375;
    return Math.max(size * scale, size * 0.8);
  }
  
  const scale = width / 375;
  return Math.max(size * scale, size * 0.8);
};

const getResponsiveFont = (size) => {
  const { width } = getDimensions();
  if (!width || width === 0) return size;
  
  if (Platform.OS === 'web') {
    const effectiveWidth = Math.min(width, 600);
    const scale = effectiveWidth / 375;
    return Math.max(size * scale, size * 0.85);
  }
  
  const scale = width / 375;
  return Math.max(size * scale, size * 0.85);
};

export default function MapViewModal({ visible, onClose, mode, selectedLocation }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [heading, setHeading] = useState(0);
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
      if (googleMapRef.current) {
        if (Platform.OS === 'web' && window.L) {
          try {
            googleMapRef.current.remove();
            console.log('Map removed successfully');
          } catch (error) {
            console.log('Error removing map:', error);
          }
        }
        googleMapRef.current = null;
      }
      // Reset states
      setShowLocationSearch(false);
      setMapLocation(null);
      setLoading(true); // Reset loading state for next open
    }
  }, [visible]);

  // Load Leaflet script dynamically on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && !window.L) {
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
    if (visible && Platform.OS === 'web' && !loading && locationToUse && mapContainerRef.current && !googleMapRef.current) {
      // Add small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeLeafletMap();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible, loading, currentLocation, selectedLocation]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      
      if (Platform.OS === 'web') {
        // Use web geolocation API
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
              // Fallback to default location or selected location
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
      } else {
        // Use expo-location for native
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied');
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
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
    const maxRetries = 100; // Try for 10 seconds
    
    // Check if Leaflet is loaded
    const checkLeaflet = () => {
      // Log what we're checking
      if (retryCount === 0) {
        console.log('Starting Leaflet initialization check...');
        console.log('window.L exists?', typeof window !== 'undefined' && !!window.L);
        console.log('mapContainerRef.current exists?', !!mapContainerRef.current);
      }
      
      // Check if Leaflet exists and is properly loaded
      if (typeof window !== 'undefined' && window.L && mapContainerRef.current && !googleMapRef.current) {
        try {
          // Clear any existing map content in the container
          if (mapContainerRef.current.innerHTML) {
            mapContainerRef.current.innerHTML = '';
          }
          
          // Create map
          const map = window.L.map(mapContainerRef.current, {
            zoomControl: false, // We'll add custom controls
          }).setView([locationToUse.latitude, locationToUse.longitude], 18);

          // Add tile layer based on map type
          let tileLayer;
          if (mapType === 'satellite') {
            // Satellite imagery from ESRI
            tileLayer = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
              attribution: 'Tiles &copy; Esri',
              maxZoom: 19,
            });
          } else {
            // OpenStreetMap
            tileLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 19,
            });
          }
          tileLayer.addTo(map);

          // Add zoom control to bottom-right
          window.L.control.zoom({
            position: 'bottomright'
          }).addTo(map);

          // Create custom golden marker icon
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

          // Add marker
          const marker = window.L.marker([locationToUse.latitude, locationToUse.longitude], {
            icon: goldIcon
          }).addTo(map);
          
          marker.bindPopup('Current Location').openPopup();

          googleMapRef.current = map;
          
          console.log('Leaflet map initialized successfully');
        } catch (error) {
          console.error('Error initializing Leaflet:', error);
          // Show error message
          if (mapContainerRef.current) {
            const messageDiv = mapContainerRef.current.querySelector('.map-error-message');
            if (messageDiv) {
              messageDiv.style.display = 'block';
              const errorDetails = messageDiv.querySelector('.error-details');
              if (errorDetails) {
                errorDetails.textContent = error.message;
              }
            }
          }
        }
      } else if (retryCount < maxRetries) {
        // Retry after a short delay
        retryCount++;
        if (retryCount % 10 === 0) {
          console.log(`Waiting for Leaflet to load... (attempt ${retryCount}/${maxRetries})`);
        }
        setTimeout(checkLeaflet, 100);
      } else if (retryCount >= maxRetries) {
        console.error('Leaflet not loaded after 10 seconds. Check your internet connection.');
        // Show user-friendly message
        if (mapContainerRef.current) {
          const messageDiv = mapContainerRef.current.querySelector('.map-error-message');
          if (messageDiv) {
            messageDiv.style.display = 'block';
          }
        }
      }
    };
    
    // Start checking immediately
    checkLeaflet();
  };

  const changeMapType = () => {
    const newType = mapType === 'satellite' ? 'standard' : 'satellite';
    setMapType(newType);
    
    if (Platform.OS === 'web' && googleMapRef.current && window.L) {
      // For Leaflet, remove old layer and add new one
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

  // Update map when location changes
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
        {/* Map View */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F4C430" />
            <Text style={styles.loadingText}>Loading Map...</Text>
          </View>
        ) : locationToUse ? (
          Platform.OS === 'web' ? (
            <div
              ref={mapContainerRef}
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                backgroundColor: '#E5E5E5',
              }}
            >
              {/* Fallback message if Google Maps doesn't load */}
              <div 
                className="map-error-message"
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  padding: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  borderRadius: '16px',
                  maxWidth: '85%',
                  zIndex: 1000,
                  border: '2px solid #F4C430',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                }}
              >
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗺️</div>
                <p style={{ 
                  color: '#B8860B', 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  margin: '0 0 12px 0' 
                }}>
                  Map Loading Error
                </p>
                <p style={{ 
                  color: '#8B7355', 
                  fontSize: '13px', 
                  margin: '0 0 16px 0',
                  lineHeight: '1.5'
                }}>
                  Unable to load map. Please check your internet connection and try again.
                </p>
                <p className="error-details" style={{ 
                  color: '#FF0000', 
                  fontSize: '11px', 
                  margin: 0,
                  fontFamily: 'monospace'
                }}></p>
                <p style={{ 
                  color: '#8B7355', 
                  fontSize: '12px', 
                  margin: 0,
                  fontStyle: 'italic'
                }}>
                  If the issue persists, please restart the app.
                </p>
              </div>
            </div>
          ) : (
            <MapView
              style={styles.map}
              initialRegion={locationToUse}
              mapType={mapType}
              showsUserLocation={true}
              showsMyLocationButton={false}
              showsCompass={false}
              rotateEnabled={true}
              pitchEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: locationToUse.latitude,
                  longitude: locationToUse.longitude,
                }}
                title="Current Location"
              />
            </MapView>
          )
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unable to load map</Text>
          </View>
        )}

        {/* Compass Overlay - Toggle visibility */}
        {showCompass && locationToUse && (
          <View style={[styles.compassOverlay, { pointerEvents: 'none', zIndex: 500, opacity: 0.6 }]}>
            <CompassView
              mode={mode}
              capturedImage={null}
              onClearImage={() => {}}
              onHeadingChange={setHeading}
            />
          </View>
        )}

        {/* Top Navigation Bar - Same as compass view */}
        <View style={styles.topBarContainer}>
          <CompassTopBar
            onMenuPress={() => {}} // Disabled in map view
            onSearchPress={() => setShowLocationSearch(!showLocationSearch)}
            onBackPress={onClose}
          />
          
          {/* Map Controls */}
          <View style={styles.mapControls}>
             {/* Compass Toggle Button */}
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

             {/* Map Type Toggle */}
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

        {/* Location Search Overlay */}
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

        {/* Bottom Info */}
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

        {/* Bottom Control Buttons */}
        <View style={styles.bottomControls}>
           {/* Download/Screenshot Button */}
           <TouchableOpacity
             style={styles.bottomButton}
             onPress={async () => {
               if (Platform.OS === 'web') {
                 try {
                   const html2canvas = (await import('html2canvas')).default;
                   
                   // Get the container element (everything inside the modal)
                   const containerElement = document.querySelector('.leaflet-container')?.parentElement?.parentElement || document.body;
                   
                   // Capture the screenshot
                   const canvas = await html2canvas(containerElement, {
                     useCORS: true,
                     allowTaint: true,
                     backgroundColor: '#000000',
                   });
                   
                   // Convert to blob and download
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

           {/* Recenter to Current Location Button */}
           <TouchableOpacity
             style={styles.bottomButton}
             onPress={() => {
               if (googleMapRef.current && currentLocation) {
                 googleMapRef.current.setView([currentLocation.latitude, currentLocation.longitude], 18);
                 setMapLocation(null); // Reset to current location
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

           {/* Lock/Unlock Map Button */}
           <TouchableOpacity
             style={[styles.bottomButton, isMapLocked && styles.bottomButtonActive]}
             onPress={() => {
               setIsMapLocked(!isMapLocked);
               if (googleMapRef.current && window.L) {
                 if (!isMapLocked) {
                   // Lock the map
                   googleMapRef.current.dragging.disable();
                   googleMapRef.current.touchZoom.disable();
                   googleMapRef.current.doubleClickZoom.disable();
                   googleMapRef.current.scrollWheelZoom.disable();
                 } else {
                   // Unlock the map
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

           {/* Go to Selected Location Button */}
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
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
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
    top: Platform.OS === 'ios' ? getResponsiveSize(80) : getResponsiveSize(90),
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
    top: Platform.OS === 'ios' ? getResponsiveSize(100) : getResponsiveSize(90),
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
  bottomButtonIcon: {
    fontSize: getResponsiveFont(24),
  },
});

