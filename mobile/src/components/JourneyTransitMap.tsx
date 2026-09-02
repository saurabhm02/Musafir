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
import type { JourneyOption } from "../lib/journeys";
import { colors } from "../theme";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

interface Props {
  journey: JourneyOption;
  height?: number;
  onExpandPress?: () => void;
  onHubPress?: (hubIndex: number) => void;
}

function boundsOf(points: [number, number][]): [number, number, number, number] {
  let west = points[0][0],
    east = points[0][0];
  let south = points[0][1],
    north = points[0][1];
  for (const [lng, lat] of points) {
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
        stroke={colors.ink}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LayersIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        stroke={colors.ink}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HubMarkerPin({
  label,
  isOrigin = false,
  isTrailhead = false,
  color = colors.accent,
}: {
  label: string;
  isOrigin?: boolean;
  isTrailhead?: boolean;
  color?: string;
}) {
  return (
    <View style={styles.hubMarkerWrap}>
      <View style={styles.hubLabelPill}>
        <Text style={styles.hubLabelText} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View
        style={[
          styles.hubDotOuter,
          isOrigin ? styles.originDotOuter : isTrailhead ? styles.trailheadDotOuter : { borderColor: color },
        ]}
      >
        <View
          style={[
            styles.hubDotInner,
            isOrigin ? styles.originDotInner : isTrailhead ? styles.trailheadDotInner : { backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

export function JourneyTransitMap({ journey, height = 340, onExpandPress, onHubPress }: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);

  // Extract all distinct hub coordinates in sequence
  const hubPoints: { name: string; coord: [number, number]; isOrigin: boolean; isTrailhead: boolean }[] = [];

  if (journey.legs && journey.legs.length > 0) {
    // 1. Origin point
    const firstLeg = journey.legs[0];
    hubPoints.push({
      name: firstLeg.from.name.replace(/,.*$/, ""),
      coord: [firstLeg.from.lon, firstLeg.from.lat],
      isOrigin: true,
      isTrailhead: false,
    });

    // 2. Intermediate points
    for (let i = 0; i < journey.legs.length; i++) {
      const leg = journey.legs[i];
      const isLast = i === journey.legs.length - 1;
      hubPoints.push({
        name: leg.to.name.replace(/,.*$/, ""),
        coord: [leg.to.lon, leg.to.lat],
        isOrigin: false,
        isTrailhead: isLast,
      });
    }
  }

  const coordinates = hubPoints.map((h) => h.coord);
  const hasCoords = coordinates.length >= 2;
  const bounds = hasCoords ? boundsOf(coordinates) : null;

  useEffect(() => {
    if (!bounds) return;
    cameraRef.current?.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      duration: 900,
    });
  }, [journey.id]);

  const routeGeoJSON = hasCoords
    ? {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates,
        },
      }
    : null;

  const centerCoord: [number, number] = hasCoords
    ? [(bounds![0] + bounds![2]) / 2, (bounds![1] + bounds![3]) / 2]
    : [78.9629, 26.5937]; // Center of India

  return (
    <View style={[styles.container, { height }]}>
      {hasCoords ? (
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE}>
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: centerCoord,
              zoom: 5.5,
            }}
          />

          {routeGeoJSON && (
            <GeoJSONSource id="journey-route-source" data={routeGeoJSON}>
              {/* Outer casing */}
              <Layer
                id="journey-line-casing"
                type="line"
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
                paint={{
                  "line-color": "#FFFFFF",
                  "line-width": 6,
                  "line-opacity": 0.9,
                }}
              />
              {/* Main transit line */}
              <Layer
                id="journey-line-main"
                type="line"
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
                paint={{
                  "line-color": colors.accent,
                  "line-width": 3.8,
                  "line-dasharray": [2, 1.5],
                }}
              />
            </GeoJSONSource>
          )}

          {/* Hub Markers */}
          {hubPoints.map((hub, idx) => (
            <Marker key={`hub-${idx}`} lngLat={hub.coord} anchor="center">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onHubPress && onHubPress(idx)}
              >
                <HubMarkerPin
                  label={hub.name}
                  isOrigin={hub.isOrigin}
                  isTrailhead={hub.isTrailhead}
                  color={idx % 2 === 0 ? colors.accent : colors.blue}
                />
              </TouchableOpacity>
            </Marker>
          ))}
        </MapView>
      ) : (
        <View style={styles.emptyMap}>
          <Text style={styles.emptyMapText}>Transit map preview not available</Text>
        </View>
      )}

      {/* Floating control buttons */}
      {onExpandPress && (
        <TouchableOpacity style={styles.expandBtn} onPress={onExpandPress} activeOpacity={0.85}>
          <ExpandIcon size={18} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.layersBtn}
        onPress={() => {
          if (bounds) {
            cameraRef.current?.fitBounds(bounds, {
              padding: { top: 50, bottom: 50, left: 50, right: 50 },
              duration: 600,
            });
          }
        }}
        activeOpacity={0.85}
      >
        <LayersIcon size={18} />
      </TouchableOpacity>
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
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  layersBtn: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  hubMarkerWrap: {
    alignItems: "center",
  },
  hubLabelPill: {
    backgroundColor: "rgba(24, 24, 27, 0.88)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  hubLabelText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
  },
  hubDotOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  hubDotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  originDotOuter: {
    borderColor: colors.success,
  },
  originDotInner: {
    backgroundColor: colors.success,
  },
  trailheadDotOuter: {
    borderColor: "#DC2626",
  },
  trailheadDotInner: {
    backgroundColor: "#DC2626",
  },
});
