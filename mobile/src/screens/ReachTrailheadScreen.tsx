import React, { useEffect, useState } from "react";
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
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import {
  fetchDiscoverJourneys,
  type JourneyDiscoveryResult,
  type JourneyOption,
  type TransportMode,
} from "../lib/journeys";
import { colors } from "../theme";
import {
  ModeIcon,
  TargetGpsIcon,
  ShieldIcon,
  ChevronRightIcon,
} from "../components/TransportIcons";

type Props = NativeStackScreenProps<RootStackParamList, "ReachTrailhead">;

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

function BookmarkIcon({ size = 20, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
        stroke={colors.ink}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? colors.accent : "none"}
      />
    </Svg>
  );
}

function ModeSequence({ modes }: { modes: TransportMode[] }) {
  return (
    <View style={styles.modeSeqRow}>
      {modes.map((m, idx) => (
        <React.Fragment key={`mode-${idx}`}>
          <View style={styles.modeIconCircle}>
            <ModeIcon mode={m} size={15} color={colors.ink} />
          </View>
          {idx < modes.length - 1 && (
            <View style={styles.modeDotSeparator}>
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
            </View>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `~${h}h${m > 0 ? ` ${m}m` : ""}`;
}

export function ReachTrailheadScreen({ route, navigation }: Props) {
  const { trekId, trekName, routeId, trailheadName, heroPhotoUrl, region } = route.params;

  const [origin, setOrigin] = useState<{ lat: number; lon: number; label: string }>({
    lat: 21.3653,
    lon: 80.3752,
    label: "Amgaon, Maharashtra",
  });
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<JourneyDiscoveryResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const loadJourneys = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDiscoverJourneys({
        originLat: lat,
        originLon: lon,
        trekId,
        trekRouteId: routeId,
      });
      setDiscovery(data);
    } catch (err: any) {
      setError(err.message || "Failed to load journey options");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJourneys(origin.lat, origin.lon);
  }, [trekId, routeId]);

  const handleDetectGPS = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const lat = loc.coords.latitude;
        const lon = loc.coords.longitude;
        let label = "Current Location";
        try {
          const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
          if (rev && rev[0]) {
            label = [rev[0].city || rev[0].district, rev[0].region].filter(Boolean).join(", ") || "Current Location";
          }
        } catch {}
        setOrigin({ lat, lon, label });
        loadJourneys(lat, lon);
      }
    } catch {
      // Keep default origin
    } finally {
      setLocating(false);
    }
  };

  const handleSelectJourney = (journey: JourneyOption) => {
    if (!discovery) return;
    navigation.navigate("JourneyItinerary", {
      journey,
      trek: discovery.trek,
      trailhead: discovery.trailhead,
      origin: {
        lat: origin.lat,
        lon: origin.lon,
        name: origin.label,
      },
    });
  };

  const displayHero =
    heroPhotoUrl ||
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <ArrowBackIcon size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How to Reach Trailhead</Text>
        <TouchableOpacity
          style={styles.bookmarkBtn}
          onPress={() => setIsSaved((p: boolean) => !p)}
          activeOpacity={0.75}
        >
          <BookmarkIcon size={20} filled={isSaved} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Trek Hero Card */}
        <View style={styles.heroCard}>
          <Image source={{ uri: displayHero }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroGradientOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{trekName || "Raghupur Fort Trek"}</Text>
            <Text style={styles.heroSubtitle}>
              {trailheadName ? `${trailheadName}, ` : "Jalori Pass, "}
              {region || "Himachal Pradesh"}
            </Text>
          </View>
        </View>

        {/* From / To Route Box */}
        <View style={styles.fromToCard}>
          {/* From row */}
          <View style={styles.fromToRow}>
            <View style={styles.pinCircleGray}>
              <View style={styles.pinDotGray} />
            </View>
            <View style={styles.fromToTextCol}>
              <Text style={styles.fromToLabel}>From</Text>
              <Text style={styles.fromToValue} numberOfLines={1}>
                {origin.label}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleDetectGPS}
              activeOpacity={0.75}
              disabled={locating}
            >
              {locating ? <ActivityIndicator size="small" color={colors.accent} /> : <TargetGpsIcon size={18} />}
            </TouchableOpacity>
          </View>

          <View style={styles.fromToDivider}>
            <View style={styles.verticalTrackLine} />
          </View>

          {/* To row */}
          <View style={styles.fromToRow}>
            <View style={styles.pinCircleGreen}>
              <View style={styles.pinDotGreen} />
            </View>
            <View style={styles.fromToTextCol}>
              <Text style={styles.fromToLabel}>To (Trailhead)</Text>
              <Text style={styles.fromToValue} numberOfLines={1}>
                {trailheadName || discovery?.trailhead.name || "Jalori Pass"}
              </Text>
              <Text style={styles.fromToSubValue} numberOfLines={1}>
                {trekName || "Raghupur Fort"} Trailhead
              </Text>
            </View>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose a journey option</Text>
          <Text style={styles.sectionSubtitle}>Multiple ways to reach your trailhead</Text>
        </View>

        {/* Options State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Finding best transport combinations...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadJourneys(origin.lat, origin.lon)}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : discovery && discovery.journeys.length > 0 ? (
          <View style={styles.optionsList}>
            {discovery.journeys.map((item: JourneyOption) => {
              let badgeBg = colors.accentSoft;
              let badgeColor = colors.accent;

              if (item.strategy === "fastest") {
                badgeBg = "#FEE2E2";
                badgeColor = "#DC2626";
              } else if (item.strategy === "cheapest") {
                badgeBg = colors.successBg;
                badgeColor = colors.success;
              } else if (item.strategy === "train_focused") {
                badgeBg = colors.blueBg;
                badgeColor = colors.blue;
              }

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.optionCard}
                  onPress={() => handleSelectJourney(item)}
                  activeOpacity={0.88}
                >
                  {/* Card Header Row */}
                  <View style={styles.cardTopRow}>
                    <View style={[styles.badgePill, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.badgeText, { color: badgeColor }]}>{item.badge}</Text>
                    </View>

                    <View style={styles.priceCol}>
                      <Text style={styles.priceText}>₹ {item.totalCostInr.toLocaleString("en-IN")}</Text>
                      <Text style={styles.priceSubtext}>per person (est.)</Text>
                    </View>

                    <ChevronRightIcon size={18} color={colors.inkMuted} />
                  </View>

                  {/* Mode Sequence */}
                  <View style={styles.cardModesRow}>
                    <ModeSequence modes={item.primaryModes} />
                  </View>

                  {/* Metrics Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.metricsText}>
                      {formatDuration(item.totalDurationMins)}  •  {item.legs.length} Legs
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transport options found for this route</Text>
          </View>
        )}

        {/* Estimated Plan Warning Banner */}
        <View style={styles.noticeCard}>
          <ShieldIcon size={20} color={colors.accent} />
          <Text style={styles.noticeText}>
            This is an estimated plan. Verify schedules & prices with operators before you travel.
          </Text>
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
    height: 52,
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
  bookmarkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    height: 140,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    marginBottom: 14,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },
  heroContent: {
    position: "absolute",
    bottom: 14,
    left: 16,
    right: 16,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  fromToCard: {
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
  fromToRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pinCircleGray: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  pinDotGray: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.inkSoft,
  },
  pinCircleGreen: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
  },
  pinDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  fromToTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  fromToLabel: {
    fontSize: 11,
    color: colors.inkMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fromToValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 1,
  },
  fromToSubValue: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 1,
  },
  fromToDivider: {
    paddingLeft: 10,
    paddingVertical: 4,
  },
  verticalTrackLine: {
    width: 2,
    height: 18,
    backgroundColor: "#E5E7EB",
    borderRadius: 1,
  },
  gpsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: colors.inkSoft,
    marginTop: 2,
  },
  optionsList: {
    gap: 12,
    marginBottom: 20,
  },
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  priceCol: {
    flex: 1,
    alignItems: "flex-end",
    marginRight: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
  },
  priceSubtext: {
    fontSize: 10.5,
    color: colors.inkMuted,
    marginTop: 1,
  },
  cardModesRow: {
    marginBottom: 10,
  },
  modeSeqRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modeIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modeDotSeparator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    marginHorizontal: 6,
  },
  tinyDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D5DB",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F9FAFB",
    paddingTop: 8,
  },
  metricsText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 12,
  },
  errorContainer: {
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    color: colors.inkSoft,
  },
});
