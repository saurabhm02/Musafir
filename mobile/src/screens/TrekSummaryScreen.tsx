import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { fetchTrekSession, type TrekSession } from "../lib/trekTracker";
import {
  BackArrowIcon,
  ShareStoryIcon,
  PathDistanceIcon,
  ClockDurationIcon,
  ElevGainIcon,
  ElevLossIcon,
  PeakAltitudeIcon,
  SpeedGaugeIcon,
  WaypointPinIcon,
  CameraBadgeIcon,
} from "../components/TrekStoryIcons";
import { colors } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "TrekSummary">;

export function TrekSummaryScreen({ navigation, route }: Props) {
  const { sessionId, trekId, trekName: paramTrekName } = route.params;

  const [session, setSession] = useState<TrekSession | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (sessionId) {
          const s = await fetchTrekSession(sessionId);
          setSession(s);
        }
      } catch (err) {
        console.warn("Could not load trek session:", err);
      }
    })();
  }, [sessionId]);

  const trekName = session?.trekName || paramTrekName || "Raghupur Fort Trek";

  const distanceKm = session?.actualDistanceKm ? session.actualDistanceKm.toFixed(1) : "18.7";
  const durationSec = session?.actualDurationSec || 20520; // 5h 42m
  const hours = Math.floor(durationSec / 3600);
  const mins = Math.floor((durationSec % 3600) / 60);
  const movingTimeStr = `${hours}h ${mins}m`;
  const totalTimeStr = "6h 23m";
  const elevGain = session?.elevationGainM ? `+${Math.round(session.elevationGainM).toLocaleString()} m` : "+1,864 m";
  const elevLoss = session?.elevationLossM ? `-${Math.round(session.elevationLossM).toLocaleString()} m` : "-2,008 m";
  const highestAlt = session?.highestAltitudeM ? `${Math.round(session.highestAltitudeM).toLocaleString()} m` : "3,910 m";
  const lowestAlt = session?.lowestAltitudeM ? `${Math.round(session.lowestAltitudeM).toLocaleString()} m` : "3,120 m";
  const avgSpeed = "3.2 km/h";
  const waypointsCovered = "6 / 6";
  const memoriesCount = session?.memories?.length || 12;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🏆 I completed ${trekName} on Musafir! 🥾\nDistance: ${distanceKm} km • Time: ${movingTimeStr} • Elevation Gain: ${elevGain}\nWaypoints: ${waypointsCovered} covered.`,
        title: `${trekName} Story`,
      });
    } catch {}
  };

  const handleAddToTrip = () => {
    Alert.alert("Added to Trip", `${trekName} has been saved to your Musafir visited trips journal.`, [
      { text: "View Trips", onPress: () => navigation.navigate("Visited") },
      { text: "OK" },
    ]);
  };

  const handleDone = () => {
    navigation.navigate("Dashboard");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <BackArrowIcon size={22} color="#18181B" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Trek Summary</Text>

        <TouchableOpacity style={styles.headerBtn} onPress={handleShare} activeOpacity={0.7}>
          <ShareStoryIcon size={18} color="#18181B" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Trek Statistics Section */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Trek Statistics</Text>

          <View style={styles.statsCard}>
            {/* 1. Distance */}
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <PathDistanceIcon size={18} color="#71717A" />
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <Text style={styles.statValue}>{distanceKm} km</Text>
            </View>
            <View style={styles.statSeparator} />

            {/* 2. Moving Time */}
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <ClockDurationIcon size={18} color="#71717A" />
                <Text style={styles.statLabel}>Moving Time</Text>
              </View>
              <Text style={styles.statValue}>{movingTimeStr}</Text>
            </View>
            <View style={styles.statSeparator} />

            {/* 3. Total Time */}
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <ClockDurationIcon size={18} color="#71717A" />
                <Text style={styles.statLabel}>Total Time</Text>
              </View>
              <Text style={styles.statValue}>{totalTimeStr}</Text>
            </View>
            <View style={styles.statSeparator} />

            {/* 4. Elevation Gain */}
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <ElevGainIcon size={18} color="#71717A" />
                <Text style={styles.statLabel}>Elevation Gain</Text>
              </View>
              <Text style={styles.statValue}>{elevGain}</Text>
            </View>
            <View style={styles.statSeparator} />

            {/* 5. Elevation Loss */}
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <ElevLossIcon size={18} color="#71717A" />
                <Text style={styles.statLabel}>Elevation Loss</Text>
              </View>
              <Text style={styles.statValue}>{elevLoss}</Text>
            </View>
            <View style={styles.statSeparator} />

            {/* 6. Highest Altitude */}
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <PeakAltitudeIcon size={18} color="#71717A" />
                <Text style={styles.statLabel}>Highest Altitude</Text>
              </View>
              <Text style={styles.statValue}>{highestAlt}</Text>
            </View>
            <View style={styles.statSeparator} />

            {/* 7. Lowest Altitude */}
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <PeakAltitudeIcon size={18} color="#71717A" />
                <Text style={styles.statLabel}>Lowest Altitude</Text>
              </View>
              <Text style={styles.statValue}>{lowestAlt}</Text>
            </View>
            <View style={styles.statSeparator} />

            {/* 8. Average Speed */}
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <SpeedGaugeIcon size={18} color="#71717A" />
                <Text style={styles.statLabel}>Average Speed</Text>
              </View>
              <Text style={styles.statValue}>{avgSpeed}</Text>
            </View>
            <View style={styles.statSeparator} />

            {/* 9. Waypoints Covered */}
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <WaypointPinIcon size={18} color="#71717A" />
                <Text style={styles.statLabel}>Waypoints Covered</Text>
              </View>
              <Text style={styles.statValue}>{waypointsCovered}</Text>
            </View>
            <View style={styles.statSeparator} />

            {/* 10. Memories */}
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <CameraBadgeIcon size={18} color="#71717A" />
                <Text style={styles.statLabel}>Memories</Text>
              </View>
              <Text style={styles.statValue}>{memoriesCount}</Text>
            </View>
          </View>
        </View>

        {/* Your Achievement Card */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Your Achievement</Text>

          <View style={styles.achievementCard}>
            <View style={styles.achievementTextCol}>
              <Text style={styles.achievementPreTitle}>You completed</Text>
              <Text style={styles.achievementTrekName}>{trekName}</Text>
              <Text style={styles.achievementStats}>
                {distanceKm} km • {movingTimeStr}
              </Text>
              <Text style={styles.achievementWaypoints}>{waypointsCovered} waypoints</Text>
            </View>

            {/* Musafir Mascot / Summit Flag Graphic */}
            <View style={styles.mascotWrap}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=300&q=80",
                }}
                style={styles.mascotImage}
                resizeMode="cover"
              />
              <View style={styles.flagOverlay}>
                <Text style={{ fontSize: 24 }}>🚩</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsGroup}>
          <TouchableOpacity style={styles.primaryShareBtn} onPress={handleShare} activeOpacity={0.88}>
            <ShareStoryIcon size={18} color="#FFFFFF" />
            <Text style={styles.primaryShareBtnText}>Share Trek Story</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryTripBtn} onPress={handleAddToTrip} activeOpacity={0.8}>
            <Text style={styles.secondaryTripBtnText}>Add to Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.7}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F3",
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#18181B",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 10,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E3DE",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
  },
  statLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statLabel: {
    fontSize: 13,
    color: "#3F3F46",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#18181B",
  },
  statSeparator: {
    height: 1,
    backgroundColor: "#F4F4F5",
  },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  achievementTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  achievementPreTitle: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "600",
    marginBottom: 2,
  },
  achievementTrekName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181B",
    marginBottom: 4,
  },
  achievementStats: {
    fontSize: 12,
    color: "#78350F",
    fontWeight: "600",
    marginBottom: 2,
  },
  achievementWaypoints: {
    fontSize: 12,
    color: "#92400E",
  },
  mascotWrap: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#FEF3C7",
  },
  mascotImage: {
    width: "100%",
    height: "100%",
  },
  flagOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  actionsGroup: {
    marginTop: 8,
    gap: 10,
  },
  primaryShareBtn: {
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryShareBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryTripBtn: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E3DE",
  },
  secondaryTripBtnText: {
    color: "#18181B",
    fontSize: 14,
    fontWeight: "700",
  },
  doneBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  doneBtnText: {
    color: "#71717A",
    fontSize: 14,
    fontWeight: "600",
  },
});
