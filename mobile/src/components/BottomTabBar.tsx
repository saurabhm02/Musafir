import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme";

export type TabType = "Home" | "Explore" | "Musa" | "Trips" | "Profile";

interface Props {
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
  onCenterPress?: () => void;
}

const ACCENT_COLOR = colors.accent || "#E24E1B";
const INACTIVE_COLOR = "#9CA3AF";

function HomeIcon({ active }: { active: boolean }) {
  const color = active ? ACCENT_COLOR : INACTIVE_COLOR;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? color + "18" : "none"}
      />
      <Path d="M9 21V12H15V21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  const color = active ? ACCENT_COLOR : INACTIVE_COLOR;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2.2} />
      <Path d="M20 20L16 16" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function MusaPawIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 11.5C9.5 11.5 7.5 13.8 7.5 16.5C7.5 18.7 9.2 20.5 12 20.5C14.8 20.5 16.5 18.7 16.5 16.5C16.5 13.8 14.5 11.5 12 11.5Z"
        fill="#FFFFFF"
      />
      <Circle cx="6.5" cy="10.5" r="2.2" fill="#FFFFFF" />
      <Circle cx="10" cy="7.2" r="2.2" fill="#FFFFFF" />
      <Circle cx="14" cy="7.2" r="2.2" fill="#FFFFFF" />
      <Circle cx="17.5" cy="10.5" r="2.2" fill="#FFFFFF" />
    </Svg>
  );
}

function TripsIcon({ active }: { active: boolean }) {
  const color = active ? ACCENT_COLOR : INACTIVE_COLOR;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="6" width="16" height="15" rx="3" stroke={color} strokeWidth={2} fill={active ? color + "18" : "none"} />
      <Path d="M9 6V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4 11H20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const color = active ? ACCENT_COLOR : INACTIVE_COLOR;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? color + "18" : "none"}
      />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BottomTabBar({ activeTab, onTabPress, onCenterPress }: Props) {
  const insets = useSafeAreaInsets();
  const bottomMargin = Math.max(12, insets.bottom > 0 ? insets.bottom : 12);

  const handleMusaPress = () => {
    if (onCenterPress) {
      onCenterPress();
    } else {
      onTabPress("Musa");
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.floatingContainer,
        {
          bottom: bottomMargin,
        },
      ]}
    >
      <View style={styles.bar}>
        {/* Home Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabPress("Home")}
          activeOpacity={0.75}
        >
          <HomeIcon active={activeTab === "Home"} />
          <Text style={[styles.tabLabel, activeTab === "Home" && styles.tabLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Explore Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabPress("Explore")}
          activeOpacity={0.75}
        >
          <SearchIcon active={activeTab === "Explore"} />
          <Text style={[styles.tabLabel, activeTab === "Explore" && styles.tabLabelActive]}>
            Explore
          </Text>
        </TouchableOpacity>

        {/* Musa Center Action Button */}
        <View style={styles.centerSlot}>
          <TouchableOpacity
            style={styles.centerBtn}
            onPress={handleMusaPress}
            activeOpacity={0.88}
          >
            <MusaPawIcon />
          </TouchableOpacity>
          <Text style={[styles.tabLabel, styles.musaLabel, activeTab === "Musa" && styles.tabLabelActive]}>
            Musa
          </Text>
        </View>

        {/* Trips Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabPress("Trips")}
          activeOpacity={0.75}
        >
          <TripsIcon active={activeTab === "Trips"} />
          <Text style={[styles.tabLabel, activeTab === "Trips" && styles.tabLabelActive]}>
            Trips
          </Text>
        </TouchableOpacity>

        {/* Profile Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabPress("Profile")}
          activeOpacity={0.75}
        >
          <ProfileIcon active={activeTab === "Profile"} />
          <Text style={[styles.tabLabel, activeTab === "Profile" && styles.tabLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  bar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    height: 64,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(201, 185, 143, 0.25)",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      default: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  tabLabelActive: {
    color: colors.accent || "#E24E1B",
    fontWeight: "700",
  },
  centerSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerBtn: {
    position: "absolute",
    top: -24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent || "#E24E1B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: colors.accent || "#E24E1B",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 10,
      },
      android: {
        elevation: 9,
      },
      default: {
        shadowColor: colors.accent || "#E24E1B",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 10,
      },
    }),
  },
  musaLabel: {
    marginTop: 26,
  },
});
