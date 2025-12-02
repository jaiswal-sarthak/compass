import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import NormalCompassPreview from './compassModes/NormalCompassPreview';
import Vastu16CompassPreview from './compassModes/Vastu16CompassPreview';
import Vastu32Compass from './compassModes/Vastu32Compass';
import ChakraCompass from './compassModes/ChakraCompass';
import Sidebar from './Sidebar';
import CompassIcon from './icons/CompassIcon';

// Get dimensions safely
const getDimensions = () => {
  try {
    return Dimensions.get('window');
  } catch (error) {
    return { width: 375, height: 812 };
  }
};

// Responsive sizing - called dynamically
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

const COMPASS_TYPES = [
  {
    id: 'normal',
    title: 'Normal Compass',
    CompassComponent: NormalCompassPreview,
    colors: ['#F4C430', '#FFD700'],
  },
  {
    id: 'vastu16',
    title: '16 Zone Vastu Compass',
    CompassComponent: Vastu16CompassPreview,
    colors: ['#FF9933', '#FF8C00'],
  },
  {
    id: 'vastu32',
    title: '32 Zone Vastu Compass',
    CompassComponent: Vastu32Compass,
    colors: ['#DAA520', '#F4C430'],
  },
  {
    id: 'chakra',
    title: 'Vastu Chakra',
    CompassComponent: ChakraCompass,
    colors: ['#B8860B', '#DAA520'],
  },
];

