import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Image, TouchableOpacity, Text, Platform } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Text as SvgText, G, Path } from 'react-native-svg';
import NormalCompass from './compassModes/NormalCompass';
import Vastu16Compass from './compassModes/Vastu16Compass';
import Vastu32Compass from './compassModes/Vastu32Compass';
import Vastu45Compass from './compassModes/Vastu45Compass';
import ChakraCompass from './compassModes/ChakraCompass';

// Get dimensions safely
const getDimensions = () => {
  try {
    return Dimensions.get('window');
  } catch (error) {
    return { width: 375, height: 812 };
  }
};

const { width, height } = getDimensions();

// Responsive compass size - adapts to screen size
const getCompassSize = () => {
  if (!width || width === 0) return 300; // Fallback size
  
  // For web, use a fixed max size
  if (Platform.OS === 'web') {
    const effectiveWidth = Math.min(width, 600);
    return effectiveWidth * 0.75; // 75% of effective width (increased from 60%)
  }
  
  const screenMin = Math.min(width, height);
  // Use 85% of screen width (increased from 75%), but ensure it fits with other elements
  const baseSize = width * 0.85;
  // For smaller screens, use a smaller percentage
  if (width < 360) {
    return width * 0.80; // Increased from 70%
  }
  // For larger screens, cap at reasonable size
  if (width > 414) {
    return Math.min(baseSize, 420); // Increased from 350
  }
  return baseSize;
};

const COMPASS_SIZE = getCompassSize();

// Responsive sizing functions
const getResponsiveSize = (size) => {
  if (!width || width === 0) return size;
  
  // For web/large screens, cap the scaling
  if (Platform.OS === 'web') {
    const effectiveWidth = Math.min(width, 700);
    const scale = effectiveWidth / 375;
    return Math.max(size * scale, size * 0.9);
  }
  
  const scale = width / 375;
  return Math.max(size * scale, size * 0.8);
};

const getResponsiveFont = (size) => {
  if (!width || width === 0) return size;
  
  // For web/large screens, cap the scaling
  if (Platform.OS === 'web') {
    const effectiveWidth = Math.min(width, 600);
    const scale = effectiveWidth / 375;
    return Math.max(size * scale, size * 0.85);
  }
  
  const scale = width / 375;
  return Math.max(size * scale, size * 0.85);
};

