import { useCallback, useState } from "react";
import { Alert, Dimensions, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";
import type { RootStackParamList } from "../navigation";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import { BottomSheet } from "../components/BottomSheet";
import { fetchMemories, type Memory } from "../lib/memories";
import { fetchPoiStatusMap, setPoiStatus, type PoiStatus } from "../lib/poiStatus";
import { fetchTrips, addTripStop, type TripSummary } from "../lib/trips";
import { colors } from "../theme";

const { height } = Dimensions.get("window");

function ArrowBackIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
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

function HeartIcon({ color = "#4B5563", size = 18, filled = false }: { color?: string; size?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"}>
      <Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusSquareIcon({ color = "#4B5563", size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function CheckIcon({ color = "#4B5563", size = 18, filled = false }: { color?: string; size?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} fill={filled ? color : "none"} />
      <Path d="M8.5 12.3l2.3 2.3 4.7-5" stroke={filled ? "#fff" : color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShareIcon({ color = "#4B5563", size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.34448 15.0583 5.67534 15.1656 5.98227L8.83441 9.01773C8.42398 8.39701 7.75916 8 7 8C5.34315 8 4 9.34315 4 11C4 12.6569 5.34315 14 7 14C7.75916 14 8.42398 13.603 8.83441 12.9823L15.1656 16.0177C15.0583 16.3247 15 16.6555 15 17C15 18.6569 16.3431 20 18 20C19.6569 20 21 18.6569 21 17C21 15.3431 19.6569 14 18 14C17.2408 14 16.576 14.397 16.1656 15.0177L9.83441 11.9823C9.94172 11.6753 10 11.3445 10 11C10 10.6555 9.94172 10.3247 9.83441 10.0177L16.1656 6.98227C16.576 7.60299 17.2408 8 18 8Z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "PlaceDetails">;

export function PlaceDetailsScreen({ route, navigation }: Props) {
  const poi = route.params.poi;
  const [status, setStatus] = useState<PoiStatus | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [readMore, setReadMore] = useState(false);
  const [addToTripOpen, setAddToTripOpen] = useState(false);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [pickedTrip, setPickedTrip] = useState<TripSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchPoiStatusMap().then((map) => setStatus(map[poi.id] ?? null)).catch(() => {});
      fetchMemories(poi.id).then(setMemories).catch(() => {});
    }, [poi.id]),
  );

  function handleTabPress(tab: TabType) {
    if (tab === "Home") navigation.navigate("Dashboard");
    else if (tab === "Explore") navigation.navigate("Home");
    else if (tab === "Trips") navigation.navigate("TripTracking", undefined);
    else if (tab === "Profile") navigation.navigate("Auth");
  }

  async function toggleStatus(next: PoiStatus) {
    const value = status === next ? null : next;
    setStatus(value);
    try {
      await setPoiStatus(poi.id, value);
    } catch {
      setStatus(status);
    }
  }

  async function openAddToTrip() {
    setAddToTripOpen(true);
    setPickedTrip(null);
    try {
      setTrips(await fetchTrips());
    } catch {
      setTrips([]);
    }
  }

  async function addToDay(trip: TripSummary, day: number) {
    try {
      await addTripStop(trip.id, { poiId: poi.id, dayNumber: day });
      setAddToTripOpen(false);
      Alert.alert("Added to trip", `${poi.name} was added to Day ${day} of "${trip.title}".`);
    } catch (e) {
      Alert.alert("Couldn't add to trip", e instanceof Error ? e.message : "something went wrong");
    }
  }

  const rating = Number(poi.avg_rating ?? 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.heroWrapper}>
        {poi.photo_url ? <Image source={{ uri: poi.photo_url }} style={styles.heroImage} resizeMode="cover" /> : <View style={[styles.heroImage, styles.heroImagePlaceholder]} />}

        <SafeAreaView style={styles.floatingHeader} edges={["top"]}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <ArrowBackIcon size={20} />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <View style={styles.sheetCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.placeTitle}>{poi.name}</Text>
              <Text style={styles.placeLocation}>{poi.category.replace("_", " ")}</Text>
            </View>
            {rating > 0 && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
                <StarIcon size={12} />
                <Text style={styles.ratingCount}>({poi.total_ratings ?? 0})</Text>
              </View>
            )}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => toggleStatus("saved")} activeOpacity={0.8}>
              <HeartIcon color={status === "saved" ? "#EA6C1E" : "#4B5563"} filled={status === "saved"} size={18} />
              <Text style={[styles.actionLabel, status === "saved" && styles.actionLabelActive]}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={openAddToTrip} activeOpacity={0.8}>
              <PlusSquareIcon size={18} />
              <Text style={styles.actionLabel}>Add to Trip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => toggleStatus("visited")} activeOpacity={0.8}>
              <CheckIcon color={status === "visited" ? "#16A34A" : "#4B5563"} filled={status === "visited"} size={18} />
              <Text style={[styles.actionLabel, status === "visited" && { color: "#16A34A" }]}>Been here</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("Share Place", `Share ${poi.name} with other travelers!`)} activeOpacity={0.8}>
              <ShareIcon size={18} />
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeader}>About</Text>
          <Text style={styles.aboutText} numberOfLines={readMore ? undefined : 3}>
            {poi.description ?? "No description yet for this place."}
          </Text>
          {poi.description && poi.description.length > 120 && (
            <TouchableOpacity onPress={() => setReadMore((p) => !p)} style={styles.readMoreBtn}>
              <Text style={styles.readMoreText}>{readMore ? "Show less" : "Read more"}</Text>
            </TouchableOpacity>
          )}

          {poi.best_time && (
            <>
              <Text style={[styles.sectionHeader, { marginTop: 18 }]}>Best time to visit</Text>
              <Text style={styles.bestTimeText}>{poi.best_time}</Text>
            </>
          )}

          {memories.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { marginTop: 18 }]}>Photos</Text>
              <View style={styles.galleryGrid}>
                {memories.map((m) => (
                  <Image key={m.id} source={{ uri: m.photo_url }} style={styles.galleryThumb} />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>

      <BottomSheet visible={addToTripOpen}>
        {!pickedTrip ? (
          <>
            <Text style={styles.sheetTitle}>Add to which trip?</Text>
            {trips.length === 0 && <Text style={styles.sheetEmpty}>No trips yet — create one from the Trips tab first.</Text>}
            {trips.map((t) => (
              <TouchableOpacity key={t.id} style={styles.tripRow} onPress={() => setPickedTrip(t)}>
                <Text style={styles.tripRowTitle}>{t.title}</Text>
                <Text style={styles.tripRowMeta}>{t.dayCount} day{t.dayCount === 1 ? "" : "s"}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sheetTitle}>Which day?</Text>
            <View style={styles.dayGrid}>
              {Array.from({ length: pickedTrip.dayCount }, (_, i) => i + 1).map((d) => (
                <TouchableOpacity key={d} style={styles.dayChip} onPress={() => addToDay(pickedTrip, d)}>
                  <Text style={styles.dayChipText}>Day {d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setAddToTripOpen(false)}>
          <Text style={styles.sheetCloseText}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheet>

      <BottomTabBar activeTab="Explore" onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  heroWrapper: { height: height * 0.38, width: "100%", position: "relative", backgroundColor: "#000" },
  heroImage: { width: "100%", height: "100%" },
  heroImagePlaceholder: { backgroundColor: colors.line },
  floatingHeader: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 10, zIndex: 10 },
  circleBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0, 0, 0, 0.4)", alignItems: "center", justifyContent: "center" },
  sheetCard: { flex: 1, backgroundColor: "#FAFAF8", borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -18, overflow: "hidden" },
  sheetScroll: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 24 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  titleCol: { flex: 1 },
  placeTitle: { fontSize: 22, fontWeight: "800", color: "#18181B", letterSpacing: -0.3 },
  placeLocation: { fontSize: 13, color: "#71717A", fontWeight: "500", marginTop: 2, textTransform: "capitalize" },
  ratingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 3, marginLeft: 10 },
  ratingValue: { fontSize: 13, fontWeight: "800", color: "#D97706" },
  ratingCount: { fontSize: 11, color: "#D97706", fontWeight: "600" },
  actionsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  actionBtn: { alignItems: "center", gap: 6, flex: 1 },
  actionLabel: { fontSize: 11.5, fontWeight: "600", color: "#4B5563" },
  actionLabelActive: { color: "#EA6C1E" },
  sectionHeader: { fontSize: 15.5, fontWeight: "700", color: "#18181B", marginBottom: 6 },
  aboutText: { fontSize: 13.5, color: "#4B5563", lineHeight: 20 },
  readMoreBtn: { alignSelf: "flex-start", marginTop: 4 },
  readMoreText: { color: "#EA6C1E", fontSize: 13, fontWeight: "600" },
  bestTimeText: { fontSize: 13.5, color: "#4B5563", lineHeight: 19 },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  galleryThumb: { width: 90, height: 90, borderRadius: 14 },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: 10 },
  sheetEmpty: { fontSize: 13, color: colors.inkSoft, marginBottom: 10 },
  tripRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", flexDirection: "row", justifyContent: "space-between" },
  tripRowTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  tripRowMeta: { fontSize: 12, color: colors.inkSoft },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayChip: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  dayChipText: { fontSize: 13, fontWeight: "700", color: colors.ink },
  sheetCloseBtn: { marginTop: 14, alignSelf: "center" },
  sheetCloseText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
});
