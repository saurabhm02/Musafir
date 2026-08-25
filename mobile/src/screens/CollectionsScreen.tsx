import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";
import type { RootStackParamList } from "../navigation";
import {
  fetchCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  type Collection,
} from "../lib/collections";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";

function ArrowBackIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#18181B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5V19M5 12H19" stroke="#18181B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FolderIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
        stroke="#D97706"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoreDotsIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="6" cy="12" r="1.8" fill="#FFFFFF" />
      <Circle cx="12" cy="12" r="1.8" fill="#FFFFFF" />
      <Circle cx="18" cy="12" r="1.8" fill="#FFFFFF" />
    </Svg>
  );
}

function MoreDotsDarkIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="6" cy="12" r="1.8" fill="#71717A" />
      <Circle cx="12" cy="12" r="1.8" fill="#71717A" />
      <Circle cx="18" cy="12" r="1.8" fill="#71717A" />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Collections">;

export function CollectionsScreen({ navigation }: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchCollections();
      setCollections(list);
    } catch {
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCollections();
    }, [loadCollections]),
  );

  const handleCreate = async () => {
    if (!newColName.trim()) return;
    setCreating(true);
    try {
      await createCollection({ name: newColName.trim(), description: newColDesc.trim() || undefined });
      setNewColName("");
      setNewColDesc("");
      setCreateModalVisible(false);
      loadCollections();
    } catch {
      Alert.alert("Error", "Could not create collection. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleOptions = (col: Collection) => {
    Alert.alert(col.name, "Manage collection", [
      {
        text: "Rename",
        onPress: () => {
          Alert.prompt
            ? Alert.prompt("Rename Collection", "Enter a new name:", async (text) => {
                if (text && text.trim()) {
                  await updateCollection(col.id, { name: text.trim() });
                  loadCollections();
                }
              })
            : null;
        },
      },
      {
        text: "Delete Collection",
        style: "destructive",
        onPress: async () => {
          await deleteCollection(col.id);
          loadCollections();
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleTabPress = (tab: TabType) => {
    if (tab === "Home") navigation.navigate("Dashboard");
    else if (tab === "Explore") navigation.navigate("Home");
    else if (tab === "Trips") navigation.navigate("TripTracking", undefined);
    else if (tab === "Profile") navigation.navigate("Auth");
  };

  const mainCollections = collections.slice(0, 4);
  const recentCollections = collections.slice(4);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowBackIcon size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Collections</Text>
        </View>

        <TouchableOpacity
          style={styles.plusBtn}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.75}
        >
          <PlusIcon size={22} />
        </TouchableOpacity>
      </View>

      {/* Subtitle count */}
      <View style={styles.subHeaderRow}>
        <Text style={styles.subHeaderText}>
          {collections.length} collection{collections.length === 1 ? "" : "s"}
        </Text>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#D97706" />
          <Text style={styles.loadingText}>Loading collections...</Text>
        </View>
      ) : collections.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <FolderIcon size={36} />
          </View>
          <Text style={styles.emptyTitle}>No collections yet</Text>
          <Text style={styles.emptyDesc}>
            Organize your favorite mountain trails, temples, waterfalls, and road trips into custom collections.
          </Text>
          <TouchableOpacity
            style={styles.emptyCTA}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.88}
          >
            <Text style={styles.emptyCTAText}>Create Collection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 2-Column Grid */}
          <View style={styles.gridRow}>
            {mainCollections.map((col) => (
              <TouchableOpacity
                key={col.id}
                style={styles.gridCard}
                onPress={() => navigation.navigate("CollectionDetail", { collectionId: col.id, title: col.name })}
                activeOpacity={0.9}
              >
                {col.cover_url ? (
                  <Image source={{ uri: col.cover_url }} style={styles.gridCardImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.gridCardImg, styles.gridCardImgFallback]}>
                    <FolderIcon size={32} />
                  </View>
                )}

                {/* Dark Gradient Overlay */}
                <View style={styles.gridCardOverlay} />

                {/* Top Options Button */}
                <TouchableOpacity
                  style={styles.cardOptionsBtn}
                  onPress={() => handleOptions(col)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={styles.dotsCircle}>
                    <MoreDotsIcon size={14} />
                  </View>
                </TouchableOpacity>

                {/* Bottom Meta */}
                <View style={styles.gridCardBottom}>
                  <Text style={styles.gridCardTitle} numberOfLines={1}>
                    {col.name}
                  </Text>
                  <Text style={styles.gridCardCount}>
                    {col.poi_count} place{col.poi_count === 1 ? "" : "s"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recently Added Section (if more collections exist) */}
          {recentCollections.length > 0 && (
            <View style={styles.recentlyAddedSection}>
              <Text style={styles.sectionTitle}>Recently Added</Text>
              <View style={styles.recentList}>
                {recentCollections.map((col) => (
                  <TouchableOpacity
                    key={col.id}
                    style={styles.recentCard}
                    onPress={() => navigation.navigate("CollectionDetail", { collectionId: col.id, title: col.name })}
                    activeOpacity={0.88}
                  >
                    {col.cover_url ? (
                      <Image source={{ uri: col.cover_url }} style={styles.recentThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.recentThumb, styles.gridCardImgFallback]}>
                        <FolderIcon size={20} />
                      </View>
                    )}
                    <View style={styles.recentDetails}>
                      <Text style={styles.recentTitle}>{col.name}</Text>
                      <Text style={styles.recentCount}>
                        {col.poi_count} place{col.poi_count === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.recentOptionsBtn}
                      onPress={() => handleOptions(col)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MoreDotsDarkIcon size={16} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Create Collection Modal */}
      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Collection</Text>
            <Text style={styles.modalSubtitle}>Give your curated list of spots a name</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Hidden Waterfalls, Paragliding Spots"
              placeholderTextColor="#9CA3AF"
              value={newColName}
              onChangeText={setNewColName}
              autoFocus
            />

            <TextInput
              style={[styles.modalInput, styles.modalInputMulti]}
              placeholder="Optional description"
              placeholderTextColor="#9CA3AF"
              value={newColDesc}
              onChangeText={setNewColDesc}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCreateModalVisible(false)}
                disabled={creating}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, !newColName.trim() && styles.modalSubmitDisabled]}
                onPress={handleCreate}
                disabled={!newColName.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#18181B", letterSpacing: -0.4 },
  plusBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  subHeaderRow: { paddingHorizontal: 20, paddingBottom: 12 },
  subHeaderText: { fontSize: 13, fontWeight: "600", color: "#71717A" },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  gridRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 14 },
  gridCard: {
    width: "47.8%",
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#18181B",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  gridCardImg: { width: "100%", height: "100%" },
  gridCardImgFallback: { backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  gridCardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.38)",
  },
  cardOptionsBtn: { position: "absolute", top: 10, right: 10 },
  dotsCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardBottom: { position: "absolute", bottom: 12, left: 12, right: 12 },
  gridCardTitle: { fontSize: 15.5, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.2 },
  gridCardCount: { fontSize: 11.5, fontWeight: "600", color: "rgba(255, 255, 255, 0.8)", marginTop: 2 },
  recentlyAddedSection: { marginTop: 26 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#18181B", marginBottom: 12 },
  recentList: { gap: 10 },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 10,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  recentThumb: { width: 56, height: 56, borderRadius: 14, marginRight: 12 },
  recentDetails: { flex: 1 },
  recentTitle: { fontSize: 14.5, fontWeight: "700", color: "#18181B" },
  recentCount: { fontSize: 12, color: "#71717A", fontWeight: "500", marginTop: 2 },
  recentOptionsBtn: { padding: 8 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
  loadingText: { marginTop: 12, fontSize: 13.5, color: "#71717A", fontWeight: "500" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 60 },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#18181B", marginBottom: 6 },
  emptyDesc: { fontSize: 13.5, color: "#71717A", textAlign: "center", lineHeight: 19, marginBottom: 20 },
  emptyCTA: { backgroundColor: "#D97706", borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12 },
  emptyCTAText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: { fontSize: 19, fontWeight: "800", color: "#18181B", marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: "#71717A", marginBottom: 16 },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#18181B",
    marginBottom: 12,
  },
  modalInputMulti: { height: 70, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  modalCancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: "#71717A" },
  modalSubmitBtn: {
    backgroundColor: "#D97706",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: "center",
  },
  modalSubmitDisabled: { opacity: 0.5 },
  modalSubmitText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
