import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { RootStackParamList } from "../navigation";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import { TRIP_DAYS, RECOMMENDED_PLACES } from "../lib/mockData";

const { width } = Dimensions.get("window");

function ArrowBackIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke="#18181B"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShareIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.34448 15.0583 5.67534 15.1656 5.98227L8.83441 9.01773C8.42398 8.39701 7.75916 8 7 8C5.34315 8 4 9.34315 4 11C4 12.6569 5.34315 14 7 14C7.75916 14 8.42398 13.603 8.83441 12.9823L15.1656 16.0177C15.0583 16.3247 15 16.6555 15 17C15 18.6569 16.3431 20 18 20C19.6569 20 21 18.6569 21 17C21 15.3431 19.6569 14 18 14C17.2408 14 16.576 14.397 16.1656 15.0177L9.83441 11.9823C9.94172 11.6753 10 11.3445 10 11C10 10.6555 9.94172 10.3247 9.83441 10.0177L16.1656 6.98227C16.576 7.60299 17.2408 8 18 8Z"
        stroke="#18181B"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoreVertIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="2" fill="#18181B" />
      <Circle cx="12" cy="12" r="2" fill="#18181B" />
      <Circle cx="12" cy="19" r="2" fill="#18181B" />
    </Svg>
  );
}

function NavigationArrowIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11L21 2L12 20L10.5 13.5L3 11Z"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "TripTracking">;

export function TripTrackingScreen({ navigation }: Props) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedStopId, setSelectedStopId] = useState("stop-1");

  function handleTabPress(tab: TabType) {
    if (tab === "Home") {
      navigation.navigate("Dashboard");
    } else if (tab === "Search") {
      navigation.navigate("Search");
    } else if (tab === "Profile") {
      navigation.navigate("Auth");
    }
  }

  const currentDayData = TRIP_DAYS.find((d) => d.day === selectedDay) || TRIP_DAYS[0];
  const activeStop = currentDayData.stops.find((s) => s.id === selectedStopId) || currentDayData.stops[0];

  function handleStopPress(stop: (typeof currentDayData.stops)[0]) {
    setSelectedStopId(stop.id);
    const matchedPlace = RECOMMENDED_PLACES.find((p) => p.name.toLowerCase().includes("hidimba") || p.name.toLowerCase().includes("spiti")) || RECOMMENDED_PLACES[4];
    navigation.navigate("PlaceDetails", { place: matchedPlace });
  }

  function handleShare() {
    Alert.alert("Share Trip", "Share your Manali Trip itinerary with friends & co-travelers!");
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <ArrowBackIcon size={22} />
          </TouchableOpacity>
          <View style={styles.titleColumn}>
            <Text style={styles.tripTitle}>Manali Trip</Text>
            <Text style={styles.tripSubtitle}>4 Days • 12 Places</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>In Progress</Text>
          </View>
          <TouchableOpacity onPress={handleShare} style={styles.iconBtn} activeOpacity={0.7}>
            <ShareIcon size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <MoreVertIcon size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Day Selector Pills */}
      <View style={styles.daySelectorWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelectorRow}
        >
          {TRIP_DAYS.map((d) => {
            const isActive = selectedDay === d.day;
            return (
              <TouchableOpacity
                key={d.day}
                style={[styles.dayPill, isActive && styles.dayPillActive]}
                onPress={() => {
                  setSelectedDay(d.day);
                  setSelectedStopId(d.stops[0].id);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayPillText, isActive && styles.dayPillTextActive]}>
                  {d.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Illustrated 3D Route Map View */}
      <View style={styles.mapContainer}>
        <Image
          source={{ uri: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/route-map-manali.png" }}
          style={styles.mapImage}
          resizeMode="cover"
        />

        {/* Interactive Map Stop Overlay Pins */}
        <TouchableOpacity
          style={[styles.mapStopPin, { top: "14%", left: "32%" }]}
          onPress={() => setSelectedStopId("stop-1")}
          activeOpacity={0.85}
        >
          <View style={styles.pinBubble}>
            <Text style={styles.pinBubbleTitle}>Solang Valley</Text>
            <Text style={styles.pinBubbleTime}>9:00 AM</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mapStopPin, { top: "37%", left: "34%" }]}
          onPress={() => setSelectedStopId("stop-2")}
          activeOpacity={0.85}
        >
          <View style={styles.pinBubble}>
            <Text style={styles.pinBubbleTitle}>Atal Tunnel</Text>
            <Text style={styles.pinBubbleTime}>12:30 PM</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mapStopPin, { top: "54%", left: "26%" }]}
          onPress={() => setSelectedStopId("stop-3")}
          activeOpacity={0.85}
        >
          <View style={styles.pinBubble}>
            <Text style={styles.pinBubbleTitle}>Hidimba Temple</Text>
            <Text style={styles.pinBubbleTime}>3:00 PM</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mapStopPin, { top: "70%", left: "38%" }]}
          onPress={() => setSelectedStopId("stop-4")}
          activeOpacity={0.85}
        >
          <View style={styles.pinBubble}>
            <Text style={styles.pinBubbleTitle}>Mall Road</Text>
            <Text style={styles.pinBubbleTime}>6:30 PM</Text>
          </View>
        </TouchableOpacity>

        {/* Floating Navigation FAB */}
        <TouchableOpacity
          style={styles.navFab}
          onPress={() => Alert.alert("Start Navigation", "Live GPS turn-by-turn navigation starting to " + activeStop.name)}
          activeOpacity={0.88}
        >
          <NavigationArrowIcon size={22} />
        </TouchableOpacity>
      </View>

      {/* Active Stop Card Preview */}
      <TouchableOpacity
        style={styles.stopCard}
        onPress={() => handleStopPress(activeStop)}
        activeOpacity={0.88}
      >
        <Image
          source={{
            uri:
              activeStop.image ||
              "https://gomusafir.s3.us-east-1.amazonaws.com/ui/stop-solang.png",
          }}
          style={styles.stopImage}
          resizeMode="cover"
        />
        <View style={styles.stopContent}>
          <Text style={styles.stopName}>{activeStop.name}</Text>
          <Text style={styles.stopTime}>{activeStop.time}</Text>
          <Text style={styles.stopDescription} numberOfLines={2}>
            {activeStop.description}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <BottomTabBar activeTab="Trips" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  titleColumn: {
    justifyContent: "center",
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.3,
  },
  tripSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#71717A",
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "700",
  },
  iconBtn: {
    padding: 6,
  },
  daySelectorWrapper: {
    paddingBottom: 8,
  },
  daySelectorRow: {
    paddingHorizontal: 18,
    gap: 8,
  },
  dayPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
  },
  dayPillActive: {
    backgroundColor: "#EA6C1E",
    borderColor: "#EA6C1E",
  },
  dayPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  dayPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 18,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E4ECE5",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  mapStopPin: {
    position: "absolute",
  },
  pinBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  pinBubbleTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#18181B",
  },
  pinBubbleTime: {
    fontSize: 8.5,
    color: "#EA6C1E",
    fontWeight: "600",
  },
  navFab: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EA6C1E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EA6C1E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  stopCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  stopImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginRight: 12,
  },
  stopContent: {
    flex: 1,
  },
  stopName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#18181B",
  },
  stopTime: {
    fontSize: 11.5,
    color: "#71717A",
    fontWeight: "500",
    marginTop: 1,
    marginBottom: 2,
  },
  stopDescription: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 15,
  },
});