function CompassCard({ compass, onPress, delay = 0 }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.95);

  React.useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 15, stiffness: 100 })
    );
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 15, stiffness: 100 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const compassSize = getResponsiveSize(100); // Slightly smaller to fit in fixed card
  const [isPressed, setIsPressed] = React.useState(false);
  const pressScale = useSharedValue(1);

  const handlePressIn = () => {
    setIsPressed(true);
    pressScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle, pressStyle]}>
      <TouchableOpacity
        style={[
          styles.card,
          isPressed && styles.cardPressed
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.cardInner}>
          <View style={styles.compassPreview}>
            <compass.CompassComponent size={compassSize} />
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{compass.title}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen({ onSelectCompass, onServicePress }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false);
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-15);

  React.useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    headerTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FFFEF5', '#FFF8E1']}
          style={styles.gradient}
        >
          {/* Header */}
          <Animated.View style={[styles.header, headerStyle]}>
            <LinearGradient
              colors={['#F4C430', '#FFD700', '#F4C430']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.headerTop}>
                <TouchableOpacity
                  style={styles.hamburger}
                  onPress={() => setSidebarVisible(true)}
                  activeOpacity={0.6}
                >
                  <View style={styles.hamburgerLine} />
                  <View style={styles.hamburgerLine} />
                  <View style={styles.hamburgerLine} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                  <CompassIcon size={getResponsiveSize(18)} color="#FFFFFF" />
                  <Text style={styles.headerTitle}>Compass By Applied</Text>
                </View>
                <View style={styles.headerSpacer} />
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Select Compass Type Label */}
          <Animated.View style={[styles.selectLabelContainer, headerStyle]}>
            <Text style={styles.selectLabel}>Select Compasses Type</Text>
          </Animated.View>

          {/* Compass Type Cards */}
          <View style={styles.compassGrid}>
            {COMPASS_TYPES.map((compass, index) => (
              <CompassCard
                key={compass.id}
                compass={compass}
                onPress={() => onSelectCompass(compass.id)}
                delay={150 + index * 80}
              />
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLogo}>
              <View style={styles.logoCircle}>
                <View style={styles.logoInnerCircle}>
                  <CompassIcon size={getResponsiveSize(22)} color="#B8860B" />
                </View>
              </View>
              <View style={styles.footerTextContainer}>
                <Text style={styles.footerText}>Vastu</Text>
                <Text style={styles.footerTextDot}>.com</Text>
              </View>
            </View>
            <View style={styles.footerLine} />
          </View>
        </LinearGradient>
      </ScrollView>

      {/* Sidebar */}
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onShowHowToUse={() => setShowHowToUse(true)}
      />

      {/* How to Use Modal */}
      <Modal
        visible={showHowToUse}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHowToUse(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How to Use Vastu Compass</Text>
              <TouchableOpacity
                onPress={() => setShowHowToUse(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>1</Text>
                <Text style={styles.instructionText}>
                  Select a compass type from the home screen (Normal, 16 Zone, 32 Zone, or Chakra).
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>2</Text>
                <Text style={styles.instructionText}>
                  Hold your device flat and allow the compass to calibrate. The red needle will point to magnetic North.
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>3</Text>
                <Text style={styles.instructionText}>
                  Use the "Search Location" button to find and set a specific location for accurate readings.
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>4</Text>
                <Text style={styles.instructionText}>
                  Use the "Capture" button to take a photo that will be displayed behind the compass for reference.
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>5</Text>
                <Text style={styles.instructionText}>
                  Adjust the image size using the +/- buttons to see more or less of your captured image.
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>6</Text>
                <Text style={styles.instructionText}>
                  The compass uses tilt compensation for maximum accuracy, so it works even when your device is slightly tilted.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: getResponsiveSize(15),
  },
  gradient: {
    flex: 1,
    minHeight: getDimensions().height,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? getResponsiveSize(50) : getResponsiveSize(40),
    paddingBottom: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(12),
    elevation: 8,
    shadowColor: '#F4C430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerGradient: {
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(8),
    paddingHorizontal: getResponsiveSize(8),
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hamburger: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(24),
    justifyContent: 'space-between',
    paddingVertical: getResponsiveSize(5),
    paddingHorizontal: getResponsiveSize(4),
    borderRadius: getResponsiveSize(6),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  hamburgerLine: {
    width: '100%',
    height: 2.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(6),
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: getResponsiveFont(15),
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: getResponsiveSize(28),
  },
  selectLabelContainer: {
    paddingHorizontal: getResponsiveSize(15),
    paddingTop: getResponsiveSize(12),
    paddingBottom: getResponsiveSize(8),
  },
  selectLabel: {
    fontSize: getResponsiveFont(13),
    fontWeight: '600',
    color: '#0066CC',
    textAlign: 'center',
  },
  compassGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveSize(12),
    gap: getResponsiveSize(8),
  },
  cardContainer: {
    width: '48%',
    marginBottom: getResponsiveSize(10),
  },
  card: {
    borderRadius: getResponsiveSize(10),
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F4C430',
    elevation: 6,
    shadowColor: '#F4C430',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    overflow: 'hidden',
    height: getResponsiveSize(170), // Fixed height for all cards
  },
  cardPressed: {
    borderColor: '#FFD700',
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardInner: {
    width: '100%',
    height: '100%',
    padding: getResponsiveSize(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassPreview: {
    marginBottom: getResponsiveSize(6),
    alignItems: 'center',
    justifyContent: 'center',
    height: getResponsiveSize(100), // Fixed height for compass preview
    width: '100%',
  },
  cardTitle: {
    fontSize: getResponsiveFont(11),
    fontWeight: '600',
    color: '#2C2C2C',
    textAlign: 'center',
    lineHeight: getResponsiveFont(14),
    minHeight: getResponsiveSize(32), // Fixed minimum height for title area
  },
  footer: {
    alignItems: 'center',
    paddingTop: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(15),
    marginTop: getResponsiveSize(10),
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(8),
    marginBottom: getResponsiveSize(8),
  },
  logoCircle: {
    width: getResponsiveSize(42),
    height: getResponsiveSize(42),
    borderRadius: getResponsiveSize(21),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  logoInnerCircle: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(16),
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  footerText: {
    fontSize: getResponsiveFont(13),
    fontWeight: '600',
    color: '#2C2C2C',
  },
  footerTextDot: {
    fontSize: getResponsiveFont(13),
    fontWeight: '600',
    color: '#4CAF50',
  },
  footerLine: {
    width: '85%',
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(20),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: getResponsiveSize(16),
    width: '100%',
    maxWidth: getResponsiveSize(400),
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getResponsiveSize(20),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: getResponsiveFont(20),
    fontWeight: '700',
    color: '#B8860B',
    flex: 1,
  },
  modalCloseButton: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(16),
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: getResponsiveFont(18),
    color: '#B8860B',
    fontWeight: '600',
  },
  modalBody: {
    padding: getResponsiveSize(20),
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: getResponsiveSize(16),
    alignItems: 'flex-start',
  },
  instructionNumber: {
    width: getResponsiveSize(28),
    height: getResponsiveSize(28),
    borderRadius: getResponsiveSize(14),
    backgroundColor: '#F4C430',
    color: '#FFFFFF',
    fontSize: getResponsiveFont(14),
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: getResponsiveSize(28),
    marginRight: getResponsiveSize(12),
  },
  instructionText: {
    flex: 1,
    fontSize: getResponsiveFont(14),
    color: '#2C2C2C',
    lineHeight: getResponsiveFont(20),
  },
});
