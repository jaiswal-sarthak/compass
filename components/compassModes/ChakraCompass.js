import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Path } from 'react-native-svg';

export default function ChakraCompass({ size }) {
  const center = size /2;
  const outerRadius = size / 2 - 2; // Reduced margin to increase overall size
  const middleRadius = outerRadius * 0.72; // Increased from 0.70 to make rings bigger
  const innerRadius = outerRadius * 0.50; // Increased from 0.40 to make inner circle bigger

  // 32 outer directions
  const outerNames = [
    "Indra", "Surya", "Satya", "Bhasha", "Akash", "Atul", "Pusha", "Vitatha",
    "Grihrakshit", "Yama", "Gandharv", "Bhringraj", "Mrita", "Pitr", "Dauvrik", "Sugriva",
    "Varuna", "Asur", "Shosha", "Papyaksma", "Roga", "Naga", "Mukhya", "Bhallat",
    "Soma", "Bhujaga", "Aditi", "Diti", "Shikhi", "Parjanya", "Jayant", "Indra"
  ];

  // 8 middle sections
  const middleNames = [
    "Aapha Vasta", "Airyama", "Savitra", "Bram",
    "Vivasvam", "Indra", "Jaya", "Rudra Jaya"
  ];

  const segmentAngle32 = (Math.PI * 2) / 32;
  const segmentAngle8 = (Math.PI * 2) / 8;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Draw thin radial lines (32 lines from center to middleRadius) */}
        {Array.from({ length: 32 }).map((_, i) => {
          const angle = (i * 11.25 - 90) * (Math.PI / 180);
          return (
            <Line
              key={`radial-${i}`}
              x1={center}
              y1={center}
              x2={center + middleRadius * Math.cos(angle)}
              y2={center + middleRadius * Math.sin(angle)}
              stroke="#e0e0e0"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Draw cross lines (red, extending beyond outer radius) */}
        <Line
          x1={center}
          y1={center - outerRadius - 20}
          x2={center}
          y2={center + outerRadius + 20}
          stroke="#e74c3c"
          strokeWidth="2"
        />
        <Line
          x1={center - outerRadius - 20}
          y1={center}
          x2={center + outerRadius + 20}
          y2={center}
          stroke="#e74c3c"
          strokeWidth="2"
        />

        {/* Draw inner circle */}
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="#FFFFFF"
          stroke="#333333"
          strokeWidth="2"
        />

        {/* N label at the top of inner circle */}
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

        {/* Draw North-South line in inner circle - starts below N and ends above S */}
        <Line
          x1={center}
          y1={center - innerRadius + 30}
          x2={center}
          y2={center + innerRadius - 25}
          stroke="#e74c3c"
          strokeWidth="2"
        />

        {/* S label at the bottom of inner circle */}
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

        {/* Draw middle ring (8 segments) */}
        {Array.from({ length: 8 }).map((_, i) => {
          const startAngle = i * segmentAngle8 - Math.PI / 2;
          const endAngle = (i + 1) * segmentAngle8 - Math.PI / 2;
          
          // Calculate arc path for segment
          const x1 = center + middleRadius * Math.cos(startAngle);
          const y1 = center + middleRadius * Math.sin(startAngle);
          const x2 = center + middleRadius * Math.cos(endAngle);
          const y2 = center + middleRadius * Math.sin(endAngle);
          const x3 = center + innerRadius * Math.cos(endAngle);
          const y3 = center + innerRadius * Math.sin(endAngle);
          const x4 = center + innerRadius * Math.cos(startAngle);
          const y4 = center + innerRadius * Math.sin(startAngle);
          
          const largeArcFlag = segmentAngle8 > Math.PI ? 1 : 0;
          
          const outerArc = `M ${x1} ${y1} A ${middleRadius} ${middleRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
          const lineToInner = `L ${x3} ${y3}`;
          const innerArc = `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`;
          const closePath = `Z`;
          const segmentPath = `${outerArc} ${lineToInner} ${innerArc} ${closePath}`;
          
          // Text position
          const midAngle = startAngle + segmentAngle8 / 2;
          const textRadius = (middleRadius + innerRadius) / 2;
          const textX = center + textRadius * Math.cos(midAngle);
          const textY = center + textRadius * Math.sin(midAngle);
          
          return (
            <G key={`middle-segment-${i}`}>
              {/* Segment border */}
              <Path
                d={segmentPath}
                fill="none"
                stroke="#333333"
                strokeWidth="1.5"
              />
              
              {/* Label text */}
              <SvgText
                x={textX}
                y={textY}
                fontSize={size * 0.035}
                fontWeight="bold"
                fill="#e74c3c"
                textAnchor="middle"
                transform={`rotate(${midAngle * 180 / Math.PI + 90} ${textX} ${textY})`}
              >
                {middleNames[i]}
              </SvgText>
            </G>
          );
        })}

        {/* Draw outer ring (32 segments) */}
        {outerNames.map((name, i) => {
          const startAngle = i * segmentAngle32 - Math.PI / 2;
          const endAngle = (i + 1) * segmentAngle32 - Math.PI / 2;
          
          // Calculate arc path for segment
          const x1 = center + outerRadius * Math.cos(startAngle);
          const y1 = center + outerRadius * Math.sin(startAngle);
          const x2 = center + outerRadius * Math.cos(endAngle);
          const y2 = center + outerRadius * Math.sin(endAngle);
          const x3 = center + middleRadius * Math.cos(endAngle);
          const y3 = center + middleRadius * Math.sin(endAngle);
          const x4 = center + middleRadius * Math.cos(startAngle);
          const y4 = center + middleRadius * Math.sin(startAngle);
          
          const largeArcFlag = segmentAngle32 > Math.PI ? 1 : 0;
          
          const outerArc = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
          const lineToInner = `L ${x3} ${y3}`;
          const innerArc = `A ${middleRadius} ${middleRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`;
          const closePath = `Z`;
          const segmentPath = `${outerArc} ${lineToInner} ${innerArc} ${closePath}`;
          
          // Text position
          const midAngle = startAngle + segmentAngle32 / 2;
          const textRadius = (outerRadius + middleRadius) / 2;
          const textX = center + textRadius * Math.cos(midAngle);
          const textY = center + textRadius * Math.sin(midAngle);
          
          return (
            <G key={`outer-segment-${i}`}>
              {/* Segment border */}
              <Path
                d={segmentPath}
                fill="none"
                stroke="#333333"
                strokeWidth="1.5"
              />
              
              {/* Label text - horizontal */}
              <SvgText
                x={textX}
                y={textY}
                fontSize={size * 0.03}
                fontWeight="bold"
                fill="#e74c3c"
                textAnchor="middle"
              >
                {name}
              </SvgText>
            </G>
          );
        })}

        {/* Center point */}
        <Circle
          cx={center}
          cy={center}
          r={4}
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
