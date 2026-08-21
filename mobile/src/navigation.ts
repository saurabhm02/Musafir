import type { Poi } from "./lib/pois";
import type { PlaceItem } from "./lib/mockData";

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Dashboard: undefined;
  Home: undefined;
  Search: undefined;
  TripTracking: undefined;
  PlaceDetails: { place?: PlaceItem } | undefined;
  POIDetails: { poi: Poi };
  AddPOI: { lat: number; lon: number };
};
