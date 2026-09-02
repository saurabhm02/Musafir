import type { Poi } from "./lib/pois";
import type { Route } from "./lib/routing";
import type { TrekRouteItem } from "./lib/treks";
import type { JourneyOption } from "./lib/journeys";

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
  TrekDetails: { trekIdOrSlug?: string; poi?: Poi };
  AvailableRoutes: { trekId: string; trekName: string; initialRouteId?: string };
  RoutePreview: { trekId: string; trekName: string; routeId: string; route: TrekRouteItem };
  ReachTrailhead: {
    trekId: string;
    trekName: string;
    routeId?: string;
    trailheadName?: string;
    trailheadLat?: number;
    trailheadLon?: number;
    heroPhotoUrl?: string;
    region?: string;
  };
  JourneyItinerary: {
    journey: JourneyOption;
    trek: { id: string; name: string; slug: string; region: string | null };
    trailhead: { name: string; lat: number; lon: number };
    origin: { lat: number; lon: number; name: string };
  };
  JourneyMap: {
    journey: JourneyOption;
    trek: { id: string; name: string; slug: string; region: string | null };
    trailhead: { name: string; lat: number; lon: number };
    origin: { lat: number; lon: number; name: string };
  };
  TrailheadArrival: {
    trekId: string;
    trekName: string;
    route?: TrekRouteItem;
    trailheadName?: string;
    trailheadLat?: number;
    trailheadLon?: number;
    altitudeM?: number;
    forceArrival?: boolean;
  };
  TrailheadDirections: {
    trekId: string;
    trekName: string;
    route?: TrekRouteItem;
    trailheadName?: string;
    trailheadLat?: number;
    trailheadLon?: number;
    distanceM?: number;
  };
  StartTrekConfirm: {
    trekId: string;
    trekName: string;
    route?: TrekRouteItem;
    trailheadName?: string;
    trailheadLat?: number;
    trailheadLon?: number;
  };
  LiveTrekTracking: {
    trekId: string;
    trekName: string;
    route?: TrekRouteItem;
    trailheadName?: string;
    trailheadLat?: number;
    trailheadLon?: number;
    sessionId?: string;
  };
  TrekComplete: {
    trekId: string;
    trekName: string;
    route?: TrekRouteItem;
    sessionId?: string;
    finalDistanceKm?: number;
    finalDurationText?: string;
    finalElevationGainM?: number;
    highestAltitudeM?: number;
    waypointsCovered?: string;
  };
  TrekMemoriesMap: {
    trekId: string;
    trekName: string;
    routeId?: string;
    route?: TrekRouteItem;
  };
  MemoryDetail: {
    memoryId: string;
    memory?: any;
    trekId?: string;
    trekName?: string;
  };
  AddMemory: {
    trekId: string;
    trekName?: string;
    routeId?: string;
    trekSessionId?: string;
    initialLat?: number;
    initialLon?: number;
  };
  FilteredMemories: {
    trekId: string;
    trekName?: string;
    activeType?: string;
    onApply?: (type: string) => void;
  };
  TrekStoryOverview: {
    sessionId?: string;
    trekId?: string;
    trekName?: string;
    routeId?: string;
  };
  ActualRouteMap: {
    sessionId?: string;
    trekId?: string;
    trekName?: string;
    routeId?: string;
  };
  TrekTimeline: {
    sessionId?: string;
    trekId?: string;
    trekName?: string;
  };
  TrekMemoriesGallery: {
    sessionId?: string;
    trekId?: string;
    trekName?: string;
  };
  TrekSummary: {
    sessionId?: string;
    trekId?: string;
    trekName?: string;
  };
  TripNavigation: { poi: Poi };
  TripReview: { poi: Poi; route?: Route };
  ActiveNavigation: { poi: Poi; route?: Route };
  AddPOI: { lat: number; lon: number };
  DownloadedTreks: undefined;
  Profile: undefined;
};
