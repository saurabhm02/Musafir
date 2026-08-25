import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme";
import type { RootStackParamList } from "../navigation";
import { createTrip, addTripStop, fetchTrips, type TripSummary } from "../lib/trips";
import { fetchPoiDetails, type PoiDetails } from "../lib/pois";
import { AddToTripBottomSheet } from "../components/AddToTripBottomSheet";

function ArrowBackIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#18181B" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NavigationArrowIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11L21 3L13 21L11 13L3 11Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

function SuitcaseIcon({ size = 18, color = "#18181B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="7" width="16" height="14" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4 12H20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function CarSmallIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 17H4C2.89543 17 2 16.1046 2 15V11C2 9.89543 2.89543 9 4 9H5L7 4H17L19 9H20C21.1046 9 22 9.89543 22 11V15C22 16.1046 21.1046 17 20 17H19"
        stroke="#71717A"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7.5" cy="13.5" r="1.5" fill="#71717A" />
      <Circle cx="16.5" cy="13.5" r="1.5" fill="#71717A" />
    </Svg>
  );
}

function ClockIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke="#71717A" strokeWidth={1.8} />
      <Path d="M12 7v5l3 2" stroke="#71717A" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function MountainIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 20L8.5 7L15 20" stroke="#71717A" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13 14L17 6L22 20" stroke="#71717A" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "TripReview">;

