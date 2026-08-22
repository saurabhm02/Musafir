import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { categoryColor, categoryIconPath } from "./categoryIcons";
import { colors } from "../theme";



export function CategoryPin({ category, selected, onPress }: { category: string; selected?: boolean; onPress: () => void }) {
  const color = categoryColor(category);
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={[styles.pin, { backgroundColor: color }, selected && styles.pinSelected]}>
          <Svg viewBox="0 0 24 24" width={15} height={15}>
            <Path d={categoryIconPath(category)} stroke="#fff" strokeWidth={2.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ClusterBubble({ count, onPress }: { count: number; onPress: () => void }) {
  const size = count >= 200 ? 60 : count >= 50 ? 52 : count >= 10 ? 44 : 36;
  const bg = count >= 50 ? "#B23611" : count >= 10 ? colors.accent : "#F4B183";
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.cluster, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
          <Text style={styles.clusterText}>{count}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  pinSelected: { borderColor: colors.accent, borderWidth: 3, transform: [{ scale: 1.15 }] },
  cluster: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  clusterText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12.5 },
});
