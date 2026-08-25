import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path, Polygon } from "react-native-svg";
import {
  Map as MapView,
  Camera,
  GeoJSONSource,
  Layer,
  Marker,
  type CameraRef,
  type GeoJSONSourceRef,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import type { Route } from "../lib/routing";
import type { Poi } from "../lib/pois";
import type { NavigationLocation } from "../lib/location";
import { MapPin } from "./MapPin";
import { CategoryPin, ClusterBubble } from "./CategoryPin";
import { colors } from "../theme";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const TILTED_PITCH = 55;
const CLUSTER_HIT_LAYER = "cluster-hit";
const POINT_HIT_LAYER = "unclustered-hit";

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

function circlePolygon([lon, lat]: [number, number], radiusKm: number, points = 64): [number, number][] {
  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;
  const ring: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    ring.push([lon + distanceX * Math.cos(theta), lat + distanceY * Math.sin(theta)]);
  }
  return ring;
}

// Directional navigation puck with heading cone
function NavigationPuck({ heading }: { heading: number | null }) {
  const rotation = heading != null ? `${heading}deg` : "0deg";
  return (
    <View style={styles.puckContainer}>
      <View style={[styles.puckHeadingWrap, { transform: [{ rotate: rotation }] }]}>
        <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
          {/* Heading directional pointer */}
          <Polygon points="18,2 26,26 18,20 10,26" fill={colors.accent} stroke="#FFFFFF" strokeWidth={2} />
          {/* Core GPS circle */}
          <Circle cx="18" cy="18" r="7" fill="#2563EB" stroke="#FFFFFF" strokeWidth={2.5} />
        </Svg>
      </View>
    </View>
  );
}