export default function CompassView({ mode, capturedImage, onClearImage, onHeadingChange, onImageSizeChange, initialRotation }) {
  const [heading, setHeading] = useState(0);
  const [imageContainerSize, setImageContainerSize] = useState(COMPASS_SIZE); // Start at 100%
  const rotation = useSharedValue(0);
  const [initialRotationComplete, setInitialRotationComplete] = useState(false);
  const [webPermissionGranted, setWebPermissionGranted] = useState(false);
  const [webPermissionRequested, setWebPermissionRequested] = useState(false);
  
  // Store sensor data for tilt compensation
  const magnetometerData = useRef({ x: 0, y: 0, z: 0 });
  const accelerometerData = useRef({ x: 0, y: 0, z: 0 });
  
  const MIN_SIZE = COMPASS_SIZE * 1.0; // 100% minimum
  const MAX_SIZE = COMPASS_SIZE * 1.3; // 130% maximum

  // Calculate tilt-compensated compass heading using all 3 axes
  const calculateTiltCompensatedHeading = () => {
    const { x: mx, y: my, z: mz } = magnetometerData.current;
    const { x: ax, y: ay, z: az } = accelerometerData.current;

    // Check if we have valid accelerometer data for tilt compensation
    const accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
    
    // If accelerometer data is not available or invalid, fall back to 2D calculation
    if (accelMagnitude < 0.1) {
      // Fallback to 2D compass (using only X and Y from magnetometer)
      // Swap X and Y for correct orientation: 0° = North
      let heading = Math.atan2(mx, my) * (180 / Math.PI);
      return (heading + 360) % 360;
    }

    // Calculate pitch and roll from accelerometer (device tilt)
    // Pitch: rotation around X-axis (forward/backward tilt)
    // Roll: rotation around Y-axis (left/right tilt)
    const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));
    const roll = Math.atan2(ay, az);

    // Apply tilt compensation to magnetometer readings
    // Rotate magnetometer vector to compensate for device tilt
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const cosRoll = Math.cos(roll);
    const sinRoll = Math.sin(roll);

    // Tilt-compensated magnetometer values
    // This projects the 3D magnetic field onto the horizontal plane
    const compensatedX = mx * cosPitch + mz * sinPitch;
    const compensatedY = mx * sinRoll * sinPitch + my * cosRoll - mz * sinRoll * cosPitch;

    // Calculate heading from tilt-compensated values
    // Note: We use atan2(compensatedX, compensatedY) to get correct orientation
    // This gives us 0° = North, 90° = East, 180° = South, 270° = West
    let heading = Math.atan2(compensatedX, compensatedY) * (180 / Math.PI);
    
    // Normalize to 0-360 degrees
    heading = (heading + 360) % 360;
    
    return heading;
  };

  // Notify parent when image size changes
  useEffect(() => {
    if (onImageSizeChange) {
      onImageSizeChange(imageContainerSize);
    }
  }, [imageContainerSize, onImageSizeChange]);

  // Track initial rotation completion
  useEffect(() => {
    if (initialRotation) {
      // Wait for initial rotation to complete (800ms + buffer)
      const timer = setTimeout(() => {
        setInitialRotationComplete(true);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setInitialRotationComplete(true);
    }
  }, [initialRotation]);

  // Check if device orientation is available on web (browsers that don't require permission)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // For browsers that don't require permission, check if API is available
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
        // Browser doesn't require permission, auto-enable
        if ('DeviceOrientationEvent' in window) {
          setWebPermissionGranted(true);
        }
      }
    }
  }, []);

  // Web: Request device orientation permission
  const requestWebPermission = () => {
    if (Platform.OS !== 'web') return;
    
    setWebPermissionRequested(true);
    
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then((response) => {
          if (response === 'granted') {
            setWebPermissionGranted(true);
          } else {
            console.warn('Device orientation permission denied');
            setWebPermissionGranted(false);
          }
        })
        .catch((error) => {
          console.warn('Error requesting device orientation permission:', error);
          setWebPermissionGranted(false);
        });
    } else {
      // For browsers that don't require permission, check if API is available
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        setWebPermissionGranted(true);
      }
    }
  };

  useEffect(() => {
    let subscription = null;
    let orientationListener = null;
    
    // Only start sensor after initial rotation completes
    if (!initialRotationComplete) return;
    
    // Web: Use Device Orientation API
    if (Platform.OS === 'web') {
      // Don't start if permission not granted (and permission is required)
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function' && !webPermissionGranted) {
        return;
      }
      
      const handleOrientation = (event) => {
        // event.alpha is the compass heading (0-360 degrees)
        // It's relative to the device's initial orientation
        let angle = event.alpha;
        
        // Some browsers provide alpha in different ranges
        if (angle === null || angle === undefined) {
          // Fallback: calculate from beta and gamma if alpha not available
          const beta = event.beta || 0;
          const gamma = event.gamma || 0;
          // This is a simplified calculation - not as accurate as alpha
          angle = Math.atan2(gamma, beta) * (180 / Math.PI);
        }
        
        // Normalize to 0-360
        angle = (angle + 360) % 360;
        
        setHeading(angle);
        rotation.value = withSpring(-angle, { damping: 15, stiffness: 100 });
        if (onHeadingChange) {
          onHeadingChange(angle);
        }
      };

      // Check if permission is already granted or not required
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        // Permission-based browser (iOS Safari)
        if (webPermissionGranted) {
          window.addEventListener('deviceorientation', handleOrientation);
        }
      } else {
        // For browsers that don't require permission
        if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
          window.addEventListener('deviceorientation', handleOrientation);
          setWebPermissionGranted(true); // Auto-granted for non-permission browsers
        }
      }

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('deviceorientation', handleOrientation);
        }
      };
    }
    
    // Native: Use Magnetometer + Accelerometer for tilt compensation
    let magnetometerSubscription = null;
    let accelerometerSubscription = null;
    
    try {
      // Check if both sensors are available
      Promise.all([
        Magnetometer.isAvailableAsync ? Magnetometer.isAvailableAsync() : Promise.resolve(true),
        Accelerometer.isAvailableAsync ? Accelerometer.isAvailableAsync() : Promise.resolve(true)
      ]).then(([magnetometerAvailable, accelerometerAvailable]) => {
        if (magnetometerAvailable) {
          // Listen to magnetometer (all 3 axes: x, y, z)
          magnetometerSubscription = Magnetometer.addListener((data) => {
            // Store all 3 axes for tilt compensation
            magnetometerData.current = { x: data.x, y: data.y, z: data.z };
            
            // Calculate tilt-compensated heading
            const angle = calculateTiltCompensatedHeading();
            
            setHeading(angle);
            // Rotate compass opposite to device rotation to keep North pointing north
            rotation.value = withSpring(-angle, { damping: 15, stiffness: 100 });
            if (onHeadingChange) {
              onHeadingChange(angle);
            }
          });
          Magnetometer.setUpdateInterval(100);
        }

        if (accelerometerAvailable) {
          // Listen to accelerometer (all 3 axes: x, y, z) for tilt detection
          accelerometerSubscription = Accelerometer.addListener((data) => {
            // Store all 3 axes for tilt compensation
            accelerometerData.current = { x: data.x, y: data.y, z: data.z };
          });
          Accelerometer.setUpdateInterval(100);
        }
      }).catch((error) => {
        console.warn('Sensor availability check failed:', error);
        // Fallback: try without accelerometer (2D compass)
      if (Magnetometer.isAvailableAsync) {
        Magnetometer.isAvailableAsync().then((isAvailable) => {
          if (isAvailable) {
              magnetometerSubscription = Magnetometer.addListener((data) => {
                const { x, y, z } = data;
                magnetometerData.current = { x, y, z };
                // Fallback to 2D calculation if accelerometer not available
              // Swap x and y for correct orientation
              let angle = Math.atan2(x, y) * (180 / Math.PI);
              angle = (angle + 360) % 360;
              setHeading(angle);
              rotation.value = withSpring(-angle, { damping: 15, stiffness: 100 });
                if (onHeadingChange) {
                  onHeadingChange(angle);
                }
            });
            Magnetometer.setUpdateInterval(100);
          }
        });
      } else {
        // Fallback for older API
          magnetometerSubscription = Magnetometer.addListener((data) => {
            const { x, y, z } = data;
            magnetometerData.current = { x: x || 0, y: y || 0, z: z || 0 };
          // Swap x and y for correct orientation
          let angle = Math.atan2(x, y) * (180 / Math.PI);
          angle = (angle + 360) % 360;
          setHeading(angle);
          rotation.value = withSpring(-angle, { damping: 15, stiffness: 100 });
        });
        Magnetometer.setUpdateInterval(100);
      }
      });
    } catch (error) {
      console.warn('Sensor error:', error);
    }

    return () => {
      if (magnetometerSubscription) {
        magnetometerSubscription.remove();
      }
      if (accelerometerSubscription) {
        accelerometerSubscription.remove();
      }
    };
  }, [initialRotationComplete, webPermissionGranted]);

  const animatedStyle = useAnimatedStyle(() => {
    // Use initial rotation during loading, then switch to magnetometer rotation
    if (initialRotation && !initialRotationComplete) {
      return {
        transform: [{ rotate: `${initialRotation.value}deg` }],
      };
    }
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const renderCompass = () => {
    switch (mode) {
      case 'normal':
        return <NormalCompass size={COMPASS_SIZE} />;
      case 'vastu16':
        return <Vastu16Compass size={COMPASS_SIZE} />;
      case 'vastu32':
        return <Vastu32Compass size={COMPASS_SIZE} />;
      case 'vastu45':
        return <Vastu45Compass size={COMPASS_SIZE} />;
      case 'chakra':
        return <ChakraCompass size={COMPASS_SIZE} />;
      default:
        return <NormalCompass size={COMPASS_SIZE} />;
    }
  };

  return (
    <View style={styles.container}>
      {capturedImage && (
        <>
          <View style={[styles.imageOverlay, { width: imageContainerSize, height: imageContainerSize, borderRadius: imageContainerSize / 2 }]}>
            <Image 
              source={{ uri: capturedImage }} 
              style={styles.backgroundImage} 
            />
            <View style={[styles.compassOverlay, { width: COMPASS_SIZE, height: COMPASS_SIZE }]}>
            <Animated.View style={[styles.compass, animatedStyle]}>
              {renderCompass()}
            </Animated.View>
            </View>
          </View>
          <View style={styles.imageControls}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => setImageContainerSize(Math.max(MIN_SIZE, imageContainerSize - getResponsiveSize(20)))}
              activeOpacity={0.8}
            >
              <Text style={styles.zoomButtonText}>−</Text>
            </TouchableOpacity>
            <View style={styles.zoomIndicator}>
              <Text style={styles.zoomIndicatorText}>
                {Math.round((imageContainerSize / COMPASS_SIZE) * 100)}%
              </Text>
            </View>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => setImageContainerSize(Math.min(MAX_SIZE, imageContainerSize + getResponsiveSize(20)))}
              activeOpacity={0.8}
            >
              <Text style={styles.zoomButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          {onClearImage && (
            <TouchableOpacity
              style={styles.clearImageButton}
              onPress={onClearImage}
              activeOpacity={0.8}
            >
              <View style={styles.clearImageButtonInner}>
                <Text style={styles.clearImageButtonText}>✕</Text>
              </View>
            </TouchableOpacity>
          )}
        </>
      )}
      {!capturedImage && (
        <Animated.View style={[styles.compass, animatedStyle]}>
          {renderCompass()}
        </Animated.View>
      )}
      {Platform.OS === 'web' && 
       !webPermissionGranted && 
       typeof DeviceOrientationEvent !== 'undefined' && 
       typeof DeviceOrientationEvent.requestPermission === 'function' && (
        <View style={styles.webPermissionContainer}>
          <Text style={styles.webPermissionText}>
            Enable device orientation to use the compass
          </Text>
          <TouchableOpacity
            style={styles.webPermissionButton}
            onPress={requestWebPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.webPermissionButtonText}>Enable Compass</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.headingIndicator}>
        <View style={styles.headingLine} />
        <View style={styles.headingDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: COMPASS_SIZE * 0.5,
    maxWidth: COMPASS_SIZE * 1.5,
    position: 'relative',
  },
  compass: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  compassOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    left: '50%',
    marginTop: -(COMPASS_SIZE / 2),
    marginLeft: -(COMPASS_SIZE / 2),
  },
  headingIndicator: {
    position: 'absolute',
    top: 0,
    width: 5,
    height: 35,
    backgroundColor: '#F4C430',
    borderRadius: 3,
    zIndex: 1000,
    shadowColor: '#F4C430',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
    alignSelf: 'center',
  },
  headingLine: {
    width: 3,
    height: 25,
    backgroundColor: '#FFD700',
  },
  headingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD700',
    marginTop: -5,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  clearImageButton: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F4C430',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  clearImageButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearImageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  imageControls: {
    position: 'absolute',
    right: getResponsiveSize(-40),
    top: '68%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveSize(8),
    zIndex: 10,
  },
  zoomButton: {
    width: getResponsiveSize(36),
    height: getResponsiveSize(36),
    borderRadius: getResponsiveSize(18),
    backgroundColor: '#F4C430',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  zoomButtonText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFont(20),
    fontWeight: '900',
    lineHeight: getResponsiveFont(20),
  },
  zoomIndicator: {
    minWidth: getResponsiveSize(50),
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(6),
    backgroundColor: '#FFFFFF',
    borderRadius: getResponsiveSize(16),
    borderWidth: 2,
    borderColor: '#F4C430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomIndicatorText: {
    color: '#B8860B',
    fontSize: getResponsiveFont(12),
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  webPermissionContainer: {
    position: 'absolute',
    top: COMPASS_SIZE / 2 - getResponsiveSize(60),
    left: '50%',
    marginLeft: -getResponsiveSize(125),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: getResponsiveSize(20),
    borderRadius: getResponsiveSize(16),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F4C430',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
    width: getResponsiveSize(250),
  },
  webPermissionText: {
    color: '#B8860B',
    fontSize: getResponsiveFont(14),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: getResponsiveSize(12),
  },
  webPermissionButton: {
    backgroundColor: '#F4C430',
    paddingVertical: getResponsiveSize(10),
    paddingHorizontal: getResponsiveSize(20),
    borderRadius: getResponsiveSize(20),
    borderWidth: 2,
    borderColor: '#DAA520',
  },
  webPermissionButtonText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFont(13),
    fontWeight: '700',
    textAlign: 'center',
  },
});


