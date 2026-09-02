import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { BackArrowIcon, ChevronDownIcon } from "../components/TrekMemoriesIcons";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "FilteredMemories">;

type FilterType = "all" | "photos" | "videos" | "notes";

export function FilteredMemoriesScreen({ navigation, route }: Props) {
  const { trekId, trekName, activeType = "all", onApply } = route.params;

  const [selectedType, setSelectedType] = useState<FilterType>(activeType as FilterType);
  const [selectedTime, setSelectedTime] = useState<string>("All Time");
  const [selectedWaypoint, setSelectedWaypoint] = useState<string>("All");
  const [selectedSort, setSelectedSort] = useState<string>("Recent First");

  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [waypointDropdownOpen, setWaypointDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const timeOptions = ["All Time", "Past Week", "Past Month", "This Season"];
  const waypointOptions = ["All", "Jalori Pass", "Chehni Kothi", "Buri Nali", "Raghupur Top", "Raghupur Fort"];
  const sortOptions = ["Recent First", "Most Liked", "Highest Altitude"];

  const handleClear = () => {
    setSelectedType("all");
    setSelectedTime("All Time");
    setSelectedWaypoint("All");
    setSelectedSort("Recent First");
  };

  const handleApply = () => {
    if (onApply) {
      onApply(selectedType);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <BackArrowIcon size={22} color="#18181B" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Filtered Memories</Text>

        <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Type Filter Buttons */}
        <View style={styles.typeRow}>
          {(
            [
              { key: "all", label: "All" },
              { key: "photos", label: "Photos" },
              { key: "videos", label: "Videos" },
              { key: "notes", label: "Notes" },
            ] as const
          ).map((item) => {
            const isSelected = selectedType === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.typeBtn, isSelected && styles.typeBtnActive]}
                onPress={() => setSelectedType(item.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.typeBtnText, isSelected && styles.typeBtnTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Trek Selector */}
        <View style={styles.filterGroup}>
          <Text style={styles.groupLabel}>Trek</Text>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownValue}>{trekName || "Raghupur Fort Trek"}</Text>
            <ChevronDownIcon size={14} color="#71717A" />
          </View>
        </View>

        {/* Time Selector */}
        <View style={styles.filterGroup}>
          <Text style={styles.groupLabel}>Time</Text>
          <TouchableOpacity
            style={styles.dropdownBox}
            onPress={() => setTimeDropdownOpen((o) => !o)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownValue}>{selectedTime}</Text>
            <ChevronDownIcon size={14} color="#71717A" />
          </TouchableOpacity>

          {timeDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {timeOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.dropdownMenuItem, selectedTime === opt && styles.dropdownMenuItemActive]}
                  onPress={() => {
                    setSelectedTime(opt);
                    setTimeDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownMenuText, selectedTime === opt && { color: colors.accent, fontWeight: "700" }]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Near Waypoints Selector */}
        <View style={styles.filterGroup}>
          <Text style={styles.groupLabel}>Near Waypoints</Text>
          <TouchableOpacity
            style={styles.dropdownBox}
            onPress={() => setWaypointDropdownOpen((o) => !o)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownValue}>{selectedWaypoint}</Text>
            <ChevronDownIcon size={14} color="#71717A" />
          </TouchableOpacity>

          {waypointDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {waypointOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.dropdownMenuItem, selectedWaypoint === opt && styles.dropdownMenuItemActive]}
                  onPress={() => {
                    setSelectedWaypoint(opt);
                    setWaypointDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownMenuText, selectedWaypoint === opt && { color: colors.accent, fontWeight: "700" }]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Sort By Selector */}
        <View style={styles.filterGroup}>
          <Text style={styles.groupLabel}>Sort By</Text>
          <TouchableOpacity
            style={styles.dropdownBox}
            onPress={() => setSortDropdownOpen((o) => !o)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownValue}>{selectedSort}</Text>
            <ChevronDownIcon size={14} color="#71717A" />
          </TouchableOpacity>

          {sortDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {sortOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.dropdownMenuItem, selectedSort === opt && styles.dropdownMenuItemActive]}
                  onPress={() => {
                    setSelectedSort(opt);
                    setSortDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownMenuText, selectedSort === opt && { color: colors.accent, fontWeight: "700" }]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Apply Filters CTA */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.88}>
            <Text style={styles.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>
          <Text style={styles.resultCountText}>82 memories found</Text>
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
  clearText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    alignItems: "center",
    justifyContent: "center",
  },
  typeBtnActive: {
    backgroundColor: "#FFF5ED",
    borderColor: colors.accent,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#71717A",
  },
  typeBtnTextActive: {
    color: colors.accent,
  },
  filterGroup: {
    marginBottom: 20,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 8,
  },
  dropdownBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownValue: {
    fontSize: 14,
    color: "#18181B",
    fontWeight: "500",
  },
  dropdownMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    marginTop: 6,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F4F5",
  },
  dropdownMenuItemActive: {
    backgroundColor: "#FFF5ED",
  },
  dropdownMenuText: {
    fontSize: 13,
    color: "#18181B",
  },
  ctaWrap: {
    marginTop: 16,
    alignItems: "center",
  },
  applyBtn: {
    width: "100%",
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  resultCountText: {
    fontSize: 12,
    color: "#71717A",
    fontWeight: "500",
  },
});
