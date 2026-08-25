import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { categoryColor, categoryIconPath } from "./categoryIcons";
import { colors } from "../theme";
import type { Poi } from "../lib/pois";

export function MapPin({ poi, detourLabel, onPress }: {
  poi: Poi;
  detourLabel?: string;
  onPress: () => void;
}) {
  const color = categoryColor(poi.category);
  return (
    <Animated.View entering={ZoomIn.springify().damping(12)}>
      <TouchableOpacity style={styles.pin} onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.icon, { backgroundColor: color }]}>
          <Svg viewBox="0 0 24 24" width={15} height={15}>
            <Path d={categoryIconPath(poi.category)} stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <View style={styles.card}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{poi.name}</Text>
            {detourLabel ? (
              <View style={styles.detourBadge}>
                <Text style={styles.detourText}>{detourLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.sub}>{poi.category.replace("_", " ")}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pin: { flexDirection: "row", alignItems: "center", gap: 7 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: colors.paper,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: { fontSize: 11, fontWeight: "700", color: colors.ink, maxWidth: 120 },
  detourBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: "#BFDBFE",
  },
  detourText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#2563EB",
  },
  sub: { fontSize: 9.5, color: colors.inkSoft, textTransform: "capitalize", marginTop: 1 },
});
