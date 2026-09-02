import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { fetchTrekMemories, type TrekMemoryItem } from "../lib/memories";
import {
  BackArrowIcon,
  GridViewIcon,
  FilterSlidersIcon,
} from "../components/TrekStoryIcons";
import { HeartLikeIcon } from "../components/TrekMemoriesIcons";
import { colors } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 12) / 2;

type Props = NativeStackScreenProps<RootStackParamList, "TrekMemoriesGallery">;

type FilterType = "all" | "photos" | "videos" | "notes";

export function TrekMemoriesGalleryScreen({ navigation, route }: Props) {
  const { sessionId, trekId, trekName: paramTrekName } = route.params;

  const [activeType, setActiveType] = useState<FilterType>("all");
  const [memories, setMemories] = useState<TrekMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (trekId) {
          const res = await fetchTrekMemories(trekId);
          if (res.items.length > 0) {
            setMemories(res.items);
          }
        }
      } catch (err) {
        console.warn("Could not load trek memories:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [trekId]);

  const trekName = paramTrekName || "Raghupur Fort Trek";

  // Fallback authentic memories if DB has few
  const defaultGallery = [
    {
      id: "1",
      location_name: "Jalori Pass",
      created_at: "Today, 07:45 AM",
      altitude_m: 3120,
      photo_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
      likes_count: 12,
      author: { avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120" },
      is_video: false,
    },
    {
      id: "2",
      location_name: "Chehni Kothi",
      created_at: "Today, 09:18 AM",
      altitude_m: 3400,
      photo_url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80",
      likes_count: 8,
      is_video: true,
    },
    {
      id: "3",
      location_name: "Buri Nali",
      created_at: "Today, 11:42 AM",
      altitude_m: 3650,
      photo_url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80",
      likes_count: 15,
      is_video: true,
    },
    {
      id: "4",
      location_name: "Raghupur Top",
      created_at: "Today, 01:20 PM",
      altitude_m: 3910,
      photo_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
      likes_count: 21,
      is_video: true,
    },
    {
      id: "5",
      location_name: "Raghupur Fort",
      created_at: "Today, 02:55 PM",
      altitude_m: 3294,
      photo_url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80",
      likes_count: 18,
      is_video: true,
    },
    {
      id: "6",
      location_name: "Trail View",
      created_at: "Today, 12:05 PM",
      photo_url: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=600&q=80",
      likes_count: 9,
      is_video: false,
    },
  ];

  const displayList = memories.length > 0 ? memories : defaultGallery;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <BackArrowIcon size={22} color="#18181B" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Memories</Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
            <GridViewIcon size={18} color="#18181B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() =>
              navigation.navigate("FilteredMemories", {
                trekId: trekId || "",
                trekName,
                activeType,
                onApply: (type) => setActiveType(type as FilterType),
              })
            }
            activeOpacity={0.7}
          >
            <FilterSlidersIcon size={18} color="#18181B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Category Chips */}
      <View style={styles.filterBar}>
        {(
          [
            { key: "all", label: "All (12)" },
            { key: "photos", label: "Photos (10)" },
            { key: "videos", label: "Videos (1)" },
            { key: "notes", label: "Notes (1)" },
          ] as const
        ).map((item) => {
          const isSelected = activeType === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setActiveType(item.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2-Column Editorial Photo Grid */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gridContent}>
        <View style={styles.gridRow}>
          {displayList.map((item: any) => {
            const photoUri = item.thumbnail_url || item.photo_url;
            const locationTitle = item.location_name || item.caption?.slice(0, 18) || "Trek Moment";
            const timeStr = item.created_at ? (item.created_at.includes("Today") ? item.created_at : "Recent") : "Today";
            const altStr = item.altitude_m ? `${item.altitude_m.toLocaleString()} m` : null;
            const likes = item.likes_count ?? 12;

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate("MemoryDetail", {
                    memoryId: item.id,
                    memory: item,
                    trekId,
                    trekName,
                  })
                }
                activeOpacity={0.88}
              >
                {/* Photo Thumbnail */}
                <View style={styles.cardImageWrap}>
                  <Image source={{ uri: photoUri }} style={styles.cardImage} resizeMode="cover" />

                  {/* Video Badge */}
                  {item.is_video && (
                    <View style={styles.videoBadge}>
                      <Text style={{ fontSize: 10, color: "#FFFFFF" }}>📹</Text>
                    </View>
                  )}

                  {/* Author Avatar */}
                  {item.author?.avatar_url && (
                    <View style={styles.avatarWrap}>
                      <Image source={{ uri: item.author.avatar_url }} style={styles.avatar} resizeMode="cover" />
                    </View>
                  )}
                </View>

                {/* Card Meta Content */}
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {locationTitle}
                  </Text>
                  <Text style={styles.cardTime}>{timeStr}</Text>

                  <View style={styles.cardBottomRow}>
                    <Text style={styles.cardAltitude}>{altStr || ""}</Text>
                    <View style={styles.likesRow}>
                      <HeartLikeIcon size={12} color="#EF4444" filled />
                      <Text style={styles.likesText}>{likes}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Floating Bottom Add Memory CTA */}
      <SafeAreaView style={styles.floatingCtaContainer} edges={["bottom"]}>
        <TouchableOpacity
          style={styles.addMemoryBtn}
          onPress={() =>
            navigation.navigate("AddMemory", {
              trekId: trekId || "",
              trekName,
              trekSessionId: sessionId,
              initialLat: 31.5396,
              initialLon: 77.3898,
            })
          }
          activeOpacity={0.88}
        >
          <Text style={styles.addMemoryBtnText}>+ Add Memory</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F3",
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
  headerRightActions: {
    flexDirection: "row",
    gap: 8,
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E3DE",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },
  filterChipActive: {
    backgroundColor: "#FFF5ED",
    borderColor: colors.accent,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#71717A",
  },
  filterChipTextActive: {
    color: colors.accent,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E3DE",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImageWrap: {
    height: 125,
    position: "relative",
    backgroundColor: "#18181B",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  videoBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: "#27272A",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 2,
  },
  cardTime: {
    fontSize: 11,
    color: "#74736F",
    marginBottom: 6,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardAltitude: {
    fontSize: 11,
    color: "#74736F",
    fontWeight: "500",
  },
  likesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likesText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#71717A",
  },
  floatingCtaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  addMemoryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 6,
  },
  addMemoryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
