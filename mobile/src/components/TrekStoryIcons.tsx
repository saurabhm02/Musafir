import React from "react";
import Svg, { Circle, Path, Rect, G } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

export function BackArrowIcon({ size = 24, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareStoryIcon({ size = 20, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="18" cy="5" r="3" stroke={color} strokeWidth={2} />
      <Circle cx="6" cy="12" r="3" stroke={color} strokeWidth={2} />
      <Circle cx="18" cy="19" r="3" stroke={color} strokeWidth={2} />
      <Path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function MoreDotsIcon({ size = 20, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="1.5" fill={color} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      <Circle cx="12" cy="19" r="1.5" fill={color} />
    </Svg>
  );
}

export function ExpandMapIcon({ size = 18, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 3H21V9M21 3L14 10M9 21H3V15M3 21L10 14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PathDistanceIcon({ size = 18, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19L8 15L13 18L20 8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="20" cy="8" r="2" fill={color} />
      <Circle cx="4" cy="19" r="2" fill={color} />
    </Svg>
  );
}

export function ClockDurationIcon({ size = 18, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M12 7V12L15 15" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ElevGainIcon({ size = 18, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 20L10 8L15 14L18 9L21 20H3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M7 4V9M7 4L4 7M7 4L10 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ElevLossIcon({ size = 18, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 20L10 8L15 14L18 9L21 20H3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M7 9V4M7 9L4 6M7 9L10 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PeakAltitudeIcon({ size = 18, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L2 20H22L12 3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 3L8 13H16L12 3Z" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

export function SpeedGaugeIcon({ size = 18, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d="M12 12L16 8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="12" r="2" fill={color} />
    </Svg>
  );
}

export function WaypointPinIcon({ size = 18, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="9" r="2.5" fill={color} />
    </Svg>
  );
}

export function CameraBadgeIcon({ size = 14, color = "#FFFFFF" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
        fill={color}
      />
      <Circle cx="12" cy="13" r="4" fill="#18181B" />
    </Svg>
  );
}

export function GridViewIcon({ size = 20, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
      <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function FilterSlidersIcon({ size = 20, color = "#18181B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="4" cy="12" r="2" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="10" r="2" stroke={color} strokeWidth={2} />
      <Circle cx="20" cy="14" r="2" stroke={color} strokeWidth={2} />
    </Svg>
  );
}
