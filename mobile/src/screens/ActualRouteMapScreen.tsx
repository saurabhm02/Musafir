import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
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
  type CameraRef,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import type { RootStackParamList } from "../navigation";
import { fetchTrekSession, type TrekSession } from "../lib/trekTracker";
import { fetchTrekMemories, type TrekMemoryItem } from "../lib/memories";
import { TrekPhotoMarker } from "../components/TrekPhotoMarker";
import {
  BackArrowIcon,
  LayerIcon,
  RecenterGpsIcon,
} from "../components/TrekMemoriesIcons";
import { CameraBadgeIcon } from "../components/TrekStoryIcons";
import { colors } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Props = NativeStackScreenProps<RootStackParamList, "ActualRouteMap">;

export function ActualRouteMapScreen({ navigation, route }: Props) {
  const { sessionId, trekId, trekName: paramTrekName, routeId } = route.params;

  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);

  const [session, setSession] = useState<TrekSession | null>(null);
  const [memories, setMemories] = useState<TrekMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load session & memories
  useEffect(() => {
    (async () => {
      try {
        if (sessionId) {
          const s = await fetchTrekSession(sessionId);
          setSession(s);
        }
        if (trekId) {
          const memRes = await fetchTrekMemories(trekId, { routeId });
          if (memRes.items.length > 0) {
            setMemories(memRes.items);
          }
        }
      } catch (err) {
        console.warn("Could not fetch route map data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, trekId, routeId]);

  const trekName = session?.trekName || paramTrekName || "Raghupur Fort Trek";

  // Coordinates for Verified Route & Actual GPS Track
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

  const verifiedCoordinates: [number, number][] = useMemo(() => {
    if (session?.routeGeometry?.coordinates?.length) {
      return session.routeGeometry.coordinates;
    }
    // Subtle deviation for visual clarity
    return actualCoordinates.map(([lon, lat]) => [lon + 0.0004, lat + 0.0003]);
  }, [session, actualCoordinates]);

  // GeoJSON for Actual Track (Solid Bright Green)
  const actualGeoJSON = useMemo(() => {
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

  // GeoJSON for Verified Route (Dashed Green)
  const verifiedGeoJSON = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: verifiedCoordinates,
          },
          properties: {},
        },
      ],
    };
  }, [verifiedCoordinates]);

  const centerCoord = actualCoordinates[Math.floor(actualCoordinates.length / 2)] || [77.376, 31.537];

  const handleRecenter = () => {
    if (cameraRef.current && actualCoordinates.length > 0) {
      let minLng = actualCoordinates[0]![0],
        maxLng = actualCoordinates[0]![0];
      let minLat = actualCoordinates[0]![1],
        maxLat = actualCoordinates[0]![1];
      for (const [lng, lat] of actualCoordinates) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      cameraRef.current.fitBounds([minLng, minLat, maxLng, maxLat], {
        padding: { top: 70, bottom: 220, left: 40, right: 40 },
        duration: 800,
      });
    }
  };

  // Waypoints on Trail
  const waypoints = [
    { name: "Chehni Kothi", alt: "3,400 m", coord: [77.377, 31.536] as [number, number], photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=160" },
    { name: "Buri Nali", alt: "3,650 m", coord: [77.376, 31.537] as [number, number], photo: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=160" },
    { name: "Raghupur Top", alt: "3,910 m", coord: [77.3745, 31.5385] as [number, number], photo: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=160" },
  ];

  const startCoord = actualCoordinates[0] || [77.378, 31.5348];
  const endCoord = actualCoordinates[actualCoordinates.length - 1] || [77.372, 31.541];

  const totalMemoriesCount = memories.length || 12;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Fullscreen MapLibre Canvas */}
      <View style={styles.mapArea}>
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE}>
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: centerCoord,
              zoom: 14.0,
            }}
          />

          {/* 1. Verified Route (Dashed Line) */}
          <GeoJSONSource id="verified-trail-source" data={verifiedGeoJSON}>
            <Layer
              id="verified-trail-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": "#15803D",
                "line-width": 3,
                "line-dasharray": [2, 2],
              }}
            />
          </GeoJSONSource>

          {/* 2. Actual GPS Track (Solid Bright Green with Halo) */}
          <GeoJSONSource id="actual-trail-source" data={actualGeoJSON}>
            <Layer
              id="actual-trail-halo"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#FFFFFF", "line-width": 6 }}
            />
            <Layer
              id="actual-trail-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#16A34A", "line-width": 4 }}
            />
          </GeoJSONSource>

          {/* Start Marker (Blue Pin) */}
          <Marker lngLat={startCoord} anchor="bottom">
            <View style={styles.waypointPinWrap}>
              <View style={styles.waypointBubble}>
                <Text style={styles.waypointBubbleTitle}>Jalori Pass</Text>
                <Text style={styles.waypointBubbleAlt}>3,120 m</Text>
              </View>
              <View style={styles.startPinCircle}>
                <View style={styles.startPinInner} />
              </View>
            </View>
          </Marker>

          {/* End Marker (Red Pin) */}
          <Marker lngLat={endCoord} anchor="bottom">
            <View style={styles.waypointPinWrap}>
              <View style={[styles.waypointBubble, { borderColor: "#EF4444" }]}>
                <Text style={styles.waypointBubbleTitle}>Raghupur Fort</Text>
                <Text style={styles.waypointBubbleAlt}>3,294 m</Text>
              </View>
              <View style={styles.endPinCircle}>
                <View style={styles.endPinInner} />
              </View>
            </View>
          </Marker>

          {/* Waypoints Along Route */}
          {waypoints.map((wp, idx) => (
            <Marker key={idx} lngLat={wp.coord} anchor="center">
              <View style={styles.waypointPhotoMarkerWrap}>
                <Image source={{ uri: wp.photo }} style={styles.waypointPhotoMarker} resizeMode="cover" />
                <View style={styles.waypointLabelBubble}>
                  <Text style={styles.waypointLabelTitle}>{wp.name}</Text>
                  <Text style={styles.waypointLabelAlt}>{wp.alt}</Text>
                </View>
              </View>
            </Marker>
          ))}

          {/* Photo Markers */}
          {memories.slice(0, 4).map((m, idx) => {
            if (m.lat == null || m.lon == null) return null;
            return (
              <Marker key={m.id || idx} lngLat={[m.lon, m.lat]} anchor="bottom">
                <TrekPhotoMarker
                  photoUrl={m.thumbnail_url || m.photo_url}
                  isPrivate={m.visibility === "private"}
                  onPress={() =>
                    navigation.navigate("MemoryDetail", {
                      memoryId: m.id,
                      memory: m,
                      trekId,
                      trekName,
                    })
                  }
                />
              </Marker>
            );
          })}
        </MapView>

        {/* Top Floating Controls */}
        <SafeAreaView style={styles.topBar} edges={["top"]}>
          <TouchableOpacity
            style={styles.floatingBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <BackArrowIcon size={20} color="#18181B" />
          </TouchableOpacity>

          <View style={styles.topRightControls}>
            <TouchableOpacity style={styles.floatingBtn} activeOpacity={0.8}>
              <LayerIcon size={20} color="#18181B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.floatingBtn} onPress={handleRecenter} activeOpacity={0.8}>
              <RecenterGpsIcon size={20} color="#18181B" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Map Legend (Bottom Left) */}
        <View style={styles.mapLegend}>
          <View style={styles.legendRow}>
            <View style={styles.legendSolidGreen} />
            <Text style={styles.legendText}>Your Trek (GPS)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendDashedGreen} />
            <Text style={styles.legendText}>Verified Route</Text>
          </View>
        </View>

        {/* Bottom Sheet: Memories on Route */}
        <View style={styles.bottomSheet}>
          <View style={styles.handleBar} />

          {/* Header */}
          <TouchableOpacity
            style={styles.bottomSheetHeader}
            onPress={() =>
              navigation.navigate("TrekMemoriesGallery", {
                sessionId,
                trekId,
                trekName,
              })
            }
            activeOpacity={0.75}
          >
            <View>
              <Text style={styles.bottomSheetTitle}>Memories on Route</Text>
              <Text style={styles.bottomSheetCount}>{totalMemoriesCount} memories</Text>
            </View>
            <Text style={styles.bottomSheetArrow}>›</Text>
          </TouchableOpacity>

          {/* Horizontal Photo Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoCarousel}
          >
            {(memories.length > 0 ? memories : defaultCarouselPhotos).map((item, idx) => {
              const photoUri = (item as any).thumbnail_url || (item as any).photo_url || (item as any).uri;
              return (
                <TouchableOpacity
                  key={(item as any).id || idx}
                  style={styles.carouselThumbWrap}
                  onPress={() => {
                    if ((item as any).id) {
                      navigation.navigate("MemoryDetail", {
                        memoryId: (item as any).id,
                        memory: item as any,
                        trekId,
                        trekName,
                      });
                    }
                  }}
                  activeOpacity={0.88}
                >
                  <Image source={{ uri: photoUri }} style={styles.carouselThumb} resizeMode="cover" />
                  <View style={styles.carouselCameraBadge}>
                    <CameraBadgeIcon size={10} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const defaultCarouselPhotos = [
  { id: "1", uri: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200" },
  { id: "2", uri: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200" },
  { id: "3", uri: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200" },
  { id: "4", uri: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200" },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mapArea: {
    flex: 1,
    position: "relative",
  },
  topBar: {
    position: "absolute",
    top: 10,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  topRightControls: {
    flexDirection: "row",
    gap: 10,
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  mapLegend: {
    position: "absolute",
    bottom: 180,
    left: 16,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSolidGreen: {
    width: 18,
    height: 3,
    backgroundColor: "#16A34A",
    borderRadius: 1.5,
  },
  legendDashedGreen: {
    width: 18,
    height: 3,
    borderWidth: 1.5,
    borderColor: "#15803D",
    borderStyle: "dashed",
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#18181B",
  },
  waypointPinWrap: {
    alignItems: "center",
  },
  waypointBubble: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#2563EB",
    marginBottom: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  waypointBubbleTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#18181B",
  },
  waypointBubbleAlt: {
    fontSize: 9,
    color: "#71717A",
  },
  startPinCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  startPinInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  endPinCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  endPinInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  waypointPhotoMarkerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  waypointPhotoMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  waypointLabelBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  waypointLabelTitle: {
    fontSize: 9,
    fontWeight: "700",
    color: "#18181B",
  },
  waypointLabelAlt: {
    fontSize: 8,
    color: "#71717A",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E4E4E7",
    alignSelf: "center",
    marginBottom: 10,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18181B",
  },
  bottomSheetCount: {
    fontSize: 12,
    color: "#71717A",
  },
  bottomSheetArrow: {
    fontSize: 20,
    color: "#71717A",
    fontWeight: "600",
  },
  photoCarousel: {
    gap: 10,
  },
  carouselThumbWrap: {
    width: 78,
    height: 78,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#18181B",
  },
  carouselThumb: {
    width: "100%",
    height: "100%",
  },
  carouselCameraBadge: {
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
});
