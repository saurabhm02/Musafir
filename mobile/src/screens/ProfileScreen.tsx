import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Linking,
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
import * as ImagePicker from "expo-image-picker";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import {
  fetchUserProfile,
  updateUserProfile,
  type UserProfile,
  type AchievementBadge,
} from "../lib/profile";
import { compressImage, uploadToStorage } from "../lib/imageUpload";
import { signOut } from "../lib/supabase";
import { colors } from "../theme";
import type { RootStackParamList } from "../navigation";

const { width } = Dimensions.get("window");

// Assets & Mascot URLs (Hosted on S3)
const MUSA_ABOUT_URL = "https://gomusafir.s3.us-east-1.amazonaws.com/assets/mascot/musa_about.png";
const MUSA_SUPPORT_URL = "https://gomusafir.s3.us-east-1.amazonaws.com/assets/mascot/musa_support.png";
const MUSA_LOGOUT_URL = "https://gomusafir.s3.us-east-1.amazonaws.com/assets/mascot/musa_compass.png";
const APP_ICON_URL = "https://gomusafir.s3.us-east-1.amazonaws.com/assets/icons/musafir_app_icon.png";

// Stats Mascots
const MUSA_TRAVELLED_URL = "https://gomusafir.s3.us-east-1.amazonaws.com/assets/mascot/musa_travelled.png";
const MUSA_TRIPS_URL = "https://gomusafir.s3.us-east-1.amazonaws.com/assets/mascot/musa_trips.png";
const MUSA_STATES_URL = "https://gomusafir.s3.us-east-1.amazonaws.com/assets/mascot/musa_states.png";
const MUSA_MEMORIES_URL = "https://gomusafir.s3.us-east-1.amazonaws.com/assets/mascot/musa_memories.png";
const DEFAULT_BANNER_URL = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80";

function getBadgeEmoji(badgeKeyOrIcon: string): string {
  switch (badgeKeyOrIcon) {
    case "dist_500":
    case "distance_500":
      return "🚗";
    case "dist_2500":
    case "distance_2500":
      return "🛣️";
    case "trips_10":
      return "🧳";
    case "mountain_explorer":
      return "🏔️";
    case "heritage_seeker":
      return "🏛️";
    case "sunset_chaser":
      return "🌅";
    case "memory_collector":
      return "📸";
    default:
      return "🏆";
  }
}

// SVG Icons
function ArrowBackIcon({ size = 20, color = "#18181B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function EditPencilIcon({ size = 16, color = "#18181B" }: { size?: number; color?: string }) {
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

function CameraIcon({ size = 14, color = "#18181B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 3H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function GearSettingsIcon({ size = 18, color = "#71717A" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserPlaceholderIcon({ size = 36, color = "#9CA3AF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function CompassStatIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke="#0D9488" strokeWidth={2} />
      <Path d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z" fill="#0D9488" stroke="#0D9488" strokeWidth={1.2} />
    </Svg>
  );
}

function SuitcaseStatIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="7" width="16" height="13" rx="3" stroke="#2563EB" strokeWidth={2} />
      <Path d="M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" stroke="#2563EB" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M4 12H20" stroke="#2563EB" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function MapStatesIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21V6Z" stroke="#059669" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 3V18M15 6V21" stroke="#059669" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function CameraStatIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 3H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z" stroke="#E11D48" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="13" r="4" stroke="#E11D48" strokeWidth={2} />
    </Svg>
  );
}

function BookmarkTagIcon({ size = 18, color = "#EF4444" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" fill={color} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="7" cy="7" r="1.5" fill="#FFFFFF" />
    </Svg>
  );
}

function HeartYellowIcon({ size = 18, color = "#F59E0B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </Svg>
  );
}

