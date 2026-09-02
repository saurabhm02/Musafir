import React, { useState } from "react";
import {
  Alert,
  Dimensions,
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
import { colors } from "../theme";
import { TrekRouteMap } from "../components/TrekRouteMap";
import { OfflineTrekBadge } from "../components/OfflineTrekBadge";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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

function BookmarkIcon({ size = 20, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? colors.accent : "none"}>
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
        stroke={filled ? colors.accent : "#18181B"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WaypointLocationPin({
  color = "#16A34A",
  isStart = false,
  isEnd = false,
}: {
  color?: string;
  isStart?: boolean;
  isEnd?: boolean;
}) {
  return (
    <View style={styles.waypointIconWrap}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 21C16 17 20 13.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13.4183 8 17 12 21Z"
          fill={isStart ? "#16A34A" : isEnd ? "#DC2626" : color}
        />
        <Circle cx="12" cy="9" r="3.5" fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "RoutePreview">;

export function RoutePreviewScreen({ route, navigation }: Props) {
  const { trekId, trekName, route: trekRoute } = route.params;
  const [isSaved, setIsSaved] = useState(false);

  const isMusafir = trekRoute.verificationStatus === "musafir_verified";
  const isCommunity = trekRoute.verificationStatus === "community_verified";

  const badgeBg = isMusafir ? "#DCFCE7" : isCommunity ? "#EFF6FF" : "#FFF7ED";
  const badgeColor = isMusafir ? "#16A34A" : isCommunity ? "#2563EB" : "#EA580C";
  const badgeText = isMusafir ? "Musafir Verified" : isCommunity ? "Community Verified" : "Pending Verification";

  const routeTypeLabel =
    trekRoute.routeType === "out_and_back"
      ? "Out & Back"
      : trekRoute.routeType === "loop"
      ? "Loop"
      : "Point to Point";

  const waypoints = trekRoute.waypoints || [];

  function handleContinue() {
    navigation.navigate("ReachTrailhead", {
      trekId,
      trekName,
      routeId: trekRoute.id,
      trailheadName: trekRoute.startPointName || undefined,
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

        <Text style={styles.headerTitle}>Route Preview</Text>

        <TouchableOpacity
          style={styles.bookmarkBtn}
          onPress={() => setIsSaved((p) => !p)}
          activeOpacity={0.8}
        >
          <BookmarkIcon size={20} filled={isSaved} />
        </TouchableOpacity>
      </View>

      {/* Interactive Map Area */}
      <View style={styles.mapContainer}>
        <TrekRouteMap
          coordinates={trekRoute.geometry?.coordinates}
          waypoints={waypoints}
          verificationStatus={trekRoute.verificationStatus}
          height={SCREEN_HEIGHT * 0.42}
          showWaypointLabels={true}
        />
      </View>

      {/* Route Info Card Bottom Sheet */}
      <View style={styles.bottomCard}>
        <View style={styles.handleBar} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Badge */}
          <View style={[styles.badgePill, { backgroundColor: badgeBg }]}>
            <View style={[styles.badgeDot, { backgroundColor: badgeColor }]} />
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
          </View>

          {/* Route Title */}
          <Text style={styles.routeTitle}>{trekRoute.name}</Text>

          {/* Key Metrics */}
          <Text style={styles.routeMetrics}>
            {trekRoute.distanceKm ? `${trekRoute.distanceKm} km` : ""}
            {trekRoute.elevationGainM ? `  •  +${trekRoute.elevationGainM} m` : ""}
            {trekRoute.elevationLossM ? `  •  -${Math.abs(Number(trekRoute.elevationLossM))} m` : ""}
          </Text>
          <Text style={styles.routeSubMetrics}>
            Moderate  •  {routeTypeLabel}
          </Text>

          {/* Offline Download Badge */}
          <View style={{ marginTop: 12, marginBottom: 8 }}>
            <OfflineTrekBadge
              trekId={trekId}
              routeId={trekRoute.id}
              trekName={trekName}
            />
          </View>

          {/* Waypoints Section */}
          <View style={styles.waypointsSection}>
            <Text style={styles.waypointsHeader}>
              Waypoints ({waypoints.length || (trekRoute.startPointName ? 2 : 1)})
            </Text>

            <View style={styles.waypointsList}>
              {waypoints.length > 0 ? (
                waypoints.map((wp, idx) => {
                  const isStart = idx === 0;
                  const isEnd = idx === waypoints.length - 1;
                  return (
                    <View key={wp.id || idx} style={styles.waypointRow}>
                      <WaypointLocationPin isStart={isStart} isEnd={isEnd} />
                      <View style={styles.waypointTextCol}>
                        <Text style={styles.waypointName}>
                          {wp.name}
                          {isStart ? " – Start" : isEnd ? " – End" : ""}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <>
                  <View style={styles.waypointRow}>
                    <WaypointLocationPin isStart={true} />
                    <View style={styles.waypointTextCol}>
                      <Text style={styles.waypointName}>
                        {trekRoute.startPointName || "Trailhead Start Point"} – Start
                      </Text>
                    </View>
                  </View>
                  <View style={styles.waypointRow}>
                    <WaypointLocationPin isEnd={true} />
                    <View style={styles.waypointTextCol}>
                      <Text style={styles.waypointName}>
                        {trekRoute.endPointName || "Summit / Destination"} – End
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Spacing for button */}
          <View style={{ height: 90 }} />
        </ScrollView>

        {/* Bottom Floating CTA */}
        <View style={styles.ctaBottomWrap}>
          <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.88}>
            <Text style={styles.continueBtnText}>Continue</Text>
            <Text style={styles.continueArrow}>→</Text>
          </TouchableOpacity>
          <Text style={styles.continueCaption}>Next: How to reach trailhead</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    zIndex: 10,
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
  bookmarkBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  mapContainer: {
    height: SCREEN_HEIGHT * 0.42,
    width: "100%",
  },
  bottomCard: {
    flex: 1,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    position: "relative",
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
    marginBottom: 8,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  routeMetrics: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkSoft,
    marginBottom: 2,
  },
  routeSubMetrics: {
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 16,
  },
  waypointsSection: {
    marginTop: 4,
  },
  waypointsHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 12,
  },
  waypointsList: {
    gap: 12,
  },
  waypointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  waypointIconWrap: {
    width: 24,
    alignItems: "center",
  },
  waypointTextCol: {
    flex: 1,
  },
  waypointName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  ctaBottomWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.paper,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "center",
  },
  continueBtn: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  continueArrow: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  continueCaption: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 6,
  },
});
