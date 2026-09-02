import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { TrekMemoryItem } from "../lib/memories";
import { HeartLikeIcon } from "./TrekMemoriesIcons";
import { colors } from "../theme";

interface Props {
  memory: TrekMemoryItem;
  isSelected?: boolean;
  onPress: () => void;
  onLikePress?: () => void;
}

export function MemoryCardItem({
  memory,
  isSelected = false,
  onPress,
  onLikePress,
}: Props) {
  const fallbackPhoto = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80";
  const fallbackAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

  // Format time relative
  const getTimeAgo = (dateStr?: string | null) => {
    if (!dateStr) return "Recent";
    const dt = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - dt.getTime()) / (1000 * 60 * 60));
    if (diffHours < 24) return "Today";
    if (diffHours < 48) return "Yesterday";
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const title = memory.location_name || (memory.caption ? memory.caption.slice(0, 22) : "Trek Memory");
  const timeText = getTimeAgo(memory.created_at);

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Cover Image */}
      <Image
        source={{ uri: memory.thumbnail_url || memory.photo_url || fallbackPhoto }}
        style={styles.cardImage}
        resizeMode="cover"
      />

      {/* Dark Overlay for text readability */}
      <View style={styles.darkOverlay} />

      {/* Author Avatar Top Left */}
      <View style={styles.avatarWrap}>
        <Image
          source={{ uri: memory.author?.avatar_url || fallbackAvatar }}
          style={styles.avatar}
          resizeMode="cover"
        />
      </View>

      {/* Bottom Content */}
      <View style={styles.contentWrap}>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.timeText}>{timeText}</Text>
        </View>

        <TouchableOpacity
          style={styles.likeBtn}
          onPress={onLikePress}
          activeOpacity={0.7}
        >
          <HeartLikeIcon
            size={16}
            color={memory.is_liked ? "#EF4444" : "#FFFFFF"}
            filled={memory.is_liked}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 145,
    height: 185,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#18181B",
    marginRight: 12,
    position: "relative",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  cardSelected: {
    borderWidth: 2.5,
    borderColor: colors.accent,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  darkOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  avatarWrap: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: "#27272A",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  contentWrap: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  textCol: {
    flex: 1,
    paddingRight: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  timeText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  likeBtn: {
    padding: 2,
  },
});