// Destination Flag Marker
function DestinationMarker({ title }: { title?: string }) {
  return (
    <View style={styles.destMarkerWrap}>
      <View style={styles.destPin}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 21C16 17 20 13.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13.4183 8 17 12 21Z"
            fill={colors.accent}
          />
          <Circle cx="12" cy="9" r="3.5" fill="#FFFFFF" />
        </Svg>
      </View>
      {title ? (
        <View style={styles.destBubble}>
          <Text style={styles.destText} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type ClusterMarker = { key: string; lon: number; lat: number; count: number; clusterId: number };
type PointMarker = { key: string; lon: number; lat: number; poiId: string; category: string };

type Props = {
  route: Route | null;
  originLabel?: string;
  pois: Poi[];
  clusterMode?: boolean;
  selectedPoiId?: string;
  onPoiPress: (poi: Poi) => void;
  onLongPress?: (lat: number, lon: number) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  focusCenter?: [number, number];
  focusZoom?: number;
  searchRadiusKm?: number;
  navMode?: boolean;
  userNavLocation?: NavigationLocation | null;
  isFollowingUser?: boolean;
  onUserPan?: () => void;
};

export function Map3D({
  route,
  originLabel,
  pois,
  clusterMode,
  selectedPoiId,
  onPoiPress,
  onLongPress,
  initialCenter,
  initialZoom,
  focusCenter,
  focusZoom,
  searchRadiusKm,
  navMode,
  userNavLocation,
  isFollowingUser = true,
  onUserPan,
}: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const sourceRef = useRef<GeoJSONSourceRef>(null);
  const mapRef = useRef<MapRef>(null);
  const [tilted, setTilted] = useState(true);
  const [clusterMarkers, setClusterMarkers] = useState<ClusterMarker[]>([]);
  const [pointMarkers, setPointMarkers] = useState<PointMarker[]>([]);

  const bounds = route ? boundsOf(route.coordinates) : null;

  // Fit bounds when route loads (for preview)
  useEffect(() => {
    if (navMode) return;
    if (!bounds) return;
    cameraRef.current?.fitBounds(bounds, {
      pitch: tilted ? TILTED_PITCH : 0,
      padding: { top: 160, bottom: 260, left: 60, right: 60 },
      duration: 1400,
    });
  }, [route, navMode, tilted]);

  // Smooth continuous camera tracking in active navigation mode
  useEffect(() => {
    if (!navMode || !userNavLocation || !isFollowingUser) return;

    cameraRef.current?.flyTo({
      center: [userNavLocation.lon, userNavLocation.lat],
      zoom: 16.5,
      duration: 800,
    });
  }, [navMode, userNavLocation, isFollowingUser]);

  // Center when focusCenter changes
  useEffect(() => {
    if (navMode) return;
    if (!focusCenter) return;
    cameraRef.current?.flyTo({ center: focusCenter, zoom: focusZoom ?? 11, duration: 1200 });
  }, [focusCenter, navMode, focusZoom]);

  function toggleTilt() {
    const next = !tilted;
    setTilted(next);
    cameraRef.current?.setStop({ pitch: next ? TILTED_PITCH : 0, duration: 500 });
  }

  function recenter() {
    if (navMode && userNavLocation) {
      cameraRef.current?.flyTo({
        center: [userNavLocation.lon, userNavLocation.lat],
        zoom: 16.5,
        duration: 700,
      });
    } else if (bounds) {
      cameraRef.current?.fitBounds(bounds, { pitch: tilted ? TILTED_PITCH : 0, duration: 700 });
    } else if (focusCenter) {
      cameraRef.current?.flyTo({ center: focusCenter, zoom: focusZoom ?? 11, duration: 700 });
    }
  }

  const routeGeoJSON = route
    ? {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: route.coordinates },
      }
    : null;

  const startPoint = route && route.coordinates.length > 0 ? route.coordinates[0] : null;
  const endPoint =
    route && route.coordinates.length > 1 ? route.coordinates[route.coordinates.length - 1] : null;

  const radiusGeoJSON = useMemo(
    () =>
      focusCenter && searchRadiusKm
        ? {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "Polygon" as const,
              coordinates: [circlePolygon(focusCenter, searchRadiusKm)],
            },
          }
        : null,
    [focusCenter, searchRadiusKm],
  );

  const poisById = useMemo(() => new Map(pois.map((p) => [p.id, p])), [pois]);
  const poisGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: pois.map((p) => ({
        type: "Feature" as const,
        properties: { id: p.id, category: p.category },
        geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
      })),
    }),
    [pois],
  );

  const refreshMarkers = useCallback(async () => {
    if (!clusterMode || !mapRef.current) return;
    try {
      const [clusterFeatures, pointFeatures] = await Promise.all([
        mapRef.current.queryRenderedFeatures({ layers: [CLUSTER_HIT_LAYER] }),
        mapRef.current.queryRenderedFeatures({ layers: [POINT_HIT_LAYER] }),
      ]);
      const clusterByCid = new Map<number, ClusterMarker>();
      for (const f of clusterFeatures) {
        const cid = f.properties?.cluster_id;
        if (cid == null || f.geometry.type !== "Point") continue;
        const [lon, lat] = f.geometry.coordinates;
        clusterByCid.set(cid, {
          key: String(cid),
          lon,
          lat,
          count: f.properties?.point_count ?? 0,
          clusterId: cid,
        });
      }
      const pointById = new Map<string, PointMarker>();
      for (const f of pointFeatures) {
        const id = f.properties?.id;
        if (!id || f.geometry.type !== "Point") continue;
        const [lon, lat] = f.geometry.coordinates;
        pointById.set(id, { key: id, lon, lat, poiId: id, category: f.properties?.category });
      }
      setClusterMarkers([...clusterByCid.values()]);
      setPointMarkers([...pointById.values()]);
    } catch {}
  }, [clusterMode]);

  useEffect(() => {
    if (!clusterMode) return;
    const t = setTimeout(refreshMarkers, 350);
    return () => clearTimeout(t);
  }, [clusterMode, poisGeoJSON, refreshMarkers]);

  const regionChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleRegionDidChange() {
    if (clusterMode) {
      if (regionChangeTimer.current) clearTimeout(regionChangeTimer.current);
      regionChangeTimer.current = setTimeout(refreshMarkers, 150);
    }
  }

  function handleRegionWillChange() {
    if (navMode && onUserPan) {
      onUserPan();
    }
  }

  function handleClusterPress(c: ClusterMarker) {
    sourceRef.current
      ?.getClusterExpansionZoom(c.clusterId)
      .then((zoom) => cameraRef.current?.flyTo({ center: [c.lon, c.lat], zoom: zoom + 0.3, duration: 600 }))
      .catch(() => {});
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={MAP_STYLE}
        onRegionDidChange={handleRegionDidChange}
        onRegionWillChange={handleRegionWillChange}
        onLongPress={onLongPress ? (e) => onLongPress(e.nativeEvent.lngLat[1], e.nativeEvent.lngLat[0]) : undefined}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: initialCenter ?? [77.209, 28.6139],
            zoom: initialZoom ?? (navMode ? 16 : 4),
            pitch: navMode ? 50 : 0,
          }}
        />

        {/* Route Line */}
        {routeGeoJSON && (
          <GeoJSONSource id="route" data={routeGeoJSON}>
            {/* Route Casing / Outer Glow */}
            <Layer
              type="line"
              id="route-casing"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#FFFFFF", "line-width": navMode ? 9 : 7, "line-opacity": 0.9 }}
            />
            {/* Route Main Polyline */}
            <Layer
              type="line"
              id="route-line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": navMode ? colors.accent : "#2563EB",
                "line-width": navMode ? 6 : 4.5,
              }}
            />
          </GeoJSONSource>
        )}

        {/* Search Radius Ring */}
        {radiusGeoJSON && (
          <GeoJSONSource id="search-radius" data={radiusGeoJSON}>
            <Layer id="search-radius-fill" type="fill" paint={{ "fill-color": "#3B82F6", "fill-opacity": 0.08 }} />
            <Layer
              id="search-radius-line"
              type="line"
              paint={{ "line-color": "#3B82F6", "line-width": 1.5, "line-opacity": 0.4 }}
            />
          </GeoJSONSource>
        )}

        {/* Start Waypoint (Non-Nav Mode) */}
        {!navMode && startPoint && originLabel && (
          <Marker lngLat={startPoint} anchor="bottom">
            <View style={styles.startLabel}>
              <View style={styles.startDot} />
              <Text style={styles.startText}>{originLabel}</Text>
            </View>
          </Marker>
        )}

        {/* Destination Pin (Nav Mode & Route) */}
        {endPoint && (
          <Marker lngLat={endPoint} anchor="bottom">
            <DestinationMarker title={pois[0]?.name} />
          </Marker>
        )}

        {/* Active Navigation Real GPS Puck with Heading Direction */}
        {navMode && userNavLocation && (
          <Marker lngLat={[userNavLocation.lon, userNavLocation.lat]} anchor="center">
            <NavigationPuck heading={userNavLocation.heading} />
          </Marker>
        )}

        {/* Standard User Location Dot (Non-Nav Mode) */}
        {!navMode && searchRadiusKm && focusCenter && (
          <Marker lngLat={focusCenter} anchor="center">
            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </Marker>
        )}

        {/* POI Markers & Clustering */}
        {clusterMode ? (
          <GeoJSONSource
            id="pois-cluster"
            data={poisGeoJSON}
            cluster
            clusterRadius={50}
            clusterMaxZoom={13}
            ref={sourceRef}
          >
            <Layer
              id={CLUSTER_HIT_LAYER}
              type="circle"
              filter={["has", "point_count"]}
              paint={{ "circle-radius": 20, "circle-opacity": 0 }}
            />
            <Layer
              id={POINT_HIT_LAYER}
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{ "circle-radius": 16, "circle-opacity": 0 }}
            />
          </GeoJSONSource>
        ) : (
          !navMode &&
          pois.map((poi) => (
            <Marker key={poi.id} lngLat={[poi.lon, poi.lat]}>
              <MapPin poi={poi} onPress={() => onPoiPress(poi)} />
            </Marker>
          ))
        )}

        {clusterMode &&
          clusterMarkers.map((c) => (
            <Marker key={`c-${c.key}`} lngLat={[c.lon, c.lat]} anchor="center">
              <ClusterBubble count={c.count} onPress={() => handleClusterPress(c)} />
            </Marker>
          ))}

        {clusterMode &&
          pointMarkers.map((p) => (
            <Marker key={`p-${p.key}`} lngLat={[p.lon, p.lat]} anchor="center">
              <CategoryPin
                category={p.category}
                selected={p.poiId === selectedPoiId}
                onPress={() => {
                  const poi = poisById.get(p.poiId);
                  if (poi) onPoiPress(poi);
                }}
              />
            </Marker>
          ))}
      </MapView>

      {/* Side Map Controls */}
      {!navMode && (
        <View style={styles.sideControls}>
          <TouchableOpacity style={styles.controlBtn} onPress={recenter} activeOpacity={0.8}>
            <Svg viewBox="0 0 24 24" width={16} height={16}>
              <Path
                d="M3 11l18-8-8 18-3-7-7-3z"
                stroke={colors.ink}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={toggleTilt} activeOpacity={0.8}>
            <Text style={[styles.controlLabel, tilted && { color: colors.accent }]}>3D</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  startLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  startDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    borderWidth: 2,
    borderColor: "#fff",
  },
  startText: { fontSize: 11.5, fontWeight: "700", color: colors.ink },
  destMarkerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  destPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  destBubble: {
    backgroundColor: "#18181B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 3,
  },
  destText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
    maxWidth: 120,
  },
  puckContainer: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  puckHeadingWrap: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  userDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(59,130,246,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  userDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2563EB",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  sideControls: { position: "absolute", right: 16, top: 190, gap: 10 },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  controlLabel: { fontSize: 11, fontWeight: "700", color: colors.ink },
});
