import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme";
import type { CorridorSearchResponse, RecommendedPoi } from "../lib/routing";
import type { Poi } from "../lib/pois";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min(320, SCREEN_WIDTH - 64);

type FilterCategory = "all" | "worth_the_detour" | "budget_food" | "sunset_viewpoint" | "quick_stops" | "trek_trail" | "rest_stop";

const FILTER_TABS: Array<{ id: FilterCategory; label: string; icon: string }> = [
  { id: "all", label: "All", icon: "✨" },
  { id: "worth_the_detour", label: "Worth the Detour", icon: "⭐" },
  { id: "budget_food", label: "Food", icon: "🍲" },
  { id: "sunset_viewpoint", label: "Viewpoints", icon: "🌄" },
  { id: "quick_stops", label: "Quick Stops", icon: "⚡" },
  { id: "trek_trail", label: "Treks", icon: "🥾" },
  { id: "rest_stop", label: "Rest Stops", icon: "☕" },
];

function StarSmallIcon({ size = 11 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#F59E0B">
      <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </Svg>
  );
}

function ClockSmallIcon({ size = 12, color = "#4B5563" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M12 7v5l3 3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NavigationArrowSmallIcon({ size = 13, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11L21 3L13 21L11 13L3 11Z" fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

function CloseSmallIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="#E4E4E7" />
      <Path d="M15 9L9 15M9 9l6 6" stroke="#71717A" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function SuitcaseSmallIcon({ size = 13, color = "#4B5563" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="7" width="16" height="14" rx="3" stroke={color} strokeWidth={1.8} />
      <Path d="M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function recommendedPoiToPoi(r: RecommendedPoi): Poi {
  return {
    id: r.id,
    name: r.name,
    description: null,
    category: r.category,
    is_verified: true,
    lat: r.lat,
    lon: r.lon,
    photo_url: r.photoUrl,
    avg_rating: r.rating,
    total_ratings: r.totalRatings,
    best_time: null,
    distance_km: r.detourDistanceKm,
  };
}

function getTagStyles(tag: RecommendedPoi["tag"]) {
  switch (tag) {
    case "worth_the_detour":
      return { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" };
    case "budget_food":
      return { bg: "#DCFCE7", text: "#166534", border: "#BBF7D0" };
    case "sunset_viewpoint":
      return { bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" };
    case "trek_trail":
      return { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" };
    case "rest_stop":
      return { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" };
    case "premium_experience":
      return { bg: "#F3E8FF", text: "#6B21A8", border: "#E9D5FF" };
    default:
      return { bg: "#F4F4F5", text: "#3F3F46", border: "#E4E4E7" };
  }
}

type Props = {
  corridorData: CorridorSearchResponse | null;
  loading: boolean;
  onSelectPoi: (poi: Poi) => void;
  onAddToTrip: (poi: Poi) => void;
  onNavigatePoi: (poi: Poi) => void;
  onClearRoute: () => void;
  selectedPoiId?: string;
};

export function AlongJourneySheet({
  corridorData,
  loading,
  onSelectPoi,
  onAddToTrip,
  onNavigatePoi,
  onClearRoute,
  selectedPoiId,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  if (loading) {
    return (
      <View style={styles.sheetContainer}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeftCol}>
            <Text style={styles.sheetTitle}>Calculating Smart Route...</Text>
            <Text style={styles.sheetSubtitle}>Discovering road detours & verified stops</Text>
          </View>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
        <View style={styles.loadingSkeletonCard}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.skeletonText}>Scanning Musafir road corridors...</Text>
        </View>
      </View>
    );
  }

  if (!corridorData) return null;

  const { route, recommendations, groupedBuckets } = corridorData;

  // Filter recommendations based on active filter chip
  const filteredList = recommendations.filter((r) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "worth_the_detour") return r.tag === "worth_the_detour" || r.score >= 80;
    if (activeFilter === "budget_food") return r.tag === "budget_food";
    if (activeFilter === "sunset_viewpoint") return r.tag === "sunset_viewpoint";
    if (activeFilter === "quick_stops") return r.tag === "rest_stop" || r.detourDurationMin <= 5;
    if (activeFilter === "trek_trail") return r.tag === "trek_trail";
    if (activeFilter === "rest_stop") return r.tag === "rest_stop" || r.detourDurationMin <= 5;
    return true;
  });

  const hours = Math.floor(route.durationMin / 60);
  const mins = route.durationMin % 60;
  const formattedRouteDuration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <View style={styles.sheetContainer}>
      {/* Top Route Overview Card */}
      <View style={styles.routeHeaderCard}>
        <View style={styles.routeHeaderTop}>
          <View style={styles.routeLineDotOrigin} />
          <Text style={styles.routePlacesText} numberOfLines={1}>
            {route.origin} <Text style={styles.routeArrowText}>→</Text> {route.destination}
          </Text>
          <TouchableOpacity onPress={onClearRoute} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <CloseSmallIcon size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.routeStatsRow}>
          <Text style={styles.routeStatBold}>
            {route.distanceKm} km <Text style={styles.routeStatDivider}>•</Text> {formattedRouteDuration}
          </Text>
          {route.overlapPercentage > 0 && (
            <View style={styles.overlapPill}>
              <Text style={styles.overlapPillText}>
                ✨ {route.overlapPercentage}% Musafir Corridor
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Section Title & Filter Chips */}
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionHeadingTitle}>Along Your Journey</Text>
        <Text style={styles.sectionCountText}>{recommendations.length} stops found</Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.id;
          let count = recommendations.length;
          if (tab.id === "worth_the_detour") count = groupedBuckets.worthTheDetour.length;
          else if (tab.id === "budget_food") count = groupedBuckets.budgetFood.length;
          else if (tab.id === "sunset_viewpoint") count = groupedBuckets.sunsetViewpoint.length;
          else if (tab.id === "quick_stops") count = groupedBuckets.restStop.length;
          else if (tab.id === "trek_trail") count = groupedBuckets.trekTrail.length;
          else if (tab.id === "rest_stop") count = groupedBuckets.restStop.length;

          if (count === 0 && tab.id !== "all") return null;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {tab.icon} {tab.label} {count > 0 ? `(${count})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Empty State */}
      {filteredList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛣️</Text>
          <Text style={styles.emptyTitle}>Nothing interesting along this route yet.</Text>
          <Text style={styles.emptySubtitle}>
            We didn't find verified stops matching this filter. Try selecting 'All' or zooming into the map.
          </Text>
        </View>
      ) : (
        /* Recommendations Horizontal Snap Carousel */
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 14}
          decelerationRate="fast"
          contentContainerStyle={styles.cardsScroll}
        >
          {filteredList.map((poi, idx) => {
            const isSelected = poi.id === selectedPoiId;
            const tagStyle = getTagStyles(poi.tag);
            const poiObj = recommendedPoiToPoi(poi);

            return (
              <TouchableOpacity
                key={poi.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => onSelectPoi(poiObj)}
                activeOpacity={0.92}
              >
                {/* Photo & Top Badges */}
                <View style={styles.cardPhotoWrapper}>
                  {poi.photoUrl ? (
                    <Image source={{ uri: poi.photoUrl }} style={styles.cardPhoto} resizeMode="cover" />
                  ) : (
                    <View style={[styles.cardPhoto, styles.cardPhotoPlaceholder]}>
                      <Text style={styles.cardPhotoPlaceholderText}>📸</Text>
                    </View>
                  )}

                  {/* Curated Tag Badge */}
                  <View style={[styles.tagBadge, { backgroundColor: tagStyle.bg, borderColor: tagStyle.border }]}>
                    <Text style={[styles.tagBadgeText, { color: tagStyle.text }]}>{poi.tagLabel}</Text>
                  </View>

                  {/* Rating Pill */}
                  {poi.rating > 0 && (
                    <View style={styles.ratingPill}>
                      <StarSmallIcon size={11} />
                      <Text style={styles.ratingPillText}>{poi.rating.toFixed(1)}</Text>
                    </View>
                  )}

                  {/* Milepost Progress Label */}
                  <View style={styles.milepostBadge}>
                    <Text style={styles.milepostText}>KM {Math.round(poi.kmAlongRoute)}</Text>
                  </View>
                </View>

                {/* Card Info Section */}
                <View style={styles.cardContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.poiName} numberOfLines={1}>
                      {poi.name}
                    </Text>
                    <Text style={styles.poiCategory}>{poi.category.replace("_", " ")}</Text>
                  </View>

                  {/* PROMINENT DETOUR UX SECTION */}
                  <View style={styles.detourBox}>
                    <View style={styles.detourPrimaryRow}>
                      <View style={styles.detourTimePill}>
                        <Text style={styles.detourTimeText}>+{poi.detourDurationMin} min detour</Text>
                      </View>
                      <Text style={styles.detourDistSub}>+{poi.detourDistanceKm} km</Text>
                    </View>

                    {poi.estimatedVisitDurationMin > 0 && (
                      <View style={styles.visitTimeRow}>
                        <ClockSmallIcon size={11} color="#6B7280" />
                        <Text style={styles.visitTimeText}>~{poi.estimatedVisitDurationMin}m recommended visit</Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={() => onAddToTrip(poiObj)}
                      activeOpacity={0.75}
                    >
                      <SuitcaseSmallIcon size={13} color="#4B5563" />
                      <Text style={styles.saveBtnText}>Add to Trip</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.navigateBtn}
                      onPress={() => onNavigatePoi(poiObj)}
                      activeOpacity={0.8}
                    >
                      <NavigationArrowSmallIcon size={12} color="#FFFFFF" />
                      <Text style={styles.navigateBtnText}>Navigate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: "#FAFAF9",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeftCol: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  loadingSkeletonCard: {
    marginHorizontal: 20,
    height: 160,
    borderRadius: 16,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  skeletonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#71717A",
  },
  routeHeaderCard: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F0F0EE",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  routeHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeLineDotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginRight: 8,
  },
  routePlacesText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  routeArrowText: {
    color: "#9CA3AF",
    fontWeight: "500",
  },
  routeStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingLeft: 16,
  },
  routeStatBold: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#4B5563",
  },
  routeStatDivider: {
    color: "#CBD5E1",
  },
  overlapPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: "#FDE68A",
  },
  overlapPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionHeadingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },
  filterChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  cardsScroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 14,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  cardPhotoWrapper: {
    height: 120,
    width: "100%",
    backgroundColor: "#E4E4E7",
    position: "relative",
  },
  cardPhoto: {
    width: "100%",
    height: "100%",
  },
  cardPhotoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardPhotoPlaceholderText: {
    fontSize: 28,
  },
  tagBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  ratingPill: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  ratingPillText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
  },
  milepostBadge: {
    position: "absolute",
    bottom: 8,
    left: 10,
    backgroundColor: "rgba(24,24,27,0.8)",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  milepostText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  cardContent: {
    padding: 12,
  },
  titleRow: {
    marginBottom: 8,
  },
  poiName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.ink,
  },
  poiCategory: {
    fontSize: 11,
    color: colors.inkSoft,
    textTransform: "capitalize",
    marginTop: 1,
  },
  detourBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  detourPrimaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detourTimePill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  detourTimeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  detourDistSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  visitTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  visitTimeText: {
    fontSize: 10,
    color: "#64748B",
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F5",
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  saveBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#4B5563",
  },
  navigateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  navigateBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.inkSoft,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
  },
});
