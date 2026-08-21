import React, { useState } from "react";
import {
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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { RootStackParamList } from "../navigation";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import type { PlaceItem } from "../lib/mockData";

const { width, height } = Dimensions.get("window");

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

function MoreVertIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="2" fill="#FFFFFF" />
      <Circle cx="12" cy="12" r="2" fill="#FFFFFF" />
      <Circle cx="12" cy="19" r="2" fill="#FFFFFF" />
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

function InfoIcon({ color = "#FFFFFF", size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M12 16V12M12 8H12.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function PhotoIcon({ color = "#4B5563", size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth={2} />
      <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
      <Path d="M21 15L16 10L5 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ReviewIcon({ color = "#4B5563", size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5A8.38 8.38 0 0 1 20.38 15A8.5 8.5 0 0 1 12 21A8.38 8.38 0 0 1 7.5 19.62L3 21L4.38 16.5A8.38 8.38 0 0 1 3 12A8.5 8.5 0 0 1 11.5 3.5A8.38 8.38 0 0 1 15 4.12A8.5 8.5 0 0 1 21 11.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookmarkIcon({ color = "#4B5563", size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21L12 16L5 21V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShareIcon({ color = "#4B5563", size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.34448 15.0583 5.67534 15.1656 5.98227L8.83441 9.01773C8.42398 8.39701 7.75916 8 7 8C5.34315 8 4 9.34315 4 11C4 12.6569 5.34315 14 7 14C7.75916 14 8.42398 13.603 8.83441 12.9823L15.1656 16.0177C15.0583 16.3247 15 16.6555 15 17C15 18.6569 16.3431 20 18 20C19.6569 20 21 18.6569 21 17C21 15.3431 19.6569 14 18 14C17.2408 14 16.576 14.397 16.1656 15.0177L9.83441 11.9823C9.94172 11.6753 10 11.3445 10 11C10 10.6555 9.94172 10.3247 9.83441 10.0177L16.1656 6.98227C16.576 7.60299 17.2408 8 18 8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type TabKey = "info" | "photos" | "reviews" | "save" | "share";

type Props = NativeStackScreenProps<RootStackParamList, "PlaceDetails">;

export function PlaceDetailsScreen({ route, navigation }: Props) {
  const place = route.params?.place;
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [saved, setSaved] = useState(false);
  const [readMore, setReadMore] = useState(false);

  const placeName = place?.name || "Hidimba Temple";
  const placeLocation = place?.location || "Manali, Himachal Pradesh";
  const placeRating = place?.rating || 4.7;
  const heroImage = place?.image || "https://gomusafir.s3.us-east-1.amazonaws.com/ui/place-hidimba-hero.png";
  const placeAbout =
    place?.about ||
    "An ancient cave temple dedicated to Hidimba Devi, surrounded by cedar forests. A peaceful and spiritual experience with traditional wood architecture.";
  const placeBestTime = place?.bestTime || "March to June, September to February";

  function handleTabPress(tab: TabType) {
    if (tab === "Home") {
      navigation.navigate("Dashboard");
    } else if (tab === "Search") {
      navigation.navigate("Search");
    } else if (tab === "Trips") {
      navigation.navigate("TripTracking");
    } else if (tab === "Profile") {
      navigation.navigate("Auth");
    }
  }

  function handleActionTab(tab: TabKey) {
    if (tab === "save") {
      setSaved((prev) => !prev);
      Alert.alert(saved ? "Removed from Saved" : "Saved!", `${placeName} has been ${saved ? "removed from" : "added to"} your saved places.`);
      return;
    }
    if (tab === "share") {
      Alert.alert("Share Place", `Share ${placeName} with other travelers!`);
      return;
    }
    setActiveTab(tab);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero Image Area */}
      <View style={styles.heroWrapper}>
        <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />

        {/* Top Floating Controls */}
        <SafeAreaView style={styles.floatingHeader} edges={["top"]}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <ArrowBackIcon size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
            <MoreVertIcon size={20} />
          </TouchableOpacity>
        </SafeAreaView>

        {/* 1/12 Photos Counter */}
        <View style={styles.photoCountBadge}>
          <Text style={styles.photoCountText}>1/12</Text>
        </View>
      </View>

      {/* Sheet Content Card */}
      <View style={styles.sheetCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
          {/* Title & Rating Row */}
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.placeTitle}>{placeName}</Text>
              <Text style={styles.placeLocation}>{placeLocation}</Text>
            </View>

            <View style={styles.ratingBadge}>
              <Text style={styles.ratingValue}>{placeRating}</Text>
              <StarIcon size={12} />
            </View>
          </View>

          {/* Quick Action Pill Buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionTabsRow}
          >
            {/* Info Tab */}
            <TouchableOpacity
              style={[styles.actionPill, activeTab === "info" && styles.actionPillActive]}
              onPress={() => handleActionTab("info")}
              activeOpacity={0.8}
            >
              <InfoIcon color={activeTab === "info" ? "#FFFFFF" : "#4B5563"} size={16} />
              <Text style={[styles.actionPillText, activeTab === "info" && styles.actionPillTextActive]}>
                Info
              </Text>
            </TouchableOpacity>

            {/* Photos Tab */}
            <TouchableOpacity
              style={[styles.actionPill, activeTab === "photos" && styles.actionPillActive]}
              onPress={() => handleActionTab("photos")}
              activeOpacity={0.8}
            >
              <PhotoIcon color={activeTab === "photos" ? "#FFFFFF" : "#4B5563"} size={16} />
              <Text style={[styles.actionPillText, activeTab === "photos" && styles.actionPillTextActive]}>
                Photos
              </Text>
            </TouchableOpacity>

            {/* Reviews Tab */}
            <TouchableOpacity
              style={[styles.actionPill, activeTab === "reviews" && styles.actionPillActive]}
              onPress={() => handleActionTab("reviews")}
              activeOpacity={0.8}
            >
              <ReviewIcon color={activeTab === "reviews" ? "#FFFFFF" : "#4B5563"} size={16} />
              <Text style={[styles.actionPillText, activeTab === "reviews" && styles.actionPillTextActive]}>
                Reviews
              </Text>
            </TouchableOpacity>

            {/* Save Tab */}
            <TouchableOpacity
              style={[styles.actionPill, saved && styles.actionPillActive]}
              onPress={() => handleActionTab("save")}
              activeOpacity={0.8}
            >
              <BookmarkIcon color={saved ? "#FFFFFF" : "#4B5563"} size={16} />
              <Text style={[styles.actionPillText, saved && styles.actionPillTextActive]}>
                {saved ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>

            {/* Share Tab */}
            <TouchableOpacity
              style={styles.actionPill}
              onPress={() => handleActionTab("share")}
              activeOpacity={0.8}
            >
              <ShareIcon color="#4B5563" size={16} />
              <Text style={styles.actionPillText}>Share</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Tab Content */}
          {activeTab === "info" && (
            <View style={styles.infoContent}>
              {/* About this place */}
              <Text style={styles.sectionHeader}>About this place</Text>
              <Text style={styles.aboutText} numberOfLines={readMore ? undefined : 3}>
                {placeAbout}
              </Text>
              <TouchableOpacity onPress={() => setReadMore((p) => !p)} style={styles.readMoreBtn}>
                <Text style={styles.readMoreText}>{readMore ? "Show less" : "Read more"}</Text>
              </TouchableOpacity>

              {/* Best time to visit */}
              <Text style={[styles.sectionHeader, { marginTop: 18 }]}>Best time to visit</Text>
              <Text style={styles.bestTimeText}>{placeBestTime}</Text>

              {/* Add to Itinerary Button */}
              <TouchableOpacity
                style={styles.ctaBtn}
                onPress={() => navigation.navigate("TripTracking")}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaBtnText}>Add to Trip Itinerary</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === "photos" && (
            <View style={styles.galleryGrid}>
              <Image source={{ uri: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/stop-solang.png" }} style={styles.galleryThumb} />
              <Image source={{ uri: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/trip-manali.png" }} style={styles.galleryThumb} />
              <Image source={{ uri: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/place-spiti.png" }} style={styles.galleryThumb} />
            </View>
          )}

          {activeTab === "reviews" && (
            <View style={styles.reviewsList}>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewerName}>Aarav Sharma ★ 5.0</Text>
                <Text style={styles.reviewComment}>
                  Breathtaking place surrounded by towering pine trees. Visiting early morning with Musa is magical!
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Bottom Navigation Bar */}
      <BottomTabBar activeTab="Profile" onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  heroWrapper: {
    height: height * 0.38,
    width: "100%",
    position: "relative",
    backgroundColor: "#000",
  },
  heroImage: {
    width: "100%",
    height: "100%",
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoCountBadge: {
    position: "absolute",
    left: 20,
    bottom: 24,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    marginTop: -18,
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
    fontSize: 22,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.3,
  },
  placeLocation: {
    fontSize: 13,
    color: "#71717A",
    fontWeight: "500",
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
    marginLeft: 10,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D97706",
  },
  actionTabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
    marginBottom: 18,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  actionPillActive: {
    backgroundColor: "#EA6C1E",
    borderColor: "#EA6C1E",
  },
  actionPillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#4B5563",
  },
  actionPillTextActive: {
    color: "#FFFFFF",
  },
  infoContent: {
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 6,
  },
  aboutText: {
    fontSize: 13.5,
    color: "#4B5563",
    lineHeight: 20,
  },
  readMoreBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  readMoreText: {
    color: "#EA6C1E",
    fontSize: 13,
    fontWeight: "600",
  },
  bestTimeText: {
    fontSize: 13.5,
    color: "#4B5563",
    lineHeight: 19,
  },
  ctaBtn: {
    backgroundColor: "#18181B",
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  galleryGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  galleryThumb: {
    width: 90,
    height: 90,
    borderRadius: 14,
  },
  reviewsList: {
    marginTop: 8,
    gap: 10,
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 4,
  },
  reviewComment: {
    fontSize: 12.5,
    color: "#4B5563",
    lineHeight: 18,
  },
});
