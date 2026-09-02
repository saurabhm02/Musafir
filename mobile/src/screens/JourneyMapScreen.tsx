import React, { useState } from "react";
import {
  Dimensions,
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
import { ModeIcon, ChevronRightIcon } from "../components/TransportIcons";
import { JourneyTransitMap } from "../components/JourneyTransitMap";
import { LegDetailsModal } from "../components/LegDetailsModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "JourneyMap">;

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

function ArrowRightSmall({ size = 12 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M12 5l7 7-7 7" stroke={colors.inkMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function JourneyMapScreen({ route, navigation }: Props) {
  const { journey } = route.params;

  const [isSaved, setIsSaved] = useState(false);
  const [selectedLeg, setSelectedLeg] = useState<JourneyLeg | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLegPress = (leg: JourneyLeg) => {
    setSelectedLeg(leg);
    setModalVisible(true);
  };

  const handleHubPress = (hubIndex: number) => {
    if (hubIndex === 0 && journey.legs[0]) {
      setSelectedLeg(journey.legs[0]);
      setModalVisible(true);
    } else if (hubIndex > 0 && journey.legs[hubIndex - 1]) {
      setSelectedLeg(journey.legs[hubIndex - 1]);
      setModalVisible(true);
    }
  };

  const mapHeight = isExpanded ? SCREEN_HEIGHT * 0.8 : SCREEN_HEIGHT * 0.44;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <ArrowBackIcon size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journey Map</Text>
        <TouchableOpacity
          style={styles.bookmarkBtn}
          onPress={() => setIsSaved((p: boolean) => !p)}
          activeOpacity={0.75}
        >
          <BookmarkIcon size={20} filled={isSaved} />
        </TouchableOpacity>
      </View>

      {/* Interactive Map */}
      <View style={[styles.mapContainer, { height: mapHeight }]}>
        <JourneyTransitMap
          journey={journey}
          height={mapHeight}
          onExpandPress={() => setIsExpanded((p: boolean) => !p)}
          onHubPress={handleHubPress}
        />
      </View>

      {/* Bottom Sheet / Overview Card */}
      {!isExpanded && (
        <View style={styles.bottomCard}>
          <View style={styles.handleBar} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Header & Modes Chain */}
            <Text style={styles.sectionTitle}>Journey Route Overview</Text>

            <View style={styles.modeChainRow}>
              {journey.primaryModes.map((m, idx) => (
                <React.Fragment key={`mode-chain-${idx}`}>
                  <View style={styles.modeIconCircle}>
                    <ModeIcon mode={m} size={15} color={colors.ink} />
                  </View>
                  {idx < journey.primaryModes.length - 1 && (
                    <View style={styles.arrowWrap}>
                      <ArrowRightSmall size={12} />
                    </View>
                  )}
                </React.Fragment>
              ))}
            </View>

            {/* List of Legs */}
            <View style={styles.legsList}>
              {journey.legs.map((leg, idx) => {
                let dotColor = colors.blue;
                if (idx === 0) dotColor = colors.success;
                else if (idx === journey.legs.length - 1) dotColor = "#DC2626";
                else if (idx % 2 === 1) dotColor = colors.accent;

                return (
                  <TouchableOpacity
                    key={leg.id || `map-leg-${idx}`}
                    style={styles.legRow}
                    onPress={() => handleLegPress(leg)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.nodeDot, { backgroundColor: dotColor }]} />

                    <View style={styles.legTextCol}>
                      <Text style={styles.legTitle} numberOfLines={1}>
                        {leg.from.name.replace(/,.*$/, "")} → {leg.to.name.replace(/,.*$/, "")}
                      </Text>
                      <Text style={styles.legSubtitle} numberOfLines={1}>
                        {leg.mode === "train"
                          ? `Train (${leg.serviceName || "Express"})`
                          : leg.mode === "bus"
                          ? `Bus (${leg.operator || "HRTC Volvo"})`
                          : leg.mode === "flight"
                          ? `Flight (${leg.operator || "Domestic Airline"})`
                          : `Road (${leg.provider || "Taxi / Auto"})`}
                      </Text>
                    </View>

                    <Text style={styles.legDistance}>~{Math.round(leg.distanceKm)} km</Text>
                    <ChevronRightIcon size={16} color={colors.inkMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

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
  mapContainer: {
    width: "100%",
    backgroundColor: "#E5E7EB",
  },
  bottomCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  modeChainRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  modeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  arrowWrap: {
    paddingHorizontal: 6,
  },
  legsList: {
    gap: 12,
  },
  legRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  nodeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  legTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  legTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  legSubtitle: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  legDistance: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkMuted,
    marginRight: 6,
  },
});
