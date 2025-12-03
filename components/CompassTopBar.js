import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SearchIcon from './icons/SearchIcon';
import CompassIcon from './icons/CompassIcon';

// Get dimensions safely
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

export default function CompassTopBar({ onMenuPress, onSearchPress, onBackPress }) {
  return (
    <LinearGradient
      colors={['#F4C430', '#FFD700', '#F4C430']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonCircle}>
            <Text style={styles.backButtonText}>←</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={onSearchPress}
          activeOpacity={0.8}
        >
          <View style={styles.searchContent}>
            <SearchIcon size={getResponsiveSize(16)} color="#666666" />
            <Text style={styles.searchText}>Search Location</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={onMenuPress}
          activeOpacity={0.7}
        >
          <View style={styles.hamburger}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? getResponsiveSize(40) : getResponsiveSize(30),
    paddingBottom: getResponsiveSize(8),
    paddingHorizontal: getResponsiveSize(12),
    elevation: 8,
    shadowColor: '#F4C430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: getResponsiveSize(8),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  hamburger: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(18),
    justifyContent: 'space-between',
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
  searchBar: {
    flex: 1,
    marginHorizontal: getResponsiveSize(10),
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(8),
    gap: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchText: {
    fontSize: getResponsiveFont(13),
    color: '#999999',
    flex: 1,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonCircle: {
    width: getResponsiveSize(36),
    height: getResponsiveSize(36),
    borderRadius: getResponsiveSize(18),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    fontSize: getResponsiveFont(28),
    color: '#FFFFFF',
    fontWeight: '900',
    textShadow: '0px 1px 3px rgba(0, 0, 0, 0.3)',
    letterSpacing: -2,
    includeFontPadding: false,
    textAlign: 'center',
    lineHeight: getResponsiveFont(28),
  },
});
