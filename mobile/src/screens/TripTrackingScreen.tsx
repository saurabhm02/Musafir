import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Map3D } from "../components/Map3D";
import { fetchTrip, fetchTrips, createTrip, optimizeTripDay, type TripDetail, type TripSummary } from "../lib/trips";
import { fetchWaypointRoute, type Route } from "../lib/routing";
import type { RootStackParamList } from "../navigation";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import { colors } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function ArrowBackIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#18181B" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon({ size = 20, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MoreHorizontalIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="1.5" fill="#71717A" />
      <Circle cx="19" cy="12" r="1.5" fill="#71717A" />
      <Circle cx="5" cy="12" r="1.5" fill="#71717A" />
    </Svg>
  );
}

function CalendarIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="3" stroke="#71717A" strokeWidth={1.8} />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke="#71717A" strokeWidth={1.8} strokeLinecap="round" />
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

type TabMode = "upcoming" | "past";

type Props = NativeStackScreenProps<RootStackParamList, "TripTracking">;

export function TripTrackingScreen({ route, navigation }: Props) {
  const paramTripId = route.params?.tripId;
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [activeTabMode, setActiveTabMode] = useState<TabMode>("upcoming");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(paramTripId ?? null);
  const [selectedTripDetail, setSelectedTripDetail] = useState<TripDetail | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [dayRoute, setDayRoute] = useState<Route | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [newDays, setNewDays] = useState("3");
  const [creating, setCreating] = useState(false);

  const loadTrips = useCallback(() => {
    setLoading(true);
    fetchTrips()
      .then((list) => {
        setTrips(list);
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(loadTrips);

  useEffect(() => {
    if (paramTripId) {
      setSelectedTripId(paramTripId);
    }
  }, [paramTripId]);

  useEffect(() => {
    if (!selectedTripId) {
      setSelectedTripDetail(null);
      return;
    }
    fetchTrip(selectedTripId)
      .then((t) => {
        setSelectedTripDetail(t);
        setSelectedDay(1);
      })
      .catch(() => setSelectedTripDetail(null));
  }, [selectedTripId]);

  const dayStops = useMemo(() => {
    if (!selectedTripDetail) return [];
    return selectedTripDetail.days[String(selectedDay)] ?? [];
  }, [selectedTripDetail, selectedDay]);

  useEffect(() => {
    if (dayStops.length < 2) {
      setDayRoute(null);
      return;
    }
    fetchWaypointRoute(dayStops.map((s) => ({ lat: s.lat, lon: s.lon })))
      .then(setDayRoute)
      .catch(() => setDayRoute(null));
  }, [dayStops]);

  const handleTabPress = (tab: TabType) => {
    if (tab === "Home") navigation.navigate("Dashboard");
    else if (tab === "Explore") navigation.navigate("Home");
    else if (tab === "Profile") navigation.navigate("Profile");
  };

  const handleOptimize = async () => {
    if (!selectedTripId) return;
    setOptimizing(true);
    try {
      await optimizeTripDay(selectedTripId, selectedDay);
      const refreshed = await fetchTrip(selectedTripId);
      setSelectedTripDetail(refreshed);
    } catch (e) {
      Alert.alert("Optimization Error", e instanceof Error ? e.message : "Failed to optimize route");
    } finally {
      setOptimizing(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Title required", "Please enter a title for your trip.");
      return;
    }
    setCreating(true);
    try {
      const id = await createTrip({
        title: newTitle.trim(),
        destination: newDestination.trim() || undefined,
        dayCount: Number(newDays) || 1,
      });
      setCreateModalOpen(false);
      setNewTitle("");
      setNewDestination("");
      setNewDays("3");
      loadTrips();
      setSelectedTripId(id);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create trip");
    } finally {
      setCreating(false);
    }
  };

  const upcomingTrips = trips.filter((t) => t.status !== "completed");
  const pastTrips = trips.filter((t) => t.status === "completed");

  // TRIP DETAIL VIEW
  if (selectedTripDetail) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

        {/* Top Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedTripId(null)} activeOpacity={0.7}>
            <ArrowBackIcon size={20} />
          </TouchableOpacity>
          <View style={styles.detailTitleCol}>
            <Text style={styles.detailTitle} numberOfLines={1}>
              {selectedTripDetail.title}
            </Text>
            <Text style={styles.detailSub}>
              {selectedTripDetail.destination ?? `${selectedTripDetail.dayCount} Days Plan`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => Alert.alert("Trip Options", selectedTripDetail.title)}
            activeOpacity={0.7}
          >
            <MoreHorizontalIcon size={20} />
          </TouchableOpacity>
        </View>

        {/* Day Selector Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorRow}>
          {Array.from({ length: selectedTripDetail.dayCount }, (_, i) => i + 1).map((d) => {
            const isActive = selectedDay === d;
            const stopCount = selectedTripDetail.days[String(d)]?.length ?? 0;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.dayPill, isActive && styles.dayPillActive]}
                onPress={() => setSelectedDay(d)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayPillText, isActive && styles.dayPillTextActive]}>Day {d}</Text>
                <Text style={[styles.dayPillCount, isActive && styles.dayPillTextActive]}>
                  {stopCount} place{stopCount === 1 ? "" : "s"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Map View */}
        <View style={styles.mapWrap}>
          {dayStops.length > 0 ? (
            <Map3D
              route={dayRoute}
              pois={dayStops.map((s) => ({
                id: s.poi_id,
                name: s.name,
                category: s.category,
                lat: s.lat,
                lon: s.lon,
                photo_url: s.photo_url,
                description: null,
                is_verified: false,
                avg_rating: null,
                total_ratings: null,
                best_time: null,
              }))}
              onPoiPress={(p) => navigation.navigate("PlaceDetails", { poi: p })}
            />
          ) : (
            <View style={styles.emptyMap}>
              <Text style={styles.emptyMapText}>No places added to Day {selectedDay} yet.</Text>
            </View>
          )}
        </View>

        {/* Stops List */}
        <ScrollView style={styles.stopsScroll} contentContainerStyle={{ paddingBottom: 85 }}>
          {dayStops.map((stop, idx) => (
            <TouchableOpacity
              key={stop.id}
              style={styles.stopCard}
              onPress={() =>
                navigation.navigate("PlaceDetails", {
                  poi: {
                    id: stop.poi_id,
                    name: stop.name,
                    category: stop.category,
                    lat: stop.lat,
                    lon: stop.lon,
                    photo_url: stop.photo_url,
                    description: null,
                    is_verified: false,
                    avg_rating: null,
                    total_ratings: null,
                    best_time: null,
                  },
                })
              }
              activeOpacity={0.88}
            >
              <View style={styles.stopNumCircle}>
                <Text style={styles.stopNumText}>{idx + 1}</Text>
              </View>
              {stop.photo_url ? (
                <Image source={{ uri: stop.photo_url }} style={styles.stopImage} resizeMode="cover" />
              ) : (
                <View style={[styles.stopImage, styles.stopImageFallback]} />
              )}
              <View style={styles.stopInfo}>
                <Text style={styles.stopName} numberOfLines={1}>
                  {stop.name}
                </Text>
                <Text style={styles.stopCategory}>{stop.category.replace("_", " ")}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {dayStops.length === 0 && (
            <View style={styles.emptyStopsBox}>
              <Text style={styles.emptyStopsText}>
                Explore places on Musafir and tap "Add to Trip" to organize your itinerary.
              </Text>
            </View>
          )}

          {dayStops.length > 1 && (
            <TouchableOpacity
              style={styles.optimizeBtn}
              onPress={handleOptimize}
              disabled={optimizing}
              activeOpacity={0.88}
            >
              {optimizing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <SparkleIcon size={16} />
                  <Text style={styles.optimizeBtnText}>Optimize Route</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>

        <BottomTabBar activeTab="Trips" onTabPress={handleTabPress} />
      </SafeAreaView>
    );
  }

  // TRIPS LIST VIEW (Panel 5 - Redesigned Trips Page)
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      {/* Main Header with "My Trips" and "+" Button */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Trips</Text>
        <TouchableOpacity
          style={styles.createTripCircleBtn}
          onPress={() => setCreateModalOpen(true)}
          activeOpacity={0.85}
        >
          <PlusIcon size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Segmented Tabs: Upcoming & Past */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.segmentTab, activeTabMode === "upcoming" && styles.segmentTabActive]}
          onPress={() => setActiveTabMode("upcoming")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentTabText, activeTabMode === "upcoming" && styles.segmentTabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentTab, activeTabMode === "past" && styles.segmentTabActive]}
          onPress={() => setActiveTabMode("past")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentTabText, activeTabMode === "past" && styles.segmentTabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTabMode === "upcoming" ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Upcoming Trips</Text>
            </View>

            {upcomingTrips.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>No upcoming trips yet</Text>
                <Text style={styles.emptyCardSub}>Plan a new journey or add places from Explore.</Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setCreateModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyActionText}>+ Plan a Trip</Text>
                </TouchableOpacity>
              </View>
            ) : (
              upcomingTrips.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={styles.tripCard}
                  onPress={() => setSelectedTripId(trip.id)}
                  activeOpacity={0.9}
                >
                  {/* Trip Cover Photo */}
                  <View style={styles.cardImageContainer}>
                    {trip.coverPhotoUrl ? (
                      <Image source={{ uri: trip.coverPhotoUrl }} style={styles.cardImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
                    )}

                    {/* Status Badge Top-Right */}
                    <View style={styles.statusBadgeUpcoming}>
                      <Text style={styles.statusBadgeUpcomingText}>Upcoming</Text>
                    </View>
                  </View>

                  {/* Trip Details */}
                  <View style={styles.cardContent}>
                    <Text style={styles.tripTitle}>{trip.title}</Text>
                    <Text style={styles.tripDestination}>
                      {trip.destination ?? `${trip.dayCount} Days Itinerary`}
                    </Text>

                    <View style={styles.cardFooter}>
                      <View style={styles.dateRow}>
                        <CalendarIcon size={14} />
                        <Text style={styles.dateText}>
                          {trip.dayCount} Day{trip.dayCount === 1 ? "" : "s"} • {trip.placeCount} Place
                          {trip.placeCount === 1 ? "" : "s"}
                        </Text>
                      </View>

                      {/* Avatars / Travelers Stack & Overflow */}
                      <View style={styles.travelerRow}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarText}>👤</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.cardMoreBtn}
                          onPress={() => Alert.alert("Trip", trip.title)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MoreHorizontalIcon size={18} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        ) : (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Completed Trips</Text>
            </View>

            {pastTrips.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>No past trips recorded yet</Text>
                <Text style={styles.emptyCardSub}>When you finish a trip, it will appear here.</Text>
              </View>
            ) : (
              pastTrips.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={styles.tripCard}
                  onPress={() => setSelectedTripId(trip.id)}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardImageContainer}>
                    {trip.coverPhotoUrl ? (
                      <Image source={{ uri: trip.coverPhotoUrl }} style={styles.cardImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
                    )}

                    <View style={styles.statusBadgeCompleted}>
                      <Text style={styles.statusBadgeCompletedText}>Completed</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.tripTitle}>{trip.title}</Text>
                    <Text style={styles.tripDestination}>
                      {trip.destination ?? `${trip.placeCount} Places visited`}
                    </Text>

                    <View style={styles.cardFooter}>
                      <View style={styles.dateRow}>
                        <CalendarIcon size={14} />
                        <Text style={styles.dateText}>
                          {trip.dayCount} Days • {trip.placeCount} Places
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.cardMoreBtn}
                        onPress={() => Alert.alert("Trip", trip.title)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MoreHorizontalIcon size={18} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Create Trip Modal */}
      <Modal visible={createModalOpen} transparent animationType="fade" onRequestClose={() => setCreateModalOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setCreateModalOpen(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.createModalCard}>
                <Text style={styles.createModalTitle}>Plan New Trip</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Trip Title</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Ladakh Road Trip"
                    placeholderTextColor="#9CA3AF"
                    value={newTitle}
                    onChangeText={setNewTitle}
                    autoFocus
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Destination</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Leh, Pangong, Nubra"
                    placeholderTextColor="#9CA3AF"
                    value={newDestination}
                    onChangeText={setNewDestination}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Duration (Days)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="3"
                    placeholderTextColor="#9CA3AF"
                    value={newDays}
                    onChangeText={setNewDays}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setCreateModalOpen(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.createSubmitBtn}
                    onPress={handleCreateTrip}
                    disabled={creating}
                    activeOpacity={0.88}
                  >
                    {creating ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.createSubmitBtnText}>Create Trip</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <BottomTabBar activeTab="Trips" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.5,
  },
  createTripCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  segmentTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
  },
  segmentTabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  segmentTabTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 95,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16.5,
    fontWeight: "700",
    color: "#18181B",
  },
  tripCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageContainer: {
    height: 150,
    width: "100%",
    position: "relative",
    backgroundColor: "#E5E7EB",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImagePlaceholder: {
    backgroundColor: "#E5E7EB",
  },
  statusBadgeUpcoming: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeUpcomingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statusBadgeCompleted: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#16A34A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeCompletedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  cardContent: {
    padding: 16,
  },
  tripTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  tripDestination: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "500",
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: "#71717A",
    fontWeight: "500",
  },
  travelerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
  },
  cardMoreBtn: {
    padding: 4,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
  },
  emptyCardTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 4,
  },
  emptyCardSub: {
    fontSize: 13,
    color: "#71717A",
    textAlign: "center",
    marginBottom: 14,
  },
  emptyActionBtn: {
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitleCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#18181B",
  },
  detailSub: {
    fontSize: 12,
    color: "#71717A",
    fontWeight: "500",
    marginTop: 1,
  },
  moreBtn: {
    padding: 6,
  },
  daySelectorRow: {
    paddingHorizontal: 18,
    gap: 8,
    paddingBottom: 8,
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
  },
  dayPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  dayPillCount: {
    fontSize: 10.5,
    color: "#9CA3AF",
    marginTop: 1,
  },
  dayPillTextActive: {
    color: "#FFFFFF",
  },
  mapWrap: {
    height: 200,
    marginHorizontal: 18,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    backgroundColor: "#E4ECE5",
  },
  emptyMap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyMapText: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "500",
  },
  stopsScroll: {
    flex: 1,
    marginHorizontal: 18,
    marginTop: 10,
  },
  stopCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
  },
  stopNumCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stopNumText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.accent,
  },
  stopImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
  },
  stopImageFallback: {
    backgroundColor: "#E5E7EB",
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#18181B",
  },
  stopCategory: {
    fontSize: 11.5,
    color: "#71717A",
    textTransform: "capitalize",
    marginTop: 1,
  },
  emptyStopsBox: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  emptyStopsText: {
    fontSize: 12.5,
    color: "#71717A",
    textAlign: "center",
  },
  optimizeBtn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.accent,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  optimizeBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  createModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#FAFAF8",
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    color: "#18181B",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#71717A",
  },
  createSubmitBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  createSubmitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
