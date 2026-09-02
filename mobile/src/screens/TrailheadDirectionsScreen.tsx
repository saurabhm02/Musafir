import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import * as Location from "expo-location";
import {
  Map as MapView,
  Camera,
  GeoJSONSource,
  Layer,
  Marker,
  type CameraRef,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { colors } from "../theme";
import { ModeIcon } from "../components/TransportIcons";
import { CompassNavIcon } from "../components/TrekTrackingIcons";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Props = NativeStackScreenProps<RootStackParamList, "TrailheadDirections">;

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

function TrailheadPin({ label }: { label: string }) {
  return (
    <View style={styles.pinWrap}>
      <View style={styles.pinBubble}>
        <Text style={styles.pinBubbleText} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.pinIconCircle}>
        <View style={styles.pinInnerDot} />
      </View>
    </View>
  );
}

function UserLocationPuck() {
  return (
    <View style={styles.userPuckOuter}>
      <View style={styles.userPuckInner} />
    </View>
  );
}

export function TrailheadDirectionsScreen({ route, navigation }: Props) {
  const {
    trekId,
    trekName,
    route: trekRoute,
    trailheadName = "Jalori Pass",
    trailheadLat = 31.5348,
    trailheadLon = 77.378,
    distanceM = 2400,
  } = route.params;

  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);

  const [userCoord, setUserCoord] = useState<[number, number]>([
    trailheadLon - 0.015,
    trailheadLat - 0.012,
  ]);

  useEffect(() => {
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then((loc) => {
        setUserCoord([loc.coords.longitude, loc.coords.latitude]);
      })
      .catch(() => {});
  }, []);

  const trailheadCoord: [number, number] = [trailheadLon, trailheadLat];

  // Bounding box
  const minLng = Math.min(userCoord[0], trailheadCoord[0]);
  const maxLng = Math.max(userCoord[0], trailheadCoord[0]);
  const minLat = Math.min(userCoord[1], trailheadCoord[1]);
  const maxLat = Math.max(userCoord[1], trailheadCoord[1]);
  const bounds: [number, number, number, number] = [minLng, minLat, maxLng, maxLat];

  useEffect(() => {
    cameraRef.current?.fitBounds(bounds, {
      padding: { top: 60, bottom: 60, left: 60, right: 60 },
      duration: 800,
    });
  }, [userCoord]);

  // Road geometry LineString
  const intermediatePt: [number, number] = [
    (userCoord[0] + trailheadCoord[0]) / 2 + 0.003,
    (userCoord[1] + trailheadCoord[1]) / 2 - 0.002,
  ];

  const roadGeoJSON = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: [userCoord, intermediatePt, trailheadCoord],
    },
  };

  const distKm = (distanceM / 1000).toFixed(1);
  const estMins = Math.max(8, Math.round(Number(distKm) * 5));

  const handleArrivalOverride = () => {
    navigation.navigate("TrailheadArrival", {
      trekId,
      trekName,
      route: trekRoute,
      trailheadName,
      trailheadLat,
      trailheadLon,
      forceArrival: true,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <ArrowBackIcon size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trailhead Directions</Text>
        <View style={styles.placeholderBtn} />
      </View>

      {/* Top Proximity Banner */}
      <View style={styles.topBanner}>
        <View style={styles.compassCircle}>
          <CompassNavIcon size={18} color={colors.accent} />
        </View>
        <View style={styles.bannerTextCol}>
          <Text style={styles.bannerTitle}>
            You're {distKm} km away from {trailheadName} Trailhead
          </Text>
          <Text style={styles.bannerSubtitle}>
            Follow the suggested route to reach the trailhead.
          </Text>
        </View>
      </View>

      {/* Interactive Directions Map */}
      <View style={styles.mapContainer}>
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE}>
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: [(userCoord[0] + trailheadCoord[0]) / 2, (userCoord[1] + trailheadCoord[1]) / 2],
              zoom: 13,
            }}
          />

          {/* Road Route */}
          <GeoJSONSource id="trailhead-road-source" data={roadGeoJSON}>
            <Layer
              id="road-halo"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#FFFFFF", "line-width": 6 }}
            />
            <Layer
              id="road-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": colors.accent,
                "line-width": 3.8,
                "line-dasharray": [2, 1.5],
              }}
            />
          </GeoJSONSource>

          {/* User Location */}
          <Marker lngLat={userCoord} anchor="center">
            <UserLocationPuck />
          </Marker>

          {/* Trailhead Marker */}
          <Marker lngLat={trailheadCoord} anchor="center">
            <TrailheadPin label={trailheadName} />
          </Marker>
        </MapView>
      </View>

      {/* Bottom Route Card */}
      <View style={styles.bottomCard}>
        <View style={styles.routeModeRow}>
          <View style={styles.modeIconCircle}>
            <ModeIcon mode="cab" size={18} color={colors.ink} />
          </View>
          <View style={styles.routeModeTextCol}>
            <Text style={styles.routeModeTitle}>
              Drive / Taxi  •  ~{estMins} min ({distKm} km)
            </Text>
            <Text style={styles.routeModeSubtitle}>Via {trailheadName} Road</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleArrivalOverride}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryBtnText}>Continue to Trailhead</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleArrivalOverride}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>I've Reached Trailhead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F3",
  },
  header: {
    height: 48,
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
  placeholderBtn: {
    width: 36,
  },
  topBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  compassCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.ink,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 1,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  routeModeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  routeModeTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  routeModeTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.ink,
  },
  routeModeSubtitle: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 1,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "800",
  },
  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondaryBtnText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  pinWrap: {
    alignItems: "center",
  },
  pinBubble: {
    backgroundColor: "rgba(24, 24, 27, 0.88)",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    marginBottom: 3,
  },
  pinBubbleText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  pinIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pinInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  userPuckOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(37, 99, 235, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  userPuckInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.blue,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
