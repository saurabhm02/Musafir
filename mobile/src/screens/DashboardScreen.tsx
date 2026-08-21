import React from "react";
import {
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
import { CATEGORIES, RECENT_TRIPS } from "../lib/mockData";

const { width } = Dimensions.get("window");

function PawIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 11.5C9.5 11.5 7.5 13.8 7.5 16.5C7.5 18.7 9.2 20.5 12 20.5C14.8 20.5 16.5 18.7 16.5 16.5C16.5 13.8 14.5 11.5 12 11.5Z"
        fill="#0D7C85"
      />
      <Circle cx="6.5" cy="10.5" r="2.2" fill="#0D7C85" />
      <Circle cx="10" cy="7.2" r="2.2" fill="#0D7C85" />
      <Circle cx="14" cy="7.2" r="2.2" fill="#0D7C85" />
      <Circle cx="17.5" cy="10.5" r="2.2" fill="#0D7C85" />
    </Svg>
  );
}

function BellIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z"
        stroke="#18181B"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21A2 2 0 0 1 10.27 21"
        stroke="#18181B"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="18" cy="6" r="3.5" fill="#EA6C1E" stroke="#FAFAF8" strokeWidth={1.5} />
    </Svg>
  );
}

function SearchSmallIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke="#9CA3AF" strokeWidth={2.2} />
      <Path d="M20 20L16 16" stroke="#9CA3AF" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  function handleTabPress(tab: TabType) {
    if (tab === "Search") {
      navigation.navigate("Search");
    } else if (tab === "Trips") {
      navigation.navigate("TripTracking");
    } else if (tab === "Profile") {
      navigation.navigate("Auth");
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      {/* Top Brand Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandTitle}>Musafir</Text>
          <View style={styles.pawBadge}>
            <PawIcon size={18} />
          </View>
        </View>
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
          <BellIcon size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroGreeting}>Hey, Explorer! 👋</Text>
            <Text style={styles.heroQuestion}>
              Where will{"\n"}
              <Text style={styles.heroMusaHighlight}>Musa</Text> take{"\n"}you today?
            </Text>
          </View>

          <View style={styles.heroRight}>
            <Image
              source={{ uri: "https://gomusafir.s3.us-east-1.amazonaws.com/mascot/musa-journey.png" }}
              style={styles.heroMascot}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate("Search")}
          activeOpacity={0.85}
        >
          <SearchSmallIcon size={18} />
          <Text style={styles.searchPlaceholder}>Search places, routes, stories...</Text>
        </TouchableOpacity>

        {/* Explore by Category */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore by category</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Search")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryCard}
              onPress={() => navigation.navigate("Search")}
              activeOpacity={0.8}
            >
              <View style={styles.categoryImageContainer}>
                <Image source={{ uri: cat.image }} style={styles.categoryImage} resizeMode="cover" />
              </View>
              <Text style={styles.categoryName}>{cat.name}</Text>
              <Text style={styles.categoryCount}>{cat.count}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Your Recent Trips */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your recent trips</Text>
          <TouchableOpacity onPress={() => navigation.navigate("TripTracking")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tripsList}>
          {RECENT_TRIPS.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripCard}
              onPress={() => navigation.navigate("TripTracking")}
              activeOpacity={0.82}
            >
              <Image source={{ uri: trip.image }} style={styles.tripThumbnail} resizeMode="cover" />
              <View style={styles.tripDetails}>
                <Text style={styles.tripTitle}>{trip.title}</Text>
                <Text style={styles.tripMeta}>
                  {trip.duration} • {trip.placesCount}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    trip.status === "In Progress" ? styles.statusInProgress : styles.statusCompleted,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      trip.status === "In Progress" ? styles.statusTextProgress : styles.statusTextCompleted,
                    ]}
                  >
                    {trip.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomTabBar
        activeTab="Home"
        onTabPress={handleTabPress}
        onCenterPress={() => navigation.navigate("Search")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  brandTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.5,
  },
  pawBadge: {
    marginLeft: 2,
  },
  bellBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F4ECE1",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 16,
    overflow: "hidden",
    minHeight: 145,
  },
  heroLeft: {
    flex: 1.1,
  },
  heroGreeting: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8C6E4E",
    marginBottom: 4,
  },
  heroQuestion: {
    fontSize: 20,
    fontWeight: "800",
    color: "#18181B",
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  heroMusaHighlight: {
    color: "#EA6C1E",
  },
  heroRight: {
    flex: 0.9,
    height: 135,
    alignItems: "center",
    justifyContent: "center",
  },
  heroMascot: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.15 }],
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    height: 50,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: "700",
    color: "#18181B",
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#EA6C1E",
  },
  categoriesRow: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 20,
  },
  categoryCard: {
    width: 72,
    alignItems: "center",
  },
  categoryImageContainer: {
    width: 68,
    height: 68,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    marginBottom: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#18181B",
    textAlign: "center",
  },
  categoryCount: {
    fontSize: 10,
    fontWeight: "500",
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 1,
  },
  tripsList: {
    gap: 12,
  },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 10,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  tripThumbnail: {
    width: 78,
    height: 64,
    borderRadius: 14,
    marginRight: 14,
  },
  tripDetails: {
    flex: 1,
    justifyContent: "center",
  },
  tripTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 2,
  },
  tripMeta: {
    fontSize: 12.5,
    color: "#71717A",
    fontWeight: "500",
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  statusInProgress: {
    backgroundColor: "#FEF3C7",
  },
  statusCompleted: {
    backgroundColor: "#DCFCE7",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextProgress: {
    color: "#D97706",
  },
  statusTextCompleted: {
    color: "#16A34A",
  },
});
