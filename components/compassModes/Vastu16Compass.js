import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Path } from 'react-native-svg';

const VASTU_16_DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW'
];

const VASTU_ZONES = [
  'Ishaan', 'Pitru', 'Agni', 'Indra',
  'Vayu', 'Nairutya', 'Varun', 'Soma',
  'Brahma', 'Jaya', 'Satya', 'Vishnu',
  'Rudra', 'Gandharva', 'Pusha', 'Aditi'
];

export default function Vastu16Compass({ size }) {
  const center = size / 2;
  const radius = size / 2 - 20;
  const innerRadius = radius - 40;

  const getPosition = (index) => {
    const angle = (index * 22.5 - 90) * (Math.PI / 180);
    return {
      x: center + (radius - 10) * Math.cos(angle),
      y: center + (radius - 10) * Math.sin(angle),
      angle: index * 22.5,
    };
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Outer ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="#FFF8E1"
          stroke="#FF9933"
          strokeWidth="3"
        />

        {/* 16 division lines */}
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i * 22.5 - 90) * (Math.PI / 180);
          const isMajor = i % 4 === 0;
          return (
            <Line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke={isMajor ? "#FF8C00" : "#FFE4B5"}
              strokeWidth={isMajor ? 2.5 : 1.5}
              opacity={isMajor ? 0.8 : 0.5}
            />
          );
        })}

        {/* Inner circle */}
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="#FFFFFF"
          stroke="#F4C430"
          strokeWidth="2.5"
        />

        {/* Center dot */}
        <Circle
          cx={center}
          cy={center}
          r={8}
          fill="#FF9933"
        />
        <Circle
          cx={center}
          cy={center}
          r={4}
          fill="#FFD700"
        />

        {/* Direction labels */}
        {VASTU_16_DIRECTIONS.map((dir, index) => {
          const pos = getPosition(index);
          const isCardinal = ['N', 'E', 'S', 'W'].includes(dir);
          
          return (
            <G key={dir}>
              <SvgText
                x={pos.x}
                y={pos.y + 5}
                fontSize={isCardinal ? 16 : 11}
                fontWeight={isCardinal ? "bold" : "normal"}
                fill={isCardinal ? "#B8860B" : "#8B7355"}
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {dir}
              </SvgText>
            </G>
          );
        })}

        {/* Vastu zone labels (inner) */}
        {VASTU_ZONES.map((zone, index) => {
          const angle = (index * 22.5 - 90) * (Math.PI / 180);
          const x = center + (innerRadius - 20) * Math.cos(angle);
          const y = center + (innerRadius - 20) * Math.sin(angle);
          
          return (
            <SvgText
              key={zone}
              x={x}
              y={y}
              fontSize={9}
              fill="#DAA520"
              fontWeight="600"
              textAnchor="middle"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {zone.substring(0, 3)}
            </SvgText>
          );
        })}
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

