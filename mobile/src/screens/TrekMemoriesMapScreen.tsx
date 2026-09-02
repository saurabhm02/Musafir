import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
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
import { fetchTrekById, type TrekDetailsData, type TrekRouteItem, type TrekWaypoint } from "../lib/treks";
import { fetchTrekMemories, type TrekMemoryItem } from "../lib/memories";
import { TrekPhotoMarker } from "../components/TrekPhotoMarker";
import { MemoryCardItem } from "../components/MemoryCardItem";
import {
  BackArrowIcon,
  FilterSlidersIcon,
  LayerIcon,
  RecenterGpsIcon,
  ChevronDownIcon,
} from "../components/TrekMemoriesIcons";
import { colors } from "../theme";
import Svg, { Circle, Path } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Props = NativeStackScreenProps<RootStackParamList, "TrekMemoriesMap">;

type FilterType = "all" | "photos" | "videos" | "notes";

function WaypointBubbleMarker({ name, type }: { name?: string; type?: string }) {
  let emoji = "📍";
  let bg = "#F59E0B";

  if (type === "peak") {
    emoji = "⛰️";
    bg = "#D97706";
  } else if (type === "campsite" || type === "camp") {
    emoji = "⛺";
    bg = "#16A34A";
  } else if (type === "pass") {
    emoji = "🏔️";
    bg = "#7C3AED";
  } else if (type === "viewpoint") {
    emoji = "👁️";
    bg = "#EA580C";
  }

  return (
    <View style={styles.waypointPinContainer}>
      <View style={[styles.waypointPinBubble, { backgroundColor: bg }]}>
        <Text style={styles.waypointPinEmoji}>{emoji}</Text>
      </View>
      {name ? (
        <View style={styles.waypointPinLabelWrap}>
          <Text style={styles.waypointPinLabelText} numberOfLines={1}>
            {name}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function StartEndMarker({ isEnd = false, label }: { isEnd?: boolean; label?: string }) {
  const pinColor = isEnd ? "#DC2626" : "#2563EB";

  return (
    <View style={styles.startEndPinContainer}>
      <View style={[styles.startEndPinBubble, { backgroundColor: pinColor }]}>
        <View style={styles.startEndPinInnerDot} />
      </View>
      {label ? (
        <View style={[styles.startEndLabelWrap, { borderColor: pinColor }]}>
          <Text style={[styles.startEndLabelText, { color: pinColor }]}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function TrekMemoriesMapScreen({ navigation, route }: Props) {
  const { trekId, trekName: initialTrekName, routeId: initialRouteId } = route.params;

  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const listRef = useRef<FlatList>(null);

  const [trek, setTrek] = useState<TrekDetailsData | null>(null);
  const [activeRoute, setActiveRoute] = useState<TrekRouteItem | null>(null);
  const [memories, setMemories] = useState<TrekMemoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedType, setSelectedType] = useState<FilterType>("all");
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch Trek and Route Data
  useEffect(() => {
    let isMounted = true;
    fetchTrekById(trekId)
      .then((data) => {
        if (!isMounted) return;
        setTrek(data);
        const matched = data.routes.find((r) => r.id === initialRouteId) || data.routes[0] || null;
        setActiveRoute(matched);
      })
      .catch((err) => {
        console.warn("Failed to load trek details:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [trekId, initialRouteId]);

  // 2. Fetch Trek Memories
  const loadMemories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchTrekMemories(trekId, {
        routeId: activeRoute?.id,
        type: selectedType,
        limit: 50,
      });
      setMemories(res.items);
      setTotalCount(res.total);
    } catch (err) {
      console.warn("Failed to load trek memories:", err);
    } finally {
      setIsLoading(false);
    }
  }, [trekId, activeRoute?.id, selectedType]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Trail Coordinates & Geometry
  const trailCoordinates = useMemo(() => {
    if (activeRoute?.geometry?.coordinates && activeRoute.geometry.coordinates.length > 0) {
      return activeRoute.geometry.coordinates;
    }
    // Fallback default coordinates for Raghupur Fort Trail
    return [
      [77.3717, 31.5372],
      [77.3775, 31.5365],
      [77.3898, 31.5396],
      [77.426, 31.5401],
      [77.4295, 31.5375],
      [77.431, 31.5384],
      [77.433, 31.5461],
    ] as [number, number][];
  }, [activeRoute]);

  const routeGeoJSON = useMemo(() => {
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: trailCoordinates,
      },
    };
  }, [trailCoordinates]);

  // Fit Camera to trail
  const centerCoord = trailCoordinates[Math.floor(trailCoordinates.length / 2)] || [77.3898, 31.5396];

  const handleRecenter = () => {
    if (cameraRef.current && trailCoordinates.length > 0) {
      let minLng = trailCoordinates[0]![0],
        maxLng = trailCoordinates[0]![0];
      let minLat = trailCoordinates[0]![1],
        maxLat = trailCoordinates[0]![1];
      for (const [lng, lat] of trailCoordinates) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      cameraRef.current.fitBounds([minLng, minLat, maxLng, maxLat], {
        padding: { top: 70, bottom: 240, left: 40, right: 40 },
        duration: 900,
      });
    }
  };

  // When tapping a memory pin on map or in bottom carousel
  const handleSelectMemory = (item: TrekMemoryItem, index?: number) => {
    setSelectedMemoryId(item.id);
    if (item.lat != null && item.lon != null && cameraRef.current) {
      cameraRef.current.flyTo({
        center: [item.lon, item.lat],
        zoom: 14.5,
        duration: 600,
      });
    }
    if (index != null && listRef.current) {
      listRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  };

  const handleOpenMemoryDetail = (item: TrekMemoryItem) => {
    navigation.navigate("MemoryDetail", {
      memoryId: item.id,
      memory: item,
      trekId: trek?.id || trekId,
      trekName: trek?.name || initialTrekName,
    });
  };

  const handleOpenAddMemory = () => {
    navigation.navigate("AddMemory", {
      trekId: trek?.id || trekId,
      trekName: trek?.name || initialTrekName,
      routeId: activeRoute?.id,
      initialLat: centerCoord[1],
      initialLon: centerCoord[0],
    });
  };

  const handleOpenFilter = () => {
    navigation.navigate("FilteredMemories", {
      trekId: trek?.id || trekId,
      trekName: trek?.name || initialTrekName,
      activeType: selectedType,
      onApply: (type) => {
        setSelectedType(type as FilterType);
      },
    });
  };

  const startCoord = trailCoordinates[0] || [77.3717, 31.5372];
  const endCoord = trailCoordinates[trailCoordinates.length - 1] || [77.433, 31.5461];
  const waypoints = activeRoute?.waypoints || [];

  const trekTitle = trek?.name || initialTrekName || "Raghupur Fort Trek";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <BackArrowIcon size={22} color="#18181B" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Trek Memories</Text>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleOpenFilter}
          activeOpacity={0.7}
        >
          <FilterSlidersIcon size={20} color="#18181B" />
        </TouchableOpacity>
      </View>

      {/* Trek Selector Chip */}
      <View style={styles.trekSelectorRow}>
        <TouchableOpacity
          style={styles.trekSelectorChip}
          onPress={() => {
            if (trek) {
              navigation.navigate("AvailableRoutes", {
                trekId: trek.id,
                trekName: trek.name,
                initialRouteId: activeRoute?.id,
              });
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.trekSelectorText} numberOfLines={1}>
            {trekTitle}
          </Text>
          <ChevronDownIcon size={14} color="#71717A" />
        </TouchableOpacity>
      </View>

      {/* MapLibre Map View */}
      <View style={styles.mapWrap}>
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE}>
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: centerCoord,
              zoom: 13.2,
            }}
          />

          {/* Trail Polyline */}
          <GeoJSONSource id="trek-memories-trail-source" data={routeGeoJSON}>
            <Layer
              id="trail-halo"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#FFFFFF", "line-width": 6 }}
            />
            <Layer
              id="trail-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#16A34A", "line-width": 3.8 }}
            />
          </GeoJSONSource>

          {/* Start Point Marker */}
          <Marker lngLat={startCoord} anchor="center">
            <StartEndMarker isEnd={false} label="Trek Start" />
          </Marker>

          {/* End Point Marker */}
          <Marker lngLat={endCoord} anchor="center">
            <StartEndMarker isEnd={true} label="Trek End" />
          </Marker>

          {/* Waypoints */}
          {waypoints.map((wp, idx) => (
            <Marker key={wp.id || `wp-${idx}`} lngLat={[wp.lng, wp.lat]} anchor="center">
              <WaypointBubbleMarker name={wp.name} type={wp.type} />
            </Marker>
          ))}

          {/* Real Photo Memory Markers along Trail */}
          {memories
            .filter((m) => m.lat != null && m.lon != null)
            .map((m, idx) => {
              const isSelected = selectedMemoryId === m.id;
              return (
                <Marker
                  key={m.id}
                  lngLat={[m.lon!, m.lat!]}
                  anchor="bottom"
                  onPress={() => handleSelectMemory(m, idx)}
                >
                  <TouchableOpacity
                    onPress={() => {
                      handleSelectMemory(m, idx);
                      handleOpenMemoryDetail(m);
                    }}
                    activeOpacity={0.9}
                  >
                    <TrekPhotoMarker
                      photoUrl={m.thumbnail_url || m.photo_url}
                      count={1}
                      isPrivate={m.visibility === "private"}
                      isSelected={isSelected}
                    />
                  </TouchableOpacity>
                </Marker>
              );
            })}
        </MapView>

        {/* Floating Controls Right Side */}
        <View style={styles.floatingControls}>
          <TouchableOpacity style={styles.floatingBtn} onPress={handleRecenter} activeOpacity={0.8}>
            <RecenterGpsIcon size={20} color="#18181B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatingBtn} activeOpacity={0.8}>
            <LayerIcon size={20} color="#18181B" />
          </TouchableOpacity>
        </View>

        {/* Floating Add Memory CTA Button */}
        <TouchableOpacity
          style={styles.floatingAddMemoryBtn}
          onPress={handleOpenAddMemory}
          activeOpacity={0.88}
        >
          <Text style={styles.floatingAddMemoryText}>+ Add Memory</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet: Memories on this trek */}
      <View style={styles.bottomSheet}>
        {/* Title and Count Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Memories on this trek</Text>
          <Text style={styles.sheetCount}>{totalCount} memories</Text>
        </View>

        {/* Type Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {(
            [
              { key: "all", label: `All (${totalCount})` },
              { key: "photos", label: `Photos (${Math.max(0, totalCount - 2)})` },
              { key: "videos", label: `Videos (2)` },
              { key: "notes", label: `Notes (1)` },
            ] as const
          ).map((chip) => {
            const isSelected = selectedType === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedType(chip.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Horizontal Memories Carousel */}
        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : memories.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No memories yet along this trail</Text>
            <Text style={styles.emptySubtitle}>Be the first trekker to pin a photo here!</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAddMemory} activeOpacity={0.85}>
              <Text style={styles.emptyAddBtnText}>Add First Memory</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={memories}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContainer}
            renderItem={({ item, index }) => (
              <MemoryCardItem
                memory={item}
                isSelected={selectedMemoryId === item.id}
                onPress={() => {
                  handleSelectMemory(item, index);
                  handleOpenMemoryDetail(item);
                }}
                onLikePress={() => {
                  setMemories((prev) =>
                    prev.map((m) =>
                      m.id === item.id ? { ...m, is_liked: !m.is_liked, likes_count: m.likes_count + (m.is_liked ? -1 : 1) } : m
                    )
                  );
                }}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  trekSelectorRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  trekSelectorChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F4F4F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  trekSelectorText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#18181B",
  },
  mapWrap: {
    flex: 1,
    position: "relative",
  },
  floatingControls: {
    position: "absolute",
    top: 14,
    right: 14,
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
  floatingAddMemoryBtn: {
    position: "absolute",
    bottom: 14,
    right: 14,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
  },
  floatingAddMemoryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 20 : 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#18181B",
  },
  sheetCount: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "500",
  },
  filterChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: "#FFF5ED",
    borderColor: colors.accent,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#71717A",
  },
  filterChipTextActive: {
    color: colors.accent,
  },
  carouselContainer: {
    paddingHorizontal: 16,
  },
  loaderWrap: {
    height: 185,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    height: 185,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#71717A",
    textAlign: "center",
    marginBottom: 12,
  },
  emptyAddBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  emptyAddBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  waypointPinContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  waypointPinBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  waypointPinEmoji: {
    fontSize: 12,
  },
  waypointPinLabelWrap: {
    backgroundColor: "rgba(24, 24, 27, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  waypointPinLabelText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  startEndPinContainer: {
    alignItems: "center",
  },
  startEndPinBubble: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  startEndPinInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  startEndLabelWrap: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
  },
  startEndLabelText: {
    fontSize: 9,
    fontWeight: "800",
  },
});
