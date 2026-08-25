import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { fetchRouteCorridorRecommendations, type CorridorSearchResponse, type Route } from "../lib/routing";
import { geocode } from "../lib/geocoding";
import { fetchTrips, addTripStop, createTrip, type TripSummary } from "../lib/trips";
import { AlongJourneySheet, recommendedPoiToPoi } from "../components/AlongJourneySheet";
import { AddToTripBottomSheet } from "../components/AddToTripBottomSheet";
import { categoryColor, categoryIconPath } from "../components/categoryIcons";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import { colors } from "../theme";
import type { RootStackParamList } from "../navigation";

const NEARBY_OPTIONS = [50, 100, 200, 500] as const;
const ZOOM_FOR_RADIUS: Record<number, number> = { 50: 10.1, 100: 9.3, 200: 8.4, 500: 7.0 };

const POPULAR_ROUTES = [
  { label: "Nagpur → Delhi", origin: "Nagpur", dest: "Delhi" },
  { label: "Mumbai → Pune", origin: "Mumbai", dest: "Pune" },
  { label: "Delhi → Manali", origin: "Delhi", dest: "Manali" },
  { label: "Bangalore → Goa", origin: "Bangalore", dest: "Goa" },
] as const;

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

function RouteHighwayIcon({ size = 18, color = "#18181B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19L8 5M20 19L16 5M12 7V9M12 13V15M12 19V21" stroke={color} strokeWidth={2} strokeLinecap="round" />
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

  // Smart Route Corridor States
  const [corridorData, setCorridorData] = useState<CorridorSearchResponse | null>(null);
  const [corridorLoading, setCorridorLoading] = useState(false);
  const [routeModeActive, setRouteModeActive] = useState(false);
  const [originInput, setOriginInput] = useState("");
  const [destInput, setDestInput] = useState("");

  // Add to Trip Bottom Sheet States
  const [addToTripOpen, setAddToTripOpen] = useState(false);
  const [tripTargetPoi, setTripTargetPoi] = useState<Poi | null>(null);
  const [trips, setTrips] = useState<TripSummary[]>([]);

  const isSearchActive = isSearchFocused || query.trim().length > 0;
  const abortControllerRef = useRef<AbortController | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchPoiStatusMap().then(setStatusMap).catch(() => {});
      fetchTrips().then(setTrips).catch(() => {});
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

  // Handler: Execute Route Corridor Search
  const executeCorridorSearch = useCallback(
    async (originText: string, destText: string) => {
      if (!destText.trim()) return;
      setCorridorLoading(true);
      Keyboard.dismiss();

      try {
        let originCoords: { lat: number; lon: number; name: string } | null = null;
        const cleanOrigin = originText.trim().toLowerCase();

        // 1. Resolve Origin
        if (!cleanOrigin || cleanOrigin === "my location" || cleanOrigin === "current location") {
          const loc = deviceLocation ?? (await getCurrentLocation()) ?? (await getCachedLocation());
          if (loc) {
            originCoords = { lat: loc.lat, lon: loc.lon, name: "Current Location" };
          }
        }

        if (!originCoords && originText.trim()) {
          const origPlace = await geocode(originText.trim());
          if (origPlace) {
            originCoords = { lat: origPlace.lat, lon: origPlace.lon, name: originText.trim() };
          }
        }

        if (!originCoords) {
          Alert.alert("Location Required", "Could not resolve origin location. Please specify a city or enable GPS.");
          setCorridorLoading(false);
          return;
        }

        // 2. Resolve Destination
        const destPlace = await geocode(destText.trim());
        if (!destPlace) {
          Alert.alert("Destination Not Found", `Could not find "${destText.trim()}". Please try a city or landmark.`);
          setCorridorLoading(false);
          return;
        }

        const destCoords = { lat: destPlace.lat, lon: destPlace.lon, name: destText.trim() };

        // 3. Call Existing Smart Route Overlap & Detour API
        const result = await fetchRouteCorridorRecommendations({
          origin: originCoords,
          destination: destCoords,
          maxDetourMinutes: 45,
        });

        setCorridorData(result);
        setRouteModeActive(true);
      } catch (err: any) {
        console.warn("Corridor search failed:", err);
        Alert.alert(
          "Route Search Notice",
          "Could not compute corridor stops at this time. Showing nearby places instead.",
        );
      } finally {
        setCorridorLoading(false);
      }
    },
    [deviceLocation],
  );

  // Main Data Fetching Effect: Handles both on-demand nearby & debounced search
  useEffect(() => {
    if (corridorData || routeModeActive) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const cleanQ = query.trim();

    // Check if query is formatted as a route (e.g. "Nagpur to Delhi" or "Mumbai -> Pune")
    const routeMatch = cleanQ.match(/^(.+?)\s*(?:to|->|→)\s*(.+)$/i);
    if (routeMatch && routeMatch[1] && routeMatch[2]) {
      const timer = setTimeout(() => {
        executeCorridorSearch(routeMatch[1]!.trim(), routeMatch[2]!.trim());
      }, 500);
      return () => clearTimeout(timer);
    }

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
  }, [query, selectedCategory, radiusKm, deviceLocation, corridorData, routeModeActive, executeCorridorSearch]);

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

  const clearRouteCorridor = () => {
    setCorridorData(null);
    setRouteModeActive(false);
    setOriginInput("");
    setDestInput("");
    setQuery("");
    setSelectedPoi(null);
  };

  // Convert corridor recommendations into POIs with detour tags for map markers
  const corridorMapPois = useMemo(() => {
    if (!corridorData) return [];
    return corridorData.recommendations.map((r) => {
      const p = recommendedPoiToPoi(r);
      (p as any).detourLabel = `+${r.detourDurationMin}m`;
      return p;
    });
  }, [corridorData]);

  // Construct Route object for Map3D
  const corridorRoute: Route | null = useMemo(() => {
    if (!corridorData) return null;
    return {
      coordinates: corridorData.route.coordinates,
      distanceKm: corridorData.route.distanceKm,
      durationMin: corridorData.route.durationMin,
      mode: "driving",
    };
  }, [corridorData]);

  // Trip Bottom Sheet handlers
  const handleOpenAddToTrip = (poi: Poi) => {
    setTripTargetPoi(poi);
    setAddToTripOpen(true);
  };

  const handleAddToTripDay = async (trip: TripSummary, dayNumber: number) => {
    if (!tripTargetPoi) return;
    await addTripStop(trip.id, { poiId: tripTargetPoi.id, dayNumber });
    Alert.alert("Added to trip", `${tripTargetPoi.name} added to Day ${dayNumber} of "${trip.title}".`);
  };

  const handleCreateNewTrip = async (title: string, destination?: string, dayCount?: number) => {
    if (!tripTargetPoi) return;
    const id = await createTrip({ title, destination, dayCount });
    await addTripStop(id, { poiId: tripTargetPoi.id, dayNumber: 1 });
    Alert.alert("Trip Created", `Created "${title}" and added ${tripTargetPoi.name}.`);
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

  const toggleSort = () => {
    if (sortMode === "nearest") setSortMode("top_rated");
    else setSortMode("nearest");
  };

  const sortLabel = sortMode === "nearest" ? "Sort by Nearest" : "Sort by Rating";

  const focusCenter: [number, number] | undefined = selectedPoi
    ? [selectedPoi.lon, selectedPoi.lat]
    : corridorRoute && corridorRoute.coordinates.length > 0
    ? undefined
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
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.routeToggleBtn, routeModeActive && styles.routeToggleBtnActive]}
              onPress={() => {
                if (routeModeActive) {
                  clearRouteCorridor();
                } else {
                  setRouteModeActive(true);
                }
              }}
              activeOpacity={0.8}
            >
              <RouteHighwayIcon size={17} color={routeModeActive ? "#FFFFFF" : "#18181B"} />
              <Text style={[styles.routeToggleText, routeModeActive && styles.routeToggleTextActive]}>
                {routeModeActive ? "Along Route" : "Find Detours"}
              </Text>
            </TouchableOpacity>

            {!routeModeActive && (
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => setIsListOnlyMode((prev) => !prev)}
                activeOpacity={0.8}
              >
                <MapListToggleIcon size={18} isList={isListOnlyMode} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ROUTE SEARCH MODE INPUTS */}
        {routeModeActive ? (
          <View style={styles.routeInputsCard}>
            <View style={styles.routeInputRow}>
              <View style={styles.routeOriginDot} />
              <TextInput
                style={styles.routeTextInput}
                placeholder="Origin (e.g. Nagpur or My Location)"
                placeholderTextColor="#9CA3AF"
                value={originInput}
                onChangeText={setOriginInput}
              />
              {originInput.length > 0 && (
                <TouchableOpacity onPress={() => setOriginInput("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <ClearIcon size={14} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.routeInputsDivider} />

            <View style={styles.routeInputRow}>
              <View style={styles.routeDestDot} />
              <TextInput
                style={styles.routeTextInput}
                placeholder="Destination (e.g. Delhi, Pune, Goa)"
                placeholderTextColor="#9CA3AF"
                value={destInput}
                onChangeText={setDestInput}
                onSubmitEditing={() => executeCorridorSearch(originInput, destInput)}
                returnKeyType="search"
              />
              {destInput.length > 0 && (
                <TouchableOpacity onPress={() => setDestInput("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <ClearIcon size={14} />
                </TouchableOpacity>
              )}
            </View>

            {/* Popular Route Quick Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRouteScroll}>
              {POPULAR_ROUTES.map((r, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.popularRoutePill}
                  onPress={() => {
                    setOriginInput(r.origin);
                    setDestInput(r.dest);
                    executeCorridorSearch(r.origin, r.dest);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.popularRoutePillText}>🛣️ {r.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.searchRouteBtn}
              onPress={() => executeCorridorSearch(originInput, destInput)}
              activeOpacity={0.88}
              disabled={corridorLoading}
            >
              {corridorLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.searchRouteBtnText}>Find Stops & Detours</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* STANDARD SEARCH BAR */
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
                placeholder="Search places, or 'Nagpur to Delhi'..."
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
          </View>
        )}

        {/* Category Filter Chips (Standard Mode only) */}
        {!isSearchActive && !routeModeActive && (
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

        {/* Radius Filter Options (Standard Mode only) */}
        {!isSearchActive && !routeModeActive && (
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

        {/* Results Location Info & Sort Control (Standard Mode only) */}
        {!routeModeActive && (
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
        )}
      </SafeAreaView>

      {/* Main Content Area */}
      {routeModeActive || corridorData ? (
        /* ROUTE CORRIDOR MAP + DETOUR OVERLAY */
        <View style={styles.mapArea}>
          <Map3D
            route={corridorRoute}
            originLabel={corridorData?.route.origin ?? originInput}
            pois={corridorMapPois}
            clusterMode={false}
            selectedPoiId={selectedPoi?.id}
            onPoiPress={(poi) => {
              setSelectedPoi(poi);
            }}
            initialCenter={[77.209, 28.6139]}
            initialZoom={6}
          />

          {/* Bottom Along Your Journey Interactive Sheet */}
          <View style={styles.corridorSheetWrapper}>
            <AlongJourneySheet
              corridorData={corridorData}
              loading={corridorLoading}
              onSelectPoi={(poi) => {
                navigation.navigate("PlaceDetails", { poi });
              }}
              onAddToTrip={handleOpenAddToTrip}
              onNavigatePoi={(poi) => {
                navigation.navigate("TripNavigation", { poi });
              }}
              onClearRoute={clearRouteCorridor}
              selectedPoiId={selectedPoi?.id}
            />
          </View>
        </View>
      ) : !isListOnlyMode && !query.trim() ? (
        /* Standard Map View */
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
        /* In-Page Scrollable Result Cards */
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

              const locationSubtitle =
                p.description && p.description.length < 50
                  ? p.description
                  : `${categoryLabel} Destination, India`;

              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.resultCard}
                  onPress={() => navigation.navigate("PlaceDetails", { poi: p })}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardThumbWrap}>
                    {p.photo_url ? (
                      <Image source={{ uri: p.photo_url }} style={styles.cardThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.cardThumb, styles.cardThumbFallback]}>
                        <Text style={{ fontSize: 28 }}>{catObj?.icon ?? "📍"}</Text>
                      </View>
                    )}
                    <View style={styles.cardThumbBadge}>
                      <Text style={styles.cardThumbBadgeIcon}>{catObj?.icon ?? "📍"}</Text>
                      <Text style={styles.cardThumbBadgeText}>{categoryLabel}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </View>

                    <Text style={styles.cardRegion} numberOfLines={1}>
                      {locationSubtitle}
                    </Text>

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

                      {p.best_time && <Text style={styles.cardMetaText}>• {p.best_time}</Text>}
                    </View>
                  </View>

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

      {/* Add to Trip Bottom Sheet Modal */}
      {tripTargetPoi && (
        <AddToTripBottomSheet
          visible={addToTripOpen}
          poi={tripTargetPoi}
          trips={trips}
          onClose={() => {
            setAddToTripOpen(false);
            setTripTargetPoi(null);
          }}
          onStartNavigation={() => {
            navigation.navigate("TripNavigation", { poi: tripTargetPoi });
          }}
          onAddToTripDay={handleAddToTripDay}
          onCreateNewTrip={handleCreateNewTrip}
        />
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
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  routeToggleBtnActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  routeToggleText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#18181B",
  },
  routeToggleTextActive: {
    color: "#FFFFFF",
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
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    color: "#18181B",
    fontWeight: "500",
  },
  routeInputsCard: {
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  routeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  routeOriginDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginRight: 10,
  },
  routeDestDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: 10,
  },
  routeTextInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.ink,
    paddingVertical: 6,
  },
  routeInputsDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
    marginLeft: 18,
  },
  popularRouteScroll: {
    gap: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },
  popularRoutePill: {
    backgroundColor: "#F4F4F5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  popularRoutePillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#4B5563",
  },
  searchRouteBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  searchRouteBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  categoryScroll: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: "#18181B",
    borderColor: "#18181B",
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#4B5563",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  radiusHeading: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    marginRight: 2,
  },
  radiusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  radiusChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  radiusChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#6B7280",
  },
  radiusChipTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  infoLocationCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoLocationText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  sortBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  mapArea: {
    flex: 1,
    position: "relative",
  },
  corridorSheetWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 12,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#71717A",
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#18181B",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#71717A",
    textAlign: "center",
    lineHeight: 18,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 10,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  cardThumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  cardThumb: {
    width: "100%",
    height: "100%",
  },
  cardThumbFallback: {
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cardThumbBadge: {
    position: "absolute",
    bottom: 5,
    left: 5,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 24, 27, 0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  cardThumbBadgeIcon: {
    fontSize: 9,
  },
  cardThumbBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardBody: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18181B",
  },
  cardRegion: {
    fontSize: 12,
    color: "#71717A",
    marginTop: 2,
    marginBottom: 6,
  },
  cardMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cardRatingVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#18181B",
  },
  cardMetaText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#71717A",
  },
  cardSaveBtn: {
    padding: 6,
  },
});
