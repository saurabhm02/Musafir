import type { Poi } from "./lib/pois";
import type { Route } from "./lib/routing";

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Dashboard: undefined;
  Home: undefined;
  SavedSpots: undefined;
  WantToGo: undefined;
  Visited: undefined;
  Collections: undefined;
  CollectionDetail: { collectionId: string; title?: string };
  Notifications: undefined;
  TripTracking: { tripId?: string } | undefined;
  PlaceDetails: { poi: Poi };
  TripNavigation: { poi: Poi };
  TripReview: { poi: Poi; route?: Route };
  ActiveNavigation: { poi: Poi; route?: Route };
  AddPOI: { lat: number; lon: number };
};


