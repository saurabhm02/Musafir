import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { colors } from "../theme";


export function BottomSheet({ visible, children }: { visible: boolean; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(visible ? 0 : 260, { damping: 18, stiffness: 180 }) }],
  }));

  return (
    <Animated.View style={[styles.sheet, style]}>
      <View style={styles.handle} />
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    borderColor: colors.ink,
    padding: 22,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.line,
    alignSelf: "center",
    marginBottom: 14,
  },
});
