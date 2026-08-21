import Svg, { Polygon, Polyline } from "react-native-svg";
import { colors } from "../theme";

const WIDTH = 118;
const HEIGHT = 34;

export function ElevationSparkline({ samples }: { samples: number[] }) {
  if (samples.length < 2) return null;

  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = max - min || 1;
  const points = samples.map((v, i) => {
    const x = (i / (samples.length - 1)) * WIDTH;
    const y = HEIGHT - ((v - min) / range) * HEIGHT;
    return `${x},${y}`;
  });

  return (
    <Svg width={WIDTH} height={HEIGHT}>
      <Polygon points={`0,${HEIGHT} ${points.join(" ")} ${WIDTH},${HEIGHT}`} fill={colors.accent} fillOpacity={0.15} />
      <Polyline points={points.join(" ")} fill="none" stroke={colors.accent} strokeWidth={1.6} />
    </Svg>
  );
}