function FolderPurpleIcon({ size = 18, color = "#8B5CF6" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill={color} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
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

function MailIcon({ size = 18, color = "#059669" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="20" height="16" rx="3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 6L12 13L2 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GlobeIcon({ size = 18, color = "#7C3AED" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M2 12H22M12 2C14.5 4.5 16 8 16 12C16 16 14.5 19.5 12 22C9.5 19.5 8 16 8 12C8 8 9.5 4.5 12 2Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ChatFeedbackIcon({ size = 18, color = "#D97706" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShieldCheckIcon({ size = 16, color = "#71717A" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

let cachedProfileData: UserProfile | null = null;

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

export function ProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfileData);
  const [loading, setLoading] = useState(!cachedProfileData);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Profile Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarLocalUri, setEditAvatarLocalUri] = useState<string | null>(null);
  const [editBannerLocalUri, setEditBannerLocalUri] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Bottom Sheet Modals State
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchUserProfile();
      cachedProfileData = data;
      setProfile(data);
      setEditName(data.user.fullName || "");
      setEditCity(data.user.homeCity || "");
      setEditBio(data.user.bio || "");
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

  const handlePickAvatar = async (fromCamera: boolean = false) => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow camera/gallery access to update your profile photo.");
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
        : await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (!result.canceled && result.assets[0]?.uri) {
        setEditAvatarLocalUri(result.assets[0].uri);
        setEditModalOpen(true);
      }
    } catch (err) {
      console.warn("Avatar selection failed:", err);
    }
  };

  const handlePickBanner = async (fromCamera: boolean = false) => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow camera/gallery access to update your banner photo.");
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        })
        : await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });

      if (!result.canceled && result.assets[0]?.uri) {
        setEditBannerLocalUri(result.assets[0].uri);
        setEditModalOpen(true);
      }
    } catch (err) {
      console.warn("Banner selection failed:", err);
    }
  };

  const handleSaveProfile = async () => {
    setSavingEdit(true);
    try {
      let finalAvatarUrl: string | undefined = undefined;
      let finalBannerUrl: string | undefined = undefined;

      if (editAvatarLocalUri) {
        const compressed = await compressImage(editAvatarLocalUri);
        finalAvatarUrl = await uploadToStorage(`users/${profile?.user?.id || "me"}/avatar_${Date.now()}.jpg`, compressed);
      }
      if (editBannerLocalUri) {
        const compressed = await compressImage(editBannerLocalUri);
        finalBannerUrl = await uploadToStorage(`users/${profile?.user?.id || "me"}/banner_${Date.now()}.jpg`, compressed);
      }

      await updateUserProfile({
        fullName: editName.trim(),
        homeCity: editCity.trim(),
        bio: editBio.trim(),
        avatarUrl: finalAvatarUrl,
        bannerUrl: finalBannerUrl,
      });

      setEditModalOpen(false);
      setEditAvatarLocalUri(null);
      setEditBannerLocalUri(null);
      loadData();
    } catch (err: any) {
      Alert.alert("Update Failed", err?.message || "Could not update profile.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLogOut = () => {
    setLogoutModalOpen(true);
  };

  const handleLogOutConfirm = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      setLogoutModalOpen(false);
      navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
    } catch (err: any) {
      Alert.alert("Logout Error", err?.message || "Failed to log out");
    } finally {
      setLoggingOut(false);
    }
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
  const displayBio = u?.bio?.trim() || null;
  const bannerUri = u?.bannerUrl || DEFAULT_BANNER_URL;
  const hasAvatar = Boolean(u?.avatarUrl);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* 1. PROFILE BANNER & HEADER */}
        <View style={styles.bannerContainer}>
          <ImageBackground source={{ uri: bannerUri }} style={styles.bannerImg} resizeMode="cover">
            <View style={styles.bannerOverlay} />

            {/* Overlaid Top Action Row */}
            <SafeAreaView edges={["top"]} style={styles.bannerTopNav}>
              <TouchableOpacity
                style={styles.bannerNavBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.75}
              >
                <ArrowBackIcon size={20} color="#18181B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bannerNavBtn}
                onPress={() => navigation.navigate("Notifications")}
                activeOpacity={0.75}
              >
                <BellIcon size={19} color="#18181B" />
              </TouchableOpacity>
            </SafeAreaView>

            {/* Change Banner Pill */}
            <TouchableOpacity
              style={styles.changeBannerPill}
              onPress={() => handlePickBanner(false)}
              activeOpacity={0.8}
            >
              <CameraIcon size={14} color="#FFFFFF" />
              <Text style={styles.changeBannerText}>Change Banner</Text>
            </TouchableOpacity>
          </ImageBackground>
        </View>

        {/* 2. PROFILE INFO CARD */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeaderRow}>
            {/* Avatar on Left with Camera Badge */}
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={() => handlePickAvatar(false)}
              activeOpacity={0.88}
            >
              {hasAvatar ? (
                <Image source={{ uri: u!.avatarUrl! }} style={styles.avatarImg} resizeMode="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <UserPlaceholderIcon size={42} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.cameraBadge}>
                <CameraIcon size={13} color="#18181B" />
              </View>
            </TouchableOpacity>

            {/* Compact Edit Pencil Button on the Right */}
            <TouchableOpacity
              style={styles.editPencilBtn}
              onPress={() => {
                setEditAvatarLocalUri(null);
                setEditBannerLocalUri(null);
                setEditModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <EditPencilIcon size={16} color="#18181B" />
            </TouchableOpacity>
          </View>

          {/* User Details */}
          <View style={styles.profileInfoBox}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{displayName}</Text>
              <VerifiedCheckIcon size={18} />
            </View>

            <View style={styles.cityRow}>
              <Text style={styles.cityPinIcon}>📍</Text>
              <Text style={styles.profileCity}>{displayCity}</Text>
            </View>

            {displayBio ? <Text style={styles.profileBio}>{displayBio}</Text> : null}
          </View>
        </View>

        {/* 3. TRAVEL STATS (4-Tile Balanced Grid) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>TRAVEL STATS</Text>
          </View>

          <View style={styles.statsGrid}>
            {/* 1. Distance / Travelled */}
            <View style={styles.statTile}>
              <View style={styles.statTileTop}>
                <View style={[styles.statIconWrap, { backgroundColor: "#DCFCE7" }]}>
                  <CompassStatIcon size={16} />
                </View>
                <Image source={{ uri: MUSA_TRAVELLED_URL }} style={styles.statMascotImg} />
              </View>
              <View style={styles.statTileBottom}>
                <Text style={styles.statNumber}>
                  {s ? Math.round(s.totalDistanceKm).toLocaleString() : "0"} <Text style={styles.statUnit}>km</Text>
                </Text>
                <Text style={styles.statLabel} numberOfLines={1}>Travelled</Text>
              </View>
            </View>

            {/* 2. Trips */}
            <View style={styles.statTile}>
              <View style={styles.statTileTop}>
                <View style={[styles.statIconWrap, { backgroundColor: "#DBEAFE" }]}>
                  <SuitcaseStatIcon size={16} />
                </View>
                <Image source={{ uri: MUSA_TRIPS_URL }} style={styles.statMascotImg} />
              </View>
              <View style={styles.statTileBottom}>
                <Text style={styles.statNumber}>{s?.totalTrips ?? 0}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>Trips</Text>
              </View>
            </View>

            {/* 3. States Explored */}
            <View style={styles.statTile}>
              <View style={styles.statTileTop}>
                <View style={[styles.statIconWrap, { backgroundColor: "#DCFCE7" }]}>
                  <MapStatesIcon size={16} />
                </View>
                <Image source={{ uri: MUSA_STATES_URL }} style={styles.statMascotImg} />
              </View>
              <View style={styles.statTileBottom}>
                <Text style={styles.statNumber}>{s?.statesExplored ?? 0}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>States Explored</Text>
              </View>
            </View>

            {/* 4. Photos & Memories */}
            <View style={styles.statTile}>
              <View style={styles.statTileTop}>
                <View style={[styles.statIconWrap, { backgroundColor: "#FCE7F3" }]}>
                  <CameraStatIcon size={16} />
                </View>
                <Image source={{ uri: MUSA_MEMORIES_URL }} style={styles.statMascotImg} />
              </View>
              <View style={styles.statTileBottom}>
                <Text style={styles.statNumber}>{s ? s.photosAndMemories.toLocaleString() : "0"}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>Photos & Memories</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. MY COLLECTIONS (Horizontal Scrollable Cards) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>MY COLLECTIONS</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.collectionsScrollRow}
          >
            {/* Saved Places */}
            <TouchableOpacity
              style={styles.colCard}
              onPress={() => navigation.navigate("SavedSpots")}
              activeOpacity={0.75}
            >
              <View style={[styles.colIconWrap, { backgroundColor: "#FEE2E2" }]}>
                <BookmarkTagIcon size={18} color="#EF4444" />
              </View>
              <View style={styles.colTextWrap}>
                <Text style={styles.colTitle} numberOfLines={1}>Saved Places</Text>
                <Text style={styles.colCount}>{savedCounts?.savedPlaces ?? 0} Places</Text>
              </View>
            </TouchableOpacity>

            {/* Want to Go */}
            <TouchableOpacity
              style={styles.colCard}
              onPress={() => navigation.navigate("WantToGo")}
              activeOpacity={0.75}
            >
              <View style={[styles.colIconWrap, { backgroundColor: "#FEF3C7" }]}>
                <HeartYellowIcon size={18} color="#F59E0B" />
              </View>
              <View style={styles.colTextWrap}>
                <Text style={styles.colTitle} numberOfLines={1}>Want to Go</Text>
                <Text style={styles.colCount}>{savedCounts?.wantToGo ?? 0} Places</Text>
              </View>
            </TouchableOpacity>

            {/* My Collections */}
            <TouchableOpacity
              style={styles.colCard}
              onPress={() => navigation.navigate("Collections")}
              activeOpacity={0.75}
            >
              <View style={[styles.colIconWrap, { backgroundColor: "#EDE9FE" }]}>
                <FolderPurpleIcon size={18} color="#8B5CF6" />
              </View>
              <View style={styles.colTextWrap}>
                <Text style={styles.colTitle} numberOfLines={1}>My Collections</Text>
                <Text style={styles.colCount}>{savedCounts?.collections ?? 0} Collections</Text>
              </View>
              <ChevronRightIcon size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 5. ACHIEVEMENTS SECTION */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
          </View>

          {/* Featured Milestone Card */}
          {fBadge && (
            <View style={styles.featuredBadgeCard}>
              <View style={styles.featuredBadgeLeft}>
                <View style={styles.featuredBadgeHex}>
                  <Text style={styles.featuredBadgeHexText}>{getBadgeEmoji(fBadge.badgeIcon || fBadge.badgeKey)}</Text>
                </View>
              </View>
              <View style={styles.featuredBadgeRight}>
                <View style={styles.featuredStatusRow}>
                  <Text style={styles.featuredBadgeTitle}>{fBadge.title}</Text>
                  {fBadge.isUnlocked && (
                    <View style={styles.earnedTag}>
                      <Text style={styles.earnedTagText}>UNLOCKED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.featuredBadgeDesc}>{fBadge.description}</Text>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, (fBadge.progress / Math.max(1, fBadge.targetValue)) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Badges Horizontal Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScroll}
          >
            {achievements.map((ach) => (
              <View
                key={ach.badgeKey}
                style={[styles.badgePill, !ach.isUnlocked && styles.badgePillLocked]}
              >
                <View style={styles.badgeHexIcon}>
                  <Text style={styles.badgeHexText}>{getBadgeEmoji(ach.badgeIcon || ach.badgeKey)}</Text>
                </View>
                <Text style={styles.badgePillTitle} numberOfLines={1}>
                  {ach.title}
                </Text>
                <Text
                  style={[
                    styles.badgePillStatus,
                    ach.isUnlocked && styles.badgePillStatusEarned,
                  ]}
                >
                  {ach.isUnlocked ? "Unlocked" : `${Math.round(ach.progress)}/${ach.targetValue}`}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 6. RECENT TRIPS */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>RECENT TRIPS</Text>
          </View>

          {recentTrips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No completed trips yet</Text>
              <Text style={styles.emptySubtitle}>Start GPS navigation or complete a journey to see your route history.</Text>
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

        {/* 7. MEMORIES SECTION */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>MEMORIES</Text>
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

        {/* 8. SETTINGS & PREFERENCES */}
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

            <TouchableOpacity style={styles.linkRow} onPress={() => setHelpModalOpen(true)} activeOpacity={0.7}>
              <Text style={styles.settingsIcon}>❓</Text>
              <Text style={styles.settingsLabel}>Help & Support</Text>
              <ChevronRightIcon size={18} />
            </TouchableOpacity>

            <View style={styles.linkDivider} />

            <TouchableOpacity style={styles.linkRow} onPress={() => setAboutModalOpen(true)} activeOpacity={0.7}>
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

        {/* 9. TRUST & FOOTER BADGES */}
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
      <Modal visible={editModalOpen} animationType="slide" transparent onRequestClose={() => setEditModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            {/* Avatar & Banner Pickers Row */}
            <View style={styles.editMediaRow}>
              {/* Avatar Picker */}
              <TouchableOpacity
                style={styles.editAvatarPicker}
                onPress={() => handlePickAvatar(false)}
                activeOpacity={0.8}
              >
                {editAvatarLocalUri || u?.avatarUrl ? (
                  <Image
                    source={{ uri: editAvatarLocalUri || u!.avatarUrl! }}
                    style={styles.editAvatarPreview}
                  />
                ) : (
                  <View style={styles.editAvatarPlaceholder}>
                    <CameraIcon size={20} color="#9CA3AF" />
                  </View>
                )}
                <Text style={styles.editMediaLabel}>Photo</Text>
              </TouchableOpacity>

              {/* Banner Picker */}
              <TouchableOpacity
                style={styles.editBannerPicker}
                onPress={() => handlePickBanner(false)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: editBannerLocalUri || u?.bannerUrl || DEFAULT_BANNER_URL }}
                  style={styles.editBannerPreview}
                />
                <View style={styles.editBannerBadge}>
                  <CameraIcon size={12} color="#FFFFFF" />
                  <Text style={styles.editBannerBadgeText}>Change Banner</Text>
                </View>
              </TouchableOpacity>
            </View>

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

      {/* ABOUT MUSAFIR MODAL */}
      <Modal
        visible={aboutModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAboutModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setAboutModalOpen(false)}
        >
          <TouchableOpacity style={styles.sheetCard} activeOpacity={1}>
            <View style={styles.sheetHandle} />

            <Image source={{ uri: MUSA_ABOUT_URL }} style={styles.mascotImageAbout} />

            <Text style={styles.sheetTitle}>About Musafir</Text>
            <Text style={styles.sheetTagline}>Your Ultimate Travel Companion</Text>

            <Text style={styles.sheetDesc}>
              Musafir helps you discover amazing places, plan your trips, record your journeys and cherish every memory.
            </Text>

            <Text style={styles.sheetCatchphrase}>Discover. Plan. Travel. Remember.</Text>
            <Text style={styles.sheetHindiTagline}>Har safar, ek kahani.</Text>

            <View style={styles.appInfoCard}>
              <Image source={{ uri: APP_ICON_URL }} style={styles.appIconImg} />
              <View style={styles.appInfoTextCol}>
                <Text style={styles.appInfoTitle}>Musafir MVP</Text>
                <Text style={styles.appInfoSubtitle}>The Ultimate Road Trip & Exploration Platform</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => setAboutModalOpen(false)}
              activeOpacity={0.88}
            >
              <Text style={styles.sheetCloseText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* HELP & SUPPORT MODAL */}
      <Modal
        visible={helpModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setHelpModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setHelpModalOpen(false)}
        >
          <TouchableOpacity style={styles.sheetCard} activeOpacity={1}>
            <View style={styles.sheetHandle} />

            <Image source={{ uri: MUSA_SUPPORT_URL }} style={styles.mascotImageSupport} />

            <Text style={styles.sheetTitle}>Help & Support</Text>
            <Text style={styles.sheetTagline}>We're here to help!</Text>

            <Text style={styles.sheetDesc}>
              Facing an issue or have a question? Reach out to us and we'll get back to you as soon as possible.
            </Text>

            <View style={styles.supportOptionsCard}>
              <TouchableOpacity
                style={styles.supportOptionRow}
                onPress={() => Linking.openURL("mailto:support@gomusafir.app").catch(() => { })}
                activeOpacity={0.7}
              >
                <View style={[styles.supportIconWrap, { backgroundColor: "#DCFCE7" }]}>
                  <MailIcon size={18} color="#059669" />
                </View>
                <View style={styles.supportOptionContent}>
                  <Text style={styles.supportOptionTitle}>support@gomusafir.app</Text>
                  <Text style={styles.supportOptionSub}>Email Us</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.supportDivider} />

              <TouchableOpacity
                style={styles.supportOptionRow}
                onPress={() => Linking.openURL("https://gomusafir.app").catch(() => { })}
                activeOpacity={0.7}
              >
                <View style={[styles.supportIconWrap, { backgroundColor: "#EDE9FE" }]}>
                  <GlobeIcon size={18} color="#7C3AED" />
                </View>
                <View style={styles.supportOptionContent}>
                  <Text style={styles.supportOptionTitle}>Visit Website</Text>
                  <Text style={styles.supportOptionSub}>gomusafir.app</Text>
                </View>
                <ChevronRightIcon size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.supportDivider} />

              <TouchableOpacity
                style={styles.supportOptionRow}
                onPress={() =>
                  Linking.openURL("mailto:support@gomusafir.app?subject=Musafir%20Feedback").catch(() => { })
                }
                activeOpacity={0.7}
              >
                <View style={[styles.supportIconWrap, { backgroundColor: "#FEF3C7" }]}>
                  <ChatFeedbackIcon size={18} color="#D97706" />
                </View>
                <View style={styles.supportOptionContent}>
                  <Text style={styles.supportOptionTitle}>Send Feedback</Text>
                  <Text style={styles.supportOptionSub}>Help us improve</Text>
                </View>
                <ChevronRightIcon size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => setHelpModalOpen(false)}
              activeOpacity={0.88}
            >
              <Text style={styles.sheetCloseText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* LOG OUT MODAL */}
      <Modal
        visible={logoutModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLogoutModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setLogoutModalOpen(false)}
        >
          <TouchableOpacity style={styles.sheetCard} activeOpacity={1}>
            <View style={styles.sheetHandle} />

            <Image source={{ uri: MUSA_LOGOUT_URL }} style={styles.mascotImageLogout} />

            <Text style={styles.sheetTitle}>Log Out</Text>
            <Text style={styles.sheetTagline}>Are you sure?</Text>

            <Text style={styles.sheetDesc}>
              You will be logged out from Musafir on this device.
            </Text>

            <View style={styles.logoutActionsRow}>
              <TouchableOpacity
                style={styles.logoutCancelBtn}
                onPress={() => setLogoutModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutConfirmBtn}
                onPress={handleLogOutConfirm}
                activeOpacity={0.88}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.logoutConfirmText}>Log Out</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.securityFooterRow}>
              <ShieldCheckIcon size={15} color="#71717A" />
              <Text style={styles.securityFooterText}>Your data is safe and secure with us.</Text>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: 110,
  },

  // Banner Header
  bannerContainer: {
    width: "100%",
    height: 230,
    position: "relative",
  },
  bannerImg: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  bannerTopNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 16 : 8,
  },
  bannerNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  changeBannerPill: {
    position: "absolute",
    bottom: 42,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(24, 24, 27, 0.75)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  changeBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Profile Card
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -30,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F4F5",
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: -46,
    marginBottom: 10,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarImg: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3.5,
    borderColor: "#FFFFFF",
  },
  avatarPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#F4F4F5",
    borderWidth: 3.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editPencilBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 4,
  },
  profileInfoBox: {
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.3,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  cityPinIcon: {
    fontSize: 13,
  },
  profileCity: {
    fontSize: 13.5,
    color: "#71717A",
    fontWeight: "500",
  },
  profileBio: {
    fontSize: 13.5,
    color: "#52525B",
    lineHeight: 19,
    marginTop: 4,
  },

  // Sections
  sectionWrap: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#71717A",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  statsGearBtn: {
    padding: 4,
  },

  // 4-Tile Travel Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statTile: {
    width: (width - 42) / 2,
    minHeight: 95,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    justifyContent: "space-between",
  },
  statTileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statMascotImg: {
    width: 70,
    height: 70,
    resizeMode: "contain",
    // marginTop: -6,
    // marginRight: -4,
  },
  statTileBottom: {
    // marginTop: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.3,
  },
  statUnit: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  statLabel: {
    fontSize: 11,
    color: "#71717A",
    fontWeight: "600",
    marginTop: 1,
  },

  // My Collections Horizontal Scroll Row
  collectionsScrollRow: {
    gap: 10,
    paddingVertical: 2,
  },
  colCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    minWidth: 148,
  },
  colIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  colTextWrap: {
    flex: 1,
  },
  colTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#18181B",
  },
  colCount: {
    fontSize: 11,
    color: "#71717A",
    fontWeight: "500",
    marginTop: 1,
  },

  // Achievements
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
  },
  featuredBadgeLeft: {
    alignItems: "center",
    justifyContent: "center",
  },
  featuredBadgeHex: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredBadgeHexText: {
    fontSize: 28,
  },
  featuredBadgeRight: {
    flex: 1,
  },
  featuredBadgeTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#18181B",
  },
  featuredBadgeDesc: {
    fontSize: 12,
    color: "#71717A",
    marginTop: 2,
    marginBottom: 6,
  },
  featuredStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  earnedTag: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  earnedTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },
  progressBarBg: {
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
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
    padding: 10,
    alignItems: "center",
  },
  badgePillLocked: {
    opacity: 0.55,
  },
  badgeHexIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  badgeHexText: {
    fontSize: 22,
  },
  badgePillTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#18181B",
    textAlign: "center",
  },
  badgePillStatus: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 2,
  },
  badgePillStatusEarned: {
    color: "#059669",
  },

  // Trips
  tripCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
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
    fontSize: 14.5,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 2,
  },
  tripDate: {
    fontSize: 12,
    color: "#71717A",
    marginBottom: 2,
  },
  tripMeta: {
    fontSize: 11.5,
    color: "#059669",
    fontWeight: "600",
  },

  // Memories
  memoriesScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  memoryCard: {
    width: 140,
    height: 180,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#18181B",
    position: "relative",
  },
  memoryImg: {
    width: "100%",
    height: "100%",
  },
  memoryHeartIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  memoryBottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  memoryCaption: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  memoryDate: {
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    marginTop: 1,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#71717A",
    textAlign: "center",
  },

  // Settings Links
  linksCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingsIcon: {
    fontSize: 18,
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
    flex: 1,
  },
  linkDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 46,
  },

  // Footer Row
  footerRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  footerItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    alignItems: "center",
  },
  footerIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  footerTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#71717A",
    letterSpacing: 0.6,
  },
  footerDesc: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 14,
  },

  // Edit Profile Modal
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
  editMediaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  editAvatarPicker: {
    alignItems: "center",
    gap: 4,
  },
  editAvatarPreview: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  editAvatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F4F4F5",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  editMediaLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#71717A",
  },
  editBannerPicker: {
    flex: 1,
    height: 68,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  editBannerPreview: {
    width: "100%",
    height: "100%",
  },
  editBannerBadge: {
    position: "absolute",
    bottom: 6,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editBannerBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
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

  // Bottom Sheet Modal Styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "android" ? 24 : 36,
    alignItems: "center",
  },
  sheetHandle: {
    width: 42,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: "#D1D5DB",
    marginBottom: 14,
  },
  mascotImageAbout: {
    width: 145,
    height: 135,
    resizeMode: "contain",
    marginBottom: 8,
  },
  mascotImageSupport: {
    width: 170,
    height: 135,
    resizeMode: "contain",
    marginBottom: 8,
  },
  mascotImageLogout: {
    width: 140,
    height: 130,
    resizeMode: "contain",
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.4,
    marginBottom: 3,
    textAlign: "center",
  },
  sheetTagline: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#059669",
    marginBottom: 8,
    textAlign: "center",
  },
  sheetDesc: {
    fontSize: 13.5,
    color: "#52525B",
    textAlign: "center",
    lineHeight: 19.5,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  sheetCatchphrase: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#3F3F46",
    textAlign: "center",
    marginTop: 4,
  },
  sheetHindiTagline: {
    fontSize: 13,
    color: "#71717A",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 10,
  },
  appInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 14,
    width: "100%",
    gap: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  appIconImg: {
    width: 46,
    height: 46,
    borderRadius: 12,
    resizeMode: "contain",
  },
  appInfoTextCol: {
    flex: 1,
  },
  appInfoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#18181B",
    marginBottom: 2,
  },
  appInfoSubtitle: {
    fontSize: 12,
    color: "#71717A",
    lineHeight: 16,
  },
  supportOptionsCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    width: "100%",
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 18,
  },
  supportOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  supportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  supportOptionContent: {
    flex: 1,
  },
  supportOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 1,
  },
  supportOptionSub: {
    fontSize: 12,
    color: "#71717A",
  },
  supportDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 64,
  },
  logoutActionsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  logoutCancelText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#18181B",
  },
  logoutConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutConfirmText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  securityFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 4,
  },
  securityFooterText: {
    fontSize: 12.5,
    color: "#71717A",
    fontWeight: "500",
  },
  sheetCloseBtn: {
    backgroundColor: "#18181B",
    borderRadius: 16,
    height: 48,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
