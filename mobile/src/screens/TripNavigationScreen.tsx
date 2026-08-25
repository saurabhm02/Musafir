import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
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
import { Map3D } from "../components/Map3D";
import { colors } from "../theme";
import type { RootStackParamList } from "../navigation";
import { getCurrentLocation, getCachedLocation, type Coords } from "../lib/location";
import {
  fetchNavigationRoute,
  resolveTravelMode,
  fetchRouteCorridorRecommendations,
  type Route,
  type RecommendedPoi,
} from "../lib/routing";
import { fetchPoiStatusMap, setPoiStatus } from "../lib/poiStatus";
import { fetchTrips, addTripStop, createTrip, type TripSummary } from "../lib/trips";
import { fetchPoiDetails, type PoiDetails } from "../lib/pois";
import { AddToTripBottomSheet } from "../components/AddToTripBottomSheet";
import { recommendedPoiToPoi } from "../components/AlongJourneySheet";
import type { Poi } from "../lib/pois";

function ArrowBackIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#18181B" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HeartIcon({ size = 20, saved = false }: { size?: number; saved?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={saved ? colors.accent : "none"}>
      <Path
        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
        stroke={saved ? colors.accent : "#18181B"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function NavigationArrowIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11L21 3L13 21L11 13L3 11Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

function CarIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 17H4C2.89543 17 2 16.1046 2 15V11C2 9.89543 2.89543 9 4 9H5L7 4H17L19 9H20C21.1046 9 22 9.89543 22 11V15C22 16.1046 21.1046 17 20 17H19M5 17V19C5 19.5523 5.44772 20 6 20H7C7.55228 20 8 19.5523 8 19V17M5 17H19M19 17V19C19 19.5523 18.5523 20 18 20H17C16.4477 20 16 19.5523 16 19V17"
        stroke="#18181B"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7.5" cy="13.5" r="1.5" fill="#18181B" />
      <Circle cx="16.5" cy="13.5" r="1.5" fill="#18181B" />
    </Svg>
  );
}

