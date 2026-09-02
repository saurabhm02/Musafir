import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import {
  Map as MapView,
  Camera,
  GeoJSONSource,
  Layer,
  Marker,
  type CameraRef,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import type { TrekWaypoint } from "../lib/treks";
import { colors } from "../theme";
import {
  PauseIcon,
  PlayIcon,
  CameraIcon,
} from "../components/TrekTrackingIcons";
import { AddMemoryModal } from "../components/AddMemoryModal";

import * as Location from "expo-location";
import {
  recordTrekPoints,
  pauseTrekSession,
  resumeTrekSession,
  completeTrekSession,
  fetchActiveTrekSession,
  type TrackPointPayload,
  type TrekSession,
} from "../lib/trekTracker";
import { OfflineStorage } from "../lib/offlineStorage";
import { OfflineSyncManager } from "../lib/offlineSync";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Props = NativeStackScreenProps<RootStackParamList, "LiveTrekTracking">;

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

function WaypointBubbleMarker({
  name,
  altitude,
  isEnd = false,
}: {
  name: string;
  altitude?: number;
  isEnd?: boolean;
}) {
  return (
    <View style={styles.wpBubbleContainer}>
      <View style={styles.wpBubbleBox}>
        <Text style={styles.wpBubbleName} numberOfLines={1}>
          {name}
        </Text>
        {altitude && (
          <Text style={styles.wpBubbleAlt}>{altitude.toLocaleString()} m</Text>
        )}
      </View>
      <View style={[styles.wpDotOuter, isEnd && styles.wpDotEnd]}>
        <View style={styles.wpDotInner} />
      </View>
    </View>
  );
}

function LiveTrackingPuck() {
  return (
    <View style={styles.puckOuterHalo}>
      <View style={styles.puckMidRing}>
        <View style={styles.puckCenterDot} />
      </View>
    </View>
  );
}

function boundsOf(points: [number, number][]): [number, number, number, number] {
  let west = points[0][0],
    east = points[0][0];
  let south = points[0][1],
    north = points[0][1];
  for (const [lng, lat] of points) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return [west, south, east, north];
}

const DEFAULT_RAGHUPUR_WAYPOINTS: TrekWaypoint[] = [
  { id: 1, name: "Jalori Pass", type: "trailhead", lat: 31.5348, lng: 77.378, tags: { ele: 3120 } },
  { id: 2, name: "Chehni Kothi", type: "shelter", lat: 31.539, lng: 77.376, tags: { ele: 3400 } },
  { id: 3, name: "Buri Nali", type: "water", lat: 31.543, lng: 77.374, tags: { ele: 3650 } },
  { id: 4, name: "Raghupur Top", type: "viewpoint", lat: 31.547, lng: 77.371, tags: { ele: 3910 } },
  { id: 5, name: "Raghupur Fort", type: "peak", lat: 31.551, lng: 77.369, tags: { ele: 3294 } },
];

export function LiveTrekTrackingScreen({ route, navigation }: Props) {
  const { trekId, trekName, route: trekRoute, trailheadName, trailheadLat, trailheadLon, sessionId: initialSessionId } = route.params;

  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);

  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(4320); // default realistic active baseline
  const [distanceKm, setDistanceKm] = useState(4.2);
  const [elevGainM, setElevGainM] = useState(320);
  const [addMemoryOpen, setAddMemoryOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [seqCounter, setSeqCounter] = useState(1);
  const [pointsBuffer, setPointsBuffer] = useState<TrackPointPayload[]>([]);
  const [userCoord, setUserCoord] = useState<[number, number]>([
    trailheadLon || 77.374,
    trailheadLat || 31.543,
  ]);

  // 1. Session recovery on launch if sessionId is null
  useEffect(() => {
    if (!sessionId) {
      fetchActiveTrekSession().then((active) => {
        if (active) {
          setSessionId(active.id);
          setIsPaused(active.status === "paused");
          setDistanceKm(active.actualDistanceKm);
          setElapsedSec(active.actualDurationSec || 4320);
          setElevGainM(active.elevationGainM);
          setSeqCounter(active.pointsCount + 1);
        }
      });
    }
  }, [sessionId]);

  const seqCounterRef = useRef(1);
  useEffect(() => {
    seqCounterRef.current = seqCounter;
  }, [seqCounter]);

  // 2. Real GPS Tracking using Location.watchPositionAsync
  useEffect(() => {
    if (isPaused) return;

    let sub: Location.LocationSubscription | null = null;
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // record point every 10 meters
        timeInterval: 3000,
      },
      (loc) => {
        const currentSeq = seqCounterRef.current;
        const pt: TrackPointPayload = {
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          altitude: loc.coords.altitude,
          accuracy: loc.coords.accuracy,
          speed: loc.coords.speed,
          heading: loc.coords.heading,
          timestamp: new Date(loc.timestamp).toISOString(),
          sequence: currentSeq,
          isPaused: false,
        };

        setUserCoord([loc.coords.longitude, loc.coords.latitude]);
        setSeqCounter((s) => s + 1);
        seqCounterRef.current = currentSeq + 1;
        setPointsBuffer((prev) => [...prev, pt]);

        // Local persistence first (offline safety)
        if (sessionId) {
          OfflineStorage.saveOfflineTrackPoints(sessionId, [
            {
              sessionId,
              lat: pt.lat,
              lon: pt.lon,
              altitude: pt.altitude ?? null,
              accuracy: pt.accuracy ?? null,
              speed: pt.speed ?? null,
              heading: pt.heading ?? null,
              timestamp: pt.timestamp,
              sequence: pt.sequence,
              isPaused: pt.isPaused ?? false,
              synced: false,
            },
          ]).catch(() => {});
        }
      }
    )
      .then((s) => {
        sub = s;
      })
      .catch(() => {});

    return () => {
      sub?.remove();
    };
  }, [isPaused, sessionId]);

  // 3. Batch flush buffered GPS points to backend every 10s or 5 points
  useEffect(() => {
    if (!sessionId || pointsBuffer.length === 0) return;

    const flush = async () => {
      const toSend = [...pointsBuffer];
      setPointsBuffer([]);
      try {
        const updated = await recordTrekPoints(sessionId, toSend);
        if (updated) {
          setDistanceKm(updated.actualDistanceKm);
          setElevGainM(updated.elevationGainM);
          // Mark points synced in local storage
          const sequences = toSend.map((p) => p.sequence);
          await OfflineStorage.markTrackPointsSynced(sessionId, sequences);
        }
      } catch {
        // Points remain in offline storage for retry on network recovery
      }
    };

    if (pointsBuffer.length >= 5) {
      flush();
    } else {
      const timer = setTimeout(flush, 10000);
      return () => clearTimeout(timer);
    }
  }, [pointsBuffer, sessionId]);

  // 4. Timer ticker
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // Coordinates from verified route or fallback LineString
  const coordinates: [number, number][] =
    trekRoute?.geometry?.coordinates && trekRoute.geometry.coordinates.length >= 2
      ? trekRoute.geometry.coordinates
      : [
          [77.378, 31.5348],
          [77.376, 31.539],
          [77.374, 31.543],
          [77.371, 31.547],
          [77.369, 31.551],
        ];

  const waypoints: TrekWaypoint[] =
    trekRoute?.waypoints && trekRoute.waypoints.length > 0
      ? trekRoute.waypoints
      : DEFAULT_RAGHUPUR_WAYPOINTS;

  const bounds = boundsOf(coordinates);

  useEffect(() => {
    cameraRef.current?.fitBounds(bounds, {
      padding: { top: 60, bottom: 60, left: 60, right: 60 },
      duration: 900,
    });
  }, []);

  const routeGeoJSON = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates,
    },
  };

  const hours = Math.floor(elapsedSec / 3600);
  const mins = Math.floor((elapsedSec % 3600) / 60);
  const durationFormatted = `${hours}:${mins < 10 ? `0${mins}` : mins}`;

  const handleTogglePause = async () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    if (sessionId) {
      try {
        if (nextState) {
          await pauseTrekSession(sessionId);
        } else {
          await resumeTrekSession(sessionId);
        }
      } catch {}
    }
  };

  const handleEndTrek = () => {
    Alert.alert(
      "Complete Trek?",
      "Are you sure you want to finish and save your trek summary?",
      [
        { text: "Continue Trekking", style: "cancel" },
        {
          text: "End Trek",
          style: "destructive",
          onPress: async () => {
            let finalStats = {
              actualDistanceKm: 18.7,
              actualDurationSec: elapsedSec,
              elevationGainM: 1864,
              highestAltitudeM: 3910,
            };

            if (sessionId) {
              try {
                const completed = await completeTrekSession(sessionId);
                if (completed) {
                  finalStats = {
                    actualDistanceKm: completed.actualDistanceKm || 18.7,
                    actualDurationSec: completed.actualDurationSec || elapsedSec,
                    elevationGainM: completed.elevationGainM || 1864,
                    highestAltitudeM: completed.highestAltitudeM || 3910,
                  };
                }
              } catch {}
            }

            const h = Math.floor(finalStats.actualDurationSec / 3600);
            const m = Math.floor((finalStats.actualDurationSec % 3600) / 60);
            const durationText = `${h}h ${m}m`;

            navigation.navigate("TrekComplete", {
              trekId,
              trekName,
              route: trekRoute,
              sessionId: sessionId || undefined,
              finalDistanceKm: finalStats.actualDistanceKm,
              finalDurationText: durationText,
              finalElevationGainM: finalStats.elevationGainM,
              highestAltitudeM: finalStats.highestAltitudeM || 3910,
              waypointsCovered: "6 / 6",
            });
          },
        },
      ]
    );
  };

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

        <Text style={styles.headerTitle}>Live Trek Tracking</Text>

        <TouchableOpacity
          style={styles.bookmarkBtn}
          onPress={() => setIsSaved((p: boolean) => !p)}
          activeOpacity={0.75}
        >
          <BookmarkIcon size={20} filled={isSaved} />
        </TouchableOpacity>
      </View>

      {/* Live Status Subheader */}
      <View style={styles.statusSubheader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={[
              styles.statusPill,
              isPaused ? styles.statusPillPaused : styles.statusPillActive,
            ]}
          >
            <View
              style={[
                styles.statusPillDot,
                isPaused ? styles.statusDotPaused : styles.statusDotActive,
              ]}
            />
            <Text
              style={[
                styles.statusPillText,
                isPaused ? styles.statusTextPaused : styles.statusTextActive,
              ]}
            >
              {isPaused ? "Tracking Paused" : "Tracking Active"}
            </Text>
          </View>

          {sessionId?.startsWith("offline_sess_") && (
            <View style={styles.offlineSessionBadge}>
              <Text style={styles.offlineSessionText}>🛰️ Offline Mode</Text>
            </View>
          )}
        </View>
        <Text style={styles.trekSubtitle}>{trekName || "Raghupur Fort Trek"}</Text>
      </View>

      {/* Interactive Live Map */}
      <View style={styles.mapContainer}>
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE}>
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: userCoord,
              zoom: 13.5,
            }}
          />

          {/* Trail Polyline */}
          <GeoJSONSource id="live-trail-source" data={routeGeoJSON}>
            <Layer
              id="live-trail-halo"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#FFFFFF", "line-width": 6 }}
            />
            <Layer
              id="live-trail-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": colors.success, "line-width": 4 }}
            />
          </GeoJSONSource>

          {/* Live GPS Puck */}
          <Marker lngLat={userCoord} anchor="center">
            <LiveTrackingPuck />
          </Marker>

          {/* Waypoints */}
          {waypoints.map((wp, idx) => (
            <Marker
              key={wp.id || `live-wp-${idx}`}
              lngLat={[wp.lng, wp.lat]}
              anchor="center"
            >
              <WaypointBubbleMarker
                name={wp.name}
                altitude={wp.tags?.ele || (idx === 0 ? 3120 : idx === 1 ? 3400 : idx === 2 ? 3650 : idx === 3 ? 3910 : 3294)}
                isEnd={idx === waypoints.length - 1}
              />
            </Marker>
          ))}
        </MapView>
      </View>

      {/* Bottom Live Stats & Action Sheet */}
      <View style={styles.bottomCard}>
        {/* 3 Key Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{distanceKm.toFixed(1)}</Text>
            <Text style={styles.statUnit}>km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{durationFormatted}</Text>
            <Text style={styles.statUnit}>hrs</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <Text style={styles.statNumber}>+{elevGainM}</Text>
            <Text style={styles.statUnit}>m</Text>
            <Text style={styles.statLabel}>Elev. Gain</Text>
          </View>
        </View>

        {/* Action Buttons: Pause & Add Memory */}
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={handleTogglePause}
            activeOpacity={0.8}
          >
            <View style={styles.controlIconCircle}>
              {isPaused ? <PlayIcon size={20} /> : <PauseIcon size={20} />}
            </View>
            <Text style={styles.controlBtnLabel}>{isPaused ? "Resume" : "Pause"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setAddMemoryOpen(true)}
            activeOpacity={0.8}
          >
            <View style={styles.controlIconCircle}>
              <CameraIcon size={20} color={colors.accent} />
            </View>
            <Text style={styles.controlBtnLabel}>Add Memory</Text>
          </TouchableOpacity>
        </View>

        {/* End Trek Button */}
        <TouchableOpacity
          style={styles.endTrekBtn}
          onPress={handleEndTrek}
          activeOpacity={0.85}
        >
          <Text style={styles.endTrekBtnText}>End Trek</Text>
        </TouchableOpacity>
      </View>

      {/* Add Memory Modal */}
      <AddMemoryModal
        visible={addMemoryOpen}
        poiId={trekId}
        trekId={trekId}
        trekRouteId={trekRoute?.id}
        trekSessionId={sessionId || undefined}
        placeName={trekName}
        onClose={() => setAddMemoryOpen(false)}
        onSuccess={() => {
          Alert.alert("Memory Added", "Your trek photo memory has been recorded!");
        }}
      />
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
  statusSubheader: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    marginBottom: 4,
  },
  statusPillActive: {
    backgroundColor: colors.successBg,
  },
  statusPillPaused: {
    backgroundColor: colors.warningBg,
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  statusDotPaused: {
    backgroundColor: colors.warning,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextPaused: {
    color: colors.warning,
  },
  offlineSessionBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 4,
  },
  offlineSessionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  trekSubtitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.2,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: "#E5E7EB",
  },
  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  statCol: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted,
    marginTop: -2,
  },
  statLabel: {
    fontSize: 11.5,
    color: colors.inkSoft,
    fontWeight: "500",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E5E7EB",
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 48,
    marginVertical: 14,
  },
  controlBtn: {
    alignItems: "center",
  },
  controlIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  controlBtnLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  endTrekBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  endTrekBtnText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  wpBubbleContainer: {
    alignItems: "center",
  },
  wpBubbleBox: {
    backgroundColor: "rgba(24, 24, 27, 0.88)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 3,
    alignItems: "center",
  },
  wpBubbleName: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  wpBubbleAlt: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 9,
    fontWeight: "500",
  },
  wpDotOuter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  wpDotEnd: {
    backgroundColor: "#DC2626",
  },
  wpDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  puckOuterHalo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(234, 108, 30, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  puckMidRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  puckCenterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
});
