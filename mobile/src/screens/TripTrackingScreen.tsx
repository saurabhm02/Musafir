import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";
import { Map3D } from "../components/Map3D";
import { fetchTrip, fetchTrips, createTrip, optimizeTripDay, type TripDetail, type TripSummary } from "../lib/trips";
import { fetchWaypointRoute, type Route } from "../lib/routing";
import type { RootStackParamList } from "../navigation";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import { colors } from "../theme";

function ArrowBackIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#18181B" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShareIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.34448 15.0583 5.67534 15.1656 5.98227L8.83441 9.01773C8.42398 8.39701 7.75916 8 7 8C5.34315 8 4 9.34315 4 11C4 12.6569 5.34315 14 7 14C7.75916 14 8.42398 13.603 8.83441 12.9823L15.1656 16.0177C15.0583 16.3247 15 16.6555 15 17C15 18.6569 16.3431 20 18 20C19.6569 20 21 18.6569 21 17C21 15.3431 19.6569 14 18 14C17.2408 14 16.576 14.397 16.1656 15.0177L9.83441 11.9823C9.94172 11.6753 10 11.3445 10 11C10 10.6555 9.94172 10.3247 9.83441 10.0177L16.1656 6.98227C16.576 7.60299 17.2408 8 18 8Z"
        stroke="#18181B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function SparkleIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L14 9L21 11L14 13L12 20L10 13L3 11L10 9L12 2Z" fill="#FFFFFF" />
    </Svg>
  );
}

const STATUS_LABEL: Record<string, string> = { draft: "Draft", in_progress: "In progress", completed: "Completed" };

type Props = NativeStackScreenProps<RootStackParamList, "TripTracking">;

