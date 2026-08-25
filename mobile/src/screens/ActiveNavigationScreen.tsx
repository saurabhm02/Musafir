import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";
import { Map3D } from "../components/Map3D";
import { colors } from "../theme";
import type { RootStackParamList } from "../navigation";
import {
  watchNavigationLocation,
  haversineMeters,
  minDistanceToPolylineMeters,
  type NavigationLocation,
} from "../lib/location";
import {
  fetchNavigationRoute,
  resolveTravelMode,
  type NavigationStep,
  type Route,
  type TravelMode,
} from "../lib/routing";
import { setPoiStatus } from "../lib/poiStatus";
import type { Poi } from "../lib/pois";

function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RecenterIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke="#18181B" strokeWidth={2} />
      <Circle cx="12" cy="12" r="3" fill="#18181B" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#18181B" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function CheckCircleIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="#16A34A" />
      <Path d="M8 12.5l2.5 2.5 5.5-6" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Maneuver Icons based on turn modifier
function ManeuverIcon({ modifier, type }: { modifier: string | null; type: string }) {
  const mod = (modifier || "").toLowerCase();
  const t = (type || "").toLowerCase();

  if (t === "arrive") {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10z" fill="#FFFFFF" />
        <Circle cx="12" cy="11" r="2.5" fill={colors.accent} />
      </Svg>
    );
  }

  if (mod.includes("right")) {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path d="M9 19V9a4 4 0 0 1 4-4h6" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M15 9l4-4-4-4" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (mod.includes("left")) {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path d="M15 19V9a4 4 0 0 0-4-4H5" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 9L5 5l4-4" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (mod.includes("uturn")) {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path d="M17 19V9a6 6 0 0 0-12 0v10" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 15L5 19l-4-4" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  // Straight / continue default
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 11l6-6 6 6" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type NavState =
  | "NAVIGATION_STARTING"
  | "NAVIGATING"
  | "OFF_ROUTE"
  | "REROUTING"
  | "ARRIVING"
  | "ARRIVED"
  | "COMPLETED";

type Props = NativeStackScreenProps<RootStackParamList, "ActiveNavigation">;

const OFF_ROUTE_THRESHOLD_METERS = 45;
const ARRIVAL_THRESHOLD_METERS = 60;

export function ActiveNavigationScreen({ route: screenRoute, navigation }: Props) {
  const { poi, route: initialRoute } = screenRoute.params;
  const travelMode: TravelMode = initialRoute?.mode || resolveTravelMode(poi.category);

  const [navState, setNavState] = useState<NavState>("NAVIGATION_STARTING");
  const [currentLocation, setCurrentLocation] = useState<NavigationLocation | null>(null);
  const [activeRoute, setActiveRoute] = useState<Route | null>(initialRoute ?? null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextStepM, setDistanceToNextStepM] = useState<number | null>(null);
  const [remainingDistanceM, setRemainingDistanceM] = useState<number>(
    (initialRoute?.distanceKm ?? 0) * 1000,
  );
  const [remainingDurationSec, setRemainingDurationSec] = useState<number>(
    (initialRoute?.durationMin ?? 0) * 60,
  );
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [isVisitedMarked, setIsVisitedMarked] = useState(false);

  // Consecutive off-route counter to prevent false-positive GPS spikes
  const offRouteCountRef = useRef(0);
  const reroutingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Recalculate route when off-route or missing initial route
  const recalculateRoute = useCallback(
    async (fromLocation: NavigationLocation) => {
      if (reroutingRef.current) return;
      reroutingRef.current = true;
      setNavState("REROUTING");

      try {
        const freshRoute = await fetchNavigationRoute(
          { lat: fromLocation.lat, lon: fromLocation.lon },
          { lat: poi.lat, lon: poi.lon },
          travelMode,
        );

        if (isMountedRef.current && freshRoute && freshRoute.coordinates.length > 0) {
          setActiveRoute(freshRoute);
          setCurrentStepIndex(0);
          setRemainingDistanceM(freshRoute.distanceKm * 1000);
          setRemainingDurationSec(freshRoute.durationMin * 60);
          offRouteCountRef.current = 0;
          setNavState("NAVIGATING");
        }
      } catch {
        // Retry on next GPS update if needed
      } finally {
        reroutingRef.current = false;
      }
    },
    [poi, travelMode],
  );

  // High-frequency Real GPS Tracking
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    watchNavigationLocation(
      (loc) => {
        if (!isMountedRef.current) return;
        setCurrentLocation(loc);

        // If no active route yet, fetch initial route from current GPS
        if (!activeRoute && !reroutingRef.current) {
          recalculateRoute(loc);
          return;
        }

        if (!activeRoute || activeRoute.coordinates.length === 0) return;

        // 1. Check Arrival Distance to Destination
        const distToDestM = haversineMeters(loc, { lat: poi.lat, lon: poi.lon });
        if (distToDestM <= ARRIVAL_THRESHOLD_METERS) {
          setNavState("ARRIVED");
          setRemainingDistanceM(0);
          setRemainingDurationSec(0);
          return;
        } else if (distToDestM <= 120) {
          setNavState("ARRIVING");
        }

        // 2. Off-Route Detection
        const { minDistanceM } = minDistanceToPolylineMeters(loc, activeRoute.coordinates);

        if (minDistanceM > OFF_ROUTE_THRESHOLD_METERS) {
          offRouteCountRef.current += 1;
          if (offRouteCountRef.current >= 2 && !reroutingRef.current) {
            // Trigger automatic reroute
            recalculateRoute(loc);
            return;
          }
        } else {
          offRouteCountRef.current = 0;
          if (navState === "OFF_ROUTE" || navState === "REROUTING" || navState === "NAVIGATION_STARTING") {
            setNavState("NAVIGATING");
          }
        }

        // 3. Dynamic Maneuver / Turn Progress
        const steps = activeRoute.steps || [];
        if (steps.length > 0) {
          let stepIdx = currentStepIndex;
          if (stepIdx >= steps.length) stepIdx = steps.length - 1;

          const targetStep = steps[stepIdx];
          const stepLoc = {
            lat: targetStep.maneuver.location[1],
            lon: targetStep.maneuver.location[0],
          };
          const distToManeuver = haversineMeters(loc, stepLoc);

          // If reached within 25m of current maneuver, advance to next step
          if (distToManeuver < 25 && stepIdx < steps.length - 1) {
            stepIdx += 1;
            setCurrentStepIndex(stepIdx);
            const nextStep = steps[stepIdx];
            const nextStepLoc = {
              lat: nextStep.maneuver.location[1],
              lon: nextStep.maneuver.location[0],
            };
            setDistanceToNextStepM(haversineMeters(loc, nextStepLoc));
          } else {
            setDistanceToNextStepM(distToManeuver);
          }
        }

        // 4. Dynamic Remaining Distance & ETA calculation
        setRemainingDistanceM(distToDestM);

        const currentSpeedKmh = loc.speedKmh && loc.speedKmh > 5 ? loc.speedKmh : travelMode === "walking" ? 4.5 : 35;
        const estimatedSeconds = Math.round((distToDestM / 1000 / currentSpeedKmh) * 3600);
        setRemainingDurationSec(estimatedSeconds);
      },
      (err) => {
        Alert.alert("Location Error", "Unable to retrieve real-time GPS position for navigation.");
      },
    ).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeRoute, currentStepIndex, navState, poi, recalculateRoute, travelMode]);

  // Format Dynamic Turn Instruction
  const currentStep: NavigationStep | undefined = activeRoute?.steps?.[currentStepIndex];
  const stepDistanceFormatted =
    distanceToNextStepM != null
      ? distanceToNextStepM > 1000
        ? `${(distanceToNextStepM / 1000).toFixed(1)} km`
        : `${Math.round(distanceToNextStepM)} m`
      : null;

  let displayInstruction = "Follow the route";
  if (navState === "REROUTING" || navState === "OFF_ROUTE") {
    displayInstruction = "Rerouting...";
  } else if (navState === "ARRIVED") {
    displayInstruction = "You have arrived at your destination";
  } else if (currentStep) {
    if (distanceToNextStepM != null && distanceToNextStepM > 40) {
      displayInstruction = `In ${stepDistanceFormatted}, ${currentStep.instruction.toLowerCase()}`;
    } else {
      displayInstruction = currentStep.instruction;
    }
  }

  // Format Dynamic Remaining ETA & Distance
  const remKm = (remainingDistanceM / 1000).toFixed(remainingDistanceM < 10000 ? 1 : 0);
  const remMin = Math.ceil(remainingDurationSec / 60);
  const hours = Math.floor(remMin / 60);
  const mins = remMin % 60;
  const formattedDuration = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

  const now = new Date();
  const etaDate = new Date(now.getTime() + remainingDurationSec * 1000);
  const etaHours = etaDate.getHours();
  const etaMins = etaDate.getMinutes().toString().padStart(2, "0");
  const ampm = etaHours >= 12 ? "PM" : "AM";
  const displayHours = etaHours % 12 || 12;
  const formattedETA = `${displayHours}:${etaMins} ${ampm}`;

  const [showEndNavModal, setShowEndNavModal] = useState(false);

  // End Navigation Dialog Trigger
  const confirmEndNavigation = () => {
    setShowEndNavModal(true);
  };

  const handleEndNavigationConfirmed = () => {
    setShowEndNavModal(false);
    setNavState("COMPLETED");
    navigation.goBack();
  };

  const handleMarkVisited = async () => {
    setIsVisitedMarked(true);
    try {
      await setPoiStatus(poi.id, "visited");
    } catch {}
  };

  const handleFinishArrival = () => {
    setNavState("COMPLETED");
    navigation.navigate("PlaceDetails", { poi });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full-Screen Map with Real-time GPS Navigation Puck & Route */}
      <View style={styles.mapWrap}>
        <Map3D
          route={activeRoute}
          pois={[poi]}
          onPoiPress={() => {}}
          navMode
          userNavLocation={currentLocation}
          isFollowingUser={isFollowingUser}
          onUserPan={() => setIsFollowingUser(false)}
        />
      </View>

      {/* Top Turn-by-Turn Dynamic Navigation Banner */}
      <SafeAreaView style={styles.topBannerOverlay} edges={["top"]}>
        <View style={styles.instructionBanner}>
          <View style={styles.turnIconWrap}>
            {navState === "REROUTING" ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <ManeuverIcon
                modifier={currentStep?.maneuver?.modifier ?? null}
                type={currentStep?.maneuver?.type ?? "turn"}
              />
            )}
          </View>
          <View style={styles.instructionTextCol}>
            <Text style={styles.instructionPrimary} numberOfLines={2}>
              {displayInstruction}
            </Text>
            {currentStep?.streetName ? (
              <Text style={styles.instructionSecondary} numberOfLines={1}>
                {currentStep.streetName}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity style={styles.closeNavBtn} onPress={confirmEndNavigation} activeOpacity={0.75}>
            <CloseIcon size={18} />
          </TouchableOpacity>
        </View>

        {/* Dynamic ETA & Distance Pill */}
        <View style={styles.etaPill}>
          <Text style={styles.etaPillText}>
            <Text style={styles.etaMinHighlight}>{formattedDuration}</Text> • {remKm} km • ETA {formattedETA}
          </Text>
        </View>
      </SafeAreaView>

      {/* Floating Recenter Button (Appears when user manually pans) */}
      {!isFollowingUser && (
        <TouchableOpacity
          style={styles.recenterFloatingBtn}
          onPress={() => setIsFollowingUser(true)}
          activeOpacity={0.85}
        >
          <RecenterIcon size={18} />
          <Text style={styles.recenterText}>Recenter</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Destination & Navigation Info Card */}
      <SafeAreaView style={styles.bottomOverlay} edges={["bottom"]}>
        <View style={styles.bottomCard}>
          <View style={styles.poiRow}>
            {poi.photo_url ? (
              <Image source={{ uri: poi.photo_url }} style={styles.poiThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.poiThumb, styles.poiThumbFallback]} />
            )}
            <View style={styles.poiInfoCol}>
              <Text style={styles.poiName} numberOfLines={1}>
                {poi.name}
              </Text>
              <Text style={styles.poiCategory} numberOfLines={1}>
                {poi.category.replace("_", " ")}
              </Text>
            </View>

            {/* Real GPS Speed Indicator */}
            <View style={styles.speedBadge}>
              <Text style={styles.speedText}>
                {currentLocation?.speedKmh != null ? currentLocation.speedKmh : "--"}
              </Text>
              <Text style={styles.speedUnit}>km/h</Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.endNavBtn} onPress={confirmEndNavigation} activeOpacity={0.8}>
              <Text style={styles.endNavBtnText}>End Navigation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* End Navigation Bottom Sheet Modal */}
      <Modal visible={showEndNavModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowEndNavModal(false)}
          />
          <View style={styles.endNavSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.endNavHeader}>
              <View style={styles.alertIconCircle}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 9v4M12 17h.01M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z"
                    stroke="#DC2626"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <Text style={styles.endNavTitle}>End navigation?</Text>
              <Text style={styles.endNavMessage}>
                Are you sure you want to stop navigation?
              </Text>
            </View>

            <View style={styles.endNavActions}>
              <TouchableOpacity
                style={styles.endNavConfirmBtn}
                onPress={handleEndNavigationConfirmed}
                activeOpacity={0.85}
              >
                <Text style={styles.endNavConfirmText}>End Navigation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.continueNavBtn}
                onPress={() => setShowEndNavModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.continueNavText}>Continue Navigation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Arrival Modal / Overlay (Only shown when user actually reaches destination) */}
      <Modal visible={navState === "ARRIVED"} transparent animationType="slide">
        <View style={styles.arrivalModalBackdrop}>
          <View style={styles.arrivalCard}>
            <View style={styles.arrivalIconWrap}>
              <CheckCircleIcon size={38} />
            </View>
            <Text style={styles.arrivalTitle}>You've Arrived! 🎉</Text>
            <Text style={styles.arrivalDestName}>{poi.name}</Text>
            <Text style={styles.arrivalSub}>
              Great job! You have reached your destination.
            </Text>

            <View style={styles.arrivalActionsRow}>
              <TouchableOpacity
                style={[styles.arrivalMarkBtn, isVisitedMarked && styles.arrivalMarkBtnActive]}
                onPress={handleMarkVisited}
                activeOpacity={0.85}
              >
                <Text style={[styles.arrivalMarkBtnText, isVisitedMarked && { color: "#16A34A" }]}>
                  {isVisitedMarked ? "✓ Marked as Visited" : "Mark as Visited"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.arrivalDoneBtn} onPress={handleFinishArrival} activeOpacity={0.88}>
                <Text style={styles.arrivalDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090B",
  },
  mapWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 16 : 6,
    zIndex: 10,
  },
  instructionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  turnIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  instructionTextCol: {
    flex: 1,
  },
  instructionPrimary: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  instructionSecondary: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    marginTop: 2,
  },
  closeNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  etaPill: {
    alignSelf: "center",
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  etaPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#71717A",
  },
  etaMinHighlight: {
    fontWeight: "800",
    color: "#18181B",
  },
  recenterFloatingBtn: {
    position: "absolute",
    right: 18,
    bottom: 120,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 20,
  },
  recenterText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#18181B",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "android" ? 16 : 8,
    zIndex: 10,
  },
  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  poiRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  poiThumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginRight: 12,
  },
  poiThumbFallback: {
    backgroundColor: "#F3F4F6",
  },
  poiInfoCol: {
    flex: 1,
  },
  poiName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#18181B",
  },
  poiCategory: {
    fontSize: 12,
    color: "#71717A",
    textTransform: "capitalize",
    marginTop: 1,
  },
  speedBadge: {
    backgroundColor: "#FAFAF8",
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
  },
  speedText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#18181B",
  },
  speedUnit: {
    fontSize: 9,
    fontWeight: "600",
    color: "#71717A",
  },
  actionsRow: {
    flexDirection: "row",
  },
  endNavBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    borderWidth: 1.2,
    borderColor: "#FECACA",
  },
  endNavBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#DC2626",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.52)",
    justifyContent: "flex-end",
  },
  endNavSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === "android" ? 24 : 36,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 18,
  },
  endNavHeader: {
    alignItems: "center",
    marginBottom: 22,
  },
  alertIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  endNavTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  endNavMessage: {
    fontSize: 14,
    color: "#71717A",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  endNavActions: {
    gap: 10,
  },
  endNavConfirmBtn: {
    width: "100%",
    height: 50,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  endNavConfirmText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  continueNavBtn: {
    width: "100%",
    height: 50,
    borderRadius: 16,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  continueNavText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#18181B",
  },
  arrivalModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  arrivalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 24,
    alignItems: "center",
  },
  arrivalIconWrap: {
    marginBottom: 10,
  },
  arrivalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.4,
  },
  arrivalDestName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent,
    marginTop: 2,
    marginBottom: 6,
  },
  arrivalSub: {
    fontSize: 13,
    color: "#71717A",
    textAlign: "center",
    marginBottom: 20,
  },
  arrivalActionsRow: {
    width: "100%",
    gap: 10,
  },
  arrivalMarkBtn: {
    width: "100%",
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FAFAF8",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  arrivalMarkBtnActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  arrivalMarkBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  arrivalDoneBtn: {
    width: "100%",
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  arrivalDoneBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
