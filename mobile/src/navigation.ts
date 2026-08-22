import type { Poi } from "./lib/pois";

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Dashboard: undefined;
  Home: undefined; // Explore (map) screen
  TripTracking: { tripId?: string } | undefined;
  PlaceDetails: { poi: Poi };
  AddPOI: { lat: number; lon: number };
};
