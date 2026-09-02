import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import {
  Map as MapView,
  Camera,
  GeoJSONSource,
  Layer,
  Marker,
  type CameraRef,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import type { TrekWaypoint, VerificationStatus } from "../lib/treks";
import { colors } from "../theme";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

interface Props {
  coordinates?: [number, number][];
  waypoints?: TrekWaypoint[];
  verificationStatus?: VerificationStatus;
  height?: number;
  interactive?: boolean;
  onExpandPress?: () => void;
  showWaypointLabels?: boolean;
}

function boundsOf(coordinates: [number, number][]): [number, number, number, number] {
  let west = coordinates[0][0],
    east = coordinates[0][0];
  let south = coordinates[0][1],
    north = coordinates[0][1];
  for (const [lng, lat] of coordinates) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return [west, south, east, north];
}

function ExpandIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
        stroke="#18181B"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WaypointPin({ type, name }: { type: string; name?: string }) {
  let pinBg = colors.accent;
  let label = "📍";

  if (type === "water") {
    pinBg = "#0284C7";
    label = "💧";
  } else if (type === "campsite" || type === "camp") {
    pinBg = "#16A34A";
    label = "⛺";
  } else if (type === "peak") {
    pinBg = "#D97706";
    label = "⛰️";
  } else if (type === "pass") {
    pinBg = "#7C3AED";
    label = "🏔️";
  } else if (type === "viewpoint") {
    pinBg = "#EA580C";
    label = "👁️";
  }

  return (
    <View style={styles.waypointPinContainer}>
      <View style={[styles.waypointPinBubble, { backgroundColor: pinBg }]}>
        <Text style={styles.waypointPinEmoji}>{label}</Text>
      </View>
      {name ? (
        <View style={styles.waypointPinLabelWrap}>
          <Text style={styles.waypointPinLabelText} numberOfLines={1}>
            {name}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function TrekRouteMap({
  coordinates = [],
  waypoints = [],
  verificationStatus = "musafir_verified",
  height = 220,
  interactive = true,
  onExpandPress,
  showWaypointLabels = false,
}: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);

  const hasCoords = coordinates && coordinates.length >= 2;
  const bounds = hasCoords ? boundsOf(coordinates) : null;
  const startPt = hasCoords ? coordinates[0] : null;
  const endPt = hasCoords ? coordinates[coordinates.length - 1] : null;

  let lineColor = colors.success;

  if (verificationStatus === "community_verified") {
    lineColor = colors.blue;
  } else if (verificationStatus === "pending") {
    lineColor = colors.warning;
  }

  useEffect(() => {
    if (!bounds) return;
    cameraRef.current?.fitBounds(bounds, {
      padding: { top: 40, bottom: 40, left: 40, right: 40 },
      duration: 800,
    });
  }, [coordinates]);

  const routeGeoJSON = hasCoords
    ? {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates },
      }
    : null;

  const centerCoord: [number, number] = hasCoords
    ? [
        (bounds![0] + bounds![2]) / 2,
        (bounds![1] + bounds![3]) / 2,
      ]
    : [77.3481, 31.6375];

  return (
    <View style={[styles.container, { height }]}>
      {hasCoords ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          mapStyle={MAP_STYLE}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: centerCoord,
              zoom: 12,
            }}
          />

          {routeGeoJSON && (
            <GeoJSONSource id="trek-trail-source" data={routeGeoJSON}>
              {/* White outer halo */}
              <Layer
                id="trail-halo"
                type="line"
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
                paint={{
                  "line-color": "#FFFFFF",
                  "line-width": 6,
                }}
              />
              {/* Primary colored trail */}
              <Layer
                id="trail-line"
                type="line"
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
                paint={{
                  "line-color": lineColor,
                  "line-width": 3.8,
                }}
              />
            </GeoJSONSource>
          )}

          {/* Start Point Marker */}
          {startPt && (
            <Marker lngLat={startPt} anchor="center">
              <View style={styles.startMarkerWrap}>
                <View style={[styles.startMarkerDot, { backgroundColor: lineColor }]}>
                  <View style={styles.markerInnerWhite} />
                </View>
              </View>
            </Marker>
          )}

          {/* End Point Marker */}
          {endPt && (
            <Marker lngLat={endPt} anchor="center">
              <View style={styles.endMarkerWrap}>
                <View style={[styles.endMarkerCircle, { borderColor: lineColor }]}>
                  <View style={[styles.endMarkerCenter, { backgroundColor: lineColor }]} />
                </View>
              </View>
            </Marker>
          )}

          {/* Waypoint Markers */}
          {waypoints.map((wp, idx) => (
            <Marker key={wp.id || `wp-${idx}`} lngLat={[wp.lng, wp.lat]} anchor="center">
              <WaypointPin type={wp.type} name={showWaypointLabels ? wp.name : undefined} />
            </Marker>
          ))}
        </MapView>
      ) : (
        <View style={styles.emptyMap}>
          <Text style={styles.emptyMapText}>Trail map preview not available</Text>
        </View>
      )}

      {/* Expand / Fullscreen button */}
      {onExpandPress && (
        <TouchableOpacity style={styles.expandBtn} onPress={onExpandPress} activeOpacity={0.85}>
          <ExpandIcon size={16} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  emptyMap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyMapText: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  expandBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  startMarkerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  startMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  markerInnerWhite: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  endMarkerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  endMarkerCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  endMarkerCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  waypointPinContainer: {
    alignItems: "center",
  },
  waypointPinBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  waypointPinEmoji: {
    fontSize: 11,
  },
  waypointPinLabelWrap: {
    backgroundColor: "rgba(24, 24, 27, 0.85)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  waypointPinLabelText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
  },
});
