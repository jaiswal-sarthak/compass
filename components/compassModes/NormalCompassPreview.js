import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const CARDINAL_DIRECTIONS = ['N', 'E', 'S', 'W'];

export default function NormalCompassPreview({ size }) {
  const center = size / 2;
  const radius = size / 2 - 10;
  const innerRadius = radius - 25;

  const getDirectionPosition = (index, isCardinal = false) => {
    const angle = (index * 45 - 90) * (Math.PI / 180);
    const r = isCardinal ? radius - 10 : radius - 3;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      angle: index * 45,
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
          stroke="#F4C430"
          strokeWidth="2"
        />

        {/* Inner ring */}
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="#FFFFFF"
          stroke="#FFD700"
          strokeWidth="1.5"
        />

        {/* Center dot */}
        <Circle
          cx={center}
          cy={center}
          r={4}
          fill="#F4C430"
        />
        <Circle
          cx={center}
          cy={center}
          r={2}
          fill="#FFD700"
        />

        {/* Direction markers and labels */}
        {DIRECTIONS.map((dir, index) => {
          const pos = getDirectionPosition(index);
          const isCardinal = CARDINAL_DIRECTIONS.includes(dir);
          
          return (
            <G key={dir}>
              {/* Marker line */}
              <Line
                x1={center + (isCardinal ? innerRadius : innerRadius + 8) * Math.cos((pos.angle - 90) * Math.PI / 180)}
                y1={center + (isCardinal ? innerRadius : innerRadius + 8) * Math.sin((pos.angle - 90) * Math.PI / 180)}
                x2={center + (isCardinal ? radius - 3 : radius - 12) * Math.cos((pos.angle - 90) * Math.PI / 180)}
                y2={center + (isCardinal ? radius - 3 : radius - 12) * Math.sin((pos.angle - 90) * Math.PI / 180)}
                stroke={isCardinal ? "#B8860B" : "#DAA520"}
                strokeWidth={isCardinal ? 2 : 1}
              />
              
              {/* Label */}
              <SvgText
                x={pos.x}
                y={pos.y + 3}
                fontSize={isCardinal ? size * 0.12 : size * 0.08}
                fontWeight={isCardinal ? "bold" : "600"}
                fill={isCardinal ? "#B8860B" : "#8B7355"}
                textAnchor="middle"
              >
                {dir}
              </SvgText>
            </G>
          );
        })}

        {/* Simple compass needle */}
        <G>
          <Line
            x1={center}
            y1={center}
            x2={center}
            y2={center - (innerRadius - 10)}
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <Line
            x1={center}
            y1={center}
            x2={center}
            y2={center + (innerRadius - 10)}
            stroke="#1E3A8A"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <Line
            x1={center}
            y1={center}
            x2={center + (innerRadius - 10)}
            y2={center}
            stroke="#1E3A8A"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <Line
            x1={center}
            y1={center}
            x2={center - (innerRadius - 10)}
            y2={center}
            stroke="#1E3A8A"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </G>
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