function SuitcaseSmallIcon({ size = 16, color = "#4B5563" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="7" width="16" height="14" rx="3" stroke={color} strokeWidth={1.8} />
      <Path d="M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M4 12H20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function TargetIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke="#9CA3AF" strokeWidth={2} />
      <Circle cx="12" cy="12" r="3" fill="#9CA3AF" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function SwapIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "TripNavigation">;

export function TripNavigationScreen({ route: screenRoute, navigation }: Props) {
  const { poi } = screenRoute.params;
  const [deviceLocation, setDeviceLocation] = useState<Coords | null>(null);
  const [routeData, setRouteData] = useState<Route | null>(null);
  const [routingLoading, setRoutingLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [poiDetails, setPoiDetails] = useState<PoiDetails | null>(null);
  const [addToTripOpen, setAddToTripOpen] = useState(false);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [corridorStops, setCorridorStops] = useState<RecommendedPoi[]>([]);

  useEffect(() => {
    fetchPoiStatusMap()
      .then((map) => setIsSaved(map[poi.id] === "saved"))
      .catch(() => {});
    fetchPoiDetails(poi.id).then(setPoiDetails).catch(() => {});
    fetchTrips().then(setTrips).catch(() => {});
  }, [poi.id]);

  const travelMode = resolveTravelMode(poi.category);

  useEffect(() => {
    let cancelled = false;
    async function loadRoute() {
      setRoutingLoading(true);
      let loc = await getCurrentLocation();
      if (!loc) {
        loc = await getCachedLocation();
      }
      if (cancelled) return;
      if (loc) {
        setDeviceLocation(loc);
        try {
          const r = await fetchNavigationRoute(loc, { lat: poi.lat, lon: poi.lon }, travelMode);
          if (!cancelled) {
            setRouteData(r);

            // Fetch stops along the route using Corridor Search API
            fetchRouteCorridorRecommendations({
              origin: { lat: loc.lat, lon: loc.lon, name: "Current Location" },
              destination: { lat: poi.lat, lon: poi.lon, name: poi.name },
              coordinates: r.coordinates,
              distanceKm: r.distanceKm,
              durationMin: r.durationMin,
              maxDetourMinutes: 30,
            })
              .then((res) => {
                if (!cancelled) {
                  // Filter out destination POI itself
                  setCorridorStops(res.recommendations.filter((c) => c.id !== poi.id));
                }
              })
              .catch(() => {});
          }
        } catch {
          if (!cancelled) {
            Alert.alert("Routing Error", "Unable to calculate route to destination from your current location.");
          }
        }
      } else {
        Alert.alert("Location Required", "Please enable GPS location to calculate the route to this destination.");
      }
      if (!cancelled) setRoutingLoading(false);
    }

    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [poi, travelMode]);

  const toggleSave = async () => {
    const next = !isSaved;
    setIsSaved(next);
    try {
      await setPoiStatus(poi.id, next ? "saved" : null);
    } catch {}
  };

  const handleStartNavigationCTA = () => {
    navigation.navigate("ActiveNavigation", { poi, route: routeData ?? undefined });
  };

  const handleAddToTripDay = async (trip: TripSummary, dayNumber: number) => {
    await addTripStop(trip.id, { poiId: poi.id, dayNumber });
    Alert.alert("Added to trip", `${poi.name} added to Day ${dayNumber} of "${trip.title}".`);
  };

  const handleCreateNewTrip = async (title: string, destination?: string, dayCount?: number) => {
    const id = await createTrip({ title, destination, dayCount });
    await addTripStop(id, { poiId: poi.id, dayNumber: 1 });
    Alert.alert("Trip Created", `Created "${title}" and added ${poi.name}.`);
  };

  // Map markers: Destination + any corridor pitstops
  const mapPois = useMemo(() => {
    const list: Poi[] = [poi];
    for (const s of corridorStops) {
      const p = recommendedPoiToPoi(s);
      (p as any).detourLabel = `+${s.detourDurationMin}m`;
      list.push(p);
    }
    return list;
  }, [poi, corridorStops]);

  // Format Duration & Distance
  const durationMin = routeData?.durationMin ?? 72;
  const distanceKm = routeData?.distanceKm ?? 32;

  const hours = Math.floor(durationMin / 60);
  const minutes = Math.round(durationMin % 60);
  const formattedDuration = hours > 0 ? `~${hours} hr ${minutes} min` : `~${minutes} min`;
  const formattedDistance = `~${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;

  // Calculate ETA
  const now = new Date();
  const etaDate = new Date(now.getTime() + durationMin * 60000);
  const etaHours = etaDate.getHours();
  const etaMins = etaDate.getMinutes().toString().padStart(2, "0");
  const ampm = etaHours >= 12 ? "PM" : "AM";
  const displayHours = etaHours % 12 || 12;
  const formattedETA = `${displayHours}:${etaMins} ${ampm}`;

  const heroImage = poiDetails?.photos?.[0]?.url ?? poi.photo_url;
  const locationText = poiDetails?.metadata?.state
    ? `${poiDetails.metadata.district ? `${poiDetails.metadata.district}, ` : ""}${poiDetails.metadata.state}`
    : poi.category.replace("_", " ");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Map View */}
      <View style={styles.mapWrap}>
        <Map3D
          route={routeData}
          originLabel="Your Location"
          pois={mapPois}
          onPoiPress={(selected) => {
            if (selected.id !== poi.id) {
              navigation.navigate("PlaceDetails", { poi: selected });
            }
          }}
          initialCenter={deviceLocation ? [deviceLocation.lon, deviceLocation.lat] : [poi.lon, poi.lat]}
          initialZoom={11}
        />
      </View>

      {/* Top Floating Header Card */}
      <SafeAreaView style={styles.topOverlay} edges={["top"]}>
        <View style={styles.topCard}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ArrowBackIcon size={20} />
          </TouchableOpacity>
          {heroImage ? (
            <Image source={{ uri: heroImage }} style={styles.topThumb} resizeMode="cover" />
          ) : null}
          <View style={styles.topInfoCol}>
            <Text style={styles.startTripLabel}>Navigation Preview</Text>
            <Text style={styles.destName} numberOfLines={1}>
              {poi.name}
            </Text>
            <Text style={styles.destLoc} numberOfLines={1}>
              {locationText}
            </Text>
          </View>
          <TouchableOpacity style={styles.heartBtn} onPress={toggleSave} activeOpacity={0.7}>
            <HeartIcon size={20} saved={isSaved} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom Floating Navigation Card */}
      <SafeAreaView style={styles.bottomOverlay} edges={["bottom"]}>
        <View style={styles.bottomCard}>
          <View style={styles.dragHandle} />

          {/* From / To Route Box */}
          <View style={styles.waypointsBox}>
            <View style={styles.waypointRow}>
              <View style={styles.blueDot} />
              <View style={styles.waypointTextCol}>
                <Text style={styles.waypointLabel}>From</Text>
                <Text style={styles.waypointVal}>Your Current Location</Text>
              </View>
              <TargetIcon size={16} />
            </View>

            <View style={styles.waypointDivider} />

            <View style={styles.waypointRow}>
              <View style={styles.redPinDot} />
              <View style={styles.waypointTextCol}>
                <Text style={styles.waypointLabel}>To</Text>
                <Text style={styles.waypointVal} numberOfLines={1}>
                  {poi.name}
                </Text>
              </View>
              <SwapIcon size={16} />
            </View>
          </View>

          {/* Pitstops Along Route Carousel (If available) */}
          {corridorStops.length > 0 && (
            <View style={styles.corridorStopsSection}>
              <Text style={styles.corridorStopsTitle}>Stops on your way ({corridorStops.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.corridorScroll}>
                {corridorStops.map((stop) => (
                  <TouchableOpacity
                    key={stop.id}
                    style={styles.stopCard}
                    onPress={() => {
                      navigation.navigate("PlaceDetails", { poi: recommendedPoiToPoi(stop) });
                    }}
                    activeOpacity={0.85}
                  >
                    {stop.photoUrl ? (
                      <Image source={{ uri: stop.photoUrl }} style={styles.stopThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.stopThumb, styles.stopThumbPlaceholder]}>
                        <Text style={{ fontSize: 14 }}>📍</Text>
                      </View>
                    )}
                    <View style={styles.stopInfo}>
                      <Text style={styles.stopName} numberOfLines={1}>
                        {stop.name}
                      </Text>
                      <View style={styles.stopBadgeRow}>
                        <Text style={styles.stopDetourPill}>+{stop.detourDurationMin}m detour</Text>
                        <Text style={styles.stopDistKm}>At KM {Math.round(stop.kmAlongRoute)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Route Summary Row */}
          <View style={styles.routeSummaryRow}>
            <View style={styles.carIconWrap}>
              <CarIcon size={18} />
            </View>
            <View style={styles.routeTextCol}>
              {routingLoading ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ alignSelf: "flex-start" }} />
              ) : (
                <>
                  <Text style={styles.routeTimeDist}>
                    {formattedDuration} • <Text style={styles.routeDistSub}>{formattedDistance}</Text>
                  </Text>
                  <Text style={styles.routeDesc}>Drive via fastest route • ETA {formattedETA}</Text>
                </>
              )}
            </View>
            <TouchableOpacity
              style={styles.addToTripPill}
              onPress={() => setAddToTripOpen(true)}
              activeOpacity={0.75}
            >
              <SuitcaseSmallIcon size={14} color="#4B5563" />
              <Text style={styles.addToTripPillText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Primary CTA: Start Navigation */}
          <TouchableOpacity
            style={styles.startNavBtn}
            onPress={handleStartNavigationCTA}
            activeOpacity={0.88}
          >
            <Text style={styles.startNavBtnText}>Start Navigation</Text>
            <NavigationArrowIcon size={18} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Add to Trip Bottom Sheet */}
      <AddToTripBottomSheet
        visible={addToTripOpen}
        poi={poi}
        trips={trips}
        onClose={() => setAddToTripOpen(false)}
        onStartNavigation={handleStartNavigationCTA}
        onAddToTripDay={handleAddToTripDay}
        onCreateNewTrip={handleCreateNewTrip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  mapWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 12 : 4,
    zIndex: 10,
  },
  topCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  topThumb: {
    width: 38,
    height: 38,
    borderRadius: 12,
    marginLeft: 10,
  },
  topInfoCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  startTripLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  destName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#18181B",
    marginTop: 1,
  },
  destLoc: {
    fontSize: 12,
    color: "#71717A",
    textTransform: "capitalize",
    marginTop: 1,
  },
  heartBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAF8",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === "android" ? 18 : 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 12,
  },
  waypointsBox: {
    backgroundColor: "#FAFAF8",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  waypointRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  blueDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    marginRight: 12,
  },
  redPinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginRight: 12,
  },
  waypointTextCol: {
    flex: 1,
  },
  waypointLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
  },
  waypointVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
  },
  waypointDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
    marginLeft: 22,
  },
  corridorStopsSection: {
    marginBottom: 10,
  },
  corridorStopsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  corridorScroll: {
    gap: 8,
  },
  stopCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    width: 190,
    gap: 8,
  },
  stopThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  stopThumbPlaceholder: {
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  stopBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  stopDetourPill: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  stopDistKm: {
    fontSize: 9.5,
    color: "#64748B",
  },
  routeSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  carIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  routeTextCol: {
    flex: 1,
  },
  routeTimeDist: {
    fontSize: 15,
    fontWeight: "800",
    color: "#18181B",
  },
  routeDistSub: {
    fontSize: 14,
    fontWeight: "600",
    color: "#71717A",
  },
  routeDesc: {
    fontSize: 12,
    color: "#71717A",
    marginTop: 1,
  },
  addToTripPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F4F5",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 5,
  },
  addToTripPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  startNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: 18,
    height: 52,
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  startNavBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
});
