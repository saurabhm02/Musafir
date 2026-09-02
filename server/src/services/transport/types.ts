export type TransportHubType =
  | "railway_station"
  | "railway_junction"
  | "airport"
  | "bus_terminal"
  | "road_junction"
  | "mountain_hub";

export type TransportMode = "train" | "bus" | "flight" | "cab" | "walk" | "local_transit";

export type DataStatus = "live" | "scheduled" | "estimated" | "unavailable";

export type JourneyStrategy =
  | "balanced"
  | "fastest"
  | "cheapest"
  | "train_focused"
  | "bus_focused"
  | "flight_enabled";

export interface TransportHub {
  id: string;
  name: string;
  hubType: TransportHubType;
  code: string | null;
  city: string | null;
  state: string | null;
  lat: number;
  lon: number;
  distanceKm?: number;
  importance: number;
}

export interface TransitCorridor {
  id: string;
  originHubId: string;
  destHubId: string;
  originHubName?: string;
  destHubName?: string;
  mode: TransportMode;
  operator: string | null;
  serviceName: string | null;
  durationMins: number;
  distanceKm: number | null;
  estimatedCostInr: number;
  frequency: string | null;
  departureTimes: string[];
  bookingUrl: string | null;
  dataStatus: DataStatus;
}

export interface JourneyLeg {
  id: string;
  legIndex: number;
  from: {
    name: string;
    code?: string | null;
    hubType?: string;
    lat: number;
    lon: number;
  };
  to: {
    name: string;
    code?: string | null;
    hubType?: string;
    lat: number;
    lon: number;
  };
  mode: TransportMode;
  provider: string;
  operator: string | null;
  serviceName: string | null;
  durationMins: number;
  distanceKm: number;
  estimatedCostInr: number;
  departureTime?: string | null;
  arrivalTime?: string | null;
  frequency?: string | null;
  dataStatus: DataStatus;
  bookingUrl?: string | null;
  instructions?: string | null;
}

export interface JourneyOption {
  id: string;
  strategy: JourneyStrategy;
  title: string;
  badge: string;
  isRecommended: boolean;
  totalDurationMins: number;
  totalDistanceKm: number;
  totalCostInr: number;
  primaryModes: TransportMode[];
  legs: JourneyLeg[];
  summary: string;
}

export interface JourneyDiscoveryInput {
  originLat: number;
  originLon: number;
  trekId?: string;
  trekRouteId?: string;
  preference?: JourneyStrategy;
}

export interface JourneyDiscoveryResult {
  origin: {
    lat: number;
    lon: number;
  };
  trek: {
    id: string;
    name: string;
    slug: string;
    region: string | null;
  };
  trailhead: {
    name: string;
    lat: number;
    lon: number;
  };
  journeys: JourneyOption[];
}