export function TripReviewScreen({ route: screenRoute, navigation }: Props) {
  const { poi, route: initialRoute } = screenRoute.params;
  const [poiDetails, setPoiDetails] = useState<PoiDetails | null>(null);
  const [saveToList, setSaveToList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [addToTripOpen, setAddToTripOpen] = useState(false);
  const [trips, setTrips] = useState<TripSummary[]>([]);

  useEffect(() => {
    fetchPoiDetails(poi.id).then(setPoiDetails).catch(() => {});
    fetchTrips().then(setTrips).catch(() => {});
  }, [poi.id]);

  const durationMin = initialRoute?.durationMin ?? 72;
  const distanceKm = initialRoute?.distanceKm ?? 32;
  const hours = Math.floor(durationMin / 60);
  const minutes = Math.round(durationMin % 60);
  const formattedDuration = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
  const formattedDistance = `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;

  const elevationGain = poiDetails?.metadata?.elevation_gain_m
    ? `${poiDetails.metadata.elevation_gain_m.toLocaleString()} m`
    : poiDetails?.metadata?.max_elevation_m
    ? `${poiDetails.metadata.max_elevation_m.toLocaleString()} m`
    : "1,050 m";

  const heroImage = poiDetails?.photos?.[0]?.url ?? poi.photo_url;
  const locationText = poiDetails?.metadata?.state
    ? `${poiDetails.metadata.district ? `${poiDetails.metadata.district}, ` : ""}${poiDetails.metadata.state}`
    : poi.category.replace("_", " ");

  const handleStartTrip = async () => {
    setLoading(true);
    try {
      if (saveToList) {
        // Create trip and add this POI as stop 1
        const tripTitle = `${poi.name} Trip`;
        const newTripId = await createTrip({
          title: tripTitle,
          destination: locationText,
          dayCount: 1,
        });
        await addTripStop(newTripId, {
          poiId: poi.id,
          dayNumber: 1,
        });
        setLoading(false);
        navigation.navigate("TripTracking", { tripId: newTripId });
      } else {
        setLoading(false);
        navigation.navigate("TripTracking", undefined);
      }
    } catch {
      setLoading(false);
      navigation.navigate("TripTracking", undefined);
    }
  };

  const handleAddToTripDay = async (trip: TripSummary, dayNumber: number) => {
    await addTripStop(trip.id, { poiId: poi.id, dayNumber });
    navigation.navigate("TripTracking", { tripId: trip.id });
  };

  const handleCreateNewTrip = async (title: string, destination?: string, dayCount?: number) => {
    const id = await createTrip({ title, destination, dayCount });
    await addTripStop(id, { poiId: poi.id, dayNumber: 1 });
    navigation.navigate("TripTracking", { tripId: id });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowBackIcon size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Your Trip</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Destination Hero Image Card */}
        <View style={styles.heroCard}>
          {heroImage ? (
            <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroImagePlaceholder]} />
          )}
        </View>

        {/* Destination Title & Subtitle */}
        <View style={styles.titleSection}>
          <Text style={styles.poiTitle}>{poi.name}</Text>
          <Text style={styles.poiSubtitle}>{locationText}</Text>
        </View>

        {/* Route Details Card */}
        <View style={styles.detailsCard}>
          {/* Origin */}
          <View style={styles.metricRow}>
            <View style={styles.metricIconWrap}>
              <View style={styles.blueRing}>
                <View style={styles.blueCenter} />
              </View>
            </View>
            <View style={styles.metricTextCol}>
              <Text style={styles.metricLabel}>From</Text>
              <Text style={styles.metricValue}>Your Current Location</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Destination */}
          <View style={styles.metricRow}>
            <View style={styles.metricIconWrap}>
              <View style={styles.redPinDot} />
            </View>
            <View style={styles.metricTextCol}>
              <Text style={styles.metricLabel}>To</Text>
              <Text style={styles.metricValue}>{poi.name}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Distance */}
          <View style={styles.metricRow}>
            <View style={styles.metricIconWrap}>
              <CarSmallIcon size={16} />
            </View>
            <View style={styles.metricTextCol}>
              <Text style={styles.metricLabel}>Distance</Text>
              <Text style={styles.metricValue}>{formattedDistance}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Est Time */}
          <View style={styles.metricRow}>
            <View style={styles.metricIconWrap}>
              <ClockIcon size={16} />
            </View>
            <View style={styles.metricTextCol}>
              <Text style={styles.metricLabel}>Est. Time</Text>
              <Text style={styles.metricValue}>{formattedDuration}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Elevation Gain */}
          <View style={styles.metricRow}>
            <View style={styles.metricIconWrap}>
              <MountainIcon size={16} />
            </View>
            <View style={styles.metricTextCol}>
              <Text style={styles.metricLabel}>Elevation Gain</Text>
              <Text style={styles.metricValue}>{elevationGain}</Text>
            </View>
          </View>
        </View>

        {/* Save to Trips Toggle Card */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleTextCol}>
            <Text style={styles.toggleTitle}>Save this trip to your list?</Text>
            <Text style={styles.toggleSubtitle}>You can access it anytime from Trips.</Text>
          </View>
          <Switch
            value={saveToList}
            onValueChange={setSaveToList}
            trackColor={{ false: "#E5E7EB", true: colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Primary CTA: Start Trip */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleStartTrip}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>Start Trip</Text>
              <NavigationArrowIcon size={18} />
            </>
          )}
        </TouchableOpacity>

        {/* Secondary CTA: Add to Existing Trip */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setAddToTripOpen(true)}
          activeOpacity={0.8}
        >
          <SuitcaseIcon size={18} color="#18181B" />
          <Text style={styles.secondaryBtnText}>Add to Existing Trip</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add To Trip Sheet Modal */}
      <AddToTripBottomSheet
        visible={addToTripOpen}
        poi={poi}
        trips={trips}
        onClose={() => setAddToTripOpen(false)}
        onStartNavigation={() => setAddToTripOpen(false)}
        onAddToTripDay={handleAddToTripDay}
        onCreateNewTrip={handleCreateNewTrip}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  heroCard: {
    height: 190,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroImagePlaceholder: {
    backgroundColor: "#E5E7EB",
  },
  titleSection: {
    marginBottom: 16,
  },
  poiTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.4,
  },
  poiSubtitle: {
    fontSize: 13.5,
    color: "#71717A",
    fontWeight: "500",
    marginTop: 2,
    textTransform: "capitalize",
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  metricIconWrap: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  blueRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  blueCenter: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2563EB",
  },
  redPinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  metricTextCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 38,
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  toggleTextCol: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
  },
  toggleSubtitle: {
    fontSize: 12,
    color: "#71717A",
    fontWeight: "500",
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: 18,
    height: 52,
    gap: 8,
    marginBottom: 12,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    height: 50,
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#18181B",
  },
});
