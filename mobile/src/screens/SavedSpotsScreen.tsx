import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import Svg, { Circle, Path } from "react-native-svg";
import type { RootStackParamList } from "../navigation";
import { fetchPoiStatusPlaces, setPoiStatus, type StatusPoiItem } from "../lib/poiStatus";
import { getCurrentLocation, getCachedLocation, type Coords } from "../lib/location";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import { colors } from "../theme";

function ArrowBackIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#18181B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SearchIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke="#18181B" strokeWidth={2} />
      <Path d="M20 20L16 16" stroke="#18181B" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ClearSmallIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" fill="#9CA3AF" />
      <Path d="M15 9L9 15M9 9l6 6" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function BookmarkFilledIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#EA580C">
      <Path
        d="M19 21L12 16L5 21V5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V21Z"
        stroke="#EA580C"
        strokeWidth={1.8}
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

function haversineKm(a: Coords, b: Coords) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

type Props = NativeStackScreenProps<RootStackParamList, "SavedSpots">;

export function SavedSpotsScreen({ navigation }: Props) {
  const [places, setPlaces] = useState<StatusPoiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<Coords | null>(null);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchPoiStatusPlaces("saved");
      setPlaces(items);
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSaved();
    }, [loadSaved]),
  );

  useEffect(() => {
    getCachedLocation().then((c) => c && setDeviceLocation(c));
    getCurrentLocation().then((fresh) => fresh && setDeviceLocation(fresh));
  }, []);

  const handleUnsave = async (poiId: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== poiId));
    try {
      await setPoiStatus(poiId, null);
    } catch {
      loadSaved();
    }
  };

  // Derive unique categories and their counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: places.length };
    for (const p of places) {
      const cat = p.category.toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [places]);

  const categories = useMemo(() => {
    const list = [{ id: "all", label: `All (${categoryCounts.all ?? 0})` }];
    const knownKeys = ["trek", "temple", "viewpoint", "waterfall", "beach", "heritage", "camping", "lake"];
    for (const k of knownKeys) {
      if (categoryCounts[k]) {
        const label = k.charAt(0).toUpperCase() + k.slice(1) + "s";
        list.push({ id: k, label: `${label} (${categoryCounts[k]})` });
      }
    }
    return list;
  }, [categoryCounts]);

  const filteredPlaces = useMemo(() => {
    let list = places;
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category.toLowerCase().includes(selectedCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
    }
    return list;
  }, [places, selectedCategory, searchQuery]);

  const handleTabPress = (tab: TabType) => {
    if (tab === "Home") navigation.navigate("Dashboard");
    else if (tab === "Explore") navigation.navigate("Home");
    else if (tab === "Trips") navigation.navigate("TripTracking", undefined);
    else if (tab === "Profile") navigation.navigate("Profile");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowBackIcon size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setIsSearchOpen((prev) => !prev)}
            activeOpacity={0.7}
          >
            <SearchIcon size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar (Expandable) */}
      {isSearchOpen && (
        <View style={styles.searchBarWrap}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search saved places..."
            placeholderTextColor="#9CA3AF"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <ClearSmallIcon size={16} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Category Chips with Counts */}
      {categories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Sub-header text */}
      <View style={styles.subHeaderRow}>
        <Text style={styles.subHeaderText}>
          {places.length} place{places.length === 1 ? "" : "s"} saved
        </Text>
      </View>

      {/* Main List / Empty State */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading saved places...</Text>
        </View>
      ) : filteredPlaces.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <BookmarkFilledIcon size={32} />
          </View>
          <Text style={styles.emptyTitle}>No saved places yet</Text>
          <Text style={styles.emptyDesc}>
            {searchQuery.trim()
              ? `No saved places found matching "${searchQuery}".`
              : "Explore scenic peaks, temples, and valleys across India and bookmark your favorite spots."}
          </Text>
          <TouchableOpacity
            style={styles.emptyCTA}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.88}
          >
            <Text style={styles.emptyCTAText}>Explore Places</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredPlaces.map((p) => {
            const dist = deviceLocation ? haversineKm(deviceLocation, p) : null;
            const rating = Number(p.avg_rating ?? 0);
            const categoryLabel = (p.category || "").replace("_", " ");

            return (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                onPress={() => navigation.navigate("PlaceDetails", { poi: p })}
                activeOpacity={0.9}
              >
                {/* Left Thumbnail Image */}
                <View style={styles.cardThumbWrap}>
                  {p.photo_url ? (
                    <Image source={{ uri: p.photo_url }} style={styles.cardThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.cardThumb, styles.cardThumbFallback]}>
                      <Text style={{ fontSize: 28 }}>📍</Text>
                    </View>
                  )}
                </View>

                {/* Details */}
                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.cardLocation} numberOfLines={1}>
                    {p.description && p.description.length < 40 ? p.description : `${categoryLabel} Destination, India`}
                  </Text>

                  <View style={styles.cardMetaLine}>
                    {rating > 0 && (
                      <View style={styles.ratingBadge}>
                        <StarIcon size={12} />
                        <Text style={styles.ratingVal}>{rating.toFixed(1)}</Text>
                      </View>
                    )}
                    <Text style={styles.metaCategory}>
                      {rating > 0 ? "• " : ""}{categoryLabel}
                    </Text>
                    {dist !== null && (
                      <Text style={styles.metaDist}>
                        • {dist < 10 ? `${dist.toFixed(1)} km` : `${Math.round(dist)} km`}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Right Save Bookmark Icon (Tapping unsaves) */}
                <TouchableOpacity
                  style={styles.unsaveBtn}
                  onPress={() => handleUnsave(p.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <BookmarkFilledIcon size={20} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <BottomTabBar activeTab="Home" onTabPress={handleTabPress} onCenterPress={() => navigation.navigate("Home")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#18181B", letterSpacing: -0.4 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { padding: 6 },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    height: 46,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#18181B", fontWeight: "500" },
  categoryScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  categoryChipText: { fontSize: 12.5, fontWeight: "700", color: "#374151" },
  categoryChipTextActive: { color: "#FFFFFF" },
  subHeaderRow: { paddingHorizontal: 20, paddingVertical: 6 },
  subHeaderText: { fontSize: 12.5, fontWeight: "600", color: "#71717A" },
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100, gap: 12 },
  card: {
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
  cardThumbWrap: { width: 88, height: 88, borderRadius: 16, overflow: "hidden" },
  cardThumb: { width: "100%", height: "100%" },
  cardThumbFallback: { backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, marginLeft: 14, justifyContent: "center" },
  cardName: { fontSize: 16, fontWeight: "800", color: "#18181B", letterSpacing: -0.2 },
  cardLocation: { fontSize: 12.5, color: "#71717A", fontWeight: "500", marginTop: 3 },
  cardMetaLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingVal: { fontSize: 12.5, fontWeight: "800", color: "#18181B" },
  metaCategory: { fontSize: 12, color: "#52525B", fontWeight: "600", textTransform: "capitalize" },
  metaDist: { fontSize: 12, color: "#71717A", fontWeight: "500" },
  unsaveBtn: { padding: 6, marginLeft: 4 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
  loadingText: { marginTop: 12, fontSize: 13.5, color: "#71717A", fontWeight: "500" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 60 },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#18181B", marginBottom: 6 },
  emptyDesc: { fontSize: 13.5, color: "#71717A", textAlign: "center", lineHeight: 19, marginBottom: 20 },
  emptyCTA: {
    backgroundColor: "#EA580C",
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyCTAText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
