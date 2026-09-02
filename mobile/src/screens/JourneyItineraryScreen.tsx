import React, { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import type { JourneyLeg } from "../lib/journeys";
import { colors } from "../theme";
import {
  ModeIcon,
  ClockIcon,
  RupeeIcon,
  MapIcon,
  ExternalLinkIcon,
} from "../components/TransportIcons";
import { LegDetailsModal } from "../components/LegDetailsModal";

type Props = NativeStackScreenProps<RootStackParamList, "JourneyItinerary">;

function ArrowBackIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={colors.ink}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookmarkIcon({ size = 20, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
        stroke={colors.ink}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? colors.accent : "none"}
      />
    </Svg>
  );
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `~${h}h${m > 0 ? ` ${m}m` : ""}`;
}

export function JourneyItineraryScreen({ route, navigation }: Props) {
  const { journey, trek, trailhead, origin } = route.params;

  const [isSaved, setIsSaved] = useState(false);
  const [selectedLeg, setSelectedLeg] = useState<JourneyLeg | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleLegPress = (leg: JourneyLeg) => {
    setSelectedLeg(leg);
    setModalVisible(true);
  };

  const handleBookOptionsPress = () => {
    // Open the primary/longest leg in the journey (e.g. train, flight, or bus)
    const primaryLeg =
      journey.legs.find((l) => l.mode === "train" || l.mode === "flight" || l.mode === "bus") ||
      journey.legs[0];
    if (primaryLeg) {
      setSelectedLeg(primaryLeg);
      setModalVisible(true);
    }
  };

  let badgeBg = colors.accentSoft;
  let badgeColor = colors.accent;

  if (journey.strategy === "fastest") {
    badgeBg = "#FEE2E2";
    badgeColor = "#DC2626";
  } else if (journey.strategy === "cheapest") {
    badgeBg = colors.successBg;
    badgeColor = colors.success;
  } else if (journey.strategy === "train_focused") {
    badgeBg = colors.blueBg;
    badgeColor = colors.blue;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <ArrowBackIcon size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journey Itinerary</Text>
        <TouchableOpacity
          style={styles.bookmarkBtn}
          onPress={() => setIsSaved((p: boolean) => !p)}
          activeOpacity={0.75}
        >
          <BookmarkIcon size={20} filled={isSaved} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Badge */}
        <View style={[styles.badgePill, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{journey.badge}</Text>
        </View>

        {/* Route Chain Title */}
        <Text style={styles.journeyTitle}>{journey.title}</Text>

        {/* 3-Stat Summary Box */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <View style={styles.statLabelRow}>
              <ClockIcon size={13} color={colors.inkMuted} />
              <Text style={styles.statLabel}>Total Duration</Text>
            </View>
            <Text style={styles.statValue}>{formatDuration(journey.totalDurationMins)}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Total Legs</Text>
            <Text style={styles.statValue}>{journey.legs.length}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <View style={styles.statLabelRow}>
              <RupeeIcon size={13} color={colors.inkMuted} />
              <Text style={styles.statLabel}>Est. Cost (per person)</Text>
            </View>
            <Text style={[styles.statValue, styles.costValue]}>
              ₹ {journey.totalCostInr.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        {/* Vertical Transport Timeline */}
        <View style={styles.timelineContainer}>
          {journey.legs.map((leg, idx) => {
            const isLast = idx === journey.legs.length - 1;
            const hours = Math.floor(leg.durationMins / 60);
            const mins = leg.durationMins % 60;
            const legDur = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim() : `${mins}m`;

            let modeBg = "#F3F4F6";
            let iconColor = colors.ink;
            if (leg.mode === "train") {
              modeBg = "#ECFDF5";
              iconColor = "#059669";
            } else if (leg.mode === "bus") {
              modeBg = "#EFF6FF";
              iconColor = "#2563EB";
            } else if (leg.mode === "flight") {
              modeBg = "#F5F3FF";
              iconColor = "#7C3AED";
            } else if (leg.mode === "cab") {
              modeBg = "#FFF7ED";
              iconColor = colors.accent;
            }

            return (
              <TouchableOpacity
                key={leg.id || `leg-${idx}`}
                style={styles.timelineRow}
                onPress={() => handleLegPress(leg)}
                activeOpacity={0.8}
              >
                {/* Left Node & Vertical Line */}
                <View style={styles.nodeCol}>
                  <View style={[styles.nodeCircle, { backgroundColor: modeBg }]}>
                    <ModeIcon mode={leg.mode} size={16} color={iconColor} />
                  </View>
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                {/* Right Content Col */}
                <View style={[styles.legContentCol, !isLast && styles.legContentWithGap]}>
                  <View style={styles.legMainRow}>
                    <View style={styles.legTitleCol}>
                      <Text style={styles.legFromTo} numberOfLines={1}>
                        {leg.from.code ? `${leg.from.name} (${leg.from.code})` : leg.from.name} →{" "}
                        {leg.to.code ? `${leg.to.name} (${leg.to.code})` : leg.to.name}
                      </Text>
                      <Text style={styles.legSubtitle} numberOfLines={1}>
                        {leg.serviceName || leg.operator || "Transfer"}
                      </Text>
                    </View>

                    <View style={styles.legMetricsCol}>
                      <Text style={styles.legDurationText}>{legDur}</Text>
                      <Text style={styles.legDistanceText}>~{Math.round(leg.distanceKm)} km</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Primary CTA: View on Map */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("JourneyMap", { journey, trek, trailhead, origin })}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryBtnText}>View on Map</Text>
          <MapIcon size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Secondary CTA: View Details & Book Options */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleBookOptionsPress}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>View Details & Book Options</Text>
          <ExternalLinkIcon size={16} color={colors.ink} />
        </TouchableOpacity>
      </ScrollView>

      {/* Leg Details Modal */}
      <LegDetailsModal
        visible={modalVisible}
        leg={selectedLeg}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F3",
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  bookmarkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  badgePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  journeyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 28,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statLabel: {
    fontSize: 10.5,
    color: colors.inkMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.ink,
  },
  costValue: {
    color: colors.accent,
  },
  statDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
  },
  timelineContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  timelineRow: {
    flexDirection: "row",
  },
  nodeCol: {
    width: 36,
    alignItems: "center",
  },
  nodeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  legContentCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  legContentWithGap: {
    paddingBottom: 24,
  },
  legMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  legTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  legFromTo: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.2,
  },
  legSubtitle: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2.5,
  },
  legMetricsCol: {
    alignItems: "flex-end",
  },
  legDurationText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.ink,
  },
  legDistanceText: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  secondaryBtnText: {
    color: colors.ink,
    fontSize: 14.5,
    fontWeight: "700",
  },
});
