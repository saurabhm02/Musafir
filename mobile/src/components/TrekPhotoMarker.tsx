import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { colors } from "../theme";

interface Props {
  photoUrl?: string | null;
  count?: number;
  isPrivate?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
}

export function TrekPhotoMarker({
  photoUrl,
  count = 1,
  isPrivate = false,
  isSelected = false,
}: Props) {
  const fallbackUrl = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80";

  return (
    <View style={styles.container}>
      {/* Outer Glow / Active Ring */}
      <View
        style={[
          styles.bubbleWrap,
          isSelected && styles.bubbleSelected,
          isPrivate && styles.bubblePrivate,
        ]}
      >
        <Image
          source={{ uri: photoUrl || fallbackUrl }}
          style={styles.photo}
          resizeMode="cover"
        />

        {/* Count Badge for Clustered Photos */}
        {count > 1 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        )}

        {/* Lock Badge for Private Photos */}
        {isPrivate && (
          <View style={styles.lockBadge}>
            <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
              <Rect x="3" y="11" width="18" height="11" rx="2" stroke="#FFFFFF" strokeWidth={3} />
              <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#FFFFFF" strokeWidth={3} />
            </Svg>
          </View>
        )}
      </View>

      {/* Triangular Pointer Stem */}
      <View
        style={[
          styles.trianglePointer,
          isSelected && { borderTopColor: colors.accent },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: 54,
    height: 60,
  },
  bubbleWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    overflow: "visible",
    position: "relative",
  },
  bubbleSelected: {
    borderColor: colors.accent,
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  bubblePrivate: {
    borderColor: "#71717A",
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#18181B",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
  },
  lockBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#71717A",
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  trianglePointer: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 0,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FFFFFF",
    marginTop: -1,
  },
});
