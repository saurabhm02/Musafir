import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { RootStackParamList } from "../navigation";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import { fetchMemories, type Memory } from "../lib/memories";
import { fetchPoiStatusMap, setPoiStatus, type PoiStatus } from "../lib/poiStatus";
import { fetchTrips, addTripStop, createTrip, type TripSummary } from "../lib/trips";
import { fetchPoiDetails, type PoiDetails } from "../lib/pois";
import { colors } from "../theme";
import { FullScreenPhotoViewer, type PhotoItem } from "../components/FullScreenPhotoViewer";
import { AddToTripBottomSheet } from "../components/AddToTripBottomSheet";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
      <Path
        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      <Path d="M8.5 12.3l2.3 2.3 4.7-5" stroke={filled ? "#FFFFFF" : color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CompassIcon({ size = 16, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M16 8L13.5 13.5L8 16L10.5 10.5L16 8Z" fill={color} />
    </Svg>
  );
}

function MountainSmallIcon({ size = 16, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 20L8.5 7L15 20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13 14L17 6L22 20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ClockSmallIcon({ size = 16, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M12 7v5l3 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function CalendarSmallIcon({ size = 16, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "PlaceDetails">;

export function PlaceDetailsScreen({ route, navigation }: Props) {
  const poi = route.params.poi;
  const [details, setDetails] = useState<PoiDetails | null>(null);
  const [status, setStatus] = useState<PoiStatus | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [readMore, setReadMore] = useState(false);
  const [addToTripOpen, setAddToTripOpen] = useState(false);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchPoiStatusMap().then((map) => setStatus(map[poi.id] ?? null)).catch(() => {});
      fetchMemories(poi.id).then(setMemories).catch(() => {});
      fetchPoiDetails(poi.id).then(setDetails).catch(() => {});
      fetchTrips().then(setTrips).catch(() => {});
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

  const handleStartNavigationFlow = () => {
    navigation.navigate("TripNavigation", { poi });
  };

  const handleAddToTripDay = async (trip: TripSummary, dayNumber: number) => {
    await addTripStop(trip.id, { poiId: poi.id, dayNumber });
    Alert.alert("Added to trip", `${poi.name} added to Day ${dayNumber} of "${trip.title}".`);
  };

  const handleCreateNewTrip = async (title: string, destination?: string, dayCount?: number) => {
    const id = await createTrip({ title, destination, dayCount });
    await addTripStop(id, { poiId: poi.id, dayNumber: 1 });
    Alert.alert("Trip Created", `Created "${title}" and added ${poi.name}.`);
  };

  const rating = Number(poi.avg_rating ?? 0);
  const heroPhotoUrl = details?.photos?.[0]?.url ?? poi.photo_url;

  // Real photos combined from API details & memories
  const allPhotos: PhotoItem[] = [
    ...(details?.photos?.map((p) => ({
      id: p.id,
      url: p.url,
      source: p.source,
      attribution: p.attribution,
    })) ?? []),
    ...memories.map((m) => ({
      id: m.id,
      url: m.photo_url,
      source: "User Memory",
      attribution: null,
    })),
  ];

  // If no photos in array but poi has photo_url, include it
  if (allPhotos.length === 0 && poi.photo_url) {
    allPhotos.push({
      id: "cover",
      url: poi.photo_url,
      source: "Musafir",
      attribution: null,
    });
  }

  const openViewer = (index: number) => {
    setPhotoViewerIndex(index);
    setPhotoViewerOpen(true);
  };

  const locationSubtitle = details?.metadata?.state
    ? `${details.metadata.district ? `${details.metadata.district}, ` : ""}${details.metadata.state}`
    : poi.category.replace("_", " ");

  const meta = details?.metadata;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero Image Section */}
      <View style={styles.heroWrapper}>
        {heroPhotoUrl ? (
          <TouchableOpacity activeOpacity={0.95} onPress={() => openViewer(0)} style={StyleSheet.absoluteFill}>
            <Image source={{ uri: heroPhotoUrl }} style={styles.heroImage} resizeMode="cover" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.heroImage, styles.heroImagePlaceholder]} />
        )}

        <SafeAreaView style={styles.floatingHeader} edges={["top"]}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <ArrowBackIcon size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.circleBtn} onPress={() => toggleStatus("saved")} activeOpacity={0.8}>
            <HeartIcon color={status === "saved" ? colors.accent : "#FFFFFF"} filled={status === "saved"} size={18} />
          </TouchableOpacity>
        </SafeAreaView>

        {allPhotos.length > 1 && (
          <TouchableOpacity style={styles.photoCountBadge} onPress={() => openViewer(0)} activeOpacity={0.85}>
            <Text style={styles.photoCountText}>📷 1 / {allPhotos.length}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sheet Content Card */}
      <View style={styles.sheetCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
          {/* Title and Rating Row */}
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.placeTitle}>{poi.name}</Text>
              <Text style={styles.placeLocation}>
                {`${locationSubtitle} • ${(poi.category || "").replace("_", " ")}`}
              </Text>
            </View>
            {rating > 0 && (
              <View style={styles.ratingBadge}>
                <StarIcon size={12} />
                <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
                {Boolean(poi.total_ratings && poi.total_ratings > 0) && (
                  <Text style={styles.ratingCount}>{`(${poi.total_ratings})`}</Text>
                )}
              </View>
            )}
          </View>

          {/* Action Buttons Row (Share Button completely removed) */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => toggleStatus("saved")} activeOpacity={0.8}>
              <View style={[styles.actionIconCircle, status === "saved" && styles.actionIconCircleSaved]}>
                <HeartIcon color={status === "saved" ? colors.accent : "#4B5563"} filled={status === "saved"} size={18} />
              </View>
              <Text style={[styles.actionLabel, status === "saved" && styles.actionLabelActive]}>
                {status === "saved" ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => setAddToTripOpen(true)} activeOpacity={0.8}>
              <View style={[styles.actionIconCircle, styles.actionIconCirclePrimary]}>
                <PlusSquareIcon color={colors.accent} size={18} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.accent, fontWeight: "700" }]}>Add to Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => toggleStatus("visited")} activeOpacity={0.8}>
              <View style={[styles.actionIconCircle, status === "visited" && styles.actionIconCircleVisited]}>
                <CheckIcon color={status === "visited" ? "#16A34A" : "#4B5563"} filled={status === "visited"} size={18} />
              </View>
              <Text style={[styles.actionLabel, status === "visited" && { color: "#16A34A" }]}>
                {status === "visited" ? "Been here" : "Been here"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Info / Metadata Grid (Only non-null values) */}
          {(meta?.difficulty || meta?.distance_km || meta?.duration_hours || meta?.elevation_gain_m || meta?.best_time || poi.best_time) && (
            <View style={styles.quickInfoGrid}>
              {meta?.difficulty && (
                <View style={styles.infoCard}>
                  <CompassIcon size={16} />
                  <Text style={styles.infoCardLabel}>Difficulty</Text>
                  <Text style={styles.infoCardValue}>{meta.difficulty}</Text>
                </View>
              )}

              {meta?.distance_km && (
                <View style={styles.infoCard}>
                  <CompassIcon size={16} color="#2563EB" />
                  <Text style={styles.infoCardLabel}>Distance</Text>
                  <Text style={styles.infoCardValue}>{meta.distance_km} km</Text>
                </View>
              )}

              {meta?.duration_hours && (
                <View style={styles.infoCard}>
                  <ClockSmallIcon size={16} color="#D97706" />
                  <Text style={styles.infoCardLabel}>Est. Time</Text>
                  <Text style={styles.infoCardValue}>{meta.duration_hours} hrs</Text>
                </View>
              )}

              {(meta?.elevation_gain_m || meta?.max_elevation_m) && (
                <View style={styles.infoCard}>
                  <MountainSmallIcon size={16} color="#16A34A" />
                  <Text style={styles.infoCardLabel}>Elevation</Text>
                  <Text style={styles.infoCardValue}>
                    {meta.elevation_gain_m ? `${meta.elevation_gain_m}m gain` : `${meta.max_elevation_m}m`}
                  </Text>
                </View>
              )}

              {(meta?.best_time || poi.best_time) && (
                <View style={[styles.infoCard, { width: "100%" }]}>
                  <CalendarSmallIcon size={16} color="#8B5CF6" />
                  <Text style={styles.infoCardLabel}>Best Time to Visit</Text>
                  <Text style={styles.infoCardValue}>{meta?.best_time || poi.best_time}</Text>
                </View>
              )}
            </View>
          )}

          {/* About Section */}
          <Text style={styles.sectionHeader}>About</Text>
          <Text style={styles.aboutText} numberOfLines={readMore ? undefined : 3}>
            {poi.description ?? "Experience the serene beauty and natural landscapes of this popular destination in India."}
          </Text>
          {poi.description && poi.description.length > 120 && (
            <TouchableOpacity onPress={() => setReadMore((p) => !p)} style={styles.readMoreBtn}>
              <Text style={styles.readMoreText}>{readMore ? "Show less" : "Read more"}</Text>
            </TouchableOpacity>
          )}

          {/* Photos Gallery Section */}
          {allPhotos.length > 0 && (
            <View style={styles.photosSection}>
              <View style={styles.photosHeaderRow}>
                <Text style={styles.sectionHeader}>Photos ({allPhotos.length})</Text>
                <TouchableOpacity onPress={() => openViewer(0)} activeOpacity={0.7}>
                  <Text style={styles.viewAllPhotosText}>View all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                {allPhotos.map((p, idx) => (
                  <TouchableOpacity
                    key={p.id || idx}
                    onPress={() => openViewer(idx)}
                    activeOpacity={0.88}
                    style={styles.galleryThumbWrap}
                  >
                    <Image source={{ uri: p.url }} style={styles.galleryThumb} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 110 }} />
        </ScrollView>
      </View>

      {/* Floating Bottom Action Bar */}
      <SafeAreaView style={styles.floatingBottomBar} edges={["bottom"]}>
        <TouchableOpacity style={styles.bottomSaveBtn} onPress={() => toggleStatus("saved")} activeOpacity={0.8}>
          <HeartIcon color={status === "saved" ? colors.accent : "#4B5563"} filled={status === "saved"} size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomAddToTripBtn} onPress={() => setAddToTripOpen(true)} activeOpacity={0.8}>
          <PlusSquareIcon color="#18181B" size={20} />
          <Text style={styles.bottomAddToTripText}>Add to Trip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomStartNavBtn}
          onPress={handleStartNavigationFlow}
          activeOpacity={0.88}
        >
          <CompassIcon size={18} color="#FFFFFF" />
          <Text style={styles.bottomStartNavText}>Start Trip</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Full-Screen Photo Viewer Modal */}
      <FullScreenPhotoViewer
        visible={photoViewerOpen}
        photos={allPhotos}
        initialIndex={photoViewerIndex}
        poiName={poi.name}
        locationText={locationSubtitle}
        onClose={() => setPhotoViewerOpen(false)}
      />

      {/* Add To Trip Bottom Sheet */}
      <AddToTripBottomSheet
        visible={addToTripOpen}
        poi={poi}
        trips={trips}
        onClose={() => setAddToTripOpen(false)}
        onStartNavigation={handleStartNavigationFlow}
        onAddToTripDay={handleAddToTripDay}
        onCreateNewTrip={handleCreateNewTrip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  heroWrapper: {
    height: SCREEN_HEIGHT * 0.38,
    width: "100%",
    position: "relative",
    backgroundColor: "#09090B",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroImagePlaceholder: {
    backgroundColor: "#27272A",
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoCountBadge: {
    position: "absolute",
    bottom: 28,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  photoCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  sheetCard: {
    flex: 1,
    backgroundColor: "#FAFAF8",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    overflow: "hidden",
  },
  sheetScroll: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titleCol: {
    flex: 1,
  },
  placeTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.4,
  },
  placeLocation: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "500",
    marginTop: 2,
    textTransform: "capitalize",
  },
  categoryText: {
    color: colors.accent,
    fontWeight: "600",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginLeft: 10,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D97706",
  },
  ratingCount: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    marginBottom: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionBtn: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  actionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconCirclePrimary: {
    backgroundColor: colors.accentSoft,
  },
  actionIconCircleSaved: {
    backgroundColor: colors.accentSoft,
  },
  actionIconCircleVisited: {
    backgroundColor: "#DCFCE7",
  },
  actionLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#4B5563",
  },
  actionLabelActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  quickInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  infoCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  infoCardLabel: {
    fontSize: 11,
    color: "#71717A",
    fontWeight: "600",
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
    textTransform: "capitalize",
  },
  sectionHeader: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#18181B",
    marginBottom: 6,
  },
  aboutText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 21,
  },
  readMoreBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  readMoreText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  photosSection: {
    marginTop: 20,
  },
  photosHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  viewAllPhotosText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  galleryScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  galleryThumbWrap: {
    width: 105,
    height: 105,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
  },
  galleryThumb: {
    width: "100%",
    height: "100%",
  },
  floatingBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === "android" ? 14 : 6,
    borderTopWidth: 1.2,
    borderTopColor: "#E5E7EB",
    gap: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomSaveBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FAFAF8",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomAddToTripBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FAFAF8",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  bottomAddToTripText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#18181B",
  },
  bottomStartNavBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accent,
    gap: 6,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  bottomStartNavText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
