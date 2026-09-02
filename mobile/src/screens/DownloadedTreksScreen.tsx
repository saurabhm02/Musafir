import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Circle, Path } from "react-native-svg";
import type { RootStackParamList } from "../navigation";
import { colors } from "../theme";
import { OfflineStorage, type OfflineTrekPackageData } from "../lib/offlineStorage";
import { OfflineSyncManager } from "../lib/offlineSync";

function ArrowBackIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke="#18181B"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 18, color = "#DC2626" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RefreshIcon({ size = 16, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, any>;

export function DownloadedTreksScreen({ navigation }: Props) {
  const [packages, setPackages] = useState<OfflineTrekPackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const list = await OfflineStorage.listOfflinePackages();
      setPackages(list);
    } catch {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const totalBytes = packages.reduce((sum, p) => sum + (p.sizeEstimateBytes || 120000), 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    let updatedCount = 0;
    try {
      for (const pkg of packages) {
        const check = await OfflineSyncManager.checkPackageUpdate(pkg.trek.id, pkg.route.id);
        if (check.updateAvailable) {
          await OfflineSyncManager.updatePackage(pkg.trek.id, pkg.route.id);
          updatedCount++;
        }
      }
      await loadPackages();
      if (updatedCount > 0) {
        Alert.alert("Packages Updated", `Successfully updated ${updatedCount} trek package(s).`);
      } else {
        Alert.alert("Up to Date", "All downloaded trek packages are already up to date.");
      }
    } catch {
      Alert.alert("Sync Notice", "Could not check updates. Working with existing offline data.");
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleDelete = (pkg: OfflineTrekPackageData) => {
    Alert.alert(
      "Remove Offline Trek",
      `Delete offline package for "${pkg.trek.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await OfflineStorage.deleteOfflinePackage(pkg.trek.id, pkg.route.id);
            await loadPackages();
          },
        },
      ]
    );
  };

  const handleOpenTrek = (pkg: OfflineTrekPackageData) => {
    navigation.navigate("TrekDetails", {
      trekIdOrSlug: pkg.trek.id,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowBackIcon size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Downloaded Treks</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Storage Summary Bar */}
      <View style={styles.summaryBar}>
        <View>
          <Text style={styles.summaryTitle}>
            {packages.length} {packages.length === 1 ? "Trek" : "Treks"} Available Offline
          </Text>
          <Text style={styles.summarySubtitle}>{totalMb} MB total storage used</Text>
        </View>

        {packages.length > 0 && (
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleCheckUpdates}
            disabled={checkingUpdates}
            activeOpacity={0.8}
          >
            {checkingUpdates ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <RefreshIcon size={14} color={colors.accent} />
                <Text style={styles.refreshBtnText}>Check Updates</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : packages.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>No Offline Treks</Text>
          <Text style={styles.emptyText}>
            You haven't downloaded any treks for offline use yet. Open any verified trek and tap
            "Download for Offline" to access maps and GPS navigation without cellular coverage.
          </Text>
        </View>
      ) : (
        <FlatList
          data={packages}
          keyExtractor={(item) => `${item.trek.id}:${item.route.id}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const sizeKb = Math.round((item.sizeEstimateBytes || 120000) / 1024);
            return (
              <TouchableOpacity
                style={styles.trekCard}
                onPress={() => handleOpenTrek(item)}
                activeOpacity={0.88}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.trekName}>{item.trek.name}</Text>
                    <Text style={styles.routeName}>{item.route.name}</Text>
                    <Text style={styles.metricsText}>
                      {item.route.distanceKm ? `${item.route.distanceKm} km` : ""}
                      {item.route.elevationGainM ? ` • +${item.route.elevationGainM} m` : ""}
                      {` • ${sizeKb} KB`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.trashBtn}
                    onPress={() => handleDelete(item)}
                    activeOpacity={0.7}
                  >
                    <TrashIcon size={18} />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Ready for Offline</Text>
                  </View>
                  <Text style={styles.downloadDate}>
                    Downloaded {new Date(item.downloadedAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F3",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E3DE",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#18181B",
  },
  summaryBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E3DE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18181B",
  },
  summarySubtitle: {
    fontSize: 12,
    color: "#74736F",
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF8F2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD9B3",
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  trekCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E3DE",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  trekName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#18181B",
  },
  routeName: {
    fontSize: 13,
    color: "#74736F",
    marginTop: 2,
  },
  metricsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 4,
  },
  trashBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  downloadDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#18181B",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#74736F",
    textAlign: "center",
    lineHeight: 20,
  },
});
