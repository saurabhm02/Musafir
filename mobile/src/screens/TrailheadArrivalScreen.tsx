import React, { useEffect, useState } from "react";
import {
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
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import type { TrekRouteItem } from "../lib/treks";
import { colors } from "../theme";
import {
  HikerIcon,
  MountainAltIcon,
  CheckmarkCircleIcon,
  ElevationGainIcon,
} from "../components/TrekTrackingIcons";

type Props = NativeStackScreenProps<RootStackParamList, "TrailheadArrival">;

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

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function TrailheadArrivalScreen({ route, navigation }: Props) {
  const {
    trekId,
    trekName,
    route: trekRoute,
    trailheadName = "Jalori Pass",
    trailheadLat = 31.5348,
    trailheadLon = 77.378,
    altitudeM = 3120,
    forceArrival = false,
  } = route.params;

  const [distanceM, setDistanceM] = useState<number>(forceArrival ? 120 : 2400);
  const [isAtTrailhead, setIsAtTrailhead] = useState<boolean>(forceArrival);

  useEffect(() => {
    if (forceArrival) {
      setIsAtTrailhead(true);
      setDistanceM(120);
      return;
    }

    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then((loc) => {
        const dist = haversineMeters(
          loc.coords.latitude,
          loc.coords.longitude,
          trailheadLat,
          trailheadLon
        );
        setDistanceM(Math.round(dist));
        setIsAtTrailhead(dist <= 500);
      })
      .catch(() => {
        // Fallback simulated proximity
        setIsAtTrailhead(true);
        setDistanceM(120);
      });
  }, [trailheadLat, trailheadLon, forceArrival]);

  const handleStartTrek = () => {
    navigation.navigate("StartTrekConfirm", {
      trekId,
      trekName,
      route: trekRoute,
      trailheadName,
      trailheadLat,
      trailheadLon,
    });
  };

  const handleDirections = () => {
    navigation.navigate("TrailheadDirections", {
      trekId,
      trekName,
      route: trekRoute,
      trailheadName,
      trailheadLat,
      trailheadLon,
      distanceM,
    });
  };

  const heroImageUri =
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80";

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
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Title Header */}
        <View style={styles.titleSection}>
          <View style={styles.tagRow}>
            <Text style={styles.tagText}>You've reached</Text>
            <View style={styles.tagPill}>
              <Text style={styles.tagPillEmoji}>📍</Text>
            </View>
          </View>
          <Text style={styles.mainTitle}>{trailheadName} Trailhead</Text>
          <Text style={styles.subTitle}>{trekName}</Text>
        </View>

        {/* Hero Image */}
        <View style={styles.heroCard}>
          <Image source={{ uri: heroImageUri }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.altitudeBadge}>
            <Text style={styles.altitudeBadgeText}>ALT. {altitudeM} M</Text>
          </View>
        </View>

        {/* Arrival Status Banner */}
        {isAtTrailhead ? (
          <View style={styles.successBanner}>
            <CheckmarkCircleIcon size={26} color={colors.success} />
            <View style={styles.successTextCol}>
              <Text style={styles.successTitle}>You're at the trailhead!</Text>
              <Text style={styles.successSubtitle}>
                Great! You've reached the starting point of your trek.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.proximityBanner}>
            <View style={styles.proximityDot} />
            <View style={styles.successTextCol}>
              <Text style={styles.proximityTitle}>
                You're {(distanceM / 1000).toFixed(1)} km away from Trailhead
              </Text>
              <Text style={styles.proximitySubtitle}>
                Follow directions to reach the trailhead starting point.
              </Text>
            </View>
          </View>
        )}

        {/* Meta Info Rows */}
        <View style={styles.metaCard}>
          {/* Row 1: Trailhead Location */}
          <View style={styles.metaRow}>
            <View style={styles.metaIconWrap}>
              <Text style={styles.metaEmoji}>📍</Text>
            </View>
            <View style={styles.metaTextCol}>
              <Text style={styles.metaLabel}>Trailhead Location</Text>
              <Text style={styles.metaValue}>{trailheadName}, Himachal Pradesh</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 2: Altitude */}
          <View style={styles.metaRow}>
            <View style={styles.metaIconWrap}>
              <MountainAltIcon size={18} color={colors.inkSoft} />
            </View>
            <View style={styles.metaTextCol}>
              <Text style={styles.metaLabel}>Altitude</Text>
              <Text style={styles.metaValue}>{altitudeM.toLocaleString()} m</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 3: Distance from location */}
          <View style={styles.metaRow}>
            <View style={styles.metaIconWrap}>
              <Text style={styles.metaEmoji}>🧭</Text>
            </View>
            <View style={styles.metaTextCol}>
              <Text style={styles.metaLabel}>Distance from your location</Text>
              <Text style={[styles.metaValue, isAtTrailhead && styles.greenText]}>
                {isAtTrailhead ? `${distanceM} m` : `${(distanceM / 1000).toFixed(1)} km`}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 4: Route */}
          <View style={styles.metaRow}>
            <View style={styles.metaIconWrap}>
              <ElevationGainIcon size={18} color={colors.inkSoft} />
            </View>
            <View style={styles.metaTextCol}>
              <Text style={styles.metaLabel}>Route</Text>
              <Text style={styles.metaValue}>{trekRoute?.name || `${trekName} (Official Route)`}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {isAtTrailhead ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleStartTrek}
            activeOpacity={0.88}
          >
            <HikerIcon size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Start Trek</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleDirections}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Continue to Trailhead</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate("TrekDetails", { trekIdOrSlug: trekId })}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>View Trek Details</Text>
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
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  titleSection: {
    marginBottom: 16,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
  },
  tagPill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  tagPillEmoji: {
    fontSize: 10,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  subTitle: {
    fontSize: 14,
    color: colors.inkSoft,
    fontWeight: "500",
    marginTop: 2,
  },
  heroCard: {
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    marginBottom: 16,
    backgroundColor: "#E5E7EB",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  altitudeBadge: {
    position: "absolute",
    bottom: 12,
    left: 14,
    backgroundColor: "rgba(24, 24, 27, 0.82)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  altitudeBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    gap: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  successTextCol: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.ink,
  },
  successSubtitle: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
    lineHeight: 16,
  },
  proximityBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
    gap: 12,
    marginBottom: 16,
  },
  proximityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  proximityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  proximitySubtitle: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  metaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  metaEmoji: {
    fontSize: 14,
  },
  metaTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.inkMuted,
    fontWeight: "500",
  },
  metaValue: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 1,
  },
  greenText: {
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 10,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
  },
  secondaryBtnText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
});
