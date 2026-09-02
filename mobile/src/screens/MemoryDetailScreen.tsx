import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Map as MapView,
  Camera,
  GeoJSONSource,
  Layer,
  Marker,
  type CameraRef,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import type { RootStackParamList } from "../navigation";
import { fetchMemoryById, type TrekMemoryItem } from "../lib/memories";
import {
  BackArrowIcon,
  BookmarkIcon,
  HeartLikeIcon,
  CommentIcon,
  ShareIcon,
  CameraPinIcon,
  GlobeIcon,
  LockIcon,
} from "../components/TrekMemoriesIcons";
import { colors } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Props = NativeStackScreenProps<RootStackParamList, "MemoryDetail">;

export function MemoryDetailScreen({ navigation, route }: Props) {
  const { memoryId, memory: initialMemory, trekId, trekName } = route.params;

  const [memory, setMemory] = useState<TrekMemoryItem | null>(initialMemory || null);
  const [isLiked, setIsLiked] = useState(initialMemory?.is_liked || false);
  const [likesCount, setLikesCount] = useState(initialMemory?.likes_count || 24);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const miniMapRef = useRef<MapRef>(null);
  const miniCameraRef = useRef<CameraRef>(null);

  useEffect(() => {
    if (!memory) {
      fetchMemoryById(memoryId)
        .then((m) => {
          setMemory(m);
          setIsLiked(m.is_liked);
          setLikesCount(m.likes_count);
        })
        .catch((err) => {
          console.warn("Failed to fetch memory detail:", err);
        });
    }
  }, [memoryId, memory]);

  const fallbackPhoto = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85";
  const fallbackAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80";

  const authorName = memory?.author?.full_name || "Ankit Sharma";
  const locationTitle = memory?.location_name || "Raghupur Top";
  const altitudeText = memory?.altitude_m ? `Altitude ${memory.altitude_m.toLocaleString()} m` : "Altitude 3,910 m";
  const captionText =
    memory?.caption ||
    "The views from Raghupur Top are absolutely breathtaking! Perfect spot to take a break and enjoy the Himalayas.";
  const tags = memory?.tags && memory.tags.length > 0 ? memory.tags : ["#raghupurfort", "#himachal", "#trekking", "#views"];

  const lat = memory?.lat ?? 31.5396;
  const lon = memory?.lon ?? 77.3898;

  const coordinateStr = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;

  const miniGeoJSON = useMemo(() => {
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [lon - 0.008, lat - 0.004],
          [lon - 0.003, lat - 0.001],
          [lon, lat],
          [lon + 0.004, lat + 0.002],
          [lon + 0.008, lat + 0.005],
        ],
      },
    };
  }, [lat, lon]);

  const handleToggleLike = () => {
    setIsLiked((prev: boolean) => {
      const next = !prev;
      setLikesCount((c: number) => c + (next ? 1 : -1));
      return next;
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this trek memory from ${locationTitle} on Musafir! ${memory?.photo_url || ""}`,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <BackArrowIcon size={22} color="#18181B" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Memory Detail</Text>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setIsBookmarked((b) => !b)}
          activeOpacity={0.7}
        >
          <BookmarkIcon
            size={20}
            color={isBookmarked ? colors.accent : "#18181B"}
            filled={isBookmarked}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Large Hero Image */}
        <View style={styles.heroImageWrap}>
          <Image
            source={{ uri: memory?.photo_url || fallbackPhoto }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>1/4</Text>
          </View>
        </View>

        <View style={styles.bodyWrap}>
          {/* Traveler Row */}
          <View style={styles.travelerRow}>
            <Image
              source={{ uri: memory?.author?.avatar_url || fallbackAvatar }}
              style={styles.travelerAvatar}
              resizeMode="cover"
            />
            <View style={styles.travelerInfo}>
              <Text style={styles.travelerName}>{authorName}</Text>
              <View style={styles.travelerMetaRow}>
                <Text style={styles.travelerTime}>2 days ago • </Text>
                {memory?.visibility === "private" ? (
                  <View style={styles.visibilityBadge}>
                    <LockIcon size={12} color="#71717A" />
                    <Text style={styles.visibilityText}>Private</Text>
                  </View>
                ) : (
                  <View style={styles.visibilityBadge}>
                    <GlobeIcon size={12} color="#16A34A" />
                    <Text style={[styles.visibilityText, { color: "#16A34A" }]}>Public</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              onPress={() => setIsFollowing((f) => !f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                {isFollowing ? "Following" : "• Follow"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Location Title & Altitude */}
          <View style={styles.locationTitleSection}>
            <Text style={styles.locationTitle}>{locationTitle}</Text>
            <Text style={styles.altitudeText}>{altitudeText}</Text>
          </View>

          {/* Caption */}
          <Text style={styles.captionText}>{captionText}</Text>

          {/* Hashtag Tags */}
          <View style={styles.tagsRow}>
            {tags.map((tag, idx) => (
              <View key={`tag-${idx}`} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag.startsWith("#") ? tag : `#${tag}`}</Text>
              </View>
            ))}
          </View>

          {/* Engagement Social Bar */}
          <View style={styles.socialBar}>
            <TouchableOpacity style={styles.socialBtn} onPress={handleToggleLike} activeOpacity={0.7}>
              <HeartLikeIcon size={20} color={isLiked ? "#EF4444" : "#71717A"} filled={isLiked} />
              <Text style={[styles.socialBtnText, isLiked && { color: "#EF4444", fontWeight: "700" }]}>
                {likesCount} Likes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => Alert.alert("Comments", "Comments feature is enabled in community mode.")}
              activeOpacity={0.7}
            >
              <CommentIcon size={20} color="#71717A" />
              <Text style={styles.socialBtnText}>5 Comments</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialBtn} onPress={handleShare} activeOpacity={0.7}>
              <ShareIcon size={20} color="#71717A" />
            </TouchableOpacity>
          </View>

          {/* Location on Map Section */}
          <View style={styles.miniMapSection}>
            <View style={styles.miniMapHeader}>
              <Text style={styles.miniMapTitle}>Location on Map</Text>
              <Text style={styles.miniMapCoord}>{coordinateStr}</Text>
            </View>

            <View style={styles.miniMapContainer} pointerEvents="none">
              <MapView
                ref={miniMapRef}
                style={StyleSheet.absoluteFill}
                mapStyle={MAP_STYLE}
              >
                <Camera
                  ref={miniCameraRef}
                  initialViewState={{
                    center: [lon, lat],
                    zoom: 14.5,
                  }}
                />

                {/* Trail Line */}
                <GeoJSONSource id="mini-trail-source" data={miniGeoJSON}>
                  <Layer
                    id="mini-trail-halo"
                    type="line"
                    layout={{ "line-cap": "round", "line-join": "round" }}
                    paint={{ "line-color": "#FFFFFF", "line-width": 5 }}
                  />
                  <Layer
                    id="mini-trail-line"
                    type="line"
                    layout={{ "line-cap": "round", "line-join": "round" }}
                    paint={{ "line-color": "#16A34A", "line-width": 3 }}
                  />
                </GeoJSONSource>

                {/* Pinned Green Camera Marker */}
                <Marker lngLat={[lon, lat]} anchor="center">
                  <View style={styles.miniMarkerWrap}>
                    <CameraPinIcon size={24} color="#16A34A" />
                  </View>
                </Marker>
              </MapView>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#18181B",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroImageWrap: {
    width: SCREEN_WIDTH,
    height: 320,
    position: "relative",
    backgroundColor: "#18181B",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  counterBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  bodyWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  travelerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  travelerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F4F4F5",
  },
  travelerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  travelerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 2,
  },
  travelerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  travelerTime: {
    fontSize: 12,
    color: "#71717A",
  },
  visibilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  visibilityText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#71717A",
  },
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  followBtnActive: {
    backgroundColor: "#F4F4F5",
  },
  followBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  followBtnTextActive: {
    color: "#71717A",
  },
  locationTitleSection: {
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#18181B",
    marginBottom: 2,
  },
  altitudeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16A34A",
  },
  captionText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#3F3F46",
    marginBottom: 14,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  tagChip: {
    backgroundColor: "#F4F4F5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#71717A",
  },
  socialBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F4F4F5",
    marginBottom: 20,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  socialBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#71717A",
  },
  miniMapSection: {
    marginTop: 4,
  },
  miniMapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  miniMapTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18181B",
  },
  miniMapCoord: {
    fontSize: 12,
    color: "#71717A",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  miniMapContainer: {
    height: 140,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E4E4E7",
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },
  miniMarkerWrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
});
