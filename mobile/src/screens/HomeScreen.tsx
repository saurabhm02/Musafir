import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";
import GorhomBottomSheet, { BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { Map3D } from "../components/Map3D";
import { fetchAllPois, fetchNearbyPois, type Poi } from "../lib/pois";
import { fetchPoiStatusMap, setPoiStatus, type PoiStatus } from "../lib/poiStatus";
import { getCurrentLocation, getCachedLocation, type Coords } from "../lib/location";
import { categoryColor, categoryIconPath } from "../components/categoryIcons";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import { colors } from "../theme";
import type { RootStackParamList } from "../navigation";

const NEARBY_OPTIONS = [50, 100, 150, 200] as const;
// Empirical zoom-per-radius so the search circle comfortably fills the view.
const ZOOM_FOR_RADIUS: Record<number, number> = { 50: 10.1, 100: 9.3, 150: 8.8, 200: 8.4 };

function ArrowBackIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke="#9CA3AF" strokeWidth={2.2} />
      <Path d="M20 20L16 16" stroke="#9CA3AF" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function FilterIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6H20M7 12H17M10 18H14" stroke="#18181B" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function PinIcon({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C16 17 20 13.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13.4183 8 17 12 21Z"
        fill="#3B82F6"
      />
      <Circle cx="12" cy="9" r="3" fill="#FFFFFF" />
    </Svg>
  );
}

