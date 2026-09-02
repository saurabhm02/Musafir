import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme";

interface Props {
  coordinates?: [number, number][];
  color?: string;
  isDashed?: boolean;
  width?: number;
  height?: number;
}

export function MiniRouteMap({
  coordinates = [],
  color = colors.success,
  isDashed = false,
  width = 90,
  height = 90,
}: Props) {
  if (!coordinates || coordinates.length < 2) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Svg width={width} height={height} viewBox="0 0 90 90" fill="none">
          <Rect width="90" height="90" rx="12" fill="#F4F5F4" />
          <Path
            d="M20 70 C35 50, 45 60, 55 35 C65 20, 70 30, 75 20"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={isDashed ? "4 4" : undefined}
          />
          <Circle cx="20" cy="70" r="4" fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
          <Circle cx="75" cy="20" r="4" fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
        </Svg>
      </View>
    );
  }

  // Calculate bounding box of coordinates
  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];

  for (const [lng, lat] of coordinates) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const dLng = maxLng - minLng || 0.001;
  const dLat = maxLat - minLat || 0.001;

  const pad = 14;
  const usableWidth = width - pad * 2;
  const usableHeight = height - pad * 2;

  // Project [lng, lat] to SVG (x, y)
  const points = coordinates.map(([lng, lat]) => {
    const x = pad + ((lng - minLng) / dLng) * usableWidth;
    const y = height - (pad + ((lat - minLat) / dLat) * usableHeight);
    return [x, y] as [number, number];
  });

  const pathD = points.reduce((acc, [x, y], idx) => {
    return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, "");

  const startPt = points[0];
  const endPt = points[points.length - 1];
  const midPt = points[Math.floor(points.length / 2)];

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
        <Rect width={width} height={height} rx="12" fill="#F4F6F4" />
        {/* Soft background terrain lines */}
        <Path
          d={`M0 ${height * 0.4} Q${width * 0.5} ${height * 0.3} ${width} ${height * 0.45}`}
          stroke="#E5EAE5"
          strokeWidth={1}
          fill="none"
        />
        <Path
          d={`M0 ${height * 0.7} Q${width * 0.5} ${height * 0.6} ${width} ${height * 0.75}`}
          stroke="#E5EAE5"
          strokeWidth={1}
          fill="none"
        />
        {/* Trail Path */}
        <Path
          d={pathD}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={isDashed ? "4 4" : undefined}
        />
        {/* Intermediate waypoint dot */}
        {midPt && <Circle cx={midPt[0]} cy={midPt[1]} r={2.5} fill={color} />}
        {/* Start Point */}
        <Circle cx={startPt[0]} cy={startPt[1]} r={4} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
        {/* End Point */}
        <Circle cx={endPt[0]} cy={endPt[1]} r={4} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F4F6F4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
});
