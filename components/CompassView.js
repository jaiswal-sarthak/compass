import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Image, TouchableOpacity, Text, Platform } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import NormalCompass from './compassModes/NormalCompass';
import Vastu16Compass from './compassModes/Vastu16Compass';
import Vastu32Compass from './compassModes/Vastu32Compass';
import Vastu45Compass from './compassModes/Vastu45Compass';
import ChakraCompass from './compassModes/ChakraCompass';
import ClassicCompass from './compassModes/ClassicCompass';
import FengShuiCompass from './compassModes/FengShuiCompass';

// Get dimensions safely
const getDimensions = () => {
  try {
    return Dimensions.get('window');
  } catch (error) {
    return { width: 375, height: 812 };
  }
};

const { width, height } = getDimensions();

// Responsive compass size
const getCompassSize = () => {
  if (!width || width === 0) return 300;
  if (Platform.OS === 'web') {
    const effectiveWidth = Math.min(width, 600);
    return effectiveWidth * 0.75;
  }
  const baseSize = width * 0.85;
  if (width < 360) return width * 0.80;
  if (width > 414) return Math.min(baseSize, 420);
  return baseSize;
};

const COMPASS_SIZE = getCompassSize();

// Responsive sizing functions
const getResponsiveSize = (size) => {
  if (!width || width === 0) return size;
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
  if (Platform.OS === 'web') {
    const effectiveWidth = Math.min(width, 600);
    const scale = effectiveWidth / 375;
    return Math.max(size * scale, size * 0.85);
  }
  const scale = width / 375;
  return Math.max(size * scale, size * 0.85);
};

// Device detection and calibration
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isPixel = /Pixel/.test(ua);
  const isSamsung = /Samsung/.test(ua);
  
  return {
    isIOS,
    isAndroid,
    isPixel,
    isSamsung,
    platform: Platform.OS,
  };
};

// Low-pass filter for smooth compass readings
class LowPassFilter {
  constructor(alpha = 0.15) {
    this.alpha = alpha; // Smoothing factor (0-1, lower = smoother)
    this.value = null;
  }

  filter(newValue) {
    if (this.value === null) {
      this.value = newValue;
      return newValue;
    }

    // Handle angle wraparound (359° -> 0°)
    let diff = newValue - this.value;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    this.value = this.value + this.alpha * diff;
    
    // Normalize to 0-360
    while (this.value < 0) this.value += 360;
    while (this.value >= 360) this.value -= 360;

    return this.value;
  }

  reset() {
    this.value = null;
  }
}

