import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { startTrekSession } from "../lib/trekTracker";
import { colors } from "../theme";
import {
  HikerIcon,
  ElevationGainIcon,
  FlagIcon,
} from "../components/TrekTrackingIcons";
import { ClockIcon, ShieldIcon } from "../components/TransportIcons";

type Props = NativeStackScreenProps<RootStackParamList, "StartTrekConfirm">;

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

function DifficultyIcon({ size = 20, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19h16M4 15l4-4 4 4 8-8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StartTrekConfirmScreen({ route, navigation }: Props) {
  const { trekId, trekName, route: trekRoute, trailheadName, trailheadLat, trailheadLon } = route.params;
  const [isStarting, setIsStarting] = useState(false);

  const handleStartTrekking = async () => {
    try {
      setIsStarting(true);
      const session = await startTrekSession({
        trekId,
        trekRouteId: trekRoute?.id,
        startLat: trailheadLat,
        startLon: trailheadLon,
      });

      navigation.navigate("LiveTrekTracking", {
        trekId,
        trekName,
        route: trekRoute,
        trailheadName,
        trailheadLat,
        trailheadLon,
        sessionId: session.id,
      });
    } catch (err: any) {
      // If error (e.g. offline initial attempt), still proceed with offline session
      navigation.navigate("LiveTrekTracking", {
        trekId,
        trekName,
        route: trekRoute,
        trailheadName,
        trailheadLat,
        trailheadLon,
      });
    } finally {
      setIsStarting(false);
    }
  };

  const heroImageUri =
    "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&auto=format&fit=crop&q=80";

  const distKm = trekRoute?.distanceKm ? `${trekRoute.distanceKm} km` : "18.6 km";
  const elevGain = trekRoute?.elevationGainM ? `${trekRoute.elevationGainM} m` : "1,864 m";
  const routeTitle = trekRoute?.name || `${trekName} (Official Route)`;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <ArrowBackIcon size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ready to Start?</Text>
        <View style={styles.placeholderBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Photo Card */}
        <View style={styles.heroCard}>
          <Image source={{ uri: heroImageUri }} style={styles.heroImage} resizeMode="cover" />
        </View>

        {/* Heading */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Ready to start your adventure?</Text>
          <Text style={styles.subTitle}>
            Once you start, your trek will be tracked in real-time.
          </Text>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          {/* Row 1: Trek & Route */}
          <View style={styles.detailRow}>
            <View style={styles.iconWrap}>
              <FlagIcon size={18} color={colors.accent} />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailTitle}>{trekName}</Text>
              <Text style={styles.detailSubtitle}>
                {routeTitle} • <Text style={styles.verifiedText}>Verified</Text>
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 2: Distance */}
          <View style={styles.detailRow}>
            <View style={styles.iconWrap}>
              <HikerIcon size={18} color={colors.inkSoft} />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Distance</Text>
              <Text style={styles.detailValue}>{distKm}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 3: Difficulty */}
          <View style={styles.detailRow}>
            <View style={styles.iconWrap}>
              <DifficultyIcon size={18} color={colors.inkSoft} />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Difficulty</Text>
              <Text style={styles.detailValue}>Moderate</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 4: Estimated Time */}
          <View style={styles.detailRow}>
            <View style={styles.iconWrap}>
              <ClockIcon size={18} color={colors.inkSoft} />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Estimated Time</Text>
              <Text style={styles.detailValue}>6 – 7 hrs</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 5: Total Elevation Gain */}
          <View style={styles.detailRow}>
            <View style={styles.iconWrap}>
              <ElevationGainIcon size={18} color={colors.inkSoft} />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Total Elevation Gain</Text>
              <Text style={styles.detailValue}>{elevGain}</Text>
            </View>
          </View>
        </View>

        {/* Safety Note Card */}
        <View style={styles.safetyCard}>
          <ShieldIcon size={20} color={colors.accent} />
          <Text style={styles.safetyText}>
            Your location will be used to track your trek and ensure your safety.
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleStartTrekking}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryBtnText}>▶  Start Trekking</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
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
  placeholderBtn: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  heroCard: {
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#E5E7EB",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  titleSection: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 13.5,
    color: colors.inkSoft,
    marginTop: 4,
    lineHeight: 18,
  },
  detailsCard: {
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
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  detailTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  detailTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.ink,
  },
  detailSubtitle: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  verifiedText: {
    color: colors.success,
    fontWeight: "600",
  },
  detailLabel: {
    fontSize: 11,
    color: colors.inkMuted,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 10,
  },
  safetyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    gap: 12,
    marginBottom: 20,
  },
  safetyText: {
    flex: 1,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 16,
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
  cancelBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: colors.inkSoft,
    fontSize: 14,
    fontWeight: "600",
  },
});
