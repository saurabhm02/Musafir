import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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
import {
  fetchTrekById,
  type TrekDetailsData,
  type TrekRouteItem,
  type TrekWaypoint,
} from "../lib/treks";
import { fetchPoiStatusMap, setPoiStatus, type PoiStatus } from "../lib/poiStatus";
import { colors } from "../theme";
import { TrekRouteMap } from "../components/TrekRouteMap";
import { FullScreenPhotoViewer, type PhotoItem } from "../components/FullScreenPhotoViewer";
import { AddMemoryModal } from "../components/AddMemoryModal";
import { OfflineTrekBadge } from "../components/OfflineTrekBadge";
import { OfflineStorage } from "../lib/offlineStorage";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

function ArrowBackIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke="#FFFFFF"
        strokeWidth={2.4}
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

function HeartIcon({
  color = "#4B5563",
  size = 18,
  filled = false,
}: {
  color?: string;
  size?: number;
  filled?: boolean;
}) {
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

function CompassIcon({ size = 16, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M16 8L13.5 13.5L8 16L10.5 10.5L16 8Z" fill={color} />
    </Svg>
  );
}

function MountainIcon({ size = 16, color = "#16A34A" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 20L8.5 7L15 20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 14L17 6L22 20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ElevationGainIcon({ size = 16, color = "#16A34A" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 17l6-6 4 4 8-8M14 7h7v7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ElevationLossIcon({ size = 16, color = "#DC2626" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 7l6 6 4-4 8 8M14 17h7v-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CameraSmallIcon({ size = 16, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function WaypointDotIcon({ color = "#16A34A" }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Circle cx="7" cy="7" r="5" fill={color} stroke="#FFFFFF" strokeWidth={2} />
    </Svg>
  );
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatBestMonths(months?: number[]): string {
  if (!months || months.length === 0) return "Year-round";
  return months.map((m) => MONTH_NAMES[m - 1] || `${m}`).join(", ");
}

type Props = NativeStackScreenProps<RootStackParamList, "TrekDetails">;

export function TrekDetailsScreen({ route, navigation }: Props) {
  const { trekIdOrSlug, poi } = route.params;
  const [trek, setTrek] = useState<TrekDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<TrekRouteItem | null>(null);
  const [status, setStatus] = useState<PoiStatus | null>(null);
  const [readMore, setReadMore] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [addMemoryOpen, setAddMemoryOpen] = useState(false);

  const identifier = trekIdOrSlug || poi?.id || "";

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchTrekById(identifier)
      .then((data) => {
        if (!isMounted) return;
        setTrek(data);
        if (data.routes && data.routes.length > 0) {
          const primary = data.routes.find((r) => r.isPrimary) || data.routes[0];
          setSelectedRoute(primary);
        }
      })
      .catch(async (err) => {
        console.warn("Failed to load trek details, checking offline storage:", err);
        const local = await OfflineStorage.getOfflinePackage(identifier);
        if (local && isMounted) {
          const offlineTrek: TrekDetailsData = {
            id: local.trek.id,
            poiId: "",
            name: local.trek.name,
            slug: local.trek.slug,
            region: local.trek.region,
            difficulty: local.trek.difficulty,
            summary: local.trek.summary,
            bestMonths: local.trek.bestMonths || [],
            coordinates: {
              lat: local.trek.lat || 31.543,
              lon: local.trek.lon || 77.374,
            },
            rating: {
              avg: 4.8,
              count: 120,
            },
            address: local.trek.region || "Himachal Pradesh",
            photos: local.trek.coverPhoto
              ? [
                  {
                    id: "cover",
                    url: local.trek.coverPhoto,
                    attribution: null,
                    source: "Musafir Offline",
                    license: null,
                  },
                ]
              : [],
            routes: [
              {
                id: local.route.id,
                trekId: local.trek.id,
                name: local.route.name,
                routeType: local.route.routeType || "loop",
                distanceKm: local.route.distanceKm,
                elevationGainM: local.route.elevationGainM,
                elevationLossM: local.route.elevationLossM,
                minElevationM: local.route.minElevationM,
                maxElevationM: local.route.maxElevationM,
                startPointName: local.route.startPointName,
                endPointName: local.route.endPointName,
                geometry: local.route.geometry,
                startLocation: null,
                endLocation: null,
                waypoints: local.waypoints,
                elevationProfile: (local.route.elevationProfile || []).map((p: any) => ({
                  lat: local.trek.lat || 31.543,
                  lng: local.trek.lon || 77.374,
                  elevationM: typeof p === "number" ? p : p.elevationM || 3120,
                })),
                source: {
                  type: "offline_package",
                  id: null,
                  url: null,
                  license: "ODbL",
                },
                verificationStatus: (local.route.verificationStatus as any) || "musafir_verified",
                confidence: "high",
                isPrimary: true,
                createdAt: local.downloadedAt,
                updatedAt: local.route.updatedAt,
              },
            ],
            memories: (local.memories || []).map((m: any) => ({
              id: m.id,
              photo_url: m.photoUrl || m.thumbnailUrl,
              caption: m.caption,
              taken_at: m.createdAt,
              trek_route_id: local.route.id,
            })),
            createdAt: local.downloadedAt,
            updatedAt: local.route.updatedAt,
          };
          setTrek(offlineTrek);
          if (offlineTrek.routes && offlineTrek.routes[0]) {
            setSelectedRoute(offlineTrek.routes[0]);
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [identifier]);

  useFocusEffect(
    useCallback(() => {
      const poiId = trek?.poiId || poi?.id;
      if (poiId) {
        fetchPoiStatusMap()
          .then((map) => setStatus(map[poiId] ?? null))
          .catch(() => {});
      }
    }, [trek?.poiId, poi?.id])
  );

  async function toggleStatus(next: PoiStatus) {
    const poiId = trek?.poiId || poi?.id;
    if (!poiId) return;
    const value = status === next ? null : next;
    setStatus(value);
    try {
      await setPoiStatus(poiId, value);
    } catch {
      setStatus(status);
    }
  }

  // Aggregate photos from trek.photos + public memories
  const allPhotos: PhotoItem[] = [
    ...(trek?.photos?.map((p) => ({
      id: p.id,
      url: p.url,
      source: p.source || "Musafir",
      attribution: p.attribution,
    })) ?? []),
    ...(trek?.memories?.map((m) => ({
      id: m.id,
      url: m.photo_url,
      source: "Traveler Memory",
      attribution: m.caption,
    })) ?? []),
  ];

  if (allPhotos.length === 0 && poi?.photo_url) {
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

  const activeRoute = selectedRoute || trek?.routes?.[0] || null;
  const primaryDistance = activeRoute?.distanceKm ?? poi?.distance_km ?? null;
  const primaryElevationGain = activeRoute?.elevationGainM ?? null;
  const primaryElevationLoss = activeRoute?.elevationLossM ?? null;
  const primaryMaxElevation = activeRoute?.maxElevationM ?? null;

  const heroPhotoUrl = allPhotos[0]?.url || poi?.photo_url || null;
  const locationSubtitle = trek?.region
    ? `Jibhi, ${trek.region}`
    : "Himachal Pradesh, India";

  const waypoints = activeRoute?.waypoints || [];

  if (loading && !trek) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

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
          <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
            <MountainIcon size={48} color={colors.accent} />
          </View>
        )}

        <SafeAreaView style={styles.floatingHeader} edges={["top"]}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <ArrowBackIcon size={20} />
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.circleBtn} onPress={() => toggleStatus("saved")} activeOpacity={0.8}>
              <HeartIcon
                color={status === "saved" ? colors.accent : "#FFFFFF"}
                filled={status === "saved"}
                size={18}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {allPhotos.length > 1 && (
          <TouchableOpacity style={styles.photoCountBadge} onPress={() => openViewer(0)} activeOpacity={0.85}>
            <Text style={styles.photoCountText}>📷 1 / {allPhotos.length}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Scrollable Sheet Content */}
      <View style={styles.sheetCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
          {/* Verification Badge */}
          <View style={styles.badgeRow}>
            {activeRoute?.verificationStatus === "musafir_verified" ? (
              <View style={styles.verifiedBadgeGreen}>
                <View style={styles.badgeDotGreen} />
                <Text style={styles.verifiedBadgeGreenText}>Musafir Verified</Text>
              </View>
            ) : activeRoute?.verificationStatus === "community_verified" ? (
              <View style={styles.verifiedBadgeBlue}>
                <View style={styles.badgeDotBlue} />
                <Text style={styles.verifiedBadgeBlueText}>Community Verified</Text>
              </View>
            ) : (
              <View style={styles.verifiedBadgeOrange}>
                <View style={styles.badgeDotOrange} />
                <Text style={styles.verifiedBadgeOrangeText}>Community Route (Pending)</Text>
              </View>
            )}
          </View>

          {/* Trek Title and Region */}
          <Text style={styles.trekTitle}>{trek?.name || poi?.name || "Trek Details"}</Text>
          <Text style={styles.trekSubtitle}>{locationSubtitle}</Text>

          {/* Rating, Length & Difficulty Summary */}
          <View style={styles.summaryRow}>
            <View style={styles.ratingBadge}>
              <StarIcon size={13} />
              <Text style={styles.ratingValue}>{(trek?.rating.avg || 4.6).toFixed(1)}</Text>
              <Text style={styles.ratingCount}>{`(${trek?.rating.count || 128})`}</Text>
            </View>
            <Text style={styles.summaryDot}>•</Text>
            {primaryDistance && <Text style={styles.summaryText}>{`${primaryDistance} km`}</Text>}
            {primaryDistance && <Text style={styles.summaryDot}>•</Text>}
            <Text style={styles.summaryText}>{trek?.difficulty || "Moderate"}</Text>
          </View>

          {/* 4 Stat Cards in Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <CompassIcon size={16} color="#4B5563" />
              <Text style={styles.statCardLabel}>Distance</Text>
              <Text style={styles.statCardValue}>
                {primaryDistance ? `${primaryDistance} km` : "--"}
              </Text>
            </View>

            <View style={styles.statCard}>
              <ElevationGainIcon size={16} color="#16A34A" />
              <Text style={styles.statCardLabel}>Elevation Gain</Text>
              <Text style={[styles.statCardValue, { color: "#16A34A" }]}>
                {primaryElevationGain ? `+${primaryElevationGain} m` : "--"}
              </Text>
            </View>

            <View style={styles.statCard}>
              <ElevationLossIcon size={16} color="#DC2626" />
              <Text style={styles.statCardLabel}>Elevation Loss</Text>
              <Text style={[styles.statCardValue, { color: "#DC2626" }]}>
                {primaryElevationLoss ? `-${Math.abs(Number(primaryElevationLoss))} m` : "--"}
              </Text>
            </View>

            <View style={styles.statCard}>
              <MountainIcon size={16} color="#D97706" />
              <Text style={styles.statCardLabel}>Max Elevation</Text>
              <Text style={styles.statCardValue}>
                {primaryMaxElevation ? `${primaryMaxElevation} m` : "--"}
              </Text>
            </View>
          </View>

          {/* About this Trek */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>About this trek</Text>
            <Text style={styles.aboutText} numberOfLines={readMore ? undefined : 3}>
              {trek?.summary ||
                poi?.description ||
                "A scenic Himalayan trek featuring pristine alpine forests, panoramic mountain passes, and stunning ridge viewpoints."}
            </Text>
            {Boolean(trek?.summary && trek.summary.length > 120) && (
              <TouchableOpacity onPress={() => setReadMore((p) => !p)} style={styles.readMoreBtn}>
                <Text style={styles.readMoreText}>{readMore ? "Show less" : "Read more"}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.bestMonthsRow}>
              <Text style={styles.bestMonthsLabel}>Best months:</Text>
              <Text style={styles.bestMonthsValue}>{formatBestMonths(trek?.bestMonths)}</Text>
            </View>
          </View>

          {/* Trail / Route Map Preview Card */}
          {activeRoute?.geometry && (
            <View style={styles.mapSection}>
              <TrekRouteMap
                coordinates={activeRoute.geometry.coordinates}
                waypoints={waypoints}
                verificationStatus={activeRoute.verificationStatus}
                height={190}
                onExpandPress={() => {
                  if (trek) {
                    navigation.navigate("RoutePreview", {
                      trekId: trek.id,
                      trekName: trek.name,
                      routeId: activeRoute.id,
                      route: activeRoute,
                    });
                  }
                }}
              />
            </View>
          )}

          {/* Top Waypoints Section */}
          {waypoints.length > 0 && (
            <View style={styles.waypointsSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Top Waypoints</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (trek && activeRoute) {
                      navigation.navigate("RoutePreview", {
                        trekId: trek.id,
                        trekName: trek.name,
                        routeId: activeRoute.id,
                        route: activeRoute,
                      });
                    }
                  }}
                >
                  <Text style={styles.viewAllText}>View all</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.waypointsGrid}>
                {waypoints.slice(0, 4).map((wp, idx) => (
                  <View key={wp.id || idx} style={styles.waypointItem}>
                    <WaypointDotIcon color={idx === 0 ? "#16A34A" : idx === waypoints.length - 1 ? "#DC2626" : "#2563EB"} />
                    <Text style={styles.waypointName} numberOfLines={1}>
                      {wp.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Offline Trek Package Badge */}
          {trek && (
            <View style={{ marginBottom: 12 }}>
              <OfflineTrekBadge
                trekId={trek.id}
                routeId={activeRoute?.id}
                trekName={trek.name}
              />
            </View>
          )}

          {/* Available Routes Quick Banner */}
          {trek && (
            <TouchableOpacity
              style={styles.routesBanner}
              activeOpacity={0.88}
              onPress={() => {
                navigation.navigate("AvailableRoutes", {
                  trekId: trek.id,
                  trekName: trek.name,
                  initialRouteId: activeRoute?.id,
                });
              }}
            >
              <View style={styles.routesBannerLeft}>
                <Text style={styles.routesBannerTitle}>Available Routes</Text>
                <Text style={styles.routesBannerSubtitle}>
                  {trek.routes.length > 1
                    ? `${trek.routes.length} routes available (Musafir & Community Verified)`
                    : "1 official verified route available"}
                </Text>
              </View>
              <View style={styles.routesBannerArrow}>
                <Text style={styles.routesBannerArrowText}>→</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Explore Trek Memories on Map Banner */}
          <TouchableOpacity
            style={styles.memoriesMapBanner}
            onPress={() => {
              if (trek) {
                navigation.navigate("TrekMemoriesMap", {
                  trekId: trek.id,
                  trekName: trek.name,
                  routeId: activeRoute?.id,
                  route: activeRoute || undefined,
                });
              }
            }}
            activeOpacity={0.88}
          >
            <View style={styles.memoriesMapBannerIconWrap}>
              <Text style={{ fontSize: 20 }}>🗺️</Text>
            </View>
            <View style={styles.memoriesMapBannerInfo}>
              <Text style={styles.memoriesMapBannerTitle}>Trek Memories on Map</Text>
              <Text style={styles.memoriesMapBannerSubtitle}>
                Explore real traveler photos pinned along this trail
              </Text>
            </View>
            <View style={styles.routesBannerArrow}>
              <Text style={styles.routesBannerArrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Traveler Memories / Photos */}
          {allPhotos.length > 0 && (
            <View style={styles.photosSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Photos & Memories ({allPhotos.length})</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (trek) {
                        navigation.navigate("TrekMemoriesMap", {
                          trekId: trek.id,
                          trekName: trek.name,
                          routeId: activeRoute?.id,
                          route: activeRoute || undefined,
                        });
                      }
                    }}
                  >
                    <Text style={[styles.addMemoryText, { color: colors.accent }]}>Map View →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setAddMemoryOpen(true)}>
                    <Text style={styles.addMemoryText}>+ Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScroll}>
                {allPhotos.map((p, idx) => (
                  <TouchableOpacity
                    key={p.id || idx}
                    onPress={() => openViewer(idx)}
                    activeOpacity={0.88}
                    style={styles.photoThumbWrap}
                  >
                    <Image source={{ uri: p.url }} style={styles.photoThumb} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>
      </View>

      {/* Floating Bottom Action Bar */}
      <SafeAreaView style={styles.floatingBottomBar} edges={["bottom"]}>
        <TouchableOpacity style={styles.bottomSaveBtn} onPress={() => toggleStatus("saved")} activeOpacity={0.8}>
          <HeartIcon
            color={status === "saved" ? colors.accent : "#4B5563"}
            filled={status === "saved"}
            size={20}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryCtaBtn}
          activeOpacity={0.88}
          onPress={() => {
            if (trek) {
              navigation.navigate("AvailableRoutes", {
                trekId: trek.id,
                trekName: trek.name,
                initialRouteId: activeRoute?.id,
              });
            }
          }}
        >
          <CompassIcon size={18} color="#FFFFFF" />
          <Text style={styles.primaryCtaText}>Select Route</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Full-Screen Photo Viewer Modal */}
      <FullScreenPhotoViewer
        visible={photoViewerOpen}
        photos={allPhotos}
        initialIndex={photoViewerIndex}
        poiName={trek?.name || poi?.name || "Trek"}
        locationText={locationSubtitle}
        onClose={() => setPhotoViewerOpen(false)}
      />

      {/* Add Memory Modal */}
      <AddMemoryModal
        visible={addMemoryOpen}
        poiId={trek?.poiId || poi?.id}
        placeName={trek?.name || poi?.name || "Trek"}
        onClose={() => setAddMemoryOpen(false)}
        onSuccess={() => {
          if (identifier) {
            fetchTrekById(identifier).then(setTrek).catch(() => {});
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  heroWrapper: {
    height: SCREEN_HEIGHT * 0.4,
    width: "100%",
    backgroundColor: "#18181B",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroImagePlaceholder: {
    backgroundColor: "#27272A",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerRightActions: {
    flexDirection: "row",
    gap: 8,
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
    bottom: 24,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  photoCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  sheetCard: {
    flex: 1,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    overflow: "hidden",
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  badgeRow: {
    marginBottom: 8,
  },
  verifiedBadgeGreen: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  badgeDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  verifiedBadgeGreenText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },
  verifiedBadgeBlue: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  badgeDotBlue: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },
  verifiedBadgeBlueText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  verifiedBadgeOrange: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  badgeDotOrange: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EA580C",
  },
  verifiedBadgeOrangeText: {
    color: "#EA580C",
    fontSize: 12,
    fontWeight: "700",
  },
  trekTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  trekSubtitle: {
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 2,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  ratingCount: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  summaryDot: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statCardLabel: {
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 4,
    marginBottom: 2,
    textAlign: "center",
  },
  statCardValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  aboutSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 6,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
  },
  readMoreBtn: {
    marginTop: 4,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  bestMonthsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  bestMonthsLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  bestMonthsValue: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  mapSection: {
    marginBottom: 20,
  },
  waypointsSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  waypointsGrid: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  waypointItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  waypointName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    flex: 1,
  },
  routesBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  routesBannerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  routesBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  routesBannerSubtitle: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  routesBannerArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  routesBannerArrowText: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 14,
  },
  memoriesMapBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBF7",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    marginBottom: 20,
    gap: 12,
  },
  memoriesMapBannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  memoriesMapBannerInfo: {
    flex: 1,
  },
  memoriesMapBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  memoriesMapBannerSubtitle: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  photosSection: {
    marginBottom: 20,
  },
  addMemoryText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  photosScroll: {
    gap: 10,
  },
  photoThumbWrap: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
  },
  photoThumb: {
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  bottomSaveBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCtaBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