export default function CompassView({ 
  mode, 
  compassType, 
  capturedImage, 
  onClearImage, 
  onHeadingChange, 
  onImageSizeChange, 
  initialRotation,
  hideCalibration = false
}) {
  const [heading, setHeading] = useState(0);
  const [imageContainerSize, setImageContainerSize] = useState(COMPASS_SIZE);
  const rotation = useSharedValue(0);
  const [initialRotationComplete, setInitialRotationComplete] = useState(false);
  const [webPermissionGranted, setWebPermissionGranted] = useState(false);
  const [showCalibration, setShowCalibration] = useState(true);

  // Filters for smooth readings - more aggressive smoothing for stability
  const headingFilter = useRef(new LowPassFilter(0.08)); // Reduced from 0.15 for more stability
  const deviceInfo = useRef(getDeviceInfo());
  
  // Stability tracking
  const lastHeadingUpdate = useRef(0);
  const lastStableHeading = useRef(null);
  const stabilityTimer = useRef(null);
  const isStable = useRef(false); // Track if device has been stable for required time
  const lastAccelData = useRef({ x: 0, y: 0, z: 0, timestamp: 0 });
  const lastOrientationData = useRef({ beta: 0, gamma: 0, timestamp: 0 });
  const isDeviceMoving = useRef(false);
  const accelData = useRef({ x: 0, y: 0, z: 0 }); // Accelerometer data for tilt compensation
  
  // Configuration - improved for stability
  const DEAD_ZONE_THRESHOLD = 1.5; // Degrees - increased from 0.5 for more stability
  const STABILITY_TIME = 2000; // ms - time device must be stable before freezing
  const MOVEMENT_THRESHOLD = 0.15; // m/s² - increased threshold for movement detection
  const HIGH_CONFIDENCE_THRESHOLD = 0.8; // Confidence level considered "high"
  const MIN_UPDATE_INTERVAL = 100; // ms - minimum time between updates
  
  const MIN_SIZE = COMPASS_SIZE * 1.0;
  const MAX_SIZE = COMPASS_SIZE * 1.3;

  // Log device info once on mount
  useEffect(() => {
    const device = deviceInfo.current;
    console.log('🧭 Compass initialized for device:', {
      platform: device.platform,
      isIOS: device.isIOS,
      isAndroid: device.isAndroid,
      isPixel: device.isPixel,
      isSamsung: device.isSamsung,
      userAgent: navigator.userAgent,
    });
    
    if (device.isPixel) {
      console.log('📱 Pixel device detected - applying special calibration:');
      console.log('  - Inverted sensor axes');
      console.log('  - 90° orientation correction');
      console.log('  - Enhanced smoothing (0.08 alpha)');
      console.log('  - Reduced update rate (150ms)');
      console.log('  - Increased damping for stability');
    }
  }, []);

  // Check if heading should be updated based on movement, confidence, and dead zone
  const shouldUpdateHeading = (newHeading, confidence, timestamp) => {
    // If no previous heading, always update
    if (lastStableHeading.current === null) {
      return true;
    }
    
    // Enforce minimum update interval
    const timeSinceLastUpdate = timestamp - lastHeadingUpdate.current;
    if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
      return false; // Too soon since last update
    }
    
    // Calculate angular difference (handling wraparound)
    let diff = Math.abs(newHeading - lastStableHeading.current);
    if (diff > 180) diff = 360 - diff;
    
    // If confidence is low, be more lenient with updates
    const effectiveThreshold = confidence && confidence < HIGH_CONFIDENCE_THRESHOLD 
      ? DEAD_ZONE_THRESHOLD * 0.7  // Slightly lower threshold when confidence is low
      : DEAD_ZONE_THRESHOLD;
    
    // If change is below dead zone threshold, check if device is moving
    if (diff < effectiveThreshold) {
      // Device appears stationary - check if we should freeze updates
      if (confidence && confidence >= HIGH_CONFIDENCE_THRESHOLD && !isDeviceMoving.current) {
        // High confidence + no movement + small change = prepare to freeze updates
        // Clear any existing stability timer
        if (stabilityTimer.current) {
          clearTimeout(stabilityTimer.current);
        }
        
        // Set timer to mark device as stable after stability period
        stabilityTimer.current = setTimeout(() => {
          isStable.current = true; // Device has been stable - freeze updates
        }, STABILITY_TIME);
        
        // If already stable, don't update unless movement detected
        if (isStable.current) {
          return false; // Don't update - device is stable
        }
        
        // Not yet stable, but preparing - be more restrictive
        return diff >= effectiveThreshold * 0.5; // Increased from 0.2
      }
      
      // Low confidence or device moving - allow small updates but still filter
      return diff >= effectiveThreshold * 0.5; // Increased from 0.3
    }
    
    // Significant change detected - clear stability state and timer
    isStable.current = false;
    if (stabilityTimer.current) {
      clearTimeout(stabilityTimer.current);
      stabilityTimer.current = null;
    }
    
    return true;
  };
  
  // Universal compass heading calculation using device magnetometer with tilt compensation
  // This properly uses the device's magnetometer to get accurate heading
  const calculateHeading = (mx, my, mz = 0, ax = 0, ay = 0, az = 0) => {
    // Normalize magnetometer readings
    const magMagnitude = Math.sqrt(mx * mx + my * my + mz * mz);
    if (magMagnitude < 0.01) {
      return lastStableHeading.current || 0; // Return last known heading if invalid
    }
    
    // Device coordinate system (Android/iOS standard):
    // - X-axis: points to the right edge of device (East)
    // - Y-axis: points to the top edge of device (North when device points North)
    // - Z-axis: points out of screen (upward)
    
    // Calculate device tilt using accelerometer (if available)
    const accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
    let heading;
    
    if (accelMagnitude > 0.1) {
      // Device is tilted - use tilt compensation
      // Normalize accelerometer to get gravity vector
      const gx = ax / accelMagnitude;
      const gy = ay / accelMagnitude;
      const gz = az / accelMagnitude;
      
      // Calculate tilt angles
      const pitch = Math.asin(-gx); // Rotation around X-axis
      const cosPitch = Math.cos(pitch);
      
      // Calculate roll (rotation around Y-axis)
      let roll;
      if (Math.abs(cosPitch) > 0.001) {
        roll = Math.asin(gy / cosPitch);
      } else {
        roll = 0; // Avoid division by zero
      }
      
      // Rotate magnetometer readings to compensate for tilt
      // This projects the magnetic field onto the horizontal plane
      const sinPitch = Math.sin(pitch);
      const cosRoll = Math.cos(roll);
      const sinRoll = Math.sin(roll);
      
      // Rotate magnetometer vector to horizontal plane
      const hx = mx * cosPitch + mz * sinPitch;
      const hy = mx * sinRoll * sinPitch + my * cosRoll - mz * sinRoll * cosPitch;
      
      // Calculate heading from horizontal components
      // Standard formula: atan2(hx, hy) gives angle from North (Y-axis)
      // If result is inverted (60° instead of 300°), we need to invert
      // 300° = 360° - 60°, so try: 360 - atan2(hx, hy)
      let rawHeading = Math.atan2(hx, hy) * (180 / Math.PI);
      // Invert if needed: if showing 60° but should be 300°
      heading = (360 - rawHeading) % 360;
    } else {
      // Device is flat - use simple 2D calculation
      // Standard formula: atan2(mx, my) gives angle from North (Y-axis)
      // If showing 60° but should be 300° (240° off), try inverting
      // 300° = 360° - 60°, so invert the result
      let rawHeading = Math.atan2(mx, my) * (180 / Math.PI);
      // Invert: 360 - rawHeading to fix the 240° offset
      heading = (360 - rawHeading) % 360;
    }
    
    // Normalize to 0-360 (North = 0°, East = 90°, South = 180°, West = 270°)
    heading = (heading + 360) % 360;
    
    // Apply low-pass filter for smoothness
    heading = headingFilter.current.filter(heading);
    
    return heading;
  };

  // Track initial rotation completion
  useEffect(() => {
    if (initialRotation) {
      const timer = setTimeout(() => {
        setInitialRotationComplete(true);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setInitialRotationComplete(true);
    }
  }, [initialRotation]);

  // Auto-hide calibration banner
  useEffect(() => {
    if (showCalibration) {
      const timer = setTimeout(() => {
        setShowCalibration(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showCalibration]);

  // Check web orientation API availability
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (typeof DeviceOrientationEvent !== 'undefined' && 
          typeof DeviceOrientationEvent.requestPermission !== 'function') {
        if ('DeviceOrientationEvent' in window) {
          setWebPermissionGranted(true);
        }
      }
    }
  }, []);

  // Request web permission
  const requestWebPermission = () => {
    if (Platform.OS !== 'web') return;
    
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then((response) => {
          setWebPermissionGranted(response === 'granted');
        })
        .catch(() => {
          setWebPermissionGranted(false);
        });
    } else if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setWebPermissionGranted(true);
    }
  };

  // Main sensor effect
  useEffect(() => {
    if (!initialRotationComplete) return;

    // WEB: Device Orientation API
    if (Platform.OS === 'web') {
      if (typeof DeviceOrientationEvent !== 'undefined' && 
          typeof DeviceOrientationEvent.requestPermission === 'function' && 
          !webPermissionGranted) {
        return;
      }

      const handleOrientation = (event) => {
        let angle = null;
        let confidence = null;
        const device = deviceInfo.current;
        const now = Date.now();
        
        // Detect movement using orientation change (beta/gamma)
        if (event.beta !== null && event.beta !== undefined && 
            event.gamma !== null && event.gamma !== undefined) {
          const lastOri = lastOrientationData.current;
          const timeDelta = (now - lastOri.timestamp) / 1000; // seconds
          
          if (timeDelta > 0 && lastOri.timestamp > 0) {
            // Calculate change in orientation
            const betaDelta = Math.abs(event.beta - lastOri.beta);
            const gammaDelta = Math.abs(event.gamma - lastOri.gamma);
            const orientationChange = Math.sqrt(betaDelta * betaDelta + gammaDelta * gammaDelta);
            
            // Update movement status (threshold in degrees per second)
            const changeRate = orientationChange / timeDelta;
            isDeviceMoving.current = changeRate > 2.0; // 2 degrees/second threshold
            
            // If device starts moving, clear stability state
            if (isDeviceMoving.current) {
              isStable.current = false;
              if (stabilityTimer.current) {
                clearTimeout(stabilityTimer.current);
                stabilityTimer.current = null;
              }
            }
          }
          
          lastOrientationData.current = {
            beta: event.beta,
            gamma: event.gamma,
            timestamp: now
          };
        }

        // Priority 1: iOS webkitCompassHeading (most accurate and universal)
        if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
          // This is already correctly calibrated for iOS
          angle = event.webkitCompassHeading;
          // iOS provides confidence (0-1, higher is better)
          confidence = event.webkitCompassAccuracy !== undefined ? 
            Math.max(0, 1 - (event.webkitCompassAccuracy / 180)) : 0.9; // Convert accuracy to confidence
        }
        // Priority 2: Absolute orientation (more reliable)
        else if (event.absolute === true && event.alpha !== null && event.alpha !== undefined) {
          // Absolute orientation gives true compass heading
          // alpha: 0° when device points North, increases counterclockwise
          // Convert to standard compass (clockwise from North)
          angle = 360 - event.alpha;
          confidence = 0.8; // Absolute orientation is generally reliable
        }
        // Priority 3: Standard alpha (relative orientation)
        else if (event.alpha !== null && event.alpha !== undefined) {
          // Standard alpha - may be relative to initial position
          // Still use same conversion
          angle = 360 - event.alpha;
          confidence = 0.6; // Relative orientation is less reliable
        }

        if (angle !== null) {
          // Normalize to 0-360
          angle = (angle + 360) % 360;
          
          // Device/Browser-specific corrections
          if (device.isPixel) {
            // Google Pixel devices need correction
            // Add 180° offset for Pixel orientation difference
            angle = (angle + 180) % 360;
          } else if (device.isAndroid) {
            // Other Android Chrome/Firefox - alpha is usually correct
            // No adjustment needed
          } else if (device.isIOS) {
            // iOS Safari - webkitCompassHeading handles it, or alpha is correct
            // No adjustment needed
          }
          
          // Apply smoothing (more aggressive for all devices)
          let smoothed;
          if (device.isPixel) {
            // Extra smoothing for Pixel to prevent jitter
            if (!headingFilter.current.pixelFilter) {
              headingFilter.current.pixelFilter = new LowPassFilter(0.06);
            }
            smoothed = headingFilter.current.pixelFilter.filter(angle);
          } else {
            smoothed = headingFilter.current.filter(angle);
          }
          
          // Check if device is moving and if update is needed
          const shouldUpdate = shouldUpdateHeading(smoothed, confidence, now);
          
          if (shouldUpdate) {
            setHeading(smoothed);
            rotation.value = withSpring(-smoothed, { 
              damping: device.isPixel ? 40 : 35,  // Increased damping for more stability
              stiffness: device.isPixel ? 60 : 70, // Reduced stiffness for smoother motion
              mass: 0.8  // Increased mass for more inertia
            });
            
            if (onHeadingChange) {
              onHeadingChange(smoothed);
            }
            
            lastHeadingUpdate.current = now;
            lastStableHeading.current = smoothed;
          }
        }
      };

      // Add listeners for both absolute and relative orientation
      if (typeof DeviceOrientationEvent !== 'undefined' && 
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        if (webPermissionGranted) {
          window.addEventListener('deviceorientationabsolute', handleOrientation, true);
          window.addEventListener('deviceorientation', handleOrientation, true);
        }
      } else if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
        setWebPermissionGranted(true);
      }

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
          window.removeEventListener('deviceorientation', handleOrientation, true);
        }
      };
    }

    // NATIVE: Accelerometer for movement detection
    let accelerometerSubscription = null;
    
    const startAccelerometer = async () => {
      try {
        const isAvailable = await Accelerometer.isAvailableAsync();
        if (isAvailable) {
          Accelerometer.setUpdateInterval(100); // Match magnetometer rate for synchronized tilt compensation
          
           accelerometerSubscription = Accelerometer.addListener((data) => {
             const { x, y, z } = data;
             const now = Date.now();
             
             // Update accelerometer data for tilt compensation (REQUIRED for accurate compass)
             accelData.current.x = x;
             accelData.current.y = y;
             accelData.current.z = z;
             
             // Calculate acceleration magnitude
             const accel = Math.sqrt(x * x + y * y + z * z);
             
             // Calculate change in acceleration (jerk) to detect movement
             const lastAccel = lastAccelData.current;
             const timeDelta = (now - lastAccel.timestamp) / 1000; // seconds
             const accelDelta = Math.abs(accel - Math.sqrt(
               lastAccel.x * lastAccel.x + 
               lastAccel.y * lastAccel.y + 
               lastAccel.z * lastAccel.z
             ));
             
             // Update movement status
             isDeviceMoving.current = accelDelta > MOVEMENT_THRESHOLD || 
               Math.abs(accel - 9.81) > 0.5; // Significant deviation from gravity
             
             lastAccelData.current = { x, y, z, timestamp: now };
             
             // If device starts moving, clear stability state
             if (isDeviceMoving.current) {
               isStable.current = false;
               if (stabilityTimer.current) {
                 clearTimeout(stabilityTimer.current);
                 stabilityTimer.current = null;
               }
             }
           });
        }
      } catch (error) {
        console.log('Accelerometer not available:', error);
      }
    };
    
    // NATIVE: Magnetometer
    let magnetometerSubscription = null;

    const startMagnetometer = async () => {
      try {
        const isAvailable = await Magnetometer.isAvailableAsync();
        if (!isAvailable) {
          console.warn('Magnetometer not available');
          return;
        }

        // Set update interval (slower for stability)
        const updateInterval = deviceInfo.current.isPixel ? 200 : 150; // Slower updates for more stability
        Magnetometer.setUpdateInterval(updateInterval);

        magnetometerSubscription = Magnetometer.addListener((data) => {
          const { x, y, z } = data;
          
          // Use magnetometer with tilt compensation from accelerometer
          // This is the CORRECT way to use device magnetometer - passes accelerometer data
          const angle = calculateHeading(x, y, z, accelData.current.x, accelData.current.y, accelData.current.z);
          
          // For native, we assume high confidence if magnitude is reasonable
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          const confidence = magnitude > 20 && magnitude < 100 ? 0.9 : 0.6; // Reasonable magnetic field strength
          
          const now = Date.now();
          const shouldUpdate = shouldUpdateHeading(angle, confidence, now);
          
          if (shouldUpdate) {
            setHeading(angle);
            rotation.value = withSpring(-angle, { 
              damping: 35,  // Increased damping for more stability
              stiffness: 70, // Reduced stiffness for smoother motion
              mass: 0.8  // Increased mass for more inertia
            });
            
            if (onHeadingChange) {
              onHeadingChange(angle);
            }
            
            lastHeadingUpdate.current = now;
            lastStableHeading.current = angle;
          }
        });
      } catch (error) {
        console.error('Magnetometer error:', error);
      }
    };

    // Start both sensors for native
    if (Platform.OS !== 'web') {
      startAccelerometer();
    }
    startMagnetometer();

    return () => {
      if (magnetometerSubscription) {
        magnetometerSubscription.remove();
      }
      if (accelerometerSubscription) {
        accelerometerSubscription.remove();
      }
      if (stabilityTimer.current) {
        clearTimeout(stabilityTimer.current);
      }
    };
  }, [initialRotationComplete, webPermissionGranted, onHeadingChange]);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => {
    if (initialRotation && !initialRotationComplete) {
      return {
        transform: [{ rotate: `${initialRotation.value}deg` }],
      };
    }
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  // Render appropriate compass
  const renderCompass = () => {
    if (compassType === 'classic') {
      return <ClassicCompass heading={heading} />;
    } else if (compassType === 'fengshui') {
      return <FengShuiCompass heading={heading} />;
    }

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
          <View style={[styles.imageOverlay, { 
            width: imageContainerSize, 
            height: imageContainerSize, 
            borderRadius: imageContainerSize / 2 
          }]}>
            <Image 
              source={{ uri: capturedImage }} 
              style={styles.backgroundImage} 
            />
            <View style={[styles.compassOverlay, { 
              width: COMPASS_SIZE, 
              height: COMPASS_SIZE 
            }]}>
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
      
      {/* Web permission prompt */}
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
      
      {/* Heading indicator */}
      <View style={styles.headingIndicator}>
        <View style={styles.headingLine} />
        <View style={styles.headingDot} />
      </View>
      
      {/* Calibration banner - hidden in capture mode */}
      {showCalibration && !hideCalibration && (
        <View style={styles.calibrationBanner}>
          <View style={styles.calibrationContent}>
            <Text style={styles.calibrationIcon}>∞</Text>
            <View style={styles.calibrationTextContainer}>
              <Text style={styles.calibrationTitle}>Calibrate Compass</Text>
              <Text style={styles.calibrationText}>Move phone in figure-8 motion</Text>
            </View>
            <TouchableOpacity
              style={styles.calibrationCloseButton}
              onPress={() => setShowCalibration(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.calibrationCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
    marginTop: -3,
    alignSelf: 'center',
    borderWidth: 1,
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
    textShadow: '0px 1px 2px rgba(0, 0, 0, 0.5)',
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
  calibrationBanner: {
    position: 'absolute',
    bottom: -getResponsiveSize(80),
    left: '50%',
    marginLeft: -getResponsiveSize(140),
    width: getResponsiveSize(280),
    backgroundColor: 'rgba(244, 196, 48, 0.98)',
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#DAA520',
  },
  calibrationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calibrationIcon: {
    fontSize: getResponsiveFont(32),
    color: '#FFFFFF',
    fontWeight: '900',
    marginRight: getResponsiveSize(12),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  calibrationTextContainer: {
    flex: 1,
  },
  calibrationTitle: {
    fontSize: getResponsiveFont(14),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: getResponsiveSize(2),
  },
  calibrationText: {
    fontSize: getResponsiveFont(12),
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
  calibrationCloseButton: {
    width: getResponsiveSize(28),
    height: getResponsiveSize(28),
    borderRadius: getResponsiveSize(14),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: getResponsiveSize(8),
  },
  calibrationCloseText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFont(16),
    fontWeight: '700',
    lineHeight: getResponsiveFont(16),
  },
});
