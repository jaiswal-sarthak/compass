import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const CARDINAL_DIRECTIONS = ['N', 'E', 'S', 'W'];

export default function NormalCompass({ size }) {
  const center = size / 2;
  const radius = size / 2 - 20;
  const innerRadius = radius - 40;
  const watermarkRadius = radius - 10;

  const getDirectionPosition = (index, isCardinal = false) => {
    const angle = (index * 45 - 90) * (Math.PI / 180);
    const r = isCardinal ? radius - 15 : radius - 5;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      angle: index * 45,
    };
  };

  // Create watermark text path
  const createWatermarkPath = (angle) => {
    const angleRad = (angle - 90) * (Math.PI / 180);
    const x = center + watermarkRadius * Math.cos(angleRad);
    const y = center + watermarkRadius * Math.sin(angleRad);
    return { x, y, angle };
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Water gradient (North) */}
          <SvgLinearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#1E3A8A" stopOpacity="1" />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="1" />
          </SvgLinearGradient>
          
          {/* Fire gradient (East) */}
          <SvgLinearGradient id="fireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="1" />
            <Stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
          </SvgLinearGradient>
          
          {/* Earth gradient (South) */}
          <SvgLinearGradient id="earthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FCD34D" stopOpacity="1" />
            <Stop offset="100%" stopColor="#F97316" stopOpacity="1" />
          </SvgLinearGradient>
          
          {/* Air gradient (West) */}
          <SvgLinearGradient id="airGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#9CA3AF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#60A5FA" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        {/* Outer ring - Elemental segments */}
        {/* North - Water (top) */}
        <Path
          d={`M ${center} ${center - radius} 
              A ${radius} ${radius} 0 0 1 ${center + radius} ${center}
              L ${center} ${center} Z`}
          fill="url(#waterGradient)"
        />
        
        {/* East - Fire (right) */}
        <Path
          d={`M ${center + radius} ${center}
              A ${radius} ${radius} 0 0 1 ${center} ${center + radius}
              L ${center} ${center} Z`}
          fill="url(#fireGradient)"
        />
        
        {/* South - Earth (bottom) */}
        <Path
          d={`M ${center} ${center + radius}
              A ${radius} ${radius} 0 0 1 ${center - radius} ${center}
              L ${center} ${center} Z`}
          fill="url(#earthGradient)"
        />
        
        {/* West - Air (left) */}
        <Path
          d={`M ${center - radius} ${center}
              A ${radius} ${radius} 0 0 1 ${center} ${center - radius}
              L ${center} ${center} Z`}
          fill="url(#airGradient)"
        />

        {/* Faint human figure outline (Vastu Purusha) */}
        <G opacity="0.15">
          {/* Head */}
          <Circle
            cx={center}
            cy={center - innerRadius + 40}
            r={innerRadius * 0.15}
            fill="none"
            stroke="#60A5FA"
            strokeWidth="1.5"
          />
          
          {/* Body/Torso */}
          <Path
            d={`M ${center} ${center - innerRadius + 60}
                Q ${center + innerRadius * 0.2} ${center - 20} ${center} ${center}
                Q ${center - innerRadius * 0.2} ${center - 20} ${center} ${center - innerRadius + 60} Z`}
            fill="none"
            stroke="#60A5FA"
            strokeWidth="1.5"
          />
          
          {/* Arms */}
          <Line
            x1={center - innerRadius * 0.25}
            y1={center - innerRadius * 0.3}
            x2={center - innerRadius * 0.4}
            y2={center - innerRadius * 0.1}
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <Line
            x1={center + innerRadius * 0.25}
            y1={center - innerRadius * 0.3}
            x2={center + innerRadius * 0.4}
            y2={center - innerRadius * 0.1}
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          
          {/* Legs (cross-legged position) */}
          <Path
            d={`M ${center - innerRadius * 0.15} ${center + innerRadius * 0.2}
                Q ${center - innerRadius * 0.3} ${center + innerRadius * 0.4} ${center - innerRadius * 0.2} ${center + innerRadius * 0.5}
                Q ${center} ${center + innerRadius * 0.45} ${center - innerRadius * 0.1} ${center + innerRadius * 0.35}`}
            fill="none"
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <Path
            d={`M ${center + innerRadius * 0.15} ${center + innerRadius * 0.2}
                Q ${center + innerRadius * 0.3} ${center + innerRadius * 0.4} ${center + innerRadius * 0.2} ${center + innerRadius * 0.5}
                Q ${center} ${center + innerRadius * 0.45} ${center + innerRadius * 0.1} ${center + innerRadius * 0.35}`}
            fill="none"
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </G>

        {/* Inner white circle */}
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="#FFFFFF"
          stroke="#E5E7EB"
          strokeWidth="2"
        />

        {/* Center Ether circle */}
        <Circle
          cx={center}
          cy={center}
          r={innerRadius - 30}
          fill="#FFFFFF"
          stroke="#D1D5DB"
          strokeWidth="2"
        />


        {/* Compass needle - 3D arrow design */}
        <Defs>
          {/* Red gradient for North arrow */}
          <SvgLinearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#8b1a1a" stopOpacity="1" />
            <Stop offset="50%" stopColor="#c62828" stopOpacity="1" />
            <Stop offset="100%" stopColor="#5a0f0f" stopOpacity="1" />
          </SvgLinearGradient>
          
          {/* Blue gradient for other arrows */}
          <SvgLinearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1a4d7a" stopOpacity="1" />
            <Stop offset="50%" stopColor="#2c5f8d" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0d3352" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        
        <G>
          {/* North arrow (Red/Dark red gradient) - 3D diamond shape */}
          <Path
            d={`M ${center} ${center} 
                L ${center - 8} ${center + 8} 
                L ${center} ${center - (innerRadius - 20)} 
                L ${center + 8} ${center + 8} Z`}
            fill="url(#redGrad)"
            stroke="#5a0f0f"
            strokeWidth="1"
            opacity="0.9"
          />
          
          {/* East arrow (Blue) - 3D diamond shape */}
          <Path
            d={`M ${center} ${center} 
                L ${center - 8} ${center - 8} 
                L ${center + (innerRadius - 20)} ${center} 
                L ${center - 8} ${center + 8} Z`}
            fill="url(#blueGrad)"
            stroke="#0d3352"
            strokeWidth="1"
            opacity="0.9"
          />
          
          {/* South arrow (Blue) - 3D diamond shape */}
          <Path
            d={`M ${center} ${center} 
                L ${center + 8} ${center - 8} 
                L ${center} ${center + (innerRadius - 20)} 
                L ${center - 8} ${center - 8} Z`}
            fill="url(#blueGrad)"
            stroke="#0d3352"
            strokeWidth="1"
            opacity="0.9"
          />
          
          {/* West arrow (Blue) - 3D diamond shape */}
          <Path
            d={`M ${center} ${center} 
                L ${center + 8} ${center + 8} 
                L ${center - (innerRadius - 20)} ${center} 
                L ${center + 8} ${center - 8} Z`}
            fill="url(#blueGrad)"
            stroke="#0d3352"
            strokeWidth="1"
            opacity="0.9"
          />
          
          {/* Center circle with metallic effect */}
          <Circle
            cx={center}
            cy={center}
            r={size * 0.05}
            fill="#4a4a4a"
            stroke="#2a2a2a"
            strokeWidth="1"
          />
          <Circle
            cx={center}
            cy={center}
            r={size * 0.035}
            fill="#6b6b6b"
          />
          <Circle
            cx={center}
            cy={center}
            r={size * 0.02}
            fill="#8a8a8a"
          />
          <Circle
            cx={center}
            cy={center}
            r={size * 0.01}
            fill="#a5a5a5"
          />
        </G>

        {/* Element labels */}
        {/* Water (North) */}
        <SvgText
          x={center}
          y={center - radius + 30}
          fontSize={size * 0.06}
          fontWeight="700"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          Water
        </SvgText>
        
        {/* Fire (East) */}
        <SvgText
          x={center + radius - 30}
          y={center}
          fontSize={size * 0.06}
          fontWeight="700"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          Fire
        </SvgText>
        
        {/* Earth (South) - upside down */}
        <SvgText
          x={center}
          y={center + radius - 20}
          fontSize={size * 0.06}
          fontWeight="700"
          fill="#FFFFFF"
          textAnchor="middle"
          transform={`rotate(180 ${center} ${center + radius - 20})`}
        >
          Earth
        </SvgText>
        
        {/* Air (West) - upside down */}
        <SvgText
          x={center - radius + 30}
          y={center}
          fontSize={size * 0.06}
          fontWeight="700"
          fill="#FFFFFF"
          textAnchor="middle"
          transform={`rotate(180 ${center - radius + 30} ${center})`}
        >
          Air
        </SvgText>

        {/* Direction labels (N, E, S, W) */}
        {CARDINAL_DIRECTIONS.map((dir, index) => {
          const pos = getDirectionPosition(index * 2, true);
          const isNorth = dir === 'N';
          
          return (
            <SvgText
              key={dir}
              x={pos.x}
              y={pos.y + 5}
              fontSize={size * 0.07}
              fontWeight="700"
              fill={isNorth ? "#EF4444" : "#1E3A8A"}
              textAnchor="middle"
            >
              {dir}
            </SvgText>
          );
        })}

        {/* Intermediate direction markers */}
        {DIRECTIONS.filter(dir => !CARDINAL_DIRECTIONS.includes(dir)).map((dir, index) => {
          const dirIndex = DIRECTIONS.indexOf(dir);
          const pos = getDirectionPosition(dirIndex);
          
          return (
            <SvgText
              key={dir}
              x={pos.x}
              y={pos.y + 4}
              fontSize={size * 0.04}
              fontWeight="600"
              fill="#374151"
              textAnchor="middle"
            >
              {dir}
            </SvgText>
          );
        })}

        {/* Watermark text - AppliedVastu.com */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = i * 45;
          const watermark = createWatermarkPath(angle);
          const rotation = angle - 90;
          
          return (
            <SvgText
              key={i}
              x={watermark.x}
              y={watermark.y}
              fontSize={size * 0.025}
              fill="#D1D5DB"
              textAnchor="middle"
              transform={`rotate(${rotation} ${watermark.x} ${watermark.y})`}
              opacity={0.4}
            >
              Vastu.com
            </SvgText>
          );
        })}

        {/* Center dot */}
        <Circle
          cx={center}
          cy={center}
          r={4}
          fill="#374151"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
