import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme";
import { OfflineStorage, type OfflineTrekPackageData } from "../lib/offlineStorage";
import { OfflineSyncManager } from "../lib/offlineSync";

interface Props {
  trekId: string;
  routeId?: string;
  trekName?: string;
  compact?: boolean;
  onPackageReady?: (pkg: OfflineTrekPackageData) => void;
}

function DownloadIcon({ size = 16, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckCircleIcon({ size = 16, color = "#16A34A" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AlertCircleIcon({ size = 16, color = "#D97706" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function OfflineTrekBadge({
  trekId,
  routeId,
  trekName,
  compact = false,
  onPackageReady,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pkg, setPkg] = useState<OfflineTrekPackageData | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);

  // 1. Check local package status on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    OfflineStorage.getOfflinePackage(trekId, routeId)
      .then(async (localPkg) => {
        if (!isMounted) return;
        setPkg(localPkg);
        if (localPkg && localPkg.status === "ready") {
          onPackageReady?.(localPkg);
          // Check if server has an updated version
          const check = await OfflineSyncManager.checkPackageUpdate(trekId, routeId);
          if (isMounted && check.updateAvailable) {
            setHasUpdate(true);
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [trekId, routeId]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setProgress(10);
      const downloaded = await OfflineSyncManager.downloadPackage(
        trekId,
        routeId,
        (pct) => setProgress(pct)
      );
      setPkg(downloaded);
      setHasUpdate(false);
      onPackageReady?.(downloaded);
    } catch (err: any) {
      Alert.alert(
        "Download Failed",
        err.message || "Could not download offline package. Please check your internet connection."
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      "Remove Offline Data?",
      `Remove downloaded offline data for ${trekName || "this trek"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await OfflineStorage.deleteOfflinePackage(trekId, routeId);
            setPkg(null);
            setHasUpdate(false);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  // State: Downloading
  if (downloading) {
    return (
      <View style={[styles.container, styles.downloadingContainer, compact && styles.compactContainer]}>
        <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 8 }} />
        <Text style={styles.downloadingText}>
          Saving for offline... {progress > 0 ? `${progress}%` : ""}
        </Text>
      </View>
    );
  }

  // State: Ready / Downloaded
  if (pkg && pkg.status === "ready") {
    const sizeKb = Math.round((pkg.sizeEstimateBytes || 120000) / 1024);

    return (
      <View style={[styles.container, styles.readyContainer, compact && styles.compactContainer]}>
        <View style={styles.readyLeft}>
          <CheckCircleIcon size={16} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.readyTitle}>Available Offline</Text>
            {!compact && (
              <Text style={styles.readySubtitle}>
                {sizeKb} KB • Route & GPS data stored locally
              </Text>
            )}
          </View>
        </View>

        <View style={styles.readyActions}>
          {hasUpdate ? (
            <TouchableOpacity style={styles.updateBtn} onPress={handleDownload} activeOpacity={0.8}>
              <AlertCircleIcon size={14} color="#D97706" />
              <Text style={styles.updateBtnText}>Update</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.removeBtn} onPress={handleRemove} activeOpacity={0.7}>
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // State: Not Downloaded
  return (
    <TouchableOpacity
      style={[styles.container, styles.downloadBtn, compact && styles.compactContainer]}
      onPress={handleDownload}
      activeOpacity={0.85}
    >
      <DownloadIcon size={16} color={colors.accent} />
      <View style={{ marginLeft: 8, flex: 1 }}>
        <Text style={styles.downloadBtnTitle}>Download for Offline</Text>
        {!compact && (
          <Text style={styles.downloadBtnSubtitle}>
            Save route, waypoints & map data for no-network use
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E3DE",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compactContainer: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  downloadBtn: {
    backgroundColor: "#FFF8F2",
    borderColor: "#FFD9B3",
  },
  downloadBtnTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  downloadBtnSubtitle: {
    fontSize: 11,
    color: "#8C5828",
    marginTop: 2,
  },
  downloadingContainer: {
    backgroundColor: "#FDFBF7",
    borderColor: "#E5E3DE",
  },
  downloadingText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
  },
  readyContainer: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  readyLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  readyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16A34A",
  },
  readySubtitle: {
    fontSize: 11,
    color: "#4B7C59",
    marginTop: 2,
  },
  readyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  updateBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  removeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  removeBtnText: {
    fontSize: 11,
    color: "#74736F",
  },
});
