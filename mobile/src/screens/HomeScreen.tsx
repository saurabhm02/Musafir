import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Map3D } from "../components/Map3D";
import { fetchNearbyPois, fetchSearchPois, fetchAllPois, type Poi } from "../lib/pois";
import { fetchPoiStatusMap, setPoiStatus, type PoiStatus } from "../lib/poiStatus";
import { getCurrentLocation, getCachedLocation, type Coords } from "../lib/location";
import { categoryColor, categoryIconPath } from "../components/categoryIcons";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import { colors } from "../theme";
import type { RootStackParamList } from "../navigation";

const NEARBY_OPTIONS = [50, 100, 200, 500] as const;
const ZOOM_FOR_RADIUS: Record<number, number> = { 50: 10.1, 100: 9.3, 200: 8.4, 500: 7.0 };

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke="#9CA3AF" strokeWidth={2.2} />
      <Path d="M20 20L16 16" stroke="#9CA3AF" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function ClearIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" fill="#9CA3AF" />
      <Path d="M15 9L9 15M9 9l6 6" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function StarIcon({ size = 12 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#F59E0B">
      <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </Svg>
  );
}

function BookmarkIcon({ size = 18, saved = false }: { size?: number; saved?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={saved ? colors.accent : "none"}>
      <Path
        d="M19 21L12 16L5 21V5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V21Z"
        stroke={saved ? colors.accent : "#9CA3AF"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PinSmallIcon({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C16 17 20 13.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13.4183 8 17 12 21Z"
        fill="#2563EB"
      />
      <Circle cx="12" cy="9" r="3" fill="#FFFFFF" />
    </Svg>
  );
}

function NavigationArrowSmallIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11L21 3L13 21L11 13L3 11Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

function RefreshIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4v5h5M20 20v-5h-5M4.5 9a8 8 0 0 1 13.9-3.4L20 9M19.5 15a8 8 0 0 1-13.9 3.4L4 15"
        stroke="#2563EB"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function FilterSliderIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6h16M4 12h16M4 18h16" stroke="#18181B" strokeWidth={2} strokeLinecap="round" />
      <Circle cx="8" cy="6" r="2.5" fill="#FFFFFF" stroke="#18181B" strokeWidth={2} />
      <Circle cx="16" cy="12" r="2.5" fill="#FFFFFF" stroke="#18181B" strokeWidth={2} />
      <Circle cx="10" cy="18" r="2.5" fill="#FFFFFF" stroke="#18181B" strokeWidth={2} />
    </Svg>
  );
}

function MapListToggleIcon({ size = 18, isList = false }: { size?: number; isList?: boolean }) {
  if (isList) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" stroke="#18181B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 3v15M15 6v15" stroke="#18181B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="#18181B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const CATEGORIES = [
  { id: "all", label: "All", icon: "⛺" },
  { id: "trek", label: "Treks", icon: "⛺" },
  { id: "temple", label: "Temples", icon: "🛕" },
  { id: "viewpoint", label: "Viewpoints", icon: "🌄" },
  { id: "beach", label: "Beaches", icon: "🏖" },
  { id: "waterfall", label: "Waterfalls", icon: "🌊" },
  { id: "heritage", label: "Heritage", icon: "🏛" },
  { id: "camping", label: "Camping", icon: "🏕" },
  { id: "lake", label: "Lakes", icon: "🏞" },
] as const;

type SortMode = "relevance" | "nearest" | "top_rated";

function haversineKm(a: Coords, b: Coords) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const [pois, setPois] = useState<Poi[]>([]);
  const [poisLoading, setPoisLoading] = useState(true);
  const [statusMap, setStatusMap] = useState<Record<string, PoiStatus>>({});
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("nearest");
  const [radiusKm, setRadiusKm] = useState<number>(100);
  const [deviceLocation, setDeviceLocation] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [isListOnlyMode, setIsListOnlyMode] = useState(false);

  const isSearchActive = isSearchFocused || query.trim().length > 0;

  const abortControllerRef = useRef<AbortController | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchPoiStatusMap().then(setStatusMap).catch(() => {});
    }, []),
  );

  function refreshLocation() {
    setLocating(true);
    getCurrentLocation()
      .then((fresh) => {
        if (fresh) setDeviceLocation(fresh);
      })
      .finally(() => setLocating(false));
  }

  // Load initial GPS location
  useEffect(() => {
    let cancelled = false;
    getCachedLocation().then((cached) => {
      if (!cancelled && cached) {
        setDeviceLocation(cached);
        setLocating(false);
      }
    });
    getCurrentLocation().then((fresh) => {
      if (cancelled) return;
      if (fresh) setDeviceLocation(fresh);
      setLocating(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Main Data Fetching Effect: Handles both on-demand nearby & debounced search
  useEffect(() => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const cleanQ = query.trim();

    // 1. Text Search Mode (Debounced by 300ms across India)
    if (cleanQ.length > 0) {
      setPoisLoading(true);
      const timer = setTimeout(async () => {
        try {
          const results = await fetchSearchPois(cleanQ, selectedCategory, 60, controller.signal);
          if (!controller.signal.aborted) {
            setPois(results);
          }
        } catch (err: any) {
          if (err?.name !== "AbortError" && !controller.signal.aborted) {
            setPois([]);
          }
        } finally {
          if (!controller.signal.aborted) {
            setPoisLoading(false);
          }
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    }

    // 2. Nearby Mode (Spatial PostGIS query based on location, radius, and category)
    setPoisLoading(true);

    async function loadNearby() {
      try {
        if (deviceLocation) {
          const results = await fetchNearbyPois(
            deviceLocation.lat,
            deviceLocation.lon,
            radiusKm,
            selectedCategory,
            80,
            controller.signal,
          );
          if (!controller.signal.aborted) {
            setPois(results);
          }
        } else {
          // If location not yet resolved, fetch top curated places
          const results = await fetchAllPois();
          if (!controller.signal.aborted) {
            setPois(results);
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError" && !controller.signal.aborted) {
          setPois([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setPoisLoading(false);
        }
      }
    }

    loadNearby();

    return () => {
      controller.abort();
    };
  }, [query, selectedCategory, radiusKm, deviceLocation]);

  const handleTabPress = (tab: TabType) => {
    if (tab === "Home") navigation.navigate("Dashboard");
    else if (tab === "Trips") navigation.navigate("TripTracking", undefined);
    else if (tab === "Profile") navigation.navigate("Auth");
  };

  const toggleSave = async (poi: Poi) => {
    const next = statusMap[poi.id] === "saved" ? null : "saved";
    setStatusMap((prev) => ({ ...prev, [poi.id]: next as PoiStatus }));
    try {
      await setPoiStatus(poi.id, next);
    } catch {}
  };

  const distanceTo = (poi: { lat: number; lon: number }): number | null => {
    return deviceLocation ? haversineKm(deviceLocation, poi) : null;
  };

  // Sort the server-fetched POIs
  const filteredPois = useMemo(() => {
    const sorted = [...pois];
    if (sortMode === "top_rated") {
      sorted.sort((a, b) => Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0));
    } else if (sortMode === "nearest" && deviceLocation) {
      sorted.sort((a, b) => haversineKm(deviceLocation, a) - haversineKm(deviceLocation, b));
    }
    return sorted;
  }, [pois, sortMode, deviceLocation]);

  const selectPoiOnMap = (poi: Poi) => {
    navigation.navigate("PlaceDetails", { poi });
  };

  const clearSelection = () => {
    setSelectedPoi(null);
  };

  const toggleSort = () => {
    if (sortMode === "nearest") setSortMode("top_rated");
    else setSortMode("nearest");
  };

  const sortLabel = sortMode === "nearest" ? "Sort by Nearest" : "Sort by Rating";

  const focusCenter: [number, number] | undefined = selectedPoi
    ? [selectedPoi.lon, selectedPoi.lat]
    : query.trim() && filteredPois.length > 0
    ? [filteredPois[0].lon, filteredPois[0].lat]
    : deviceLocation
    ? [deviceLocation.lon, deviceLocation.lat]
    : undefined;

  const focusZoom = selectedPoi
    ? 13
    : query.trim() && filteredPois.length > 0
    ? 11
    : ZOOM_FOR_RADIUS[radiusKm] ?? 9.3;

  return (
    <View style={styles.container}>
      {/* Top Search & Filter Area */}
      <SafeAreaView style={styles.topArea} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

        {/* Top Header: Title & Map/List Toggle */}
        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>Explore</Text>
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setIsListOnlyMode((prev) => !prev)}
            activeOpacity={0.8}
          >
            <MapListToggleIcon size={18} isList={isListOnlyMode} />
          </TouchableOpacity>
        </View>

        {/* Modern Search Bar */}
        <View style={styles.searchRowWrap}>
          <View style={styles.searchBar}>
            <SearchIcon size={18} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChangeText={(text) => {
                setQuery(text);
                if (selectedPoi) setSelectedPoi(null);
              }}
              placeholder="Search places, regions, routes..."
              placeholderTextColor="#9CA3AF"
              returnKeyType="search"
            />
            {(query.length > 0 || isSearchFocused) && (
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
                  setIsSearchFocused(false);
                  requestAnimationFrame(() => {
                    Keyboard.dismiss();
                  });
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ClearIcon size={16} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setIsListOnlyMode((prev) => !prev)}
            activeOpacity={0.8}
          >
            <FilterSliderIcon size={18} />
          </TouchableOpacity>
        </View>

        {/* Category Filter Chips (Hidden when actively typing/searching) */}
        {!isSearchActive && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setSelectedPoi(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                    {cat.icon} {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Radius Filter Options: 50 km / 100 km / 200 km / 500 km (only when not searching) */}
        {!isSearchActive && (
          <View style={styles.radiusRow}>
            <Text style={styles.radiusHeading}>Search within</Text>
            {NEARBY_OPTIONS.map((km) => {
              const isActive = radiusKm === km;
              return (
                <TouchableOpacity
                  key={km}
                  style={[styles.radiusChip, isActive && styles.radiusChipActive]}
                  onPress={() => {
                    setRadiusKm(km);
                    setSelectedPoi(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.radiusChipText, isActive && styles.radiusChipTextActive]}>{km} km</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Results Location Info & Sort Control */}
        <View style={styles.infoRow}>
          <View style={styles.infoLocationCol}>
            <Text style={styles.infoLocationText} numberOfLines={1}>
              {query.trim()
                ? `Showing results for "${query.trim()}"`
                : deviceLocation
                ? `Showing results within ${radiusKm} km`
                : "Waiting for device location..."}
            </Text>
            {!query.trim() && (
              <TouchableOpacity onPress={refreshLocation} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {locating ? <ActivityIndicator size="small" color="#2563EB" /> : <RefreshIcon size={14} />}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.sortBtn} onPress={toggleSort} activeOpacity={0.7}>
            <Text style={styles.sortBtnText}>{sortLabel} ⌄</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main Content Area */}
      {!isListOnlyMode && !query.trim() ? (
        /* Map View with Pin selection */
        <View style={styles.mapArea}>
          <Map3D
            route={null}
            pois={filteredPois}
            clusterMode
            selectedPoiId={selectedPoi?.id}
            onPoiPress={(poi) => navigation.navigate("PlaceDetails", { poi })}
            onLongPress={(lat, lon) => navigation.navigate("AddPOI", { lat, lon })}
            initialCenter={[77.209, 28.6139]}
            initialZoom={5}
            focusCenter={focusCenter}
            focusZoom={focusZoom}
            searchRadiusKm={deviceLocation ? radiusKm : undefined}
          />
        </View>
      ) : (
        /* In-Page Scrollable Result Cards (Matching Reference Design 2) */
        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={styles.resultsScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {poisLoading && filteredPois.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#EA580C" />
              <Text style={styles.loadingText}>
                {query.trim() ? "Searching places across India..." : "Finding nearby places..."}
              </Text>
            </View>
          ) : filteredPois.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No places found</Text>
              <Text style={styles.emptySubtitle}>
                {query.trim()
                  ? `No results matching "${query.trim()}". Try searching for another place or region.`
                  : `No places found within ${radiusKm} km. Try expanding the radius.`}
              </Text>
            </View>
          ) : (
            filteredPois.map((p) => {
              const dist = distanceTo(p);
              const rating = Number(p.avg_rating ?? 0);
              const isSaved = statusMap[p.id] === "saved";
              const catObj = CATEGORIES.find((c) => p.category.toLowerCase().includes(c.id));
              const categoryLabel = catObj ? catObj.label : (p.category || "").replace("_", " ");
              const isSpecialCat = p.category.toLowerCase().includes("waterfall") || p.category.toLowerCase().includes("viewpoint");

              // Format realistic region/locality
              const locationSubtitle = p.description && p.description.length < 50
                ? p.description
                : `${categoryLabel} Destination, India`;

              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.resultCard}
                  onPress={() => navigation.navigate("PlaceDetails", { poi: p })}
                  activeOpacity={0.9}
                >
                  {/* Left Thumbnail Image */}
                  <View style={styles.cardThumbWrap}>
                    {p.photo_url ? (
                      <Image source={{ uri: p.photo_url }} style={styles.cardThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.cardThumb, styles.cardThumbFallback]}>
                        <Text style={{ fontSize: 28 }}>{catObj?.icon ?? "📍"}</Text>
                      </View>
                    )}

                    {/* Category Overlay Badge on bottom-left of thumbnail */}
                    <View style={styles.cardThumbBadge}>
                      <Text style={styles.cardThumbBadgeIcon}>{catObj?.icon ?? "📍"}</Text>
                      <Text style={styles.cardThumbBadgeText}>{categoryLabel}</Text>
                    </View>
                  </View>

                  {/* Middle Content Details */}
                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {p.name}
                      </Text>

                      {/* Optional Category Pill for Special Categories */}
                      {isSpecialCat && (
                        <View style={styles.catPillBadge}>
                          <Text style={styles.catPillText}>{categoryLabel}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.cardRegion} numberOfLines={1}>
                      {locationSubtitle}
                    </Text>

                    {/* Metadata line: Rating • Distance • Duration */}
                    <View style={styles.cardMetaLine}>
                      {rating > 0 && (
                        <View style={styles.cardMetaItem}>
                          <StarIcon size={12} />
                          <Text style={styles.cardRatingVal}>{rating.toFixed(1)}</Text>
                        </View>
                      )}

                      {dist !== null && (
                        <Text style={styles.cardMetaText}>
                          {rating > 0 ? "• " : ""}
                          {dist < 10 ? `${dist.toFixed(1)} km` : `${Math.round(dist)} km`}
                        </Text>
                      )}

                      {p.best_time && (
                        <Text style={styles.cardMetaText}>• {p.best_time}</Text>
                      )}
                    </View>
                  </View>

                  {/* Right Bookmark / Save Icon */}
                  <TouchableOpacity
                    style={styles.cardSaveBtn}
                    onPress={() => toggleSave(p)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <BookmarkIcon size={20} saved={isSaved} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <BottomTabBar activeTab="Explore" onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  topArea: {
    backgroundColor: "#FAFAF8",
    zIndex: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.5,
  },
  toggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchRowWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    height: 48,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    color: "#18181B",
    fontWeight: "500",
  },
  categoryScroll: {
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#374151",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  radiusHeading: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#71717A",
    marginRight: 2,
  },
  radiusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  radiusChipActive: {
    backgroundColor: "#18181B",
    borderColor: "#18181B",
  },
  radiusChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  radiusChipTextActive: {
    color: "#FFFFFF",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  infoLocationCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  infoLocationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#71717A",
    flexShrink: 1,
  },
  sortBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#18181B",
  },
  mapArea: {
    flex: 1,
  },
  resultsScroll: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  resultsScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
    gap: 12,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F4F4F5",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardThumbWrap: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  cardThumb: {
    width: "100%",
    height: "100%",
  },
  cardThumbFallback: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  cardThumbBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 3,
  },
  cardThumbBadgeIcon: {
    fontSize: 9,
    color: "#FFFFFF",
  },
  cardThumbBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "capitalize",
  },
  cardBody: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#18181B",
    flex: 1,
    letterSpacing: -0.2,
  },
  catPillBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  cardRegion: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "500",
    marginTop: 3,
  },
  cardMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  cardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardRatingVal: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#18181B",
  },
  cardMetaText: {
    fontSize: 12.5,
    color: "#52525B",
    fontWeight: "500",
  },
  cardSaveBtn: {
    padding: 6,
    marginLeft: 4,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13.5,
    color: "#71717A",
    fontWeight: "500",
    marginTop: 12,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#18181B",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#71717A",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
