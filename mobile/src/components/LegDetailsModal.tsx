import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Linking,
  ScrollView,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../theme";
import type { JourneyLeg } from "../lib/journeys";
import { ModeIcon, ExternalLinkIcon } from "./TransportIcons";

interface Props {
  visible: boolean;
  leg: JourneyLeg | null;
  onClose: () => void;
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={colors.inkSoft}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={colors.success}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LegDetailsModal({ visible, leg, onClose }: Props) {
  if (!leg) return null;

  const mode = leg.mode;
  let modeBg = "#EFF6FF";
  let modeColor = colors.blue;
  let classLabel = "General / Standard";
  let bookingActionLabel = "View Options ↗";

  if (mode === "train") {
    modeBg = "#ECFDF5";
    modeColor = "#059669";
    classLabel = "Sleeper / 3AC";
    bookingActionLabel = "View on IRCTC";
  } else if (mode === "bus") {
    modeBg = "#EFF6FF";
    modeColor = "#2563EB";
    classLabel = "Volvo AC Sleeper";
    bookingActionLabel = "View on RedBus";
  } else if (mode === "flight") {
    modeBg = "#F5F3FF";
    modeColor = "#7C3AED";
    classLabel = "Economy";
    bookingActionLabel = "Search on Google Flights";
  } else if (mode === "cab") {
    modeBg = "#FFF7ED";
    modeColor = colors.accent;
    classLabel = "Private / Shared Taxi";
    bookingActionLabel = "Find Local Cab";
  } else if (mode === "local_transit") {
    modeBg = "#FEF3C7";
    modeColor = "#D97706";
    classLabel = "Mountain Shuttle / HRTC";
    bookingActionLabel = "Check Local Timings";
  }

  const hours = Math.floor(leg.durationMins / 60);
  const mins = leg.durationMins % 60;
  const durationText = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim() : `${mins}m`;

  const handleBookingPress = () => {
    if (leg.bookingUrl) {
      Linking.openURL(leg.bookingUrl).catch(() => {});
    } else if (mode === "train") {
      Linking.openURL("https://www.irctc.co.in").catch(() => {});
    } else if (mode === "bus") {
      Linking.openURL("https://www.redbus.in").catch(() => {});
    } else if (mode === "flight") {
      Linking.openURL("https://www.google.com/travel/flights").catch(() => {});
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              <View style={styles.handleBar} />

              <View style={styles.headerRow}>
                <View style={[styles.modeIconWrap, { backgroundColor: modeBg }]}>
                  <ModeIcon mode={mode} size={24} color={modeColor} />
                </View>
                <View style={styles.headerTextCol}>
                  <Text style={styles.title} numberOfLines={1}>
                    {leg.from.code ? `${leg.from.name} (${leg.from.code})` : leg.from.name} →{" "}
                    {leg.to.code ? `${leg.to.name} (${leg.to.code})` : leg.to.name}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {leg.serviceName || leg.operator || "Transport Connection"}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                  <CloseIcon size={18} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Badges Row */}
                <View style={styles.badgesRow}>
                  <View style={[styles.classPill, { backgroundColor: modeBg }]}>
                    <Text style={[styles.classText, { color: modeColor }]}>{classLabel}</Text>
                  </View>
                  {leg.operator ? (
                    <View style={styles.operatorBadge}>
                      <Text style={styles.operatorText}>{leg.operator}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Details Grid */}
                <View style={styles.gridContainer}>
                  <View style={styles.gridRow}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Departure</Text>
                      <Text style={styles.gridValue}>
                        {leg.departureTime ? `${leg.departureTime}` : "Scheduled"}
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Arrival</Text>
                      <Text style={styles.gridValue}>
                        {leg.arrivalTime ? `${leg.arrivalTime}` : "Estimated"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.gridRow}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Duration</Text>
                      <Text style={styles.gridValue}>{durationText}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Distance</Text>
                      <Text style={styles.gridValue}>~{Math.round(leg.distanceKm)} km</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.gridRow}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Est. Cost (per person)</Text>
                      <Text style={[styles.gridValue, styles.costValue]}>
                        {leg.estimatedCostInr > 0 ? `₹ ${leg.estimatedCostInr}` : "Local Fare"}
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Data Status</Text>
                      <View style={styles.statusRow}>
                        <Text
                          style={[
                            styles.statusText,
                            leg.dataStatus === "scheduled" || leg.dataStatus === "live"
                              ? styles.statusSuccess
                              : styles.statusEstimated,
                          ]}
                        >
                          {leg.dataStatus === "scheduled"
                            ? "Scheduled"
                            : leg.dataStatus === "live"
                            ? "Live"
                            : "Estimated"}
                        </Text>
                        {leg.dataStatus === "scheduled" || leg.dataStatus === "live" ? (
                          <CheckIcon size={13} />
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Instructions Box */}
                {leg.instructions ? (
                  <View style={styles.instructionBox}>
                    <Text style={styles.instructionText}>{leg.instructions}</Text>
                  </View>
                ) : null}

                {/* Booking / Action Button */}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleBookingPress}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionBtnText}>{bookingActionLabel}</Text>
                  <ExternalLinkIcon size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  handleBar: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modeIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 10,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  classPill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  classText: {
    fontSize: 12,
    fontWeight: "700",
  },
  operatorBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  operatorText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  gridContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gridItem: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 12,
    color: colors.inkMuted,
    fontWeight: "500",
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  costValue: {
    color: colors.accent,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusSuccess: {
    color: colors.success,
  },
  statusEstimated: {
    color: colors.warning,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  instructionBox: {
    backgroundColor: colors.accentSoft,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: 18,
  },
  instructionText: {
    fontSize: 12.5,
    color: colors.ink,
    lineHeight: 18,
  },
  actionBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
