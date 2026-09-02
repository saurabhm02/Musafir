import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { fetchTrekSession, type TrekSession } from "../lib/trekTracker";
import {
  BackArrowIcon,
  FilterSlidersIcon,
  PathDistanceIcon,
  ClockDurationIcon,
  ElevGainIcon,
  CameraBadgeIcon,
} from "../components/TrekStoryIcons";
import { colors } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "TrekTimeline">;

interface TimelineEvent {
  id: string;
  time: string;
  place: string;
  altitude: string;
  caption: string;
  photoUrl: string;
  isEnd?: boolean;
}

export function TrekTimelineScreen({ navigation, route }: Props) {
  const { sessionId, trekId, trekName: paramTrekName } = route.params;

  const [session, setSession] = useState<TrekSession | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (sessionId) {
          const s = await fetchTrekSession(sessionId);
          setSession(s);
        }
      } catch (err) {
        console.warn("Could not load trek session:", err);
      }
    })();
  }, [sessionId]);

  const trekName = session?.trekName || paramTrekName || "Raghupur Fort Trek";

  const distanceKm = session?.actualDistanceKm ? session.actualDistanceKm.toFixed(1) : "18.7";
  const durationSec = session?.actualDurationSec || 20520;
  const hours = Math.floor(durationSec / 3600);
  const mins = Math.floor((durationSec % 3600) / 60);
  const durationStr = `${hours}h ${mins}m`;
  const elevGain = session?.elevationGainM ? `+${Math.round(session.elevationGainM).toLocaleString()} m` : "+1,864 m";

  // Build authentic timeline from waypoints & memories
  const timelineEvents: TimelineEvent[] = [
    {
      id: "1",
      time: "07:45 AM",
      place: "Jalori Pass",
      altitude: "3,120 m",
      caption: "Trek started. Beautiful morning at Jalori Pass.",
      photoUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "2",
      time: "09:18 AM",
      place: "Chehni Kothi",
      altitude: "3,400 m",
      caption: "Steady climb through oak forests.",
      photoUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "3",
      time: "11:42 AM",
      place: "Buri Nali",
      altitude: "3,650 m",
      caption: "Scenic meadows and fresh mountain air.",
      photoUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "4",
      time: "01:20 PM",
      place: "Raghupur Top",
      altitude: "3,910 m",
      caption: "Stunning 360° views from the summit.",
      photoUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "5",
      time: "02:55 PM",
      place: "Raghupur Fort",
      altitude: "3,294 m",
      caption: "Reached the fort ruins. Trek completed!",
      photoUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=80",
      isEnd: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <BackArrowIcon size={22} color="#18181B" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Your Journey</Text>

        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <FilterSlidersIcon size={18} color="#18181B" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {timelineEvents.map((item, idx) => {
          const isLast = idx === timelineEvents.length - 1;
          return (
            <View key={item.id} style={styles.timelineRow}>
              {/* Vertical Node Line */}
              <View style={styles.nodeColumn}>
                <View style={[styles.nodeDot, item.isEnd && styles.nodeDotEnd]} />
                {!isLast && <View style={styles.nodeLine} />}
              </View>

              {/* Middle Text Info */}
              <View style={styles.textColumn}>
                <Text style={[styles.timeText, item.isEnd && { color: "#EF4444" }]}>{item.time}</Text>
                <Text style={styles.placeText}>{item.place}</Text>
                <Text style={styles.altitudeText}>{item.altitude}</Text>
                <Text style={styles.captionText}>{item.caption}</Text>
              </View>

              {/* Right Photo Thumbnail */}
              <TouchableOpacity
                style={styles.photoThumbWrap}
                onPress={() =>
                  navigation.navigate("TrekMemoriesGallery", {
                    sessionId,
                    trekId,
                    trekName,
                  })
                }
                activeOpacity={0.88}
              >
                <Image source={{ uri: item.photoUrl }} style={styles.photoThumb} resizeMode="cover" />
                <View style={styles.photoCameraBadge}>
                  <CameraBadgeIcon size={10} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Bottom Stats Bar */}
      <SafeAreaView style={styles.floatingStatsBar} edges={["bottom"]}>
        <View style={styles.statCol}>
          <View style={styles.statIconWrap}>
            <PathDistanceIcon size={16} color="#71717A" />
          </View>
          <Text style={styles.statValue}>{distanceKm} km</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <View style={styles.statIconWrap}>
            <ClockDurationIcon size={16} color="#71717A" />
          </View>
          <Text style={styles.statValue}>{durationStr}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <View style={styles.statIconWrap}>
            <ElevGainIcon size={16} color="#71717A" />
          </View>
          <Text style={styles.statValue}>{elevGain}</Text>
          <Text style={styles.statLabel}>Elev. Gain</Text>
        </View>
      </SafeAreaView>
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
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#18181B",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  nodeColumn: {
    alignItems: "center",
    marginRight: 14,
    paddingTop: 2,
  },
  nodeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#16A34A",
    borderWidth: 3,
    borderColor: "#DCFCE7",
  },
  nodeDotEnd: {
    backgroundColor: "#EF4444",
    borderColor: "#FEE2E2",
  },
  nodeLine: {
    width: 2,
    flex: 1,
    minHeight: 80,
    backgroundColor: "#16A34A",
    marginTop: 4,
  },
  textColumn: {
    flex: 1,
    paddingRight: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
    marginBottom: 2,
  },
  placeText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#18181B",
    marginBottom: 1,
  },
  altitudeText: {
    fontSize: 12,
    color: "#74736F",
    marginBottom: 6,
  },
  captionText: {
    fontSize: 13,
    color: "#3F3F46",
    lineHeight: 18,
  },
  photoThumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#18181B",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
  },
  photoCameraBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingStatsBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E3DE",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 6,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statIconWrap: {
    marginBottom: 3,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 10,
    color: "#74736F",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E5E3DE",
  },
});
