import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, withRepeat, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Map3D } from "../components/Map3D";
import { BottomSheet } from "../components/BottomSheet";
import { ElevationSparkline } from "../components/ElevationSparkline";
import { geocode } from "../lib/geocoding";
import { fetchRoute, saveRouteAndCheckOverlap, type Route } from "../lib/routing";
import { fetchElevationProfile } from "../lib/elevation";
import { fetchAllPois, poisNearRoute, type Poi } from "../lib/pois";
import { categoryColor, categoryIconPath } from "../components/categoryIcons";
import { colors } from "../theme";
import Svg, { Path } from "react-native-svg";
import type { RootStackParamList } from "../navigation";

const CATEGORIES = ["food", "cafe", "viewpoint", "temple", "trek"];

type Stats = {
  distanceKm: number;
  durationMin: number;
  elevationGain: number;
  elevationSamples: number[];
  matchedSegments: number;
};
type Props = NativeStackScreenProps<RootStackParamList, "Home">;

// Input: the origin/destination text the user typed
// Output: a rendered route + its stats, or an error message
// Turns two place names into coordinates, asks OSRM for the road between
// them, Open-Elevation for how much climbing it involves, then saves the
// route and asks Smart Route Overlap how much of it was already mapped.
async function searchRoute(originText: string, destText: string) {
  const [origin, destination] = await Promise.all([geocode(originText), geocode(destText)]);
  if (!origin) throw new Error(`couldn't find "${originText}"`);
  if (!destination) throw new Error(`couldn't find "${destText}"`);

  const route = await fetchRoute(origin, destination);
  const profile = await fetchElevationProfile(route.coordinates).catch(() => ({ gain: 0, samples: [] }));
  const matchedSegments = await saveRouteAndCheckOverlap(route, originText, destText).catch(() => 0);
  return {
    route,
    stats: {
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      elevationGain: profile.gain,
      elevationSamples: profile.samples,
      matchedSegments,
    },
  };
}

export function HomeScreen({ navigation }: Props) {
  const [originText, setOriginText] = useState("Delhi");
  const [destText, setDestText] = useState("Triund");
  const [route, setRoute] = useState<Route | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allPois, setAllPois] = useState<Poi[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");

  const reloadPois = useCallback(() => {
    fetchAllPois().then(setAllPois).catch(() => {});
  }, []);

  useFocusEffect(reloadPois);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const result = await searchRoute(originText, destText);
      setRoute(result.route);
      setStats(result.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong");
      setRoute(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  const nearby = route ? poisNearRoute(route.coordinates, allPois) : [];
  const visiblePois = activeCategory === "all" ? nearby : nearby.filter((p) => p.category === activeCategory);

  return (
    <View style={styles.container}>
      <Map3D
        route={route}
        originLabel={route ? originText : undefined}
        pois={visiblePois}
        onPoiPress={(poi) => navigation.navigate("POIDetails", { poi })}
        onLongPress={(lat, lon) => navigation.navigate("AddPOI", { lat, lon })}
      />

      <SafeAreaView style={styles.searchBar} edges={["top"]}>
        <View style={styles.searchCard}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate("Dashboard")}>
            <Svg viewBox="0 0 24 24" width={22} height={22}>
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <View style={styles.stops}>
            <TextInput
              style={styles.input}
              value={originText}
              onChangeText={setOriginText}
              placeholder="Origin"
              placeholderTextColor={colors.inkSoft}
            />
            <TextInput
              style={styles.input}
              value={destText}
              onChangeText={setDestText}
              placeholder="Destination"
              placeholderTextColor={colors.inkSoft}
            />
          </View>
          <TouchableOpacity style={styles.goButton} onPress={onSearch} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.accentInk} /> : <Text style={styles.goText}>Go</Text>}
          </TouchableOpacity>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.chipRow}>
          <TouchableOpacity style={styles.catChip} onPress={() => setActiveCategory("all")}>
            <View style={[styles.catCirc, activeCategory === "all" && { backgroundColor: colors.ink }]}>
              <Text style={[styles.catAllText, activeCategory === "all" && { color: colors.paper }]}>All</Text>
            </View>
            <Text style={styles.catLabel}>All</Text>
          </TouchableOpacity>
          {CATEGORIES.map((c) => {
            const color = categoryColor(c);
            const active = activeCategory === c;
            return (
              <TouchableOpacity key={c} style={styles.catChip} onPress={() => setActiveCategory(c)}>
                <View style={[styles.catCirc, { backgroundColor: active ? color : `${color}22` }]}>
                  <Svg viewBox="0 0 24 24" width={18} height={18}>
                    <Path d={categoryIconPath(c)} stroke={active ? "#fff" : color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
                <Text style={styles.catLabel}>{c.replace("_", " ")}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      <BottomSheet visible={!!stats}>
        {stats && stats.matchedSegments > 0 && (
          <View style={styles.overlapBadge}>
            <PulsingDot />
            <Text style={styles.overlapText}>
              {stats.matchedSegments} place{stats.matchedSegments === 1 ? "" : "s"} already mapped on this stretch
            </Text>
          </View>
        )}
        <View style={styles.sheetTop}>
          <Text style={styles.title}>
            {originText} → {destText}
          </Text>
          {stats && <ElevationSparkline samples={stats.elevationSamples} />}
        </View>
        <View style={styles.statRow}>
          <Stat label="Distance" value={stats ? `${stats.distanceKm.toFixed(0)} km` : "—"} />
          <Stat label="Duration" value={stats ? `${Math.round(stats.durationMin)} min` : "—"} />
          <Stat label="Elevation" value={stats ? `${stats.elevationGain} m` : "—"} />
        </View>
      </BottomSheet>
    </View>
  );
}

function PulsingDot() {
  const style = useAnimatedStyle(() => ({
    opacity: withRepeat(withTiming(0.25, { duration: 800 }), -1, true),
  }));
  return <Animated.View style={[styles.pulseDot, style]} />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  searchBar: { position: "absolute", left: 0, right: 0, top: 0 },
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "rgba(244,238,224,0.95)",
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 16,
    padding: 12,
  },
  backBtn: { paddingRight: 4, paddingVertical: 4, justifyContent: "center", alignItems: "center" },
  stops: { flex: 1, gap: 6 },
  input: { fontSize: 15, fontWeight: "600", color: colors.ink, padding: 0 },
  goButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  goText: { color: colors.accentInk, fontWeight: "700" },
  error: { color: colors.accent, marginHorizontal: 24, marginTop: 8, fontSize: 13 },
  chipRow: { flexDirection: "row", gap: 14, marginHorizontal: 20, marginTop: 12 },
  catChip: { alignItems: "center", gap: 5, width: 48 },
  catCirc: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  catAllText: { fontSize: 12, fontWeight: "700", color: colors.ink },
  catLabel: { fontSize: 9.5, color: colors.inkSoft, fontWeight: "600", textTransform: "capitalize" },
  overlapBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.trail,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentInk },
  overlapText: { color: colors.accentInk, fontSize: 10.5, fontWeight: "600" },
  sheetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  title: { fontSize: 19, fontWeight: "700", color: colors.ink },
  statRow: { flexDirection: "row", gap: 22 },
  stat: {},
  statValue: { fontSize: 16, fontWeight: "600", color: colors.ink },
  statLabel: { fontSize: 10, color: colors.inkSoft, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
});
