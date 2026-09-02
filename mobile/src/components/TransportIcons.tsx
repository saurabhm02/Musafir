import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect, G } from "react-native-svg";
import { colors } from "../theme";
import type { TransportMode } from "../lib/journeys";

interface IconProps {
  size?: number;
  color?: string;
}

export function TrainIcon({ size = 18, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="3" width="16" height="15" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M4 11h16M12 3v8M8 19l-3 3M16 19l3 3M8 15h.01M16 15h.01" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BusIcon({ size = 18, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="3" width="16" height="15" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M4 9h16M7 19v2M17 19v2M7 15h.01M17 15h.01" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function FlightIcon({ size = 18, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        fill={color}
      />
    </Svg>
  );
}

export function CarIcon({ size = 18, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M3 11h18v6a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-1H8v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7.5" cy="14.5" r="1.5" fill={color} />
      <Circle cx="16.5" cy="14.5" r="1.5" fill={color} />
    </Svg>
  );
}

export function WalkIcon({ size = 18, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="13" cy="4" r="2" stroke={color} strokeWidth={2} />
      <Path
        d="M8 21l3-7 2 2v6M13 10l2-2 3 2M10 13l3-3-2-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LocalTransitIcon({ size = 18, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="16" height="14" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M4 10h16M9 18l-2 3M15 18l2 3M8 14h.01M16 14h.01" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ModeIcon({
  mode,
  size = 18,
  color = colors.ink,
}: {
  mode: TransportMode;
  size?: number;
  color?: string;
}) {
  switch (mode) {
    case "train":
      return <TrainIcon size={size} color={color} />;
    case "bus":
      return <BusIcon size={size} color={color} />;
    case "flight":
      return <FlightIcon size={size} color={color} />;
    case "cab":
      return <CarIcon size={size} color={color} />;
    case "walk":
      return <WalkIcon size={size} color={color} />;
    case "local_transit":
    default:
      return <CarIcon size={size} color={color} />;
  }
}

export function ClockIcon({ size = 16, color = colors.inkSoft }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
      <Path d="M12 7v5l3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function RupeeIcon({ size = 16, color = colors.inkSoft }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3h12M6 8h12M6 13l7 8M6 13h4a4 4 0 0 0 0-8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TargetGpsIcon({ size = 18, color = colors.accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="7" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="12" r="2.5" fill={color} />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ShieldIcon({ size = 18, color = colors.accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 8v4M12 16h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function MapIcon({ size = 18, color = "#FFFFFF" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 6v15l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v15M16 6v15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ExternalLinkIcon({ size = 16, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 18, color = colors.inkMuted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