function RefreshIcon({ size = 15 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4v5h5M20 20v-5h-5M4.5 9a8 8 0 0 1 13.9-3.4L20 9M19.5 15a8 8 0 0 1-13.9 3.4L4 15"
        stroke="#3B82F6"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function HeartIcon({ size = 18, saved = false }: { size?: number; saved?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={saved ? "#EA6C1E" : "none"}>
      <Path
        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
        stroke={saved ? "#EA6C1E" : "#9CA3AF"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusSquareIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8v8M8 12h8" stroke="#4B5563" strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="12" r="9" stroke="#4B5563" strokeWidth={2} />
    </Svg>
  );
}

// A photo when one exists, otherwise a soft category-tinted icon watermark
// instead of a flat empty box -- most imported POIs have no photo yet.
function PlaceImage({ poi, style }: { poi: Poi; style: { width: number; height: number; borderRadius: number } }) {
  if (poi.photo_url) return <Image source={{ uri: poi.photo_url }} style={style} />;
  const tint = categoryColor(poi.category);
  return (
    <View style={[style, styles.placeholderImg, { backgroundColor: `${tint}1A` }]}>
      <Svg viewBox="0 0 24 24" width={style.width * 0.34} height={style.width * 0.34}>
        <Path d={categoryIconPath(poi.category)} stroke={tint} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function haversineKm(a: Coords, b: Coords) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

type Toggle = "nearby" | "saved" | "visited";
type SortMode = "nearest" | "top_rated";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const SNAP_POINTS = ["14%", "45%", "85%"];

export function HomeScreen({ navigation }: Props) {
  const sheetRef = useRef<GorhomBottomSheet>(null);
  const [allPois, setAllPois] = useState<Poi[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, PoiStatus>>({});
  const [query, setQuery] = useState("");
  const [toggle, setToggle] = useState<Toggle>("nearby");
  const [sortMode, setSortMode] = useState<SortMode>("nearest");
  const [selected, setSelected] = useState<Poi | null>(null);
  const [nearbyPois, setNearbyPois] = useState<Poi[] | null>(null);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState<number>(100);
  const [deviceLocation, setDeviceLocation] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchAllPois().then(setAllPois).catch(() => { });
      fetchPoiStatusMap().then(setStatusMap).catch(() => { });
    }, []),
  );

  function refreshLocation() {
    setLocating(true);
    getCurrentLocation()
      .then((fresh) => fresh && setDeviceLocation(fresh))
      .finally(() => setLocating(false));
  }

  // Shows the last-known GPS fix instantly (if any), then refines it with a
  // fresh read in the background.
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

  // "Nearby" re-queries the server for POIs within the selected radius of
  // the device. Falls back to the full fetched list (unsorted by distance
  // until deviceLocation exists) when location is unavailable.
  useEffect(() => {
    if (toggle !== "nearby") return;
    if (!deviceLocation) {
      setNearbyPois(null);
      return;
    }
    let cancelled = false;
    fetchNearbyPois(deviceLocation.lat, deviceLocation.lon, nearbyRadiusKm)
      .then((results) => {
        if (!cancelled) setNearbyPois(results);
      })
      .catch(() => {
        if (!cancelled) setNearbyPois(null);
      });
    return () => {
      cancelled = true;
    };
  }, [toggle, deviceLocation, nearbyRadiusKm]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return allPois.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, allPois]);

  const basePois = useMemo(() => {
    if (toggle === "saved") return allPois.filter((p) => statusMap[p.id] === "saved");
    if (toggle === "visited") return allPois.filter((p) => statusMap[p.id] === "visited");
    return nearbyPois ?? allPois;
  }, [toggle, allPois, statusMap, nearbyPois]);

  const visiblePois = useMemo(() => {
    const arr = [...basePois];
    if (sortMode === "top_rated") arr.sort((a, b) => Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0));
    else if (deviceLocation) arr.sort((a, b) => haversineKm(deviceLocation, a) - haversineKm(deviceLocation, b));
    return arr;
  }, [basePois, sortMode, deviceLocation]);

  const focusCenter: [number, number] | undefined = toggle === "nearby" && deviceLocation ? [deviceLocation.lon, deviceLocation.lat] : undefined;

  function handleTabPress(tab: TabType) {
    if (tab === "Home") navigation.navigate("Dashboard");
    else if (tab === "Trips") navigation.navigate("TripTracking", undefined);
    else if (tab === "Profile") navigation.navigate("Auth");
  }

  async function toggleSave(poi: Poi) {
    const next = statusMap[poi.id] === "saved" ? null : "saved";
    setStatusMap((prev) => ({ ...prev, [poi.id]: next as PoiStatus }));
    try {
      await setPoiStatus(poi.id, next);
    } catch {
    }
  }

  function distanceTo(poi: Poi): number | null {
    return deviceLocation ? haversineKm(deviceLocation, poi) : null;
  }

  function selectPoi(poi: Poi) {
    setSelected(poi);
    sheetRef.current?.snapToIndex(1);
  }

  function clearSelection() {
    setSelected(null);
  }

  const distanceToSelected = selected ? distanceTo(selected) : null;
  const showingUnavailableBadge = toggle === "nearby" && !locating && !deviceLocation;
  const resultLabel = toggle === "nearby" ? "near you" : toggle === "saved" ? "saved" : "visited";

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.topArea} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />
        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>Explore</Text>
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
            <FilterIcon size={18} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <SearchIcon size={18} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search places, regions, routes..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {searchResults.length > 0 && (
          <View style={styles.resultsDropdown}>
            {searchResults.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.resultRow}
                onPress={() => {
                  setQuery("");
                  navigation.navigate("PlaceDetails", { poi: p });
                }}
              >
                <Text style={styles.resultName}>{p.name}</Text>
                <Text style={styles.resultCategory}>{p.category.replace("_", " ")}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.toggleRow}>
          {(["nearby", "saved", "visited"] as Toggle[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleChip, toggle === t && styles.toggleChipActive]}
              onPress={() => {
                setSelected(null);
                setToggle(t);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, toggle === t && styles.toggleTextActive]}>
                {t === "nearby" ? "Nearby" : t === "saved" ? "Saved" : "Visited"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {toggle === "nearby" && (
          <>
            <View style={styles.radiusRow}>
              <Text style={styles.radiusLabel}>Search within</Text>
              {NEARBY_OPTIONS.map((km) => (
                <TouchableOpacity
                  key={km}
                  style={[styles.radiusChip, nearbyRadiusKm === km && styles.radiusChipActive]}
                  onPress={() => setNearbyRadiusKm(km)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.radiusText, nearbyRadiusKm === km && styles.radiusTextActive]}>{km} km</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.infoRow}>
              <PinIcon size={13} />
              <Text style={styles.infoText}>
                {deviceLocation ? `Showing places within ${nearbyRadiusKm} km of your location` : "Waiting for your location..."}
              </Text>
              <TouchableOpacity onPress={refreshLocation} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} disabled={locating}>
                {locating ? <ActivityIndicator size="small" color="#3B82F6" /> : <RefreshIcon size={15} />}
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>

      <View style={styles.mapArea}>
        <Map3D
          route={null}
          pois={visiblePois}
          clusterMode
          selectedPoiId={selected?.id}
          onPoiPress={selectPoi}
          onLongPress={(lat, lon) => navigation.navigate("AddPOI", { lat, lon })}
          initialCenter={[79.0, 22.5]}
          initialZoom={3.7}
          focusCenter={focusCenter}
          focusZoom={ZOOM_FOR_RADIUS[nearbyRadiusKm]}
          searchRadiusKm={toggle === "nearby" ? nearbyRadiusKm : undefined}
        />
        {showingUnavailableBadge && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Location unavailable — showing places across India instead</Text>
          </View>
        )}
        {navigation.canGoBack() && (
          <SafeAreaView style={styles.backArea} edges={["top"]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <ArrowBackIcon size={20} />
            </TouchableOpacity>
          </SafeAreaView>
        )}
      </View>

      <GorhomBottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={SNAP_POINTS}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        enablePanDownToClose={false}
      >
        {selected ? (
          <BottomSheetView style={styles.sheetContent}>
            <View style={styles.placeCardRow}>
              <PlaceImage poi={selected} style={styles.placeImg} />
              <View style={styles.placeBody}>
                <View style={styles.placeNameRow}>
                  <Text style={styles.placeName} numberOfLines={1}>{selected.name}</Text>
                  <TouchableOpacity onPress={clearSelection} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.placeCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.placeCategory}>{selected.category.replace("_", " ")}</Text>
                <View style={styles.placeMetaRow}>
                  {Number(selected.avg_rating ?? 0) > 0 && (
                    <View style={styles.metaChip}>
                      <StarIcon size={11} />
                      <Text style={styles.metaChipText}>{Number(selected.avg_rating).toFixed(1)}</Text>
                    </View>
                  )}
                  {distanceToSelected !== null && (
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>{distanceToSelected.toFixed(distanceToSelected < 10 ? 1 : 0)} km away</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.placeActionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => toggleSave(selected)} activeOpacity={0.85}>
                <HeartIcon size={17} saved={statusMap[selected.id] === "saved"} />
                <Text style={[styles.actionBtnText, statusMap[selected.id] === "saved" && { color: "#EA6C1E" }]}>
                  {statusMap[selected.id] === "saved" ? "Saved" : "Save"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate("PlaceDetails", { poi: selected })}
                activeOpacity={0.85}
              >
                <PlusSquareIcon size={17} />
                <Text style={styles.actionBtnText}>Add to Trip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                onPress={() => navigation.navigate("PlaceDetails", { poi: selected })}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnPrimaryText}>View place</Text>
              </TouchableOpacity>
            </View>
          </BottomSheetView>
        ) : (
          <BottomSheetView style={styles.sheetContent}>
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>
                {visiblePois.length} place{visiblePois.length === 1 ? "" : "s"} {resultLabel}
              </Text>
              <TouchableOpacity
                style={styles.sortBtn}
                onPress={() => setSortMode((m) => (m === "nearest" ? "top_rated" : "nearest"))}
                activeOpacity={0.8}
              >
                <Text style={styles.sortBtnText}>{sortMode === "nearest" ? "Nearest" : "Top rated"} ⌄</Text>
              </TouchableOpacity>
            </View>
            {visiblePois.length === 0 ? (
              <Text style={styles.emptyText}>No places to show here yet.</Text>
            ) : (
              <BottomSheetScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
                {visiblePois.slice(0, 30).map((p) => {
                  const dist = distanceTo(p);
                  return (
                    <TouchableOpacity key={p.id} style={styles.card} onPress={() => selectPoi(p)} activeOpacity={0.9}>
                      <View style={styles.cardImgWrap}>
                        <PlaceImage poi={p} style={styles.cardImg} />
                        <TouchableOpacity style={styles.cardHeart} onPress={() => toggleSave(p)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <HeartIcon size={15} saved={statusMap[p.id] === "saved"} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.cardName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.cardCategory}>{p.category.replace("_", " ")}</Text>
                      <View style={styles.cardMetaRow}>
                        {Number(p.avg_rating ?? 0) > 0 && (
                          <View style={styles.cardMetaItem}>
                            <StarIcon size={10} />
                            <Text style={styles.cardMetaText}>{Number(p.avg_rating).toFixed(1)}</Text>
                          </View>
                        )}
                        {dist !== null && <Text style={styles.cardMetaText}>{dist.toFixed(dist < 10 ? 1 : 0)} km</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </BottomSheetScrollView>
            )}
          </BottomSheetView>
        )}
      </GorhomBottomSheet>

      <BottomTabBar activeTab="Explore" onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  topArea: { backgroundColor: "#FAFAF8", zIndex: 5 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#18181B", letterSpacing: -0.4 },
  filterBtn: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1.2, borderColor: "#E5E7EB",
    alignItems: "center", justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.2,
    borderColor: "#E5E7EB", height: 48, marginHorizontal: 20, paddingHorizontal: 14, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#18181B", fontWeight: "500" },
  resultsDropdown: {
    marginHorizontal: 20, marginTop: 6, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1.2,
    borderColor: "#E5E7EB", overflow: "hidden",
  },
  resultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  resultName: { fontSize: 13.5, fontWeight: "600", color: "#18181B" },
  resultCategory: { fontSize: 11.5, color: "#71717A", textTransform: "capitalize" },
  toggleRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  toggleChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1.2, borderColor: "#E5E7EB" },
  toggleChipActive: { backgroundColor: "#EA6C1E", borderColor: "#EA6C1E" },
  toggleText: { fontSize: 12.5, fontWeight: "600", color: "#374151" },
  toggleTextActive: { color: "#FFFFFF" },
  radiusRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  radiusLabel: { fontSize: 11.5, fontWeight: "600", color: "#71717A", marginRight: 2 },
  radiusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: "#F4EEE0", borderWidth: 1, borderColor: "#E5E7EB" },
  radiusChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  radiusText: { fontSize: 11.5, fontWeight: "700", color: "#4B5563" },
  radiusTextActive: { color: "#FFFFFF" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingBottom: 12 },
  infoText: { flex: 1, fontSize: 11.5, color: "#3B82F6", fontWeight: "600" },
  mapArea: { flex: 1 },
  statusBadge: {
    position: "absolute", top: 12, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  statusText: { fontSize: 12, fontWeight: "600", color: "#374151", flexShrink: 1 },
  backArea: { position: "absolute", left: 16, top: 0 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, marginTop: 6,
  },
  sheetBackground: { backgroundColor: "#FAFAF8", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { backgroundColor: colors.line, width: 40 },
  sheetContent: { flex: 1, paddingHorizontal: 20 },
  placeholderImg: { alignItems: "center", justifyContent: "center" },
  sheetHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: "#F4EEE0" },
  sortBtnText: { fontSize: 11.5, fontWeight: "700", color: colors.ink },
  emptyText: { fontSize: 13, color: colors.inkSoft, textAlign: "center", paddingVertical: 12 },
  cardsRow: { gap: 12, paddingBottom: 4 },
  card: { width: 128 },
  cardImgWrap: { position: "relative", marginBottom: 6 },
  cardImg: { width: 128, height: 92, borderRadius: 14 },
  cardHeart: {
    position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center", justifyContent: "center",
  },
  cardName: { fontSize: 13, fontWeight: "700", color: colors.ink },
  cardCategory: { fontSize: 10.5, color: colors.inkSoft, textTransform: "capitalize", marginTop: 1 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  cardMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  cardMetaText: { fontSize: 10.5, fontWeight: "700", color: colors.ink },
  placeCardRow: { flexDirection: "row", gap: 14, marginBottom: 14 },
  placeImg: { width: 84, height: 84, borderRadius: 16 },
  placeBody: { flex: 1, justifyContent: "center" },
  placeNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  placeName: { flex: 1, fontSize: 17, fontWeight: "800", color: colors.ink },
  placeCloseText: { fontSize: 15, color: colors.inkSoft, paddingLeft: 10 },
  placeCategory: { fontSize: 12.5, color: colors.inkSoft, textTransform: "capitalize", marginTop: 2 },
  placeMetaRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F4EEE0", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  metaChipText: { fontSize: 11, fontWeight: "700", color: colors.ink },
  placeActionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#FFFFFF", borderWidth: 1.2, borderColor: "#E5E7EB", borderRadius: 14, height: 46,
  },
  actionBtnText: { fontSize: 12.5, fontWeight: "700", color: "#4B5563" },
  actionBtnPrimary: { backgroundColor: colors.ink, borderColor: colors.ink },
  actionBtnPrimaryText: { fontSize: 12.5, fontWeight: "700", color: "#FFFFFF" },
});
