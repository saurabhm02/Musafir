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
    case "map":
    default:
      return (
        <View style={[styles.iconWrap, { backgroundColor: "#DCFCE7" }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zm7-4v16m8-12v16" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
      const list = await fetchNotifications();
      setNotifications(list);
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

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await markNotificationAsRead(id);
    } catch {
      loadNotifications();
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
    else if (tab === "Profile") navigation.navigate("Auth");
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
            We'll notify you here about your upcoming trips, weather and road updates, and trending spots across India.
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
                    onPress={() => handleMarkRead(n.id)}
                    activeOpacity={0.85}
                  >
                    <NotificationIcon type={n.type} />
                    <View style={styles.notifBody}>
                      <Text style={[styles.notifTitle, !n.is_read && styles.notifTitleUnread]} numberOfLines={1}>
                        {n.title}
                      </Text>
                      <Text style={styles.notifSub} numberOfLines={1}>
                        {n.subtitle}
                      </Text>
                    </View>
                    <View style={styles.notifRight}>
                      <Text style={styles.notifTime}>{n.time_label}</Text>
                      {!n.is_read && <View style={styles.unreadDot} />}
                    </View>
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
                    onPress={() => handleMarkRead(n.id)}
                    activeOpacity={0.85}
                  >
                    <NotificationIcon type={n.type} />
                    <View style={styles.notifBody}>
                      <Text style={[styles.notifTitle, !n.is_read && styles.notifTitleUnread]} numberOfLines={1}>
                        {n.title}
                      </Text>
                      <Text style={styles.notifSub} numberOfLines={1}>
                        {n.subtitle}
                      </Text>
                    </View>
                    <View style={styles.notifRight}>
                      <Text style={styles.notifTime}>{n.time_label}</Text>
                      {!n.is_read && <View style={styles.unreadDot} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#18181B", letterSpacing: -0.4 },
  markAllBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100, gap: 20 },
  sectionGroup: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#71717A", letterSpacing: 0.2 },
  groupCards: { gap: 8 },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F4F4F5",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  notifRowUnread: {
    borderColor: "#E0E7FF",
    backgroundColor: "#FFFFFF",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notifBody: { flex: 1, justifyContent: "center" },
  notifTitle: { fontSize: 14.5, fontWeight: "600", color: "#374151" },
  notifTitleUnread: { fontWeight: "800", color: "#18181B" },
  notifSub: { fontSize: 12.5, color: "#71717A", marginTop: 2 },
  notifRight: { alignItems: "flex-end", gap: 6, paddingLeft: 8 },
  notifTime: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563EB" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
  loadingText: { marginTop: 12, fontSize: 13.5, color: "#71717A", fontWeight: "500" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 60 },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#18181B", marginBottom: 6 },
  emptyDesc: { fontSize: 13.5, color: "#71717A", textAlign: "center", lineHeight: 19, marginBottom: 20 },
  emptyCTA: { backgroundColor: "#EA580C", borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12 },
  emptyCTAText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
