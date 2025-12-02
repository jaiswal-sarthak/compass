import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Path } from 'react-native-svg';

export default function Vastu32Compass({ size }) {
  const center = size / 2;
  const outerRadius = size / 2 - 20;
  const innerRadius = outerRadius * 0.79; // Approximately 300/380 ratio
  const labelRadius = outerRadius * 0.895; // Approximately 340/380 ratio

  // 32 directions with their names and colors (matching the HTML version exactly)
  const directions = [
    { name: "Indra", color: "#4a90e2" },
    { name: "Surya", color: "#e74c3c" },
    { name: "Satya", color: "#e74c3c" },
    { name: "Bhasha", color: "#27ae60" },
    { name: "Akash", color: "#f39c12" },
    { name: "Atul", color: "#f39c12" },
    { name: "Pusha", color: "#9b59b6" },
    { name: "Vitatha", color: "#e74c3c" },
    { name: "Grihrakshit", color: "#27ae60" },
    { name: "Yama", color: "#e74c3c" },
    { name: "Gandharv", color: "#f39c12" },
    { name: "Bhringraj", color: "#f39c12" },
    { name: "Mrita", color: "#3498db" },
    { name: "Pitr", color: "#3498db" },
    { name: "Dauvrik", color: "#27ae60" },
    { name: "Sugriva", color: "#3498db" },
    { name: "Varuna", color: "#3498db" },
    { name: "Asur", color: "#e74c3c" },
    { name: "Shosha", color: "#f39c12" },
    { name: "Papyaksma", color: "#27ae60" },
    { name: "Roga", color: "#9b59b6" },
    { name: "Naga", color: "#3498db" },
    { name: "Mukhya", color: "#3498db" },
    { name: "Bhallat", color: "#f39c12" },
    { name: "Soma", color: "#f39c12" },
    { name: "Bhujaga", color: "#27ae60" },
    { name: "Aditi", color: "#f39c12" },
    { name: "Diti", color: "#f39c12" },
    { name: "Shikhi", color: "#3498db" },
    { name: "Parjanya", color: "#27ae60" },
    { name: "Jayant", color: "#3498db" },
    { name: "Indra", color: "#4a90e2" }
  ];

  const segmentAngle = (Math.PI * 2) / 32;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Draw outer ring with segmented backgrounds and labels */}
        {directions.map((direction, i) => {
          const startAngle = i * segmentAngle - Math.PI / 2;
          const endAngle = (i + 1) * segmentAngle - Math.PI / 2;
          
          // Calculate arc path for segment
          const x1 = center + outerRadius * Math.cos(startAngle);
          const y1 = center + outerRadius * Math.sin(startAngle);
          const x2 = center + outerRadius * Math.cos(endAngle);
          const y2 = center + outerRadius * Math.sin(endAngle);
          const x3 = center + innerRadius * Math.cos(endAngle);
          const y3 = center + innerRadius * Math.sin(endAngle);
          const x4 = center + innerRadius * Math.cos(startAngle);
          const y4 = center + innerRadius * Math.sin(startAngle);
          
          const largeArcFlag = segmentAngle > Math.PI ? 1 : 0;
          
          const outerArc = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
          const lineToInner = `L ${x3} ${y3}`;
          const innerArc = `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`;
          const closePath = `Z`;
          const segmentPath = `${outerArc} ${lineToInner} ${innerArc} ${closePath}`;
          
          // Text position
          const midAngle = startAngle + segmentAngle / 2;
          const textX = center + labelRadius * Math.cos(midAngle);
          const textY = center + labelRadius * Math.sin(midAngle);
          
          return (
            <G key={`segment-${i}`}>
              {/* Segment background */}
              <Path
                d={segmentPath}
                fill="#fffacd"
                stroke="#666666"
                strokeWidth="1"
              />
              
              {/* Label text */}
              <SvgText
                x={textX}
                y={textY}
                fontSize={size * 0.022}
                fontWeight="bold"
                fill={direction.color}
                textAnchor="middle"
                transform={`rotate(${midAngle * 180 / Math.PI + 90} ${textX} ${textY})`}
              >
                {direction.name}
              </SvgText>
            </G>
          );
        })}

        {/* Draw inner circle */}
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          stroke="#8b7355"
          strokeWidth="3"
        />

        {/* Draw very thin radial lines from inner circle edge to center */}
        {Array.from({ length: 32 }).map((_, i) => {
          const angle = i * segmentAngle - Math.PI / 2;
          const x = center + innerRadius * Math.cos(angle);
          const y = center + innerRadius * Math.sin(angle);
          
          return (
            <Line
              key={`radial-${i}`}
              x1={x}
              y1={y}
              x2={center}
              y2={center}
              stroke="#e0e0e0"
              strokeWidth="0.5"
            />
          );
        })}

        {/* N label at the top */}
        <SvgText
          x={center}
          y={center - innerRadius + 20}
          fontSize={size * 0.035}
          fontWeight="bold"
          fill="#e74c3c"
          textAnchor="middle"
        >
          N
        </SvgText>

        {/* Draw North-South line - starts below N and ends above S */}
        <Line
          x1={center}
          y1={center - innerRadius + 30}
          x2={center}
          y2={center + innerRadius - 25}
          stroke="#e74c3c"
          strokeWidth="2"
        />

        {/* S label at the bottom */}
        <SvgText
          x={center}
          y={center + innerRadius - 10}
          fontSize={size * 0.035}
          fontWeight="bold"
          fill="#e74c3c"
          textAnchor="middle"
        >
          S
        </SvgText>

        {/* Draw center point */}
        <Circle
          cx={center}
          cy={center}
          r={5}
          fill="#333333"
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
