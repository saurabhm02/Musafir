import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
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
import { MapPin } from "./MapPin";
import { CategoryPin, ClusterBubble } from "./CategoryPin";
import { colors } from "../theme";

// OpenFreeMap's "Liberty" vector style -- free, no API key, no usage cap,
// self-hosts its own sprite + font glyphs (unlike the demo hosts that broke
// before, this is a maintained public service: https://openfreemap.org).
// Real road/land/water cartography + labels instead of bare raster tiles.
// Cluster/category badges are still rendered as plain RN views (see below)
// rather than native SymbolLayers, so they stay independent of this style.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const TILTED_PITCH = 55;
const CLUSTER_HIT_LAYER = "cluster-hit";
const POINT_HIT_LAYER = "unclustered-hit";

function boundsOf(coordinates: [number, number][]): [number, number, number, number] {
  let west = coordinates[0][0], east = coordinates[0][0];
  let south = coordinates[0][1], north = coordinates[0][1];
  for (const [lng, lat] of coordinates) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return [west, south, east, north];
}

// Input: a center point + radius in km
// Output: a polygon ring approximating a real-world circle of that radius --
// a plain CircleLayer's radius is in screen pixels, not km, so a "search
// radius" ring needs an actual geometry, not a paint property.
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

type ClusterMarker = { key: string; lon: number; lat: number; count: number; clusterId: number };
type PointMarker = { key: string; lon: number; lat: number; poiId: string; category: string };

