import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import {
  fetchUserProfile,
  updateUserProfile,
  type UserProfile,
  type AchievementBadge,
} from "../lib/profile";
import { signOut } from "../lib/supabase";
import { colors } from "../theme";
import type { RootStackParamList } from "../navigation";

const { width } = Dimensions.get("window");

// SVG Icons
function ArrowBackIcon({ size = 20, color = "#18181B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function EditPencilIcon({ size = 14, color = "#18181B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShareIcon({ size = 18, color = "#18181B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V12M16 6L12 2M12 2L8 6M12 2V15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BellIcon({ size = 18, color = "#18181B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21A2 2 0 0 1 10.27 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRightIcon({ size = 16, color = "#9CA3AF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function VerifiedCheckIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="#10B981" />
      <Path d="M8 12L11 15L16 9" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CompassStatIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke="#0D9488" strokeWidth={2} />
      <Path d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z" stroke="#0D9488" strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function SuitcaseStatIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="7" width="16" height="13" rx="3" stroke="#2563EB" strokeWidth={2} />
      <Path d="M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" stroke="#2563EB" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M4 12H20" stroke="#2563EB" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function MapPinStatIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21C16 17.5 19 14 19 10C19 6.13401 15.866 3 12 3C8.13401 3 5 6.13401 5 10C5 14 8 17.5 12 21Z" stroke="#7C3AED" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="10" r="3" stroke="#7C3AED" strokeWidth={2} />
    </Svg>
  );
}

function MapStatesIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21V6Z" stroke="#059669" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 3V18M15 6V21" stroke="#059669" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CityStatIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 21H21M5 21V7L13 3V21M19 21V10L13 7M9 9V9.01M9 13V13.01M9 17V17.01" stroke="#D97706" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CameraStatIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 3H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z" stroke="#E11D48" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="13" r="4" stroke="#E11D48" strokeWidth={2} />
    </Svg>
  );
}

