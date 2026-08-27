import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { RootStackParamList } from "../navigation";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
} from "../lib/notifications";
import { fetchPoiDetails } from "../lib/pois";
import { BottomTabBar, type TabType } from "../components/BottomTabBar";

function ArrowBackIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#18181B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckAllIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L7 17l-5-5" stroke="#18181B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 10l-7.5 7.5-2-2" stroke="#18181B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BellLargeIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z" stroke="#EA580C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21A2 2 0 0 1 10.27 21" stroke="#EA580C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  switch (type) {
    case "trip":
      return (
        <View style={[styles.iconWrap, { backgroundColor: "#FFEDD5" }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#EA580C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      );
    case "visited":
      return (
        <View style={[styles.iconWrap, { backgroundColor: "#DCFCE7" }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="9" stroke="#16A34A" strokeWidth={2} />
            <Path d="M8.5 12.3l2.3 2.3 4.7-5" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </View>
      );
    case "saved":
      return (
        <View style={[styles.iconWrap, { backgroundColor: "#EDE9FE" }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M19 21L12 16L5 21V5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V21Z" stroke="#7C3AED" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      );
    case "discovery":
      return (
        <View style={[styles.iconWrap, { backgroundColor: "#FEF3C7" }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#D97706" />
          </Svg>
        </View>
      );
    case "alert":
      return (
        <View style={[styles.iconWrap, { backgroundColor: "#E0F2FE" }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M11 5.882V19.24a1.76 1.76 0 0 1-3.417.592l-2.147-6.15M18 8a3 3 0 0 1 0 6M11 5.882l-7 4.118H2v4h2l7 4.118V5.882z" stroke="#0284C7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      );
    case "collection":
      return (
        <View style={[styles.iconWrap, { backgroundColor: "#FCE7F3" }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="#DB2777" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      );
    default:
      return (
        <View style={[styles.iconWrap, { backgroundColor: "#F3F4F6" }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="9" stroke="#6B7280" strokeWidth={2} />
          </Svg>
        </View>
      );
  }
}

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

export function NotificationsScreen({ navigation }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications();
      setNotifications(res.items);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  const handleNotificationPress = async (n: AppNotification) => {
    if (!n.is_read) {
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item)));
      markNotificationAsRead(n.id).catch(() => {});
    }

    const data = n.data || {};
    const entityType = data.entityType;
    const entityId = data.entityId || n.link_id;

    if (entityType === "trip" && entityId) {
      navigation.navigate("TripTracking", { tripId: entityId });
    } else if (entityType === "achievement") {
      navigation.navigate("Profile");
    } else if (entityType === "collection") {
      navigation.navigate("Collections");
    } else if (entityType === "poi" && entityId) {
      try {
        const poi = await fetchPoiDetails(entityId);
        if (poi) navigation.navigate("PlaceDetails", { poi: poi as any });
      } catch {}
    } else if (n.type === "saved") {
      navigation.navigate("SavedSpots");
    } else if (n.type === "visited") {
      navigation.navigate("Visited");
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await markAllNotificationsAsRead();
    } catch {
      loadNotifications();
    }
  };

  const handleTabPress = (tab: TabType) => {
    if (tab === "Home") navigation.navigate("Dashboard");
    else if (tab === "Explore") navigation.navigate("Home");
    else if (tab === "Trips") navigation.navigate("TripTracking", undefined);
    else if (tab === "Profile") navigation.navigate("Profile");
  };

  const todayNotifs = notifications.filter((n) => n.group === "today");
  const earlierNotifs = notifications.filter((n) => n.group === "earlier");

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF8" />

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowBackIcon size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead} activeOpacity={0.7}>
          <CheckAllIcon size={20} />
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <BellLargeIcon size={36} />
          </View>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyDesc}>
            We'll notify you here about your journey milestones, badge unlocks, and memories.
          </Text>
          <TouchableOpacity
            style={styles.emptyCTA}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.88}
          >
            <Text style={styles.emptyCTAText}>Explore Musafir</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {todayNotifs.length > 0 && (
            <View style={styles.sectionGroup}>
              <Text style={styles.sectionTitle}>Today</Text>
              <View style={styles.groupCards}>
                {todayNotifs.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.notifRow, !n.is_read && styles.notifRowUnread]}
                    onPress={() => handleNotificationPress(n)}
                    activeOpacity={0.75}
                  >
                    <NotificationIcon type={n.type} />
                    <View style={styles.notifContent}>
                      <View style={styles.titleLine}>
                        <Text style={styles.notifTitle} numberOfLines={1}>
                          {n.title}
                        </Text>
                        <Text style={styles.timeLabel}>{n.time_label}</Text>
                      </View>
                      <Text style={styles.notifSubtitle} numberOfLines={2}>
                        {n.subtitle}
                      </Text>
                    </View>
                    {!n.is_read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {earlierNotifs.length > 0 && (
            <View style={styles.sectionGroup}>
              <Text style={styles.sectionTitle}>Earlier</Text>
              <View style={styles.groupCards}>
                {earlierNotifs.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.notifRow, !n.is_read && styles.notifRowUnread]}
                    onPress={() => handleNotificationPress(n)}
                    activeOpacity={0.75}
                  >
                    <NotificationIcon type={n.type} />
                    <View style={styles.notifContent}>
                      <View style={styles.titleLine}>
                        <Text style={styles.notifTitle} numberOfLines={1}>
                          {n.title}
                        </Text>
                        <Text style={styles.timeLabel}>{n.time_label}</Text>
                      </View>
                      <Text style={styles.notifSubtitle} numberOfLines={2}>
                        {n.subtitle}
                      </Text>
                    </View>
                    {!n.is_read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <BottomTabBar activeTab="Home" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: -0.4,
  },
  markAllBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#71717A",
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 13.5,
    color: "#71717A",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyCTA: {
    backgroundColor: "#18181B",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyCTAText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 20,
  },
  sectionGroup: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#71717A",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  groupCards: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F4F5",
    gap: 14,
  },
  notifRowUnread: {
    backgroundColor: "#FFFBF7",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: {
    flex: 1,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#18181B",
    flex: 1,
    marginRight: 8,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  notifSubtitle: {
    fontSize: 12.5,
    color: "#71717A",
    lineHeight: 17,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EA580C",
  },
});