type Props = {
  route: Route | null;
  originLabel?: string;
  pois: Poi[];
  /** Renders `pois` through MapLibre's native, zoom-aware clustering instead
   * of one custom marker per POI -- use for large/national POI sets (Explore).
   * Leave off for small, fixed sets like a trip day's stops. */
  clusterMode?: boolean;
  selectedPoiId?: string;
  onPoiPress: (poi: Poi) => void;
  onLongPress?: (lat: number, lon: number) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  focusCenter?: [number, number];
  focusZoom?: number;
  /** Draws a translucent "search radius" ring + a location dot at focusCenter. */
  searchRadiusKm?: number;
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
}: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const sourceRef = useRef<GeoJSONSourceRef>(null);
  const mapRef = useRef<MapRef>(null);
  const [tilted, setTilted] = useState(true);
  const [clusterMarkers, setClusterMarkers] = useState<ClusterMarker[]>([]);
  const [pointMarkers, setPointMarkers] = useState<PointMarker[]>([]);

  const bounds = route ? boundsOf(route.coordinates) : null;

  useEffect(() => {
    if (!bounds) return;
    cameraRef.current?.fitBounds(bounds, {
      pitch: tilted ? TILTED_PITCH : 0,
      padding: { top: 160, bottom: 260, left: 60, right: 60 },
      duration: 1400,
    });
    // only re-fit when a new route arrives, not on every tilt toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  // Recenters the camera on demand (e.g. once the device's GPS position
  // comes back) without needing a route to fit bounds around.
  useEffect(() => {
    if (!focusCenter) return;
    cameraRef.current?.flyTo({ center: focusCenter, zoom: focusZoom ?? 11, duration: 1200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCenter]);

  function toggleTilt() {
    const next = !tilted;
    setTilted(next);
    cameraRef.current?.setStop({ pitch: next ? TILTED_PITCH : 0, duration: 500 });
  }

  function recenter() {
    if (bounds) cameraRef.current?.fitBounds(bounds, { pitch: tilted ? TILTED_PITCH : 0, duration: 700 });
    else if (focusCenter) cameraRef.current?.flyTo({ center: focusCenter, zoom: focusZoom ?? 11, duration: 700 });
  }

  const routeGeoJSON = route
    ? { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: route.coordinates } }
    : null;
  // walker sits ~55% along the route -- a simple index pick, not true arc-length
  const walkerPoint = route ? route.coordinates[Math.floor(route.coordinates.length * 0.55)] : null;
  const startPoint = route ? route.coordinates[0] : null;

  const radiusGeoJSON = useMemo(
    () =>
      focusCenter && searchRadiusKm
        ? { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [circlePolygon(focusCenter, searchRadiusKm)] } }
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

  // MapLibre computes the actual clustering natively (zoom-aware, fast even
  // for thousands of points) -- we just ask it, after each camera settle,
  // which features are currently rendered as clusters vs individual points,
  // and draw those as plain React views (colored badge + RN <Text>/<Svg>).
  // This sidesteps needing native icon sprites or map-style font glyphs for
  // cluster-count text, while still getting real zoom-reactive clustering.
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
        clusterByCid.set(cid, { key: String(cid), lon, lat, count: f.properties?.point_count ?? 0, clusterId: cid });
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
    } catch {
      // querying can transiently fail mid-gesture -- next settle retries
    }
  }, [clusterMode]);

  useEffect(() => {
    if (!clusterMode) return;
    const t = setTimeout(refreshMarkers, 350);
    return () => clearTimeout(t);
  }, [clusterMode, poisGeoJSON, refreshMarkers]);

  const regionChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleRegionDidChange() {
    if (regionChangeTimer.current) clearTimeout(regionChangeTimer.current);
    regionChangeTimer.current = setTimeout(refreshMarkers, 150);
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
        onRegionDidChange={clusterMode ? handleRegionDidChange : undefined}
        onLongPress={onLongPress ? (e) => onLongPress(e.nativeEvent.lngLat[1], e.nativeEvent.lngLat[0]) : undefined}
      >
        <Camera ref={cameraRef} initialViewState={{ center: initialCenter ?? [77.209, 28.6139], zoom: initialZoom ?? 4 }} />
        {routeGeoJSON && (
          <GeoJSONSource id="route" data={routeGeoJSON}>
            <Layer
              type="line"
              id="route-line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": colors.accent, "line-width": 5 }}
            />
          </GeoJSONSource>
        )}
        {radiusGeoJSON && (
          <GeoJSONSource id="search-radius" data={radiusGeoJSON}>
            <Layer id="search-radius-fill" type="fill" paint={{ "fill-color": "#3B82F6", "fill-opacity": 0.08 }} />
            <Layer id="search-radius-line" type="line" paint={{ "line-color": "#3B82F6", "line-width": 1.5, "line-opacity": 0.4 }} />
          </GeoJSONSource>
        )}
        {startPoint && originLabel && (
          <Marker lngLat={startPoint} anchor="bottom">
            <View style={styles.startLabel}>
              <View style={styles.startDot} />
              <Text style={styles.startText}>{originLabel}</Text>
            </View>
          </Marker>
        )}
        {walkerPoint && (
          <Marker lngLat={walkerPoint} anchor="bottom">
            <View style={styles.walker}>
              <Image source={{ uri: "https://gomusafir.s3.us-east-1.amazonaws.com/mascot/musa-walker.png" }} style={styles.walkerImg} />
            </View>
          </Marker>
        )}
        {searchRadiusKm && focusCenter && (
          <Marker lngLat={focusCenter} anchor="center">
            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </Marker>
        )}
        {clusterMode ? (
          <GeoJSONSource id="pois-cluster" data={poisGeoJSON} cluster clusterRadius={50} clusterMaxZoom={13} ref={sourceRef}>
            <Layer id={CLUSTER_HIT_LAYER} type="circle" filter={["has", "point_count"]} paint={{ "circle-radius": 20, "circle-opacity": 0 }} />
            <Layer id={POINT_HIT_LAYER} type="circle" filter={["!", ["has", "point_count"]]} paint={{ "circle-radius": 16, "circle-opacity": 0 }} />
          </GeoJSONSource>
        ) : (
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

      <View style={styles.sideControls}>
        <TouchableOpacity style={styles.controlBtn} onPress={recenter}>
          <Svg viewBox="0 0 24 24" width={16} height={16}>
            <Path d="M3 11l18-8-8 18-3-7-7-3z" stroke={colors.ink} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={toggleTilt}>
          <Text style={[styles.controlLabel, tilted && { color: colors.accent }]}>3D</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  startLabel: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.paper, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  startDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, borderWidth: 2, borderColor: "#fff" },
  startText: { fontSize: 11.5, fontWeight: "700", color: colors.ink },
  walker: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, padding: 4,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  walkerImg: { width: "100%", height: "100%", borderRadius: 18 },
  userDotOuter: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(59,130,246,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  userDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#3B82F6", borderWidth: 2, borderColor: "#FFFFFF" },
  sideControls: { position: "absolute", right: 16, top: 190, gap: 10 },
  controlBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paper,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  controlLabel: { fontSize: 11, fontWeight: "700", color: colors.ink },
});
