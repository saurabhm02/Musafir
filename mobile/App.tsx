import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { TripTrackingScreen } from "./src/screens/TripTrackingScreen";
import { PlaceDetailsScreen } from "./src/screens/PlaceDetailsScreen";
import { TrekDetailsScreen } from "./src/screens/TrekDetailsScreen";
import { AvailableRoutesScreen } from "./src/screens/AvailableRoutesScreen";
import { RoutePreviewScreen } from "./src/screens/RoutePreviewScreen";
import { ReachTrailheadScreen } from "./src/screens/ReachTrailheadScreen";
import { JourneyItineraryScreen } from "./src/screens/JourneyItineraryScreen";
import { JourneyMapScreen } from "./src/screens/JourneyMapScreen";
import { TrailheadArrivalScreen } from "./src/screens/TrailheadArrivalScreen";
import { TrailheadDirectionsScreen } from "./src/screens/TrailheadDirectionsScreen";
import { StartTrekConfirmScreen } from "./src/screens/StartTrekConfirmScreen";
import { LiveTrekTrackingScreen } from "./src/screens/LiveTrekTrackingScreen";
import { TrekCompleteScreen } from "./src/screens/TrekCompleteScreen";
import { TrekMemoriesMapScreen } from "./src/screens/TrekMemoriesMapScreen";
import { MemoryDetailScreen } from "./src/screens/MemoryDetailScreen";
import { AddMemoryScreen } from "./src/screens/AddMemoryScreen";
import { FilteredMemoriesScreen } from "./src/screens/FilteredMemoriesScreen";
import { TrekStoryOverviewScreen } from "./src/screens/TrekStoryOverviewScreen";
import { ActualRouteMapScreen } from "./src/screens/ActualRouteMapScreen";
import { TrekTimelineScreen } from "./src/screens/TrekTimelineScreen";
import { TrekMemoriesGalleryScreen } from "./src/screens/TrekMemoriesGalleryScreen";
import { TrekSummaryScreen } from "./src/screens/TrekSummaryScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SavedSpotsScreen } from "./src/screens/SavedSpotsScreen";
import { WantToGoScreen } from "./src/screens/WantToGoScreen";
import { VisitedScreen } from "./src/screens/VisitedScreen";
import { CollectionsScreen } from "./src/screens/CollectionsScreen";
import { CollectionDetailScreen } from "./src/screens/CollectionDetailScreen";
import { NotificationsScreen } from "./src/screens/NotificationsScreen";
import { TripNavigationScreen } from "./src/screens/TripNavigationScreen";
import { TripReviewScreen } from "./src/screens/TripReviewScreen";
import { ActiveNavigationScreen } from "./src/screens/ActiveNavigationScreen";
import { AddPOIScreen } from "./src/screens/AddPOIScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { DownloadedTreksScreen } from "./src/screens/DownloadedTreksScreen";
import { supabase } from "./src/lib/supabase";
import { colors } from "./src/theme";
import type { RootStackParamList } from "./src/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();
type InitialRoute = "Onboarding" | "Auth" | "Dashboard";

// Set to true to show Onboarding first for testing
const DEV_ALWAYS_SHOW_ONBOARDING = false;

export default function App() {
  const [initialRoute, setInitialRoute] = useState<InitialRoute | null>(null);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem("onboarded"), supabase.auth.getSession()]).then(([onboarded, { data }]) => {
      if (DEV_ALWAYS_SHOW_ONBOARDING || !onboarded) {
        return setInitialRoute("Onboarding");
      }
      const loggedIn = !!data.session && !data.session.user.is_anonymous;
      setInitialRoute(loggedIn ? "Dashboard" : "Auth");
    });
  }, []);

  if (!initialRoute) {
    return <View style={styles.loading} />;
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="SavedSpots" component={SavedSpotsScreen} />
            <Stack.Screen name="WantToGo" component={WantToGoScreen} />
            <Stack.Screen name="Visited" component={VisitedScreen} />
            <Stack.Screen name="Collections" component={CollectionsScreen} />
            <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="TripTracking" component={TripTrackingScreen} />
            <Stack.Screen name="PlaceDetails" component={PlaceDetailsScreen} />
            <Stack.Screen name="TrekDetails" component={TrekDetailsScreen} />
            <Stack.Screen name="AvailableRoutes" component={AvailableRoutesScreen} />
            <Stack.Screen name="RoutePreview" component={RoutePreviewScreen} />
            <Stack.Screen name="ReachTrailhead" component={ReachTrailheadScreen} />
            <Stack.Screen name="JourneyItinerary" component={JourneyItineraryScreen} />
            <Stack.Screen name="JourneyMap" component={JourneyMapScreen} />
            <Stack.Screen name="TrailheadArrival" component={TrailheadArrivalScreen} />
            <Stack.Screen name="TrailheadDirections" component={TrailheadDirectionsScreen} />
            <Stack.Screen name="StartTrekConfirm" component={StartTrekConfirmScreen} />
            <Stack.Screen name="LiveTrekTracking" component={LiveTrekTrackingScreen} />
            <Stack.Screen name="TrekComplete" component={TrekCompleteScreen} />
            <Stack.Screen name="TrekMemoriesMap" component={TrekMemoriesMapScreen} />
            <Stack.Screen name="MemoryDetail" component={MemoryDetailScreen} />
            <Stack.Screen name="AddMemory" component={AddMemoryScreen} />
            <Stack.Screen name="FilteredMemories" component={FilteredMemoriesScreen} />
            <Stack.Screen name="TrekStoryOverview" component={TrekStoryOverviewScreen} />
            <Stack.Screen name="ActualRouteMap" component={ActualRouteMapScreen} />
            <Stack.Screen name="TrekTimeline" component={TrekTimelineScreen} />
            <Stack.Screen name="TrekMemoriesGallery" component={TrekMemoriesGalleryScreen} />
            <Stack.Screen name="TrekSummary" component={TrekSummaryScreen} />
            <Stack.Screen name="TripNavigation" component={TripNavigationScreen} />
            <Stack.Screen name="TripReview" component={TripReviewScreen} />
            <Stack.Screen name="ActiveNavigation" component={ActiveNavigationScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="DownloadedTreks" component={DownloadedTreksScreen} />
            <Stack.Screen name="AddPOI" component={AddPOIScreen} options={{ presentation: "modal" }} />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, backgroundColor: colors.paper },
});
