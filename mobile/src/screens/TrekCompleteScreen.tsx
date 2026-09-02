import React from "react";
import {
  Alert,
  Image,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Polygon, G } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { colors } from "../theme";
import {
  HikerIcon,
  MountainAltIcon,
  ElevationGainIcon,
  ShareIcon,
} from "../components/TrekTrackingIcons";
import { ClockIcon } from "../components/TransportIcons";

type Props = NativeStackScreenProps<RootStackParamList, "TrekComplete">;

function ArrowBackIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={colors.ink}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CelebrationSummitIcon({ size = 110 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Background circle glow */}
      <Circle cx="60" cy="60" r="54" fill="#FFF7ED" />
      <Circle cx="60" cy="60" r="42" fill="#FED7AA" opacity={0.35} />

      {/* Celebratory Sparks / Confetti */}
      <Circle cx="24" cy="30" r="2.5" fill={colors.accent} />
      <Circle cx="96" cy="32" r="2.5" fill={colors.accent} />
      <Circle cx="16" cy="62" r="2" fill="#F59E0B" />
      <Circle cx="104" cy="64" r="2" fill="#F59E0B" />
      <Circle cx="34" cy="18" r="2" fill={colors.success} />
      <Circle cx="86" cy="18" r="2" fill={colors.success} />
      <Path d="M28 22l4 4M92 22l-4 4" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />

      {/* Mountain Base & Summit */}
      <Polygon points="20,100 60,38 100,100" fill="#78716C" />
      <Polygon points="60,38 78,65 60,60 42,65" fill="#E7E5E4" />
      <Polygon points="45,100 60,38 75,100" fill="#57534E" />

      {/* Victory Flag Pole & Banner */}
      <Path d="M60 38V16" stroke="#1C1917" strokeWidth={2.5} strokeLinecap="round" />
      <Path
        d="M60 18c6-2 14 2 20-1v14c-6 3-14-1-20 1V18z"
        fill={colors.accent}
        stroke={colors.accent}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const SAMPLE_MEMORIES = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&auto=format&fit=crop&q=80",
];

export function TrekCompleteScreen({ route, navigation }: Props) {
  const {
    trekId,
    trekName = "Raghupur Fort Trek",
    sessionId,
    route: trekRoute,
    finalDistanceKm = 18.7,
    finalDurationText = "5h 42m",
    finalElevationGainM = 1864,
    highestAltitudeM = 3910,
    waypointsCovered = "6 / 6",
  } = route.params;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🏆 I just conquered ${trekName} (${finalDistanceKm} km in ${finalDurationText}) with Musafir! 🏔️`,
      });
    } catch {}
  };

  const handleAddToTrip = () => {
    Alert.alert("Added to Trip", `"${trekName}" has been successfully added to your trip log!`);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate("Home")}
          activeOpacity={0.75}
        >
          <ArrowBackIcon size={20} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Trek Complete</Text>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.75}>
          <ShareIcon size={20} color={colors.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Celebration Summit Card */}
        <View style={styles.celebrationCard}>
          <CelebrationSummitIcon size={115} />

          <Text style={styles.congratsTitle}>Congratulations!</Text>
          <Text style={styles.congratsSubtitle}>You've completed {trekName}</Text>

          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>
              {finalDistanceKm} km  •  {finalDurationText}
            </Text>
          </View>
        </View>

        {/* Metrics Card */}
        <View style={styles.metricsCard}>
          {/* Row 1: Distance */}
          <View style={styles.metricRow}>
            <View style={styles.metricIconWrap}>
              <HikerIcon size={18} color={colors.inkSoft} />
            </View>
            <Text style={styles.metricLabel}>Distance</Text>
            <Text style={styles.metricValue}>{finalDistanceKm} km</Text>
          </View>

          <View style={styles.divider} />

          {/* Row 2: Duration */}
          <View style={styles.metricRow}>
            <View style={styles.metricIconWrap}>
              <ClockIcon size={18} color={colors.inkSoft} />
            </View>
            <Text style={styles.metricLabel}>Duration</Text>
            <Text style={styles.metricValue}>{finalDurationText}</Text>
          </View>

          <View style={styles.divider} />

          {/* Row 3: Elevation Gain */}
          <View style={styles.metricRow}>
            <View style={styles.metricIconWrap}>
              <ElevationGainIcon size={18} color={colors.inkSoft} />
            </View>
            <Text style={styles.metricLabel}>Elevation Gain</Text>
            <Text style={styles.metricValue}>{finalElevationGainM.toLocaleString()} m</Text>
          </View>

          <View style={styles.divider} />

          {/* Row 4: Highest Altitude */}
          <View style={styles.metricRow}>
            <View style={styles.metricIconWrap}>
              <MountainAltIcon size={18} color={colors.inkSoft} />
            </View>
            <Text style={styles.metricLabel}>Highest Altitude</Text>
            <Text style={styles.metricValue}>{highestAltitudeM.toLocaleString()} m</Text>
          </View>

          <View style={styles.divider} />

          {/* Row 5: Waypoints Covered */}
          <View style={styles.metricRow}>
            <View style={styles.metaEmojiWrap}>
              <Text style={styles.metaEmoji}>📍</Text>
            </View>
            <Text style={styles.metricLabel}>Waypoints Covered</Text>
            <Text style={styles.metricValue}>{waypointsCovered}</Text>
          </View>
        </View>

        {/* Photos & Memories Gallery */}
        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>Trek Memories</Text>
          <View style={styles.photoRow}>
            {SAMPLE_MEMORIES.map((uri, idx) => (
              <View key={`mem-${idx}`} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoImg} resizeMode="cover" />
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            navigation.navigate("TrekStoryOverview", {
              sessionId,
              trekId,
              trekName,
              routeId: trekRoute?.id,
            })
          }
          activeOpacity={0.88}
        >
          <Text style={styles.primaryBtnText}>View My Trek Story</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleAddToTrip}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>Add to Trip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.navigate("Home")}
          activeOpacity={0.75}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  celebrationCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  congratsTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
    marginTop: 12,
  },
  congratsSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.inkSoft,
    marginTop: 3,
  },
  summaryPill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 10,
  },
  summaryPillText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.ink,
  },
  metricsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  metaEmojiWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  metaEmoji: {
    fontSize: 14,
  },
  metricLabel: {
    flex: 1,
    fontSize: 13.5,
    color: colors.inkSoft,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 10,
  },
  photosSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 10,
  },
  photoRow: {
    flexDirection: "row",
    gap: 10,
  },
  photoThumb: {
    flex: 1,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  photoImg: {
    width: "100%",
    height: "100%",
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  secondaryBtnText: {
    color: colors.ink,
    fontSize: 14.5,
    fontWeight: "700",
  },
  doneBtn: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    color: colors.inkSoft,
    fontSize: 14,
    fontWeight: "600",
  },
});
