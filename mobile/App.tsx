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
import { HomeScreen } from "./src/screens/HomeScreen";
import { AddPOIScreen } from "./src/screens/AddPOIScreen";
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
            <Stack.Screen name="TripTracking" component={TripTrackingScreen} />
            <Stack.Screen name="PlaceDetails" component={PlaceDetailsScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
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
