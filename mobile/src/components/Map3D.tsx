import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Map, Camera, GeoJSONSource, Layer, Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import type { Route } from "../lib/routing";
import type { Poi } from "../lib/pois";
import { MapPin } from "./MapPin";
import { colors } from "../theme";

// Inline OSM raster style -- no external style.json fetch (that's what
// broke: demotiles.maplibre.org is a small demo host, not built for uptime).
// OSM's own raster tiles are the most reliable free public tile source.
// Swap for a MapTiler/Mapbox vector style (with an API key) when real
// terrain exaggeration is needed.
const MAP_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};
const TILTED_PITCH = 55;

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

type Props = {
  route: Route | null;
  originLabel?: string;
  pois: Poi[];
  onPoiPress: (poi: Poi) => void;
  onLongPress: (lat: number, lon: number) => void;
};

export function Map3D({ route, originLabel, pois, onPoiPress, onLongPress }: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const [tilted, setTilted] = useState(true);

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

  function toggleTilt() {
    const next = !tilted;
    setTilted(next);
    cameraRef.current?.setStop({ pitch: next ? TILTED_PITCH : 0, duration: 500 });
  }

  function recenter() {
    if (bounds) cameraRef.current?.fitBounds(bounds, { pitch: tilted ? TILTED_PITCH : 0, duration: 700 });
  }

  const routeGeoJSON = route
    ? { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: route.coordinates } }
    : null;
  // walker sits ~55% along the route -- a simple index pick, not true arc-length
  const walkerPoint = route ? route.coordinates[Math.floor(route.coordinates.length * 0.55)] : null;
  const startPoint = route ? route.coordinates[0] : null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Map
        style={styles.map}
        mapStyle={MAP_STYLE}
        onLongPress={(e) => onLongPress(e.nativeEvent.lngLat[1], e.nativeEvent.lngLat[0])}
      >
        <Camera ref={cameraRef} initialViewState={{ center: [77.209, 28.6139], zoom: 4 }} />
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
        {pois.map((poi) => (
          <Marker key={poi.id} lngLat={[poi.lon, poi.lat]}>
            <MapPin poi={poi} onPress={() => onPoiPress(poi)} />
          </Marker>
        ))}
      </Map>

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
  sideControls: { position: "absolute", right: 16, top: 190, gap: 10 },
  controlBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paper,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  controlLabel: { fontSize: 11, fontWeight: "700", color: colors.ink },
});
