import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";
import type { RootStackParamList } from "../navigation";
import { fetchCollectionDetail, togglePoiInCollection, type CollectionDetail } from "../lib/collections";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";

function ArrowBackIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#18181B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#EF4444" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function StarIcon({ size = 12 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#F59E0B">
      <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "CollectionDetail">;

export function CollectionDetailScreen({ route, navigation }: Props) {
  const { collectionId, title } = route.params;
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCollectionDetail(collectionId);
      setCollection(data);
    } catch {
      setCollection(null);
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail]),
  );

  const handleRemovePoi = async (poiId: string) => {
    if (!collection) return;
    setCollection({
      ...collection,
      pois: collection.pois.filter((p) => p.id !== poiId),
      poi_count: Math.max(0, collection.poi_count - 1),
    });
    try {
      await togglePoiInCollection(collectionId, poiId);
    } catch {
      loadDetail();
    }
  };

  const handleTabPress = (tab: TabType) => {
    if (tab === "Home") navigation.navigate("Dashboard");
    else if (tab === "Explore") navigation.navigate("Home");
    else if (tab === "Trips") navigation.navigate("TripTracking", undefined);
    else if (tab === "Profile") navigation.navigate("Auth");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowBackIcon size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {collection?.name || title}
          </Text>
        </View>
      </View>

      {/* Subheader */}
      {collection?.description && (
        <View style={styles.descWrap}>
          <Text style={styles.descText}>{collection.description}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#D97706" />
          <Text style={styles.loadingText}>Loading places in collection...</Text>
        </View>
      ) : !collection || collection.pois.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No places in this collection</Text>
          <Text style={styles.emptyDesc}>
            Add viewpoints, temples, waterfalls, or mountain passes from Explore to populate this collection.
          </Text>
          <TouchableOpacity
            style={styles.emptyCTA}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.88}
          >
            <Text style={styles.emptyCTAText}>Explore Places</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {collection.pois.map((p) => {
            const rating = Number(p.avg_rating ?? 0);
            const categoryLabel = (p.category || "").replace("_", " ");

            return (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                onPress={() => navigation.navigate("PlaceDetails", { poi: p })}
                activeOpacity={0.9}
              >
                <View style={styles.cardThumbWrap}>
                  {p.photo_url ? (
                    <Image source={{ uri: p.photo_url }} style={styles.cardThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.cardThumb, styles.cardThumbFallback]}>
                      <Text style={{ fontSize: 28 }}>📍</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.cardLocation} numberOfLines={1}>
                    {p.description && p.description.length < 40 ? p.description : `${categoryLabel} Destination, India`}
                  </Text>

                  <View style={styles.cardMetaLine}>
                    {rating > 0 && (
                      <View style={styles.ratingBadge}>
                        <StarIcon size={12} />
                        <Text style={styles.ratingVal}>{rating.toFixed(1)}</Text>
                      </View>
                    )}
                    <Text style={styles.metaCategory}>
                      {rating > 0 ? "• " : ""}{categoryLabel}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemovePoi(p.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <TrashIcon size={18} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <BottomTabBar activeTab="Home" onTabPress={handleTabPress} onCenterPress={() => navigation.navigate("Home")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#18181B", letterSpacing: -0.4, flex: 1 },
  descWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  descText: { fontSize: 13.5, color: "#71717A", lineHeight: 18 },
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F4F4F5",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardThumbWrap: { width: 88, height: 88, borderRadius: 16, overflow: "hidden" },
  cardThumb: { width: "100%", height: "100%" },
  cardThumbFallback: { backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, marginLeft: 14, justifyContent: "center" },
  cardName: { fontSize: 16, fontWeight: "800", color: "#18181B", letterSpacing: -0.2 },
  cardLocation: { fontSize: 12.5, color: "#71717A", fontWeight: "500", marginTop: 3 },
  cardMetaLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingVal: { fontSize: 12.5, fontWeight: "800", color: "#18181B" },
  metaCategory: { fontSize: 12, color: "#52525B", fontWeight: "600", textTransform: "capitalize" },
  removeBtn: { padding: 8, marginLeft: 4 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
  loadingText: { marginTop: 12, fontSize: 13.5, color: "#71717A", fontWeight: "500" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#18181B", marginBottom: 6 },
  emptyDesc: { fontSize: 13.5, color: "#71717A", textAlign: "center", lineHeight: 19, marginBottom: 20 },
  emptyCTA: { backgroundColor: "#D97706", borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12 },
  emptyCTAText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