export function TripTrackingScreen({ route, navigation }: Props) {
  const paramTripId = route.params?.tripId;
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [tripId, setTripId] = useState<string | undefined>(paramTripId);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [dayRoute, setDayRoute] = useState<Route | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [newDays, setNewDays] = useState("3");

  const reload = useCallback(() => {
    if (paramTripId) {
      setTripId(paramTripId);
      return;
    }
    fetchTrips().then((list) => {
      setTrips(list);
      if (!tripId && list.length > 0) setTripId(list[0].id);
    }).catch(() => {});
  }, [paramTripId, tripId]);

  useFocusEffect(reload);

  useFocusEffect(
    useCallback(() => {
      if (!tripId) return;
      fetchTrip(tripId).then((t) => {
        setTrip(t);
        setSelectedDay((d) => (t.days[d] ? d : 1));
      }).catch(() => {});
    }, [tripId]),
  );

  const dayStops = useMemo(() => trip?.days[String(selectedDay)] ?? [], [trip, selectedDay]);

  useFocusEffect(
    useCallback(() => {
      if (dayStops.length < 2) return setDayRoute(null);
      fetchWaypointRoute(dayStops.map((s) => ({ lat: s.lat, lon: s.lon }))).then(setDayRoute).catch(() => setDayRoute(null));
    }, [dayStops]),
  );

  function handleTabPress(tab: TabType) {
    if (tab === "Home") navigation.navigate("Dashboard");
    else if (tab === "Explore") navigation.navigate("Home");
    else if (tab === "Profile") navigation.navigate("Auth");
  }

  async function handleOptimize() {
    if (!tripId) return;
    setOptimizing(true);
    try {
      await optimizeTripDay(tripId, selectedDay);
      const refreshed = await fetchTrip(tripId);
      setTrip(refreshed);
    } catch (e) {
      Alert.alert("Couldn't optimize this day", e instanceof Error ? e.message : "something went wrong");
    } finally {
      setOptimizing(false);
    }
  }

  async function handleCreateTrip() {
    if (!newTitle.trim()) return Alert.alert("Give your trip a title");
    setCreating(true);
    try {
      const id = await createTrip({ title: newTitle, destination: newDestination || undefined, dayCount: Number(newDays) || 1 });
      setTripId(id);
    } catch (e) {
      Alert.alert("Couldn't create trip", e instanceof Error ? e.message : "something went wrong");
    } finally {
      setCreating(false);
    }
  }

  function handleShare() {
    Alert.alert("Share Trip", `Share "${trip?.title}" with friends & co-travelers!`);
  }

  if (!tripId) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />
        <ScrollView contentContainerStyle={styles.createForm}>
          <Text style={styles.createTitle}>Plan your first trip</Text>
          <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="Trip title (e.g. Ladakh Road Trip)" placeholderTextColor={colors.inkSoft} />
          <TextInput style={styles.input} value={newDestination} onChangeText={setNewDestination} placeholder="Destination" placeholderTextColor={colors.inkSoft} />
          <TextInput style={styles.input} value={newDays} onChangeText={setNewDays} placeholder="Number of days" placeholderTextColor={colors.inkSoft} keyboardType="number-pad" />
          <TouchableOpacity style={styles.createBtn} onPress={handleCreateTrip} disabled={creating}>
            {creating ? <ActivityIndicator color={colors.accentInk} /> : <Text style={styles.createBtnText}>Create Trip</Text>}
          </TouchableOpacity>
        </ScrollView>
        <BottomTabBar activeTab="Trips" onTabPress={handleTabPress} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      <View style={styles.topBar}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate("Dashboard")} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowBackIcon size={22} />
          </TouchableOpacity>
          <View>
            <Text style={styles.tripTitle}>{trip?.title ?? "Loading..."}</Text>
            {trip && <Text style={styles.tripSubtitle}>{STATUS_LABEL[trip.status]}</Text>}
          </View>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.iconBtn} activeOpacity={0.7}>
          <ShareIcon size={20} />
        </TouchableOpacity>
      </View>

      {trip && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorRow}>
            {Array.from({ length: trip.dayCount }, (_, i) => i + 1).map((d) => {
              const isActive = selectedDay === d;
              const first = trip.days[String(d)]?.[0];
              return (
                <TouchableOpacity key={d} style={[styles.dayPill, isActive && styles.dayPillActive]} onPress={() => setSelectedDay(d)} activeOpacity={0.8}>
                  <Text style={[styles.dayPillText, isActive && styles.dayPillTextActive]}>Day {d}</Text>
                  {first && <Text style={[styles.dayPillSub, isActive && styles.dayPillTextActive]} numberOfLines={1}>{first.name}</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.mapContainer}>
            {dayStops.length > 0 ? (
              <Map3D
                route={dayRoute}
                pois={dayStops.map((s) => ({ id: s.poi_id, name: s.name, category: s.category, lat: s.lat, lon: s.lon, photo_url: s.photo_url, description: null, is_verified: false, avg_rating: null, total_ratings: null, best_time: null }))}
                onPoiPress={(poi) => navigation.navigate("PlaceDetails", { poi })}
              />
            ) : (
              <View style={styles.emptyMap}>
                <Text style={styles.emptyMapText}>No places added to Day {selectedDay} yet</Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.stopsList} contentContainerStyle={{ paddingBottom: 8 }}>
            {dayStops.map((stop) => (
              <TouchableOpacity
                key={stop.id}
                style={styles.stopCard}
                activeOpacity={0.88}
                onPress={() => navigation.navigate("PlaceDetails", { poi: { id: stop.poi_id, name: stop.name, category: stop.category, lat: stop.lat, lon: stop.lon, photo_url: stop.photo_url, description: null, is_verified: false, avg_rating: null, total_ratings: null, best_time: null } })}
              >
                {stop.photo_url ? <Image source={{ uri: stop.photo_url }} style={styles.stopImage} /> : <View style={[styles.stopImage, styles.stopImagePlaceholder]} />}
                <View style={styles.stopContent}>
                  <Text style={styles.stopName}>{stop.name}</Text>
                  {stop.time_label && <Text style={styles.stopTime}>{stop.time_label}</Text>}
                  {stop.note && <Text style={styles.stopDescription} numberOfLines={2}>{stop.note}</Text>}
                </View>
              </TouchableOpacity>
            ))}
            {dayStops.length === 0 && (
              <Text style={styles.emptyStopsHint}>Open a place on Explore and tap "Add to Trip" to build this day's plan.</Text>
            )}
          </ScrollView>

          {dayStops.length > 1 && (
            <TouchableOpacity style={styles.optimizeBtn} onPress={handleOptimize} disabled={optimizing} activeOpacity={0.88}>
              {optimizing ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <SparkleIcon size={16} />
                  <Text style={styles.optimizeBtnText}>Optimize Route</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      <BottomTabBar activeTab="Trips" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  tripTitle: { fontSize: 18, fontWeight: "800", color: "#18181B", letterSpacing: -0.3 },
  tripSubtitle: { fontSize: 12, fontWeight: "600", color: "#EA6C1E", marginTop: 1 },
  iconBtn: { padding: 6 },
  daySelectorRow: { paddingHorizontal: 18, gap: 8, paddingBottom: 8 },
  dayPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1.2, borderColor: "#E5E7EB", maxWidth: 130 },
  dayPillActive: { backgroundColor: "#EA6C1E", borderColor: "#EA6C1E" },
  dayPillText: { fontSize: 13, fontWeight: "700", color: "#4B5563" },
  dayPillSub: { fontSize: 10, color: "#9CA3AF", marginTop: 1 },
  dayPillTextActive: { color: "#FFFFFF" },
  mapContainer: {
    height: 220, marginHorizontal: 18, borderRadius: 24, overflow: "hidden", position: "relative", backgroundColor: "#E4ECE5",
    borderWidth: 1.2, borderColor: "#E5E7EB",
  },
  emptyMap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  emptyMapText: { fontSize: 13, color: colors.inkSoft, fontWeight: "500", textAlign: "center" },
  stopsList: { flex: 1, marginHorizontal: 18, marginTop: 10 },
  stopCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", marginBottom: 8, padding: 10, borderRadius: 18,
    borderWidth: 1.2, borderColor: "#E5E7EB",
  },
  stopImage: { width: 52, height: 52, borderRadius: 12, marginRight: 12 },
  stopImagePlaceholder: { backgroundColor: "#E5E7EB" },
  stopContent: { flex: 1 },
  stopName: { fontSize: 14.5, fontWeight: "700", color: "#18181B" },
  stopTime: { fontSize: 11.5, color: "#71717A", fontWeight: "500", marginTop: 1, marginBottom: 2 },
  stopDescription: { fontSize: 11, color: "#6B7280", lineHeight: 15 },
  emptyStopsHint: { fontSize: 12.5, color: colors.inkSoft, textAlign: "center", marginTop: 20, paddingHorizontal: 10 },
  optimizeBtn: {
    flexDirection: "row", gap: 8, backgroundColor: "#EA6C1E", marginHorizontal: 18, marginTop: 10, marginBottom: 10,
    height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  optimizeBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14.5 },
  createForm: { padding: 22, gap: 12 },
  createTitle: { fontSize: 20, fontWeight: "800", color: colors.ink, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: 12, padding: 12, fontSize: 15, color: colors.ink },
  createBtn: { backgroundColor: colors.accent, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  createBtnText: { color: colors.accentInk, fontWeight: "700", fontSize: 15 },
});
