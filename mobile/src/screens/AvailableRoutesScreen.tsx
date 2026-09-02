import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";
import type { RootStackParamList } from "../navigation";
import { fetchTrekRoutes, type TrekRouteItem } from "../lib/treks";
import { colors } from "../theme";
import { MiniRouteMap } from "../components/MiniRouteMap";

function ArrowBackIcon({ size = 20 }: { size?: number }) {
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

function InfoIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke="#18181B" strokeWidth={2} />
      <Path d="M12 8h.01M12 11v5" stroke="#18181B" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "AvailableRoutes">;

export function AvailableRoutesScreen({ route, navigation }: Props) {
  const { trekId, trekName, initialRouteId } = route.params;
  const [routes, setRoutes] = useState<TrekRouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(initialRouteId || null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchTrekRoutes(trekId, true)
      .then((data) => {
        if (!isMounted) return;
        setRoutes(data);
        if (!selectedRouteId && data.length > 0) {
          const primary = data.find((r) => r.isPrimary) || data[0];
          setSelectedRouteId(primary.id);
        }
      })
      .catch((err) => {
        console.warn("Failed to load trek routes:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [trekId]);

  function handleSelectRoute(r: TrekRouteItem) {
    if (r.verificationStatus === "pending" || r.verificationStatus === "rejected") {
      Alert.alert(
        "Unverified Community Route",
        "This trail was submitted by a traveler and is currently awaiting field verification by our team. It cannot be used as a trusted navigation trail yet.",
        [{ text: "Understood" }]
      );
      return;
    }

    setSelectedRouteId(r.id);
    navigation.navigate("RoutePreview", {
      trekId,
      trekName,
      routeId: r.id,
      route: r,
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowBackIcon size={20} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Available Routes</Text>

        <TouchableOpacity style={styles.infoBtn} onPress={() => setInfoModalOpen(true)} activeOpacity={0.8}>
          <InfoIcon size={20} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Instructions Banner */}
          <View style={styles.instructionsBanner}>
            <Text style={styles.instructionsTitle}>Choose a verified route to continue</Text>
            <Text style={styles.instructionsSubtitle}>
              Routes are created by our team and verified by the community.
            </Text>
          </View>

          {/* Routes List */}
          <View style={styles.routesList}>
            {routes.map((r) => {
              const isSelected = selectedRouteId === r.id;
              const isMusafir = r.verificationStatus === "musafir_verified";
              const isCommunity = r.verificationStatus === "community_verified";
              const isPending = r.verificationStatus === "pending";

              let badgeBg = "#DCFCE7";
              let badgeColor = "#16A34A";
              let badgeLabel = "Musafir Verified";
              let mapColor = colors.success;

              if (isCommunity) {
                badgeBg = "#EFF6FF";
                badgeColor = "#2563EB";
                badgeLabel = "Community Verified";
                mapColor = colors.blue;
              } else if (isPending) {
                badgeBg = "#FFF7ED";
                badgeColor = "#EA580C";
                badgeLabel = "Community Route (Pending)";
                mapColor = colors.warning;
              }

              const routeTypeLabel =
                r.routeType === "out_and_back"
                  ? "Out & Back"
                  : r.routeType === "loop"
                  ? "Loop"
                  : "Point to Point";

              return (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.routeCard,
                    isSelected && styles.routeCardSelected,
                    isPending && styles.routeCardPending,
                  ]}
                  activeOpacity={0.88}
                  onPress={() => handleSelectRoute(r)}
                >
                  <View style={styles.routeCardLeft}>
                    {/* Badge */}
                    <View style={[styles.badgePill, { backgroundColor: badgeBg }]}>
                      <View style={[styles.badgeDot, { backgroundColor: badgeColor }]} />
                      <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.routeName} numberOfLines={2}>
                      {r.name}
                    </Text>

                    {/* Stats */}
                    {isPending ? (
                      <View style={styles.pendingInfoWrap}>
                        <Text style={styles.pendingStatsText}>
                          {r.distanceKm ? `${r.distanceKm} km • ` : ""}
                          {r.elevationGainM ? `+${r.elevationGainM} m` : ""}
                        </Text>
                        <Text style={styles.pendingNoticeText}>
                          Awaiting review. Not available for navigation.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.routeStatsCol}>
                        <Text style={styles.routeStatsText}>
                          {r.distanceKm ? `${r.distanceKm} km` : ""}
                          {r.elevationGainM ? `  •  +${r.elevationGainM} m` : ""}
                          {r.elevationLossM ? `  •  -${Math.abs(Number(r.elevationLossM))} m` : ""}
                        </Text>
                        <Text style={styles.routeSubStatsText}>
                          Moderate  •  {routeTypeLabel}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Mini Map Thumbnail */}
                  <View style={styles.routeCardRight}>
                    <MiniRouteMap
                      coordinates={r.geometry?.coordinates}
                      color={mapColor}
                      isDashed={isPending}
                      width={92}
                      height={92}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Badges Explanation Card */}
          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>What do these badges mean?</Text>

            <View style={styles.explanationItem}>
              <View style={[styles.explanationDot, { backgroundColor: "#16A34A" }]} />
              <View style={styles.explanationCol}>
                <Text style={styles.explanationBadgeName}>Musafir Verified</Text>
                <Text style={styles.explanationBadgeDesc}>
                  Verified by Musafir team with exact GPS ground mapping
                </Text>
              </View>
            </View>

            <View style={styles.explanationItem}>
              <View style={[styles.explanationDot, { backgroundColor: "#2563EB" }]} />
              <View style={styles.explanationCol}>
                <Text style={styles.explanationBadgeName}>Community Verified</Text>
                <Text style={styles.explanationBadgeDesc}>
                  Verified after thorough review and multiple user GPX logs
                </Text>
              </View>
            </View>

            <View style={styles.explanationItem}>
              <View style={[styles.explanationDot, { backgroundColor: "#EA580C" }]} />
              <View style={styles.explanationCol}>
                <Text style={styles.explanationBadgeName}>Pending</Text>
                <Text style={styles.explanationBadgeDesc}>
                  Under editorial review and not recommended for live navigation
                </Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Info Modal */}
      <Modal visible={infoModalOpen} transparent animationType="fade" onRequestClose={() => setInfoModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Multi-Route Trekking</Text>
            <Text style={styles.modalBody}>
              Many Himalayan peaks and trails offer multiple distinct routes (e.g. Ridge ascent, Valley trail, Winter path).
              {"\n\n"}
              Musafir preserves all routes independently so you can choose the path that matches your schedule, season, and fitness level.
            </Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setInfoModalOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
  },
  infoBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  instructionsBanner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  instructionsSubtitle: {
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 4,
    lineHeight: 18,
  },
  routesList: {
    gap: 14,
    marginBottom: 24,
  },
  routeCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  routeCardSelected: {
    borderColor: colors.accent,
    backgroundColor: "#FFFDFB",
  },
  routeCardPending: {
    borderColor: "#FDBA74",
    backgroundColor: "#FFFDF8",
  },
  routeCardLeft: {
    flex: 1,
    paddingRight: 12,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
    marginBottom: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  routeName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 20,
    marginBottom: 6,
  },
  routeStatsCol: {
    gap: 2,
  },
  routeStatsText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  routeSubStatsText: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  pendingInfoWrap: {
    gap: 2,
  },
  pendingStatsText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  pendingNoticeText: {
    fontSize: 11,
    color: "#D97706",
    fontStyle: "italic",
    marginTop: 2,
  },
  routeCardRight: {
    width: 92,
    height: 92,
  },
  explanationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 14,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 2,
  },
  explanationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  explanationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  explanationCol: {
    flex: 1,
  },
  explanationBadgeName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  explanationBadgeDesc: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 1,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
    marginBottom: 20,
  },
  modalCloseBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
