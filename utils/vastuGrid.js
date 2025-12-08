// Vastu Purusha Mandala 9×9 Grid
// Exact structure and names from HTML code

/**
 * 9×9 Vastu Grid - Matching HTML structure exactly
 * Row 0 = North (top)
 * Row 8 = South (bottom)
 * Col 0 = West (left)
 * Col 8 = East (right)
 */
export const VASTU_GRID_9X9 = [
  // Row 0 (North - top row)
  [
    { devta: 'Vayu', zone: 'NW', energy: 'positive', color: '#87CEEB' },
    { devta: 'Naag', zone: 'NNW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Mukhya', zone: 'NNW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Bhallat', zone: 'N', energy: 'neutral', color: '#CD853F' },
    { devta: 'Som', zone: 'N', energy: 'positive', color: '#DEB887' },
    { devta: 'Charak', zone: 'N', energy: 'neutral', color: '#CD853F' },
    { devta: 'Aditi', zone: 'NNE', energy: 'very positive', color: '#4169E1' },
    { devta: 'Uditi', zone: 'NNE', energy: 'positive', color: '#4682B4' },
    { devta: 'Isha', zone: 'NE', energy: 'very positive', color: '#4169E1' },
  ],
  // Row 1
  [
    { devta: 'Rog', zone: 'NW', energy: 'negative', color: '#8B4513' },
    { devta: 'Rudrajay', zone: 'NW', energy: 'neutral', color: '#A0522D' }, // Merged 2 rows
    { devta: null, zone: null, energy: null, color: null }, // Empty cell
    { devta: 'Bhoodhar', zone: 'N', energy: 'positive', color: '#87CEEB' }, // Merged 3x3
    { devta: 'Bhoodhar', zone: 'N', energy: 'positive', color: '#87CEEB' },
    { devta: 'Bhoodhar', zone: 'N', energy: 'positive', color: '#87CEEB' },
    { devta: 'Aap', zone: 'NNE', energy: 'very positive', color: '#4169E1' }, // Merged 2 cols
    { devta: 'Aap', zone: 'NNE', energy: 'very positive', color: '#4169E1' },
    { devta: 'Parjanya', zone: 'ENE', energy: 'positive', color: '#90EE90' },
  ],
  // Row 2
  [
    { devta: 'Sosh', zone: 'WNW', energy: 'negative', color: '#A0522D' },
    { devta: 'Rudrajay', zone: 'NW', energy: 'neutral', color: '#A0522D' }, // Merged continues
    { devta: 'Rudra', zone: 'NNW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Bhoodhar', zone: 'N', energy: 'positive', color: '#87CEEB' }, // Merged continues
    { devta: 'Bhoodhar', zone: 'N', energy: 'positive', color: '#87CEEB' },
    { devta: 'Bhoodhar', zone: 'N', energy: 'positive', color: '#87CEEB' },
    { devta: 'Aapvatsa', zone: 'NNE', energy: 'positive', color: '#4682B4' }, // Merged 2 cols
    { devta: 'Aapvatsa', zone: 'NNE', energy: 'positive', color: '#4682B4' },
    { devta: 'Jayant', zone: 'E', energy: 'positive', color: '#90EE90' },
  ],
  // Row 3
  [
    { devta: 'Asur', zone: 'WNW', energy: 'negative', color: '#A0522D' },
    { devta: 'Mitra', zone: 'W', energy: 'positive', color: '#DEB887' }, // Merged 3x2
    { devta: 'Mitra', zone: 'W', energy: 'positive', color: '#DEB887' },
    { devta: 'Brahma', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' }, // Merged 3x3
    { devta: 'Brahma', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' },
    { devta: 'Brahma', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' },
    { devta: 'Aryama', zone: 'E', energy: 'positive', color: '#DEB887' }, // Merged 3x2
    { devta: 'Aryama', zone: 'E', energy: 'positive', color: '#DEB887' },
    { devta: 'Mahendra', zone: 'E', energy: 'very positive', color: '#FFD700' },
  ],
  // Row 4
  [
    { devta: 'Varun', zone: 'W', energy: 'neutral', color: '#CD853F' },
    { devta: 'Mitra', zone: 'W', energy: 'positive', color: '#DEB887' }, // Merged continues
    { devta: 'Mitra', zone: 'W', energy: 'positive', color: '#DEB887' },
    { devta: 'Brahma', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' }, // Merged continues
    { devta: 'Brahma', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' },
    { devta: 'Brahma', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' },
    { devta: 'Aryama', zone: 'E', energy: 'positive', color: '#DEB887' }, // Merged continues
    { devta: 'Aryama', zone: 'E', energy: 'positive', color: '#DEB887' },
    { devta: 'Aditya', zone: 'E', energy: 'positive', color: '#90EE90' },
  ],
  // Row 5
  [
    { devta: 'Pushpdant', zone: 'W', energy: 'positive', color: '#DEB887' },
    { devta: 'Mitra', zone: 'W', energy: 'positive', color: '#DEB887' }, // Merged continues
    { devta: 'Mitra', zone: 'W', energy: 'positive', color: '#DEB887' },
    { devta: 'Brahma', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' }, // Merged continues
    { devta: 'Brahma', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' },
    { devta: 'Brahma', zone: 'BRAHMASTHAN', energy: 'divine', color: '#FFA500' },
    { devta: 'Aryama', zone: 'E', energy: 'positive', color: '#DEB887' }, // Merged continues
    { devta: 'Aryama', zone: 'E', energy: 'positive', color: '#DEB887' },
    { devta: 'Satyak', zone: 'ESE', energy: 'positive', color: '#90EE90' },
  ],
  // Row 6
  [
    { devta: 'Sugreev', zone: 'WSW', energy: 'neutral', color: '#CD853F' },
    { devta: 'Indraraj', zone: 'W', energy: 'positive', color: '#DEB887' }, // Merged 2 cols
    { devta: 'Indraraj', zone: 'W', energy: 'positive', color: '#DEB887' },
    { devta: 'Vivasvan', zone: 'S', energy: 'positive', color: '#F4A460' }, // Merged 3x2
    { devta: 'Vivasvan', zone: 'S', energy: 'positive', color: '#F4A460' },
    { devta: 'Vivasvan', zone: 'S', energy: 'positive', color: '#F4A460' },
    { devta: 'Svitra', zone: 'SSE', energy: 'positive', color: '#FFD700' }, // Merged 2 cols
    { devta: 'Svitra', zone: 'SSE', energy: 'positive', color: '#FFD700' },
    { devta: 'Bhusha', zone: 'SE', energy: 'neutral', color: '#FFD700' },
  ],
  // Row 7
  [
    { devta: 'Dauwarik', zone: 'WSW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Indra', zone: 'SW', energy: 'neutral', color: '#A0522D' }, // Merged 2 cols
    { devta: 'Indra', zone: 'SW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Vivasvan', zone: 'S', energy: 'positive', color: '#F4A460' }, // Merged continues
    { devta: 'Vivasvan', zone: 'S', energy: 'positive', color: '#F4A460' },
    { devta: 'Vivasvan', zone: 'S', energy: 'positive', color: '#F4A460' },
    { devta: 'Savitra', zone: 'SSE', energy: 'positive', color: '#FFA500' }, // Merged 2 cols
    { devta: 'Savitra', zone: 'SSE', energy: 'positive', color: '#FFA500' },
    { devta: 'Antrix', zone: 'SE', energy: 'neutral', color: '#FFD700' },
  ],
  // Row 8 (South - bottom row)
  [
    { devta: 'Pitru', zone: 'SW', energy: 'negative', color: '#8B4513' },
    { devta: 'Mrig', zone: 'SSW', energy: 'neutral', color: '#A0522D' },
    { devta: 'Bhujang', zone: 'SSW', energy: 'negative', color: '#A0522D' },
    { devta: 'Gandharva', zone: 'S', energy: 'neutral', color: '#CD853F' },
    { devta: 'Yama', zone: 'S', energy: 'negative', color: '#A0522D' },
    { devta: 'Gkhawat', zone: 'S', energy: 'neutral', color: '#CD853F' },
    { devta: 'Vitath', zone: 'SSE', energy: 'neutral', color: '#FFA500' },
    { devta: 'Pusha', zone: 'SSE', energy: 'positive', color: '#FFA500' },
    { devta: 'Agni', zone: 'SE', energy: 'positive', color: '#FFD700' },
  ],
];

/**
 * Get Brahmasthan cells (center 9 cells - Brahma)
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

/**
 * Get devta name for a cell (handles merged cells)
 */
export function getDevtaName(row, col) {
  if (row < 0 || row >= 9 || col < 0 || col >= 9) return null;
  const cell = VASTU_GRID_9X9[row][col];
  return cell && cell.devta ? cell.devta : null;
}
