import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme";
import type { TripSummary } from "../lib/trips";
import type { Poi } from "../lib/pois";

function NavigationArrowIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11L21 3L13 21L11 13L3 11Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

function SuitcaseIcon({ size = 20, color = "#18181B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="7" width="16" height="14" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4 12H20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function PlusCircleIcon({ size = 20, color = "#18181B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ArrowRightIcon({ size = 16, color = "#9CA3AF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ArrowBackIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#18181B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type ViewState = "main" | "select_trip" | "select_day" | "create_trip";

interface Props {
  visible: boolean;
  poi: Poi;
  trips: TripSummary[];
  onClose: () => void;
  onStartNavigation: () => void;
  onAddToTripDay: (trip: TripSummary, dayNumber: number) => Promise<void>;
  onCreateNewTrip: (title: string, destination?: string, dayCount?: number) => Promise<void>;
}

export function AddToTripBottomSheet({
  visible,
  poi,
  trips,
  onClose,
  onStartNavigation,
  onAddToTripDay,
  onCreateNewTrip,
}: Props) {
  const [viewState, setViewState] = useState<ViewState>("main");
  const [selectedTrip, setSelectedTrip] = useState<TripSummary | null>(null);
  const [newTripTitle, setNewTripTitle] = useState("");
  const [newTripDays, setNewTripDays] = useState("3");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setViewState("main");
    setSelectedTrip(null);
    setNewTripTitle("");
    setNewTripDays("3");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSelectTrip = (trip: TripSummary) => {
    setSelectedTrip(trip);
    if (trip.dayCount <= 1) {
      handleConfirmDay(trip, 1);
    } else {
      setViewState("select_day");
    }
  };

  const handleConfirmDay = async (trip: TripSummary, day: number) => {
    setLoading(true);
    try {
      await onAddToTripDay(trip, day);
      handleClose();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to add to trip");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!newTripTitle.trim()) {
      Alert.alert("Title required", "Please enter a name for your trip.");
      return;
    }
    setLoading(true);
    try {
      await onCreateNewTrip(newTripTitle.trim(), poi.name, Number(newTripDays) || 1);
      handleClose();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create trip");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <SafeAreaView edges={["bottom"]} style={styles.sheet}>
              <View style={styles.handle} />

              {/* VIEW: MAIN OPTIONS */}
              {viewState === "main" && (
                <View style={styles.content}>
                  <Text style={styles.sheetTitle}>Add to Trip</Text>
                  <Text style={styles.sheetSubtitle}>Choose how you want to explore {poi.name}</Text>

                  {/* Primary Option: Start Navigation */}
                  <TouchableOpacity
                    style={styles.primaryNavBtn}
                    onPress={() => {
                      handleClose();
                      onStartNavigation();
                    }}
                    activeOpacity={0.88}
                  >
                    <View style={styles.navIconCircle}>
                      <NavigationArrowIcon size={18} />
                    </View>
                    <View style={styles.navBtnTextCol}>
                      <Text style={styles.navBtnTitle}>Start Navigation</Text>
                      <Text style={styles.navBtnSub}>Get live route and directions now</Text>
                    </View>
                    <ArrowRightIcon size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Option 2: Add to Existing Trip */}
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={() => setViewState("select_trip")}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.optionIconWrap, { backgroundColor: "#EFF6FF" }]}>
                      <SuitcaseIcon size={20} color="#2563EB" />
                    </View>
                    <View style={styles.optionTextCol}>
                      <Text style={styles.optionTitle}>Add to existing trip</Text>
                      <Text style={styles.optionSub}>
                        {trips.length > 0 ? `${trips.length} active trip${trips.length === 1 ? "" : "s"} available` : "Select from your planned trips"}
                      </Text>
                    </View>
                    <ArrowRightIcon size={18} />
                  </TouchableOpacity>

                  {/* Option 3: Create New Trip */}
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={() => setViewState("create_trip")}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.optionIconWrap, { backgroundColor: "#F3F4F6" }]}>
                      <PlusCircleIcon size={20} color="#18181B" />
                    </View>
                    <View style={styles.optionTextCol}>
                      <Text style={styles.optionTitle}>Create new trip</Text>
                      <Text style={styles.optionSub}>Start a brand new itinerary with this place</Text>
                    </View>
                    <ArrowRightIcon size={18} />
                  </TouchableOpacity>
                </View>
              )}

              {/* VIEW: SELECT EXISTING TRIP */}
              {viewState === "select_trip" && (
                <View style={styles.content}>
                  <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => setViewState("main")} style={styles.backBtn} activeOpacity={0.7}>
                      <ArrowBackIcon size={18} />
                    </TouchableOpacity>
                    <Text style={styles.viewTitle}>Choose a Trip</Text>
                    <View style={{ width: 32 }} />
                  </View>

                  {trips.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No existing trips found.</Text>
                      <TouchableOpacity
                        style={styles.emptyActionBtn}
                        onPress={() => setViewState("create_trip")}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.emptyActionText}>+ Create a New Trip</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <ScrollView style={styles.tripList} showsVerticalScrollIndicator={false}>
                      {trips.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={styles.tripItem}
                          onPress={() => handleSelectTrip(t)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.tripItemInfo}>
                            <Text style={styles.tripItemTitle}>{t.title}</Text>
                            <Text style={styles.tripItemMeta}>
                              {t.dayCount} Day{t.dayCount === 1 ? "" : "s"} • {t.placeCount} Places
                            </Text>
                          </View>
                          <ArrowRightIcon size={18} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* VIEW: SELECT DAY */}
              {viewState === "select_day" && selectedTrip && (
                <View style={styles.content}>
                  <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => setViewState("select_trip")} style={styles.backBtn} activeOpacity={0.7}>
                      <ArrowBackIcon size={18} />
                    </TouchableOpacity>
                    <Text style={styles.viewTitle}>Which Day?</Text>
                    <View style={{ width: 32 }} />
                  </View>
                  <Text style={styles.sheetSubtitle}>Add to "{selectedTrip.title}"</Text>

                  {loading ? (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="large" color={colors.accent} />
                    </View>
                  ) : (
                    <View style={styles.dayGrid}>
                      {Array.from({ length: selectedTrip.dayCount }, (_, i) => i + 1).map((day) => (
                        <TouchableOpacity
                          key={day}
                          style={styles.dayCard}
                          onPress={() => handleConfirmDay(selectedTrip, day)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.dayCardTitle}>Day {day}</Text>
                          <Text style={styles.dayCardSub}>Add Stop</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* VIEW: CREATE NEW TRIP */}
              {viewState === "create_trip" && (
                <View style={styles.content}>
                  <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => setViewState("main")} style={styles.backBtn} activeOpacity={0.7}>
                      <ArrowBackIcon size={18} />
                    </TouchableOpacity>
                    <Text style={styles.viewTitle}>Create New Trip</Text>
                    <View style={{ width: 32 }} />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Trip Title</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Himachal Summer Journey"
                      placeholderTextColor="#9CA3AF"
                      value={newTripTitle}
                      onChangeText={setNewTripTitle}
                      autoFocus
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Duration (Days)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="3"
                      placeholderTextColor="#9CA3AF"
                      value={newTripDays}
                      onChangeText={setNewTripDays}
                      keyboardType="number-pad"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleCreateTrip}
                    disabled={loading}
                    activeOpacity={0.88}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Create & Add {poi.name}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </SafeAreaView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 16,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 16,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.4,
  },
  sheetSubtitle: {
    fontSize: 13.5,
    color: "#71717A",
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 18,
  },
  primaryNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  navIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  navBtnTextCol: {
    flex: 1,
  },
  navBtnTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  navBtnSub: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 1,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAF8",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18181B",
  },
  optionSub: {
    fontSize: 12,
    color: "#71717A",
    fontWeight: "500",
    marginTop: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  viewTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181B",
  },
  tripList: {
    maxHeight: 280,
  },
  tripItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FAFAF8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  tripItemInfo: {
    flex: 1,
  },
  tripItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18181B",
  },
  tripItemMeta: {
    fontSize: 12,
    color: "#71717A",
    marginTop: 2,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#71717A",
    marginBottom: 14,
  },
  emptyActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.accentSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  emptyActionText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.accent,
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 10,
  },
  dayCard: {
    width: "47.5%",
    backgroundColor: "#FAFAF8",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  dayCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#18181B",
  },
  dayCardSub: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#FAFAF8",
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    color: "#18181B",
    fontWeight: "500",
  },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: "center",
  },
});
