import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import {
  Map as MapView,
  Camera,
  GeoJSONSource,
  Layer,
  Marker,
} from "@maplibre/maplibre-react-native";
import type { RootStackParamList } from "../navigation";
import { fetchTrekSession, type TrekSession } from "../lib/trekTracker";
import {
  BackArrowIcon,
  ShareStoryIcon,
  MoreDotsIcon,
  ExpandMapIcon,
  PathDistanceIcon,
  ClockDurationIcon,
  ElevGainIcon,
  PeakAltitudeIcon,
  CameraBadgeIcon,
} from "../components/TrekStoryIcons";
import { colors } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Props = NativeStackScreenProps<RootStackParamList, "TrekStoryOverview">;

export function TrekStoryOverviewScreen({ navigation, route }: Props) {
  const {
    sessionId,
    trekId,
    trekName: paramTrekName,
    routeId,
  } = route.params;

  const [session, setSession] = useState<TrekSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (sessionId) {
          const data = await fetchTrekSession(sessionId);
          setSession(data);
        }
      } catch (err) {
        console.warn("Could not load trek session:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const trekName = session?.trekName || paramTrekName || "Raghupur Fort Trek";
  const startTrailhead = "Jalori Pass";
  const endDestination = "Raghupur Fort";
  const trailSubtitle = `${startTrailhead} → ${endDestination}`;
  const trekDate = session?.completedAt
    ? new Date(session.completedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "24 Aug 2026";

  const distanceKm = session?.actualDistanceKm ? session.actualDistanceKm.toFixed(1) : "18.7";
  const durationSec = session?.actualDurationSec || 20520; // 5h 42m fallback
  const hours = Math.floor(durationSec / 3600);
  const mins = Math.floor((durationSec % 3600) / 60);
  const durationStr = `${hours}h ${mins}m`;
  const elevGain = session?.elevationGainM ? `+${Math.round(session.elevationGainM).toLocaleString()} m` : "+1,864 m";
  const highestAlt = session?.highestAltitudeM ? `${Math.round(session.highestAltitudeM).toLocaleString()} m` : "3,910 m";

  // Coordinates for mini map
  const fallbackPoints: [number, number][] = [
    [77.378, 31.5348],
    [77.377, 31.536],
    [77.376, 31.537],
    [77.3745, 31.5385],
    [77.372, 31.541],
  ];

  const actualCoordinates: [number, number][] = useMemo(() => {
    if (session?.geometry?.coordinates?.length) {
      return session.geometry.coordinates;
    }
    if (session?.points?.length) {
      return session.points.map((p) => [p.lon, p.lat]);
    }
    return fallbackPoints;
  }, [session]);

  const miniGeoJSON = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: actualCoordinates,
          },
          properties: {},
        },
      ],
    };
  }, [actualCoordinates]);

  const centerCoord = actualCoordinates[Math.floor(actualCoordinates.length / 2)] || [77.376, 31.537];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I completed ${trekName}! 🥾 ${distanceKm} km • ${durationStr} • ${elevGain} on Musafir.`,
        title: `${trekName} Story`,
      });
    } catch {}
  };

  const heroPhoto = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <BackArrowIcon size={22} color="#18181B" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Trek Story</Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleShare} activeOpacity={0.7}>
            <ShareStoryIcon size={18} color="#18181B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              Alert.alert("Trek Options", undefined, [
                { text: "View Summary", onPress: () => navigation.navigate("TrekSummary", { sessionId, trekId, trekName }) },
                { text: "Share Story", onPress: handleShare },
                { text: "Cancel", style: "cancel" },
              ]);
            }}
            activeOpacity={0.7}
          >
            <MoreDotsIcon size={18} color="#18181B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Photo Card */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: heroPhoto }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroDarkGradient} />

          {/* Hero Content Overlay */}
          <View style={styles.heroContent}>
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>Completed</Text>
            </View>

            <Text style={styles.heroTitle}>{trekName}</Text>
            <Text style={styles.heroSubtitle}>{trailSubtitle}</Text>
            <Text style={styles.heroDate}>{trekDate}</Text>
          </View>
        </View>

        {/* 4 Key Statistics Box */}
        <View style={styles.statsBox}>
          <View style={styles.statCol}>
            <View style={styles.statIconWrap}>
              <PathDistanceIcon size={16} color="#71717A" />
            </View>
            <Text style={styles.statValue}>{distanceKm} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <View style={styles.statIconWrap}>
              <ClockDurationIcon size={16} color="#71717A" />
            </View>
            <Text style={styles.statValue}>{durationStr}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <View style={styles.statIconWrap}>
              <ElevGainIcon size={16} color="#71717A" />
            </View>
            <Text style={styles.statValue}>{elevGain}</Text>
            <Text style={styles.statLabel}>Elev. Gain</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <View style={styles.statIconWrap}>
              <PeakAltitudeIcon size={16} color="#71717A" />
            </View>
            <Text style={styles.statValue}>{highestAlt}</Text>
            <Text style={styles.statLabel}>Highest Altitude</Text>
          </View>
        </View>

        {/* Section: Your Trek Route */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Trek Route</Text>
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={() =>
                navigation.navigate("ActualRouteMap", {
                  sessionId,
                  trekId,
                  trekName,
                  routeId,
                })
              }
              activeOpacity={0.7}
            >
              <ExpandMapIcon size={16} color="#18181B" />
            </TouchableOpacity>
          </View>

          {/* Interactive Mini Map */}
          <TouchableOpacity
            style={styles.miniMapWrapper}
            onPress={() =>
              navigation.navigate("ActualRouteMap", {
                sessionId,
                trekId,
                trekName,
                routeId,
              })
            }
            activeOpacity={0.92}
          >
            <MapView style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE}>
              <Camera
                initialViewState={{
                  center: centerCoord,
                  zoom: 13.5,
                }}
              />

              <GeoJSONSource id="overview-trail-source" data={miniGeoJSON}>
                <Layer
                  id="overview-trail-halo"
                  type="line"
                  layout={{ "line-cap": "round", "line-join": "round" }}
                  paint={{ "line-color": "#FFFFFF", "line-width": 5 }}
                />
                <Layer
                  id="overview-trail-line"
                  type="line"
                  layout={{ "line-cap": "round", "line-join": "round" }}
                  paint={{ "line-color": "#16A34A", "line-width": 3.5 }}
                />
              </GeoJSONSource>

              {/* Start Pin */}
              {actualCoordinates[0] && (
                <Marker lngLat={actualCoordinates[0]} anchor="center">
                  <View style={styles.startMiniPin}>
                    <View style={styles.startMiniPinInner} />
                  </View>
                </Marker>
              )}

              {/* End Pin */}
              {actualCoordinates[actualCoordinates.length - 1] && (
                <Marker lngLat={actualCoordinates[actualCoordinates.length - 1]!} anchor="center">
                  <View style={styles.endMiniPin}>
                    <View style={styles.endMiniPinInner} />
                  </View>
                </Marker>
              )}
            </MapView>
          </TouchableOpacity>
        </View>

        {/* Section: Your Journey Timeline */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Journey Timeline</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("TrekTimeline", {
                  sessionId,
                  trekId,
                  trekName,
                })
              }
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {/* Timeline snippet 1 */}
          <View style={styles.timelineSnippetItem}>
            <View style={styles.timelineNodeCol}>
              <View style={styles.timelineNodeCircle} />
              <View style={styles.timelineNodeLine} />
            </View>

            <View style={styles.timelineTextCol}>
              <Text style={styles.timelineTime}>07:45 AM</Text>
              <Text style={styles.timelinePlace}>Jalori Pass</Text>
              <Text style={styles.timelineAlt}>3,120 m</Text>
              <Text style={styles.timelineCaption}>Trek started. Beautiful morning at Jalori Pass.</Text>
            </View>

            <View style={styles.timelineThumbWrap}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=200&q=80",
                }}
                style={styles.timelineThumb}
                resizeMode="cover"
              />
              <View style={styles.timelineThumbCameraBadge}>
                <CameraBadgeIcon size={10} color="#FFFFFF" />
              </View>
            </View>
          </View>

          {/* Timeline snippet 2 */}
          <View style={styles.timelineSnippetItem}>
            <View style={styles.timelineNodeCol}>
              <View style={styles.timelineNodeCircle} />
            </View>

            <View style={styles.timelineTextCol}>
              <Text style={styles.timelineTime}>09:18 AM</Text>
              <Text style={styles.timelinePlace}>Chehni Kothi</Text>
              <Text style={styles.timelineAlt}>3,400 m</Text>
              <Text style={styles.timelineCaption}>Steady climb through oak forests.</Text>
            </View>

            <View style={styles.timelineThumbWrap}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=200&q=80",
                }}
                style={styles.timelineThumb}
                resizeMode="cover"
              />
              <View style={styles.timelineThumbCameraBadge}>
                <CameraBadgeIcon size={10} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.primaryCta}
          onPress={() =>
            navigation.navigate("ActualRouteMap", {
              sessionId,
              trekId,
              trekName,
              routeId,
            })
          }
          activeOpacity={0.88}
        >
          <Text style={styles.primaryCtaText}>View Trek Route</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Musafir 5-Item Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Home")} activeOpacity={0.7}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Dashboard")} activeOpacity={0.7}>
          <Text style={styles.navIcon}>🔍</Text>
          <Text style={styles.navLabel}>Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCenterItem}
          onPress={() => navigation.navigate("AddPOI", { lat: 31.5396, lon: 77.3898 })}
          activeOpacity={0.85}
        >
          <View style={styles.navCenterCircle}>
            <Text style={{ fontSize: 20 }}>🐾</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Visited")} activeOpacity={0.7}>
          <Text style={[styles.navIcon, { color: colors.accent }]}>🗺️</Text>
          <Text style={[styles.navLabel, { color: colors.accent, fontWeight: "700" }]}>Trips</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Profile")} activeOpacity={0.7}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
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
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  heroWrap: {
    height: 230,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    marginBottom: 16,
    backgroundColor: "#18181B",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroDarkGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },
  heroContent: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  completedBadge: {
    backgroundColor: "#16A34A",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  completedBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    marginBottom: 2,
  },
  heroDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
  },
  statsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E3DE",
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statIconWrap: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#74736F",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E3DE",
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18181B",
  },
  expandBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E3DE",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  miniMapWrapper: {
    height: 140,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E3DE",
    backgroundColor: "#E5E7EB",
  },
  startMiniPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2563EB",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  startMiniPinInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  endMiniPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  endMiniPinInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  timelineSnippetItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E3DE",
  },
  timelineNodeCol: {
    alignItems: "center",
    marginRight: 10,
    paddingTop: 4,
  },
  timelineNodeCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
    borderWidth: 2,
    borderColor: "#DCFCE7",
  },
  timelineNodeLine: {
    width: 1.5,
    flex: 1,
    minHeight: 40,
    backgroundColor: "#E5E3DE",
    marginTop: 4,
  },
  timelineTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  timelineTime: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
    marginBottom: 1,
  },
  timelinePlace: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 1,
  },
  timelineAlt: {
    fontSize: 11,
    color: "#74736F",
    marginBottom: 4,
  },
  timelineCaption: {
    fontSize: 12,
    color: "#3F3F46",
    lineHeight: 16,
  },
  timelineThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#18181B",
  },
  timelineThumb: {
    width: "100%",
    height: "100%",
  },
  timelineThumbCameraBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCta: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 20,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  bottomNav: {
    height: 60,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E3DE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#74736F",
  },
  navCenterItem: {
    top: -12,
    alignItems: "center",
    justifyContent: "center",
  },
  navCenterCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});
