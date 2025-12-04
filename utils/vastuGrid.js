// Vastu Purusha Mandala 9×9 Grid
// 81 Padas with Devtas and Zones

/**
 * 9×9 Vastu Grid
 * Row 0 = South (bottom)
 * Row 8 = North (top)
 * Col 0 = West (left)
 * Col 8 = East (right)
 */
export const VASTU_GRID_9X9 = [
  // Row 0 (South)
  [
    { devta: 'Nirruti', zone: 'SW', energy: 'negative', color: '#8B4513' },
    { devta: 'Pitru', zone: 'SSW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Dauvarika', zone: 'SSW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Sugriva', zone: 'S', energy: 'neutral', color: '#CD853F' },
    { devta: 'Pushpadanta', zone: 'S', energy: 'positive', color: '#DEB887' },
    { devta: 'Varuna', zone: 'S', energy: 'neutral', color: '#CD853F' },
    { devta: 'Asura', zone: 'SSE', energy: 'negative', color: '#A0522D' },
    { devta: 'Shosha', zone: 'SSE', energy: 'negative', color: '#A0522D' },
    { devta: 'Papayakshma', zone: 'SE', energy: 'negative', color: '#8B4513' },
  ],
  // Row 1
  [
    { devta: 'Mriga', zone: 'SW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Putana', zone: 'SW', energy: 'negative', color: '#8B4513' },
    { devta: 'Aryaman', zone: 'S', energy: 'positive', color: '#DEB887' },
    { devta: 'Vivasvan', zone: 'S', energy: 'positive', color: '#F4A460' },
    { devta: 'Indra', zone: 'CENTER', energy: 'very positive', color: '#FFD700' },
    { devta: 'Mitra', zone: 'S', energy: 'positive', color: '#F4A460' },
    { devta: 'Rudra', zone: 'S', energy: 'neutral', color: '#DEB887' },
    { devta: 'Yaksha', zone: 'SE', energy: 'negative', color: '#8B4513' },
    { devta: 'Roga', zone: 'SE', energy: 'negative', color: '#A0522D' },
  ],
  // Row 2
  [
    { devta: 'Bhrungraj', zone: 'SW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Pitru', zone: 'SW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Anjan', zone: 'S', energy: 'neutral', color: '#CD853F' },
    { devta: 'Savita', zone: 'CENTER', energy: 'positive', color: '#FFD700' },
    { devta: 'Brahma', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' },
    { devta: 'Satya', zone: 'CENTER', energy: 'positive', color: '#FFD700' },
    { devta: 'Bhringaraj', zone: 'SE', energy: 'neutral', color: '#CD853F' },
    { devta: 'Ahi', zone: 'SE', energy: 'negative', color: '#A0522D' },
    { devta: 'Naga', zone: 'SE', energy: 'neutral', color: '#A0522D' },
  ],
  // Row 3
  [
    { devta: 'Vitatha', zone: 'W', energy: 'neutral', color: '#CD853F' },
    { devta: 'Griharakshita', zone: 'W', energy: 'positive', color: '#DEB887' },
    { devta: 'Yama', zone: 'S', energy: 'negative', color: '#A0522D' },
    { devta: 'Gandharva', zone: 'CENTER', energy: 'positive', color: '#FFD700' },
    { devta: 'Brahmasthan', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' },
    { devta: 'Bhringraja', zone: 'CENTER', energy: 'positive', color: '#FFD700' },
    { devta: 'Soma', zone: 'E', energy: 'positive', color: '#DEB887' },
    { devta: 'Mukhya', zone: 'E', energy: 'positive', color: '#DEB887' },
    { devta: 'Mukhya', zone: 'E', energy: 'positive', color: '#CD853F' },
  ],
  // Row 4 (Center row - contains Brahmasthan center)
  [
    { devta: 'Gruhakshata', zone: 'W', energy: 'positive', color: '#DEB887' },
    { devta: 'Yama', zone: 'W', energy: 'negative', color: '#A0522D' },
    { devta: 'Gandharva', zone: 'CENTER', energy: 'positive', color: '#FFD700' },
    { devta: 'Bhringraja', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' },
    { devta: 'Antariksha', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FF8C00' },
    { devta: 'Prithvidhara', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' },
    { devta: 'Parjanya', zone: 'CENTER', energy: 'positive', color: '#FFD700' },
    { devta: 'Jayanta', zone: 'E', energy: 'positive', color: '#DEB887' },
    { devta: 'Indra', zone: 'E', energy: 'very positive', color: '#FFD700' },
  ],
  // Row 5
  [
    { devta: 'Vayu', zone: 'W', energy: 'positive', color: '#DEB887' },
    { devta: 'Pusha', zone: 'W', energy: 'positive', color: '#DEB887' },
    { devta: 'Bhrisha', zone: 'CENTER', energy: 'positive', color: '#FFD700' },
    { devta: 'Aakash', zone: 'CENTER', energy: 'positive', color: '#FFD700' },
    { devta: 'Brahma', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' },
    { devta: 'Aryama', zone: 'CENTER', energy: 'positive', color: '#FFD700' },
    { devta: 'Pusha', zone: 'N', energy: 'positive', color: '#DEB887' },
    { devta: 'Aditi', zone: 'NE', energy: 'very positive', color: '#4169E1' },
    { devta: 'Diti', zone: 'NE', energy: 'positive', color: '#4682B4' },
  ],
  // Row 6
  [
    { devta: 'Varuna', zone: 'W', energy: 'neutral', color: '#CD853F' },
    { devta: 'Rudra', zone: 'NW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Rajayakshma', zone: 'NW', energy: 'negative', color: '#A0522D' },
    { devta: 'Savita', zone: 'N', energy: 'positive', color: '#DEB887' },
    { devta: 'Brahma', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' },
    { devta: 'Vivasvan', zone: 'N', energy: 'positive', color: '#DEB887' },
    { devta: 'Indra', zone: 'N', energy: 'very positive', color: '#FFD700' },
    { devta: 'Mitra', zone: 'NE', energy: 'positive', color: '#4682B4' },
    { devta: 'Isha', zone: 'NE', energy: 'very positive', color: '#4169E1' },
  ],
  // Row 7
  [
    { devta: 'Asura', zone: 'NW', energy: 'negative', color: '#A0522D' },
    { devta: 'Papa', zone: 'NW', energy: 'negative', color: '#8B4513' },
    { devta: 'Gandharva', zone: 'NW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Aryama', zone: 'N', energy: 'positive', color: '#DEB887' },
    { devta: 'Indra', zone: 'CENTER', energy: 'very positive', color: '#FFD700' },
    { devta: 'Prithvidhara', zone: 'N', energy: 'positive', color: '#DEB887' },
    { devta: 'Jayanta', zone: 'NE', energy: 'positive', color: '#4682B4' },
    { devta: 'Mahendra', zone: 'NE', energy: 'very positive', color: '#4169E1' },
    { devta: 'Surya', zone: 'NE', energy: 'very positive', color: '#4682B4' },
  ],
  // Row 8 (North)
  [
    { devta: 'Roga', zone: 'NW', energy: 'negative', color: '#8B4513' },
    { devta: 'Naga', zone: 'NNW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Mukhya', zone: 'NNW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Bhallata', zone: 'N', energy: 'neutral', color: '#CD853F' },
    { devta: 'Soma', zone: 'N', energy: 'positive', color: '#DEB887' },
    { devta: 'Aap', zone: 'N', energy: 'positive', color: '#CD853F' },
    { devta: 'Agni', zone: 'NNE', energy: 'positive', color: '#4682B4' },
    { devta: 'Isha', zone: 'NNE', energy: 'very positive', color: '#4169E1' },
    { devta: 'Shiva', zone: 'NE', energy: 'divine', color: '#0000CD' },
  ],
];

/**
 * Get Brahmasthan cells (center 9 cells)
 */
export function getBrahmasthanCells() {
  const cells = [];
  for (let row = 3; row <= 5; row++) {
    for (let col = 3; col <= 5; col++) {
      cells.push({ row, col });
    }
  }
  return cells;
}

/**
 * Get zone color
 */
export function getZoneColor(zone) {
  const zoneColors = {
    'NE': '#4169E1',  // Royal Blue - Most auspicious
    'N': '#87CEEB',   // Sky Blue
    'E': '#90EE90',   // Light Green
    'SE': '#FFD700',  // Gold
    'S': '#FFA500',   // Orange
    'SW': '#8B4513',  // Saddle Brown - Less auspicious
    'W': '#CD853F',   // Peru
    'NW': '#A0522D',  // Sienna
    'CENTER': '#FFD700', // Gold
    'BRAHMASTHAN': '#FFA500', // Orange - Sacred center
  };
  
  return zoneColors[zone] || '#CCCCCC';
}

/**
 * Get energy level description
 */
export function getEnergyDescription(energy) {
  const descriptions = {
    'divine': 'Divine Energy - Sacred Center',
    'very positive': 'Very Positive - Highly Auspicious',
    'positive': 'Positive Energy - Auspicious',
    'neutral': 'Neutral Energy',
    'negative': 'Negative Energy - Avoid Heavy Activities',
  };
  
  return descriptions[energy] || 'Unknown';
}

/**
 * Get zone recommendations
 */
export function getZoneRecommendations(zone) {
  const recommendations = {
    'NE': 'Water bodies, worship room, entrance. Keep light and clean.',
    'N': 'Safe, treasury, study room. Good for finance and career.',
    'E': 'Bathrooms, living room, open spaces. Auspicious for beginnings.',
    'SE': 'Kitchen, electrical appliances. Fire element zone.',
    'S': 'Bedroom, heavy storage. Moderate activities.',
    'SW': 'Master bedroom, heavy storage. Keep heavy and elevated.',
    'W': 'Dining, study, children room. Moderate to good.',
    'NW': 'Guest room, garage. Temporary activities.',
    'BRAHMASTHAN': 'Keep open, light, and clutter-free. No pillars or heavy structures.',
  };
  
  return recommendations[zone] || 'General use area';
}

