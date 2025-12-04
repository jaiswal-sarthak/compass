// Map utility functions for Vastu grid plotting

const R = 6378137; // Earth radius in meters

/**
 * Convert lat/lng to local XY coordinates (meters)
 */
export function latLngToXY(center, point) {
  const dLat = (point.latitude - center.latitude) * (Math.PI / 180);
  const dLon = (point.longitude - center.longitude) * (Math.PI / 180);
  const x = dLon * R * Math.cos((center.latitude * Math.PI) / 180);
  const y = dLat * R;
  return { x, y };
}

/**
 * Convert local XY coordinates back to lat/lng
 */
export function xyToLatLng(center, x, y) {
  const dLat = y / R;
  const dLon = x / (R * Math.cos((center.latitude * Math.PI) / 180));
  return {
    latitude: center.latitude + (dLat * 180) / Math.PI,
    longitude: center.longitude + (dLon * 180) / Math.PI,
  };
}

/**
 * Calculate average center of multiple points
 */
export function averageCenter(points) {
  const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length;
  return { latitude: lat, longitude: lng };
}

/**
 * Sort corners as rectangle (BL, BR, TR, TL)
 */
export function sortCornersAsRect(points) {
  const sorted = [...points].sort((a, b) => a.y - b.y);
  const bottom = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const top = sorted.slice(2).sort((a, b) => a.x - b.x);
  const [BL, BR] = bottom;
  const [TL, TR] = top;
  return [BL, BR, TR, TL];
}

/**
 * Interpolate between two points
 */
export function interpolate(p1, p2, t) {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}

/**
 * Create 9×9 grid lines
 */
export function createGridLinesXY(rectCorners) {
  const [BL, BR, TR, TL] = rectCorners;
  const verticalLines = [];
  const horizontalLines = [];

  for (let i = 0; i <= 9; i++) {
    const t = i / 9;
    
    // Vertical lines
    const bottomPoint = interpolate(BL, BR, t);
    const topPoint = interpolate(TL, TR, t);
    verticalLines.push([bottomPoint, topPoint]);
    
    // Horizontal lines
    const leftPoint = interpolate(BL, TL, t);
    const rightPoint = interpolate(BR, TR, t);
    horizontalLines.push([leftPoint, rightPoint]);
  }

  return { verticalLines, horizontalLines };
}

/**
 * Create 3-layer grid (divide by 3)
 * Returns outer, middle, and center grid lines
 */
export function create3LayerGridXY(rectCorners) {
  const [BL, BR, TR, TL] = rectCorners;
  
  const divisions = [0, 1/3, 2/3, 1]; // 3 layers
  const outerLines = [];
  const middleLines = [];
  
  // Main 3x3 division lines (thicker)
  divisions.forEach((t) => {
    // Vertical
    const bottomPoint = interpolate(BL, BR, t);
    const topPoint = interpolate(TL, TR, t);
    outerLines.push({ line: [bottomPoint, topPoint], type: 'vertical', position: t });
    
    // Horizontal
    const leftPoint = interpolate(BL, TL, t);
    const rightPoint = interpolate(BR, TR, t);
    outerLines.push({ line: [leftPoint, rightPoint], type: 'horizontal', position: t });
  });
  
  // Subdivide outer perimeter cells (for 45 devtas)
  const outerSubdivisions = [];
  
  // Top row subdivisions (9 cells)
  for (let i = 0; i <= 9; i++) {
    const t = i / 9 / 3; // Within first 1/3
    const bottomPoint = interpolate(BL, BR, t);
    const topPoint = interpolate(TL, TR, t);
    outerSubdivisions.push({ line: [bottomPoint, topPoint], layer: 'outer', dir: 'N' });
  }
  
  // Similar for other sides...
  // (We can add more detailed subdivisions as needed)
  
  return { outerLines, middleLines, outerSubdivisions };
}

/**
 * Get cell position for 3-layer system
 */
export function get3LayerCellXY(rect, layer, index) {
  const [BL, BR, TR, TL] = rect;
  
  if (layer === 'center') {
    // Brahma - center cell (1/3 to 2/3 in both directions)
    return {
      corners: [
        interpolate(interpolate(BL, BR, 1/3), interpolate(TL, TR, 1/3), 1/3),
        interpolate(interpolate(BL, BR, 2/3), interpolate(TL, TR, 2/3), 1/3),
        interpolate(interpolate(BL, BR, 2/3), interpolate(TL, TR, 2/3), 2/3),
        interpolate(interpolate(BL, BR, 1/3), interpolate(TL, TR, 1/3), 2/3),
      ],
      center: getCellCenterXY(rect, 4, 4), // Approximate center in 9x9
    };
  }
  
  // For outer and middle layers, calculate based on index
  // This is simplified - full implementation based on devta positions
  return null;
}

/**
 * Get center of a specific cell in the 9×9 grid
 */
export function getCellCenterXY(rect, row, col) {
  const [BL, BR, TR, TL] = rect;
  const tX = (col + 0.5) / 9;
  const tY = (row + 0.5) / 9;
  const bottom = interpolate(BL, BR, tX);
  const top = interpolate(TL, TR, tX);
  const point = interpolate(bottom, top, tY);
  return point;
}

/**
 * Get corners of a specific cell
 */
export function getCellCornersXY(rect, row, col) {
  const [BL, BR, TR, TL] = rect;
  
  const t1X = col / 9;
  const t2X = (col + 1) / 9;
  const t1Y = row / 9;
  const t2Y = (row + 1) / 9;
  
  const bottom1 = interpolate(BL, BR, t1X);
  const bottom2 = interpolate(BL, BR, t2X);
  const top1 = interpolate(TL, TR, t1X);
  const top2 = interpolate(TL, TR, t2X);
  
  const bl = interpolate(bottom1, top1, t1Y);
  const br = interpolate(bottom2, top2, t1Y);
  const tr = interpolate(bottom2, top2, t2Y);
  const tl = interpolate(bottom1, top1, t2Y);
  
  return [bl, br, tr, tl];
}

/**
 * Calculate plot angle relative to east
 */
export function getPlotAngle(center, corners) {
  const p0 = latLngToXY(center, corners[0]);
  const p1 = latLngToXY(center, corners[1]);
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  return Math.atan2(dy, dx); // radians
}

/**
 * Rotate grid matrix based on compass heading
 */
export function rotateGridForHeading(grid, plotAngle, northAngle) {
  // Calculate rotation needed (in 90° increments)
  const delta = ((plotAngle - northAngle) * 180 / Math.PI + 360) % 360;
  const rotations = Math.round(delta / 90) % 4;
  
  if (rotations === 0) return grid;
  
  let rotated = grid;
  for (let i = 0; i < rotations; i++) {
    rotated = rotateMatrix90(rotated);
  }
  return rotated;
}

/**
 * Rotate matrix 90° clockwise
 */
function rotateMatrix90(matrix) {
  const n = matrix.length;
  const rotated = Array(n).fill(null).map(() => Array(n).fill(null));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rotated[j][n - 1 - i] = matrix[i][j];
    }
  }
  
  return rotated;
}

