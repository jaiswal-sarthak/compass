import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';

// Get dimensions safely
const getDimensions = () => {
  try {
    return Dimensions.get('window');
  } catch (error) {
    return { width: 375, height: 812 };
  }
};

// Responsive sizing
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

function MenuItem({ title, onPress, delay = 0 }) {
  const [isPressed, setIsPressed] = useState(false);
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(0);

  const handlePressIn = () => {
    setIsPressed(true);
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    backgroundColor.value = withTiming(1, { duration: 150 });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    backgroundColor.value = withTiming(0, { duration: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundColor.value,
  }));

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[styles.menuItemContent, animatedStyle]}>
        <Animated.View style={[styles.menuItemBackground, backgroundStyle]} />
        <Text style={styles.menuItemText}>{title}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function Sidebar({ visible, onClose, onShowHowToUse }) {
  const translateX = useSharedValue(-getDimensions().width * 0.75);

  React.useEffect(() => {
    if (visible) {
      translateX.value = withSpring(0, { damping: 15, stiffness: 100 });
    } else {
      translateX.value = withTiming(-getDimensions().width * 0.75, { duration: 300 });
    }
  }, [visible]);

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: visible ? withTiming(1, { duration: 300 }) : withTiming(0, { duration: 300 }),
  }));

  const handleShareApp = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync({
          message: 'Check out this amazing Vastu Compass app!',
          url: '',
        });
      } else {
        if (Platform.OS === 'web') {
          if (navigator.share) {
            await navigator.share({
              title: 'Vastu Compass',
              text: 'Check out this amazing Vastu Compass app!',
              url: window.location.href,
            });
          }
        }
      }
    } catch (error) {
      console.log('Error sharing:', error);
    }
    onClose();
  };

  const handleManagePermissions = async () => {
    try {
      if (Platform.OS === 'ios') {
        const url = 'app-settings:';
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        }
      } else if (Platform.OS === 'android') {
        if (Linking.openSettings) {
          await Linking.openSettings();
        }
      } else {
        alert('On web, permissions are requested automatically when needed. Check your browser settings for location and device orientation permissions.');
      }
    } catch (error) {
      console.log('Error opening settings:', error);
      alert('Unable to open settings. Please go to your device settings manually.');
    }
    onClose();
  };

  const handleHowToUse = () => {
    onClose();
    if (onShowHowToUse) {
      onShowHowToUse();
    }
  };

  if (!visible) return null;

  return (
    <>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View style={[styles.sidebar, sidebarStyle]}>
        <View style={styles.sidebarContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Menu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <MenuItem
              title="Share App"
              onPress={handleShareApp}
              delay={0}
            />
            <MenuItem
              title="Manage Permissions"
              onPress={handleManagePermissions}
              delay={50}
            />
            <MenuItem
              title="How to Use Vastu Compass"
              onPress={handleHowToUse}
              delay={100}
            />
          </ScrollView>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  overlayTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: getDimensions().width * 0.75,
    maxWidth: 280,
    height: '100%',
    backgroundColor: '#FFFFFF',
    zIndex: 999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  sidebarContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? getResponsiveSize(50) : getResponsiveSize(40),
    paddingBottom: getResponsiveSize(15),
    paddingHorizontal: getResponsiveSize(20),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: getResponsiveFont(20),
    fontWeight: '700',
    color: '#2C2C2C',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: getResponsiveSize(28),
    height: getResponsiveSize(28),
    borderRadius: getResponsiveSize(14),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: getResponsiveFont(16),
    color: '#666666',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingTop: getResponsiveSize(8),
  },
  menuItem: {
    marginHorizontal: getResponsiveSize(12),
    marginBottom: getResponsiveSize(4),
    borderRadius: getResponsiveSize(8),
    overflow: 'hidden',
  },
  menuItemContent: {
    paddingVertical: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(16),
    position: 'relative',
    overflow: 'hidden',
  },
  menuItemBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF8E1',
  },
  menuItemText: {
    fontSize: getResponsiveFont(14),
    fontWeight: '500',
    color: '#2C2C2C',
    position: 'relative',
    zIndex: 1,
  },
});
