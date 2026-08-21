import React, { useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { RootStackParamList } from "../navigation";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";
import { POPULAR_SEARCHES, RECOMMENDED_PLACES, type PlaceItem } from "../lib/mockData";

const { width } = Dimensions.get("window");

function ArrowBackIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke="#18181B"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke="#9CA3AF" strokeWidth={2.2} />
      <Path d="M20 20L16 16" stroke="#9CA3AF" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function FilterIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6H20M7 12H17M10 18H14"
        stroke="#18181B"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function LocationPinIcon({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C16 17 20 13.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13.4183 8 17 12 21Z"
        fill="#18181B"
      />
      <Circle cx="12" cy="9" r="3" fill="#FFFFFF" />
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

function BookmarkIcon({ size = 18, saved = false }: { size?: number; saved?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={saved ? "#EA6C1E" : "none"}>
      <Path
        d="M19 21L12 16L5 21V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21Z"
        stroke={saved ? "#EA6C1E" : "#9CA3AF"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Search">;

export function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>({});

  function handleTabPress(tab: TabType) {
    if (tab === "Home") {
      navigation.navigate("Dashboard");
    } else if (tab === "Trips") {
      navigation.navigate("TripTracking");
    } else if (tab === "Profile") {
      navigation.navigate("Auth");
    }
  }

  function toggleSave(id: string) {
    setSavedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handlePlacePress(place: PlaceItem) {
    navigation.navigate("PlaceDetails", { place });
  }

  const filteredPlaces = RECOMMENDED_PLACES.filter((place) => {
    if (selectedTag && !place.name.toLowerCase().includes(selectedTag.toLowerCase()) && !place.tags.some(t => t.toLowerCase() === selectedTag.toLowerCase())) {
      return false;
    }
    if (query.trim()) {
      return (
        place.name.toLowerCase().includes(query.toLowerCase()) ||
        place.location.toLowerCase().includes(query.toLowerCase())
      );
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <ArrowBackIcon size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Search Bar + Filter Button */}
        <View style={styles.searchRow}>
          <View style={styles.inputContainer}>
            <SearchIcon size={18} />
            <TextInput
              style={styles.inputField}
              value={query}
              onChangeText={setQuery}
              placeholder="Search places, routes, stories..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
            <FilterIcon size={18} />
          </TouchableOpacity>
        </View>

        {/* Popular Searches */}
        <Text style={styles.sectionTitle}>Popular searches</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularRow}
        >
          {POPULAR_SEARCHES.map((term) => {
            const isSelected = selectedTag === term;
            return (
              <TouchableOpacity
                key={term}
                style={[styles.popularChip, isSelected && styles.popularChipActive]}
                onPress={() => setSelectedTag(isSelected ? null : term)}
                activeOpacity={0.75}
              >
                <Text style={[styles.popularChipText, isSelected && styles.popularChipTextActive]}>
                  {term}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Recommended for You */}
        <Text style={styles.sectionTitle}>Recommended for you</Text>
        <View style={styles.placesList}>
          {filteredPlaces.map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.placeCard}
              onPress={() => handlePlacePress(place)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: place.image }} style={styles.placeImage} resizeMode="cover" />

              <View style={styles.placeInfo}>
                <View style={styles.placeTitleRow}>
                  <View style={styles.pinNameRow}>
                    <LocationPinIcon size={13} />
                    <Text style={styles.placeName}>{place.name}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleSave(place.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <BookmarkIcon size={18} saved={!!savedItems[place.id]} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.placeLocation}>{place.location}</Text>

                <View style={styles.ratingRow}>
                  <StarIcon size={13} />
                  <Text style={styles.ratingText}>
                    {place.rating} <Text style={styles.reviewsCount}>({place.reviewsCount})</Text>
                  </Text>
                </View>

                <View style={styles.tagsRow}>
                  {place.tags.map((tag, i) => (
                    <View
                      key={i}
                      style={[
                        styles.tagBadge,
                        i === 0 ? styles.tagBadgePrimary : styles.tagBadgeSecondary,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          i === 0 ? styles.tagTextPrimary : styles.tagTextSecondary,
                        ]}
                      >
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomTabBar activeTab="Search" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  backBtn: {
    marginBottom: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    marginBottom: 20,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    height: 48,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: "#18181B",
    paddingVertical: 0,
    fontWeight: "500",
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 12,
  },
  popularRow: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 22,
  },
  popularChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
  },
  popularChipActive: {
    backgroundColor: "#EA6C1E",
    borderColor: "#EA6C1E",
  },
  popularChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  popularChipTextActive: {
    color: "#FFFFFF",
  },
  placesList: {
    gap: 14,
  },
  placeCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 10,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  placeImage: {
    width: 100,
    height: 88,
    borderRadius: 14,
    marginRight: 14,
  },
  placeInfo: {
    flex: 1,
    justifyContent: "center",
  },
  placeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  pinNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  placeName: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#18181B",
  },
  placeLocation: {
    fontSize: 12.5,
    color: "#71717A",
    fontWeight: "500",
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#18181B",
  },
  reviewsCount: {
    color: "#71717A",
    fontWeight: "500",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  tagBadgePrimary: {
    backgroundColor: "#ECFDF5",
  },
  tagBadgeSecondary: {
    backgroundColor: "#FEF3C7",
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  tagTextPrimary: {
    color: "#059669",
  },
  tagTextSecondary: {
    color: "#D97706",
  },
});