function HeartOutlineIcon({ size = 14, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

export function ProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Profile Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchUserProfile();
      setProfile(data);
      setEditName(data.user.fullName || "");
      setEditCity(data.user.homeCity || "");
      setEditBio(data.user.bio || "");
      setEditAvatarUrl(data.user.avatarUrl || "");
    } catch (err) {
      console.warn("Failed to load user profile:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleSaveProfile = async () => {
    setSavingEdit(true);
    try {
      await updateUserProfile({
        fullName: editName,
        homeCity: editCity,
        bio: editBio,
        avatarUrl: editAvatarUrl,
      });
      setEditModalOpen(false);
      loadData();
    } catch (err: any) {
      Alert.alert("Update Failed", err?.message || "Could not update profile.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLogOut = () => {
    Alert.alert("Log Out", "Are you sure you want to log out of Musafir?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
        },
      },
    ]);
  };

  const handleTabPress = (tab: TabType) => {
    if (tab === "Home") navigation.navigate("Dashboard");
    else if (tab === "Explore") navigation.navigate("Home");
    else if (tab === "Trips") navigation.navigate("TripTracking", undefined);
  };

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading your Musafir profile...</Text>
      </View>
    );
  }

  const u = profile?.user;
  const s = profile?.stats;
  const fBadge = profile?.featuredAchievement;
  const achievements = profile?.achievements || [];
  const recentTrips = profile?.recentTrips || [];
  const recentMemories = profile?.recentMemories || [];
  const savedCounts = profile?.savedCounts;

  const displayName = u?.fullName || u?.username || "Musafir Traveler";
  const displayCity = u?.homeCity || "India";
  const displayBio = u?.bio || "Explorer by heart, capturing memories one journey at a time.";
  const avatarUri =
    u?.avatarUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      {/* Top App Bar */}
      <SafeAreaView style={styles.topBarSafe} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topIconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ArrowBackIcon size={20} />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Profile & Travel Stats</Text>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.topIconBtn} activeOpacity={0.7} onPress={() => navigation.navigate("Notifications")}>
              <BellIcon size={19} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* Profile Backdrop & Header */}
        <View style={styles.headerCard}>
          <ImageBackground
            source={{ uri: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&auto=format&fit=crop&q=80" }}
            style={styles.headerBackdrop}
            imageStyle={styles.headerBackdropImg}
          >
            <View style={styles.headerBackdropOverlay} />
          </ImageBackground>

          <View style={styles.avatarWrap}>
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} resizeMode="cover" />
            <View style={styles.verifiedBadge}>
              <VerifiedCheckIcon size={18} />
            </View>
          </View>

          <View style={styles.profileInfoBox}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{displayName}</Text>
              <VerifiedCheckIcon size={16} />
            </View>

            <View style={styles.cityRow}>
              <Text style={styles.cityPinIcon}>📍</Text>
              <Text style={styles.profileCity}>{displayCity}</Text>
            </View>

            <Text style={styles.profileBio}>{displayBio}</Text>

            <TouchableOpacity style={styles.editProfileBtn} onPress={() => setEditModalOpen(true)} activeOpacity={0.8}>
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
              <EditPencilIcon size={14} color="#18181B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. TRAVEL STATS GRID (6 Tiles) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>TRAVEL STATS</Text>
          </View>

          <View style={styles.statsGrid}>
            {/* Distance */}
            <View style={styles.statTile}>
              <View style={[styles.statIconWrap, { backgroundColor: "#F0FDFA" }]}>
                <CompassStatIcon size={20} />
              </View>
              <Text style={styles.statNumber}>
                {s ? s.totalDistanceKm.toLocaleString() : "0"} <Text style={styles.statUnit}>km</Text>
              </Text>
              <Text style={styles.statLabel}>Travelled</Text>
            </View>

            {/* Trips */}
            <View style={styles.statTile}>
              <View style={[styles.statIconWrap, { backgroundColor: "#EFF6FF" }]}>
                <SuitcaseStatIcon size={20} />
              </View>
              <Text style={styles.statNumber}>{s?.totalTrips ?? 0}</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>

            {/* Places Visited */}
            <View style={styles.statTile}>
              <View style={[styles.statIconWrap, { backgroundColor: "#F5F3FF" }]}>
                <MapPinStatIcon size={20} />
              </View>
              <Text style={styles.statNumber}>{s?.placesVisited ?? 0}</Text>
              <Text style={styles.statLabel}>Places Visited</Text>
            </View>

            {/* States Explored */}
            <View style={styles.statTile}>
              <View style={[styles.statIconWrap, { backgroundColor: "#ECFDF5" }]}>
                <MapStatesIcon size={20} />
              </View>
              <Text style={styles.statNumber}>{s?.statesExplored ?? 0}</Text>
              <Text style={styles.statLabel}>States Explored</Text>
            </View>

            {/* Cities Visited */}
            <View style={styles.statTile}>
              <View style={[styles.statIconWrap, { backgroundColor: "#FFFBEB" }]}>
                <CityStatIcon size={20} />
              </View>
              <Text style={styles.statNumber}>{s?.citiesVisited ?? 0}</Text>
              <Text style={styles.statLabel}>Cities Visited</Text>
            </View>

            {/* Photos & Memories */}
            <View style={styles.statTile}>
              <View style={[styles.statIconWrap, { backgroundColor: "#FFF1F2" }]}>
                <CameraStatIcon size={20} />
              </View>
              <Text style={styles.statNumber}>{s ? s.photosAndMemories.toLocaleString() : "0"}</Text>
              <Text style={styles.statLabel}>Photos & Memories</Text>
            </View>
          </View>
        </View>

        {/* 2. ACHIEVEMENTS SECTION */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
            <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* Featured Milestone Card */}
          {fBadge && (
            <View style={styles.featuredBadgeCard}>
              <View style={styles.featuredBadgeLeft}>
                <View style={styles.featuredBadgeHex}>
                  <Text style={{ fontSize: 26 }}>🏔️</Text>
                  <Text style={styles.featuredBadgeHexText}>HIMALAYAN{"\n"}EXPLORER</Text>
                </View>
              </View>
              <View style={styles.featuredBadgeRight}>
                <Text style={styles.featuredBadgeTitle}>{fBadge.title.toUpperCase()}</Text>
                <Text style={styles.featuredBadgeDesc}>{fBadge.description}</Text>
                <View style={styles.featuredStatusRow}>
                  <View style={styles.earnedTag}>
                    <Text style={styles.earnedTagText}>{fBadge.isUnlocked ? "Earned" : "In Progress"}</Text>
                  </View>
                  <Text style={styles.featuredProgressRatio}>
                    {fBadge.progress} / {fBadge.targetValue}
                  </Text>
                </View>
                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, (fBadge.progress / fBadge.targetValue) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Horizontal Badges Scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
            {achievements.map((ach) => (
              <View key={ach.badgeKey} style={[styles.badgePill, !ach.isUnlocked && styles.badgePillLocked]}>
                <View style={styles.badgeHexIcon}>
                  <Text style={{ fontSize: 20 }}>
                    {ach.badgeKey.includes("500") ? "🛣️" : ach.badgeKey.includes("10") ? "🧳" : ach.badgeKey.includes("heritage") ? "🏛️" : ach.badgeKey.includes("sunset") ? "🌄" : "📸"}
                  </Text>
                </View>
                <Text style={styles.badgePillTitle} numberOfLines={1}>
                  {ach.title}
                </Text>
                <Text style={[styles.badgePillStatus, ach.isUnlocked && styles.badgePillStatusEarned]}>
                  {ach.isUnlocked ? (ach.level ? `Level ${ach.level}` : "Earned") : `${ach.progress}/${ach.targetValue}`}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 3. RECENT TRIPS SECTION */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>RECENT TRIPS</Text>
            <TouchableOpacity onPress={() => navigation.navigate("TripTracking", undefined)} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentTrips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No recorded trips yet</Text>
              <Text style={styles.emptySubtitle}>Start your first journey to see detailed route stats and memories here.</Text>
            </View>
          ) : (
            recentTrips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={styles.tripCard}
                onPress={() => navigation.navigate("TripTracking", { tripId: trip.id })}
                activeOpacity={0.88}
              >
                <Image
                  source={{
                    uri:
                      trip.coverPhotoUrl ||
                      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=80",
                  }}
                  style={styles.tripThumb}
                  resizeMode="cover"
                />
                <View style={styles.tripInfo}>
                  <Text style={styles.tripTitle} numberOfLines={1}>
                    {trip.title}
                  </Text>
                  <Text style={styles.tripDate}>
                    {new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {trip.completedDate ? ` – ${new Date(trip.completedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                  </Text>
                  <Text style={styles.tripMeta}>
                    {Math.round(trip.actualDistanceKm)} km • {trip.dayCount}d • {trip.stopCount} Stops
                  </Text>
                </View>
                <ChevronRightIcon size={18} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* 4. MEMORIES SECTION */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>MEMORIES</Text>
            <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentMemories.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No travel memories yet</Text>
              <Text style={styles.emptySubtitle}>Upload photos at visited destinations to start your travel timeline.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memoriesScroll}>
              {recentMemories.map((mem) => (
                <View key={mem.id} style={styles.memoryCard}>
                  <Image source={{ uri: mem.photoUrl }} style={styles.memoryImg} resizeMode="cover" />
                  <View style={styles.memoryHeartIcon}>
                    <HeartOutlineIcon size={14} />
                  </View>
                  <View style={styles.memoryBottomGradient}>
                    <Text style={styles.memoryCaption} numberOfLines={1}>
                      {mem.caption || "Travel Moment"}
                    </Text>
                    <Text style={styles.memoryDate}>
                      {new Date(mem.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 5. SAVED & COLLECTIONS NAVIGATION */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>SAVED & COLLECTIONS</Text>
          </View>

          <View style={styles.linksCard}>
            {/* Saved Places */}
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate("SavedSpots")}
              activeOpacity={0.7}
            >
              <View style={[styles.linkIconWrap, { backgroundColor: "#ECFDF5" }]}>
                <Text style={{ fontSize: 16 }}>🔖</Text>
              </View>
              <View style={styles.linkTextCol}>
                <Text style={styles.linkLabel}>Saved Places</Text>
                <Text style={styles.linkSubtext}>{savedCounts?.savedPlaces ?? 0} Places</Text>
              </View>
              <ChevronRightIcon size={18} />
            </TouchableOpacity>

            <View style={styles.linkDivider} />

            {/* Want to Go */}
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate("WantToGo")}
              activeOpacity={0.7}
            >
              <View style={[styles.linkIconWrap, { backgroundColor: "#FFFBEB" }]}>
                <Text style={{ fontSize: 16 }}>🧡</Text>
              </View>
              <View style={styles.linkTextCol}>
                <Text style={styles.linkLabel}>Want to Go</Text>
                <Text style={styles.linkSubtext}>{savedCounts?.wantToGo ?? 0} Places</Text>
              </View>
              <ChevronRightIcon size={18} />
            </TouchableOpacity>

            <View style={styles.linkDivider} />

            {/* My Collections */}
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate("Collections")}
              activeOpacity={0.7}
            >
              <View style={[styles.linkIconWrap, { backgroundColor: "#F5F3FF" }]}>
                <Text style={{ fontSize: 16 }}>📁</Text>
              </View>
              <View style={styles.linkTextCol}>
                <Text style={styles.linkLabel}>My Collections</Text>
                <Text style={styles.linkSubtext}>{savedCounts?.collections ?? 0} Collections</Text>
              </View>
              <ChevronRightIcon size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. SETTINGS & PREFERENCES */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>SETTINGS</Text>
          </View>

          <View style={styles.linksCard}>
            <TouchableOpacity style={styles.linkRow} onPress={() => setEditModalOpen(true)} activeOpacity={0.7}>
              <Text style={styles.settingsIcon}>👤</Text>
              <Text style={styles.settingsLabel}>Account Settings</Text>
              <ChevronRightIcon size={18} />
            </TouchableOpacity>

            <View style={styles.linkDivider} />

            <TouchableOpacity style={styles.linkRow} onPress={() => {}} activeOpacity={0.7}>
              <Text style={styles.settingsIcon}>🔒</Text>
              <Text style={styles.settingsLabel}>Privacy & Visibility</Text>
              <ChevronRightIcon size={18} />
            </TouchableOpacity>

            <View style={styles.linkDivider} />

            <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("Notifications")} activeOpacity={0.7}>
              <Text style={styles.settingsIcon}>🔔</Text>
              <Text style={styles.settingsLabel}>Notifications</Text>
              <ChevronRightIcon size={18} />
            </TouchableOpacity>

            <View style={styles.linkDivider} />

            <TouchableOpacity style={styles.linkRow} onPress={() => Alert.alert("Musafir Support", "Contact us at support@gomusafir.app")} activeOpacity={0.7}>
              <Text style={styles.settingsIcon}>❓</Text>
              <Text style={styles.settingsLabel}>Help & Support</Text>
              <ChevronRightIcon size={18} />
            </TouchableOpacity>

            <View style={styles.linkDivider} />

            <TouchableOpacity style={styles.linkRow} onPress={() => Alert.alert("Musafir", "Musafir v2.4.0 — The Ultimate Road Trip & Exploration Platform")} activeOpacity={0.7}>
              <Text style={styles.settingsIcon}>ℹ️</Text>
              <Text style={styles.settingsLabel}>About Musafir</Text>
              <ChevronRightIcon size={18} />
            </TouchableOpacity>

            <View style={styles.linkDivider} />

            <TouchableOpacity style={styles.linkRow} onPress={handleLogOut} activeOpacity={0.7}>
              <Text style={styles.settingsIcon}>🚪</Text>
              <Text style={[styles.settingsLabel, { color: "#DC2626" }]}>Log Out</Text>
              <ChevronRightIcon size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. TRUST & FOOTER BADGES */}
        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <Text style={styles.footerIcon}>✔</Text>
            <Text style={styles.footerTitle}>REAL DATA</Text>
            <Text style={styles.footerDesc}>All stats from your actual trips and memories.</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerIcon}>🛡️</Text>
            <Text style={styles.footerTitle}>PRIVATE & SECURE</Text>
            <Text style={styles.footerDesc}>Your data is private and visible only to you.</Text>
          </View>
        </View>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={editModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Saurabh Sharma"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Home City</Text>
            <TextInput
              style={styles.modalInput}
              value={editCity}
              onChangeText={setEditCity}
              placeholder="e.g. Nagpur, India"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              style={[styles.modalInput, styles.modalBioInput]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell other travelers about your journey..."
              placeholderTextColor="#9CA3AF"
              multiline
            />

            <Text style={styles.inputLabel}>Avatar Photo URL</Text>
            <TextInput
              style={styles.modalInput}
              value={editAvatarUrl}
              onChangeText={setEditAvatarUrl}
              placeholder="https://..."
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveProfile}
                activeOpacity={0.88}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomTabBar activeTab="Profile" onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAF8",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#71717A",
  },
  topBarSafe: {
    backgroundColor: "#FAFAF8",
    zIndex: 10,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  topIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  screenHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#18181B",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  headerBackdrop: {
    width: "100%",
    height: 120,
    position: "relative",
  },
  headerBackdropImg: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerBackdropOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  avatarWrap: {
    alignSelf: "center",
    marginTop: -45,
    position: "relative",
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 1,
  },
  profileInfoBox: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#18181B",
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  cityPinIcon: {
    fontSize: 12,
  },
  profileCity: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  profileBio: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 10,
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAF8",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 9,
    gap: 6,
    marginTop: 14,
  },
  editProfileBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#18181B",
  },
  sectionWrap: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#059669",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statTile: {
    width: (width - 32 - 20) / 3,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    padding: 12,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: "800",
    color: "#18181B",
  },
  statUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 2,
    textAlign: "center",
  },
  featuredBadgeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  featuredBadgeLeft: {
    alignItems: "center",
    justifyContent: "center",
  },
  featuredBadgeHex: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  featuredBadgeHexText: {
    fontSize: 7.5,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 2,
  },
  featuredBadgeRight: {
    flex: 1,
  },
  featuredBadgeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#18181B",
  },
  featuredBadgeDesc: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 6,
  },
  featuredStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  earnedTag: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  earnedTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },
  featuredProgressRatio: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
  },
  badgesScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  badgePill: {
    width: 86,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    padding: 8,
    alignItems: "center",
  },
  badgePillLocked: {
    opacity: 0.5,
  },
  badgeHexIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  badgePillTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#18181B",
    textAlign: "center",
  },
  badgePillStatus: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 2,
  },
  badgePillStatusEarned: {
    color: "#059669",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 16,
  },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    padding: 10,
    marginBottom: 10,
    gap: 12,
  },
  tripThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
  },
  tripDate: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 2,
  },
  tripMeta: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#059669",
    marginTop: 2,
  },
  memoriesScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  memoryCard: {
    width: 120,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  memoryImg: {
    width: "100%",
    height: "100%",
  },
  memoryHeartIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryBottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  memoryCaption: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  memoryDate: {
    fontSize: 9,
    color: "#D1D5DB",
    marginTop: 1,
  },
  linksCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  linkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  linkTextCol: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
  },
  linkSubtext: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 1,
  },
  linkDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 48,
  },
  settingsIcon: {
    fontSize: 18,
    width: 26,
    textAlign: "center",
  },
  settingsLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#18181B",
  },
  footerRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  footerItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  footerIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  footerTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#18181B",
  },
  footerDesc: {
    fontSize: 9.5,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: Platform.OS === "android" ? 24 : 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181B",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: "#FAFAF8",
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: "#18181B",
    marginBottom: 12,
  },
  modalBioInput: {
    height: 70,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#18181B",
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
