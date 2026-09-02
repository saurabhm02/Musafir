import { db } from "../../lib/db";
import {
  RailwayProvider,
  BusProvider,
  FlightProvider,
  RoadProvider,
} from "./providers";
import {
  discoverNearbyOriginHubs,
  discoverNearbyDestinationHubs,
} from "./hubDiscovery";
import type {
  JourneyDiscoveryInput,
  JourneyDiscoveryResult,
  JourneyOption,
  JourneyLeg,
  TransportHub,
  TransitCorridor,
} from "./types";

const railwayProvider = new RailwayProvider();
const busProvider = new BusProvider();
const flightProvider = new FlightProvider();
const roadProvider = new RoadProvider();

// Simple in-memory cache with 10-minute TTL
interface CacheEntry {
  expiresAt: number;
  data: JourneyDiscoveryResult;
}
const journeyCache = new Map<string, CacheEntry>();

function getCacheKey(input: JourneyDiscoveryInput): string {
  const latRounded = Number(input.originLat.toFixed(2));
  const lonRounded = Number(input.originLon.toFixed(2));
  const target = input.trekRouteId || input.trekId || "default";
  const pref = input.preference || "all";
  return `${latRounded}_${lonRounded}_${target}_${pref}`;
}

export async function discoverJourneys(
  input: JourneyDiscoveryInput
): Promise<JourneyDiscoveryResult> {
  const cacheKey = getCacheKey(input);
  const cached = journeyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 1. Resolve Trek & Trailhead information
  let trekId = input.trekId;
  let trailheadName = "Trailhead";
  let trailheadLat: number | null = null;
  let trailheadLon: number | null = null;
  let trekName = "Trek";
  let trekSlug = "trek";
  let trekRegion: string | null = null;

  if (input.trekRouteId) {
    const rawRoute = await db.$queryRawUnsafe<any[]>(
      `
      SELECT 
        tr.id,
        tr.trek_id as "trekId",
        tr.name as "routeName",
        tr.start_point_name as "startPointName",
        st_y(tr.start_location::geometry) as "startLat",
        st_x(tr.start_location::geometry) as "startLon",
        t.name as "trekName",
        t.slug as "trekSlug",
        t.region as "trekRegion",
        st_y(p.location::geometry) as "poiLat",
        st_x(p.location::geometry) as "poiLon"
      FROM trek_routes tr
      JOIN treks t ON t.id = tr.trek_id
      JOIN pois p ON p.id = t.poi_id
      WHERE tr.id = $1::uuid
      LIMIT 1
    `,
      input.trekRouteId
    );

    if (rawRoute.length > 0) {
      const r = rawRoute[0];
      trekId = r.trekId;
      trekName = r.trekName;
      trekSlug = r.trekSlug;
      trekRegion = r.trekRegion;
      trailheadName = r.startPointName || "Trailhead Start Point";
      trailheadLat = r.startLat ? Number(r.startLat) : Number(r.poiLat);
      trailheadLon = r.startLon ? Number(r.startLon) : Number(r.poiLon);
    }
  }

  if (!trailheadLat || !trailheadLon) {
    if (!trekId) {
      throw Object.assign(new Error("Either trekRouteId or trekId is required"), { status: 400 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trekId);
    const sql = isUuid
      ? `
      SELECT 
        t.id,
        t.name as "trekName",
        t.slug as "trekSlug",
        t.region as "trekRegion",
        st_y(p.location::geometry) as "poiLat",
        st_x(p.location::geometry) as "poiLon",
        (
          SELECT tr.start_point_name 
          FROM trek_routes tr 
          WHERE tr.trek_id = t.id 
          ORDER BY tr.is_primary DESC, tr.created_at ASC 
          LIMIT 1
        ) as "primaryStartName",
        (
          SELECT st_y(tr.start_location::geometry) 
          FROM trek_routes tr 
          WHERE tr.trek_id = t.id AND tr.start_location IS NOT NULL
          ORDER BY tr.is_primary DESC, tr.created_at ASC 
          LIMIT 1
        ) as "primaryStartLat",
        (
          SELECT st_x(tr.start_location::geometry) 
          FROM trek_routes tr 
          WHERE tr.trek_id = t.id AND tr.start_location IS NOT NULL
          ORDER BY tr.is_primary DESC, tr.created_at ASC 
          LIMIT 1
        ) as "primaryStartLon"
      FROM treks t
      JOIN pois p ON p.id = t.poi_id
      WHERE t.id = $1::uuid
      LIMIT 1
    `
      : `
      SELECT 
        t.id,
        t.name as "trekName",
        t.slug as "trekSlug",
        t.region as "trekRegion",
        st_y(p.location::geometry) as "poiLat",
        st_x(p.location::geometry) as "poiLon",
        (
          SELECT tr.start_point_name 
          FROM trek_routes tr 
          WHERE tr.trek_id = t.id 
          ORDER BY tr.is_primary DESC, tr.created_at ASC 
          LIMIT 1
        ) as "primaryStartName",
        (
          SELECT st_y(tr.start_location::geometry) 
          FROM trek_routes tr 
          WHERE tr.trek_id = t.id AND tr.start_location IS NOT NULL
          ORDER BY tr.is_primary DESC, tr.created_at ASC 
          LIMIT 1
        ) as "primaryStartLat",
        (
          SELECT st_x(tr.start_location::geometry) 
          FROM trek_routes tr 
          WHERE tr.trek_id = t.id AND tr.start_location IS NOT NULL
          ORDER BY tr.is_primary DESC, tr.created_at ASC 
          LIMIT 1
        ) as "primaryStartLon"
      FROM treks t
      JOIN pois p ON p.id = t.poi_id
      WHERE t.slug = $1
      LIMIT 1
    `;

    const rawTrek = await db.$queryRawUnsafe<any[]>(sql, trekId);

    if (rawTrek.length === 0) {
      throw Object.assign(new Error("Trek not found"), { status: 404 });
    }

    const t = rawTrek[0];
    trekId = t.id;
    trekName = t.trekName;
    trekSlug = t.trekSlug;
    trekRegion = t.trekRegion;
    trailheadName = t.primaryStartName || "Trailhead Start Point";
    trailheadLat = t.primaryStartLat ? Number(t.primaryStartLat) : Number(t.poiLat);
    trailheadLon = t.primaryStartLon ? Number(t.primaryStartLon) : Number(t.poiLon);
  }

  const origin = { lat: input.originLat, lon: input.originLon };
  const trailhead = { name: trailheadName, lat: trailheadLat, lon: trailheadLon };

  // 2. Discover Candidate Origin Hubs near user GPS
  const originHubs = await discoverNearbyOriginHubs(origin.lat, origin.lon);

  // 3. Discover Candidate Destination Hubs near Trailhead
  const destHubs = await discoverNearbyDestinationHubs(trailhead.lat, trailhead.lon);

  // 4. Fetch national transit gateways (New Delhi, Chandigarh)
  const gateways = await db.$queryRawUnsafe<any[]>(`
    SELECT 
      th.id,
      th.name,
      th.hub_type as "hubType",
      th.code,
      th.city,
      th.state,
      th.importance,
      st_y(th.location::geometry) as lat,
      st_x(th.location::geometry) as lon
    FROM transport_hubs th
    WHERE th.code IN ('NDLS', 'DEL', 'ISBT_DEL_KG', 'CDG', 'IXC', 'ISBT_CDG_43')
  `);

  const gatewayMap = new Map<string, TransportHub>();
  for (const g of gateways) {
    gatewayMap.set(g.code || g.name, {
      id: g.id,
      name: g.name,
      hubType: g.hubType,
      code: g.code,
      city: g.city,
      state: g.state,
      lat: Number(g.lat),
      lon: Number(g.lon),
      importance: g.importance,
    });
  }

  // Identify Gateway Nodes
  const delRail = gatewayMap.get("NDLS");
  const delAir = gatewayMap.get("DEL");
  const delBus = gatewayMap.get("ISBT_DEL_KG");
  const cdgRail = gatewayMap.get("CDG");

  // Identify Best Destination Nodes near Trailhead
  const destValleyBus =
    destHubs.find((h) => h.hubType === "mountain_hub" || h.hubType === "bus_terminal") ||
    destHubs[0];
  const destAirport = destHubs.find((h) => h.hubType === "airport");
  const destRailhead = destHubs.find(
    (h) => h.hubType === "railway_junction" || h.hubType === "railway_station"
  );

  // Identify Best Origin Nodes near User GPS
  const originLocalStation = originHubs.find((h) => h.hubType === "railway_station");
  const originJunction =
    originHubs.find((h) => h.hubType === "railway_junction") || originLocalStation;
  const originAirport = originHubs.find((h) => h.hubType === "airport");

  const journeys: JourneyOption[] = [];

  // =========================================================================
  // JOURNEY OPTION 1: BALANCED (Train + Overnight Volvo + Mountain Transfer)
  // =========================================================================
  if (originJunction && delRail && delBus && destValleyBus) {
    const legs: JourneyLeg[] = [];

    // Leg 1: First Mile (User GPS -> Origin Rail Junction)
    const leg1Road = roadProvider.calculateRoadLeg(
      { name: "Current Location", lat: origin.lat, lon: origin.lon },
      { name: originJunction.name, lat: originJunction.lat, lon: originJunction.lon }
    );
    legs.push({
      id: "leg-1",
      legIndex: 1,
      from: { name: "Current Location", lat: origin.lat, lon: origin.lon },
      to: {
        name: originJunction.name,
        code: originJunction.code,
        hubType: originJunction.hubType,
        lat: originJunction.lat,
        lon: originJunction.lon,
      },
      mode: "cab",
      provider: "Local Taxi / Auto",
      operator: null,
      serviceName: "First-Mile Transfer",
      durationMins: leg1Road.durationMins,
      distanceKm: leg1Road.distanceKm,
      estimatedCostInr: leg1Road.estimatedCostInr,
      dataStatus: "estimated",
      instructions: `Take a local cab or auto to ${originJunction.name}`,
    });

    // Leg 2: Intercity Rail (Origin Junction -> New Delhi NDLS)
    const trainCorridors = await railwayProvider.getCorridors(originJunction.id, delRail.id);
    const trainCorr = trainCorridors[0] || {
      operator: "Indian Railways",
      serviceName: "Superfast Express",
      durationMins: Math.round((originJunction.distanceKm || 900) * 1.1),
      distanceKm: originJunction.distanceKm ? originJunction.distanceKm * 1.1 : 950,
      estimatedCostInr: 750,
      frequency: "daily",
      departureTimes: ["15:30"],
      bookingUrl: "https://www.irctc.co.in",
      dataStatus: "scheduled" as const,
    };

    legs.push({
      id: "leg-2",
      legIndex: 2,
      from: {
        name: originJunction.name,
        code: originJunction.code,
        hubType: originJunction.hubType,
        lat: originJunction.lat,
        lon: originJunction.lon,
      },
      to: {
        name: delRail.name,
        code: delRail.code,
        hubType: delRail.hubType,
        lat: delRail.lat,
        lon: delRail.lon,
      },
      mode: "train",
      provider: "Indian Railways",
      operator: trainCorr.operator,
      serviceName: trainCorr.serviceName || "Superfast Express",
      durationMins: trainCorr.durationMins,
      distanceKm: trainCorr.distanceKm || 950,
      estimatedCostInr: trainCorr.estimatedCostInr,
      departureTime: trainCorr.departureTimes[0] || "15:30",
      frequency: trainCorr.frequency,
      dataStatus: trainCorr.dataStatus,
      bookingUrl: trainCorr.bookingUrl,
      instructions: `Board ${trainCorr.serviceName || "Superfast Express"} from ${originJunction.name} to ${delRail.name}`,
    });

    // Leg 3: Interstate Volvo Bus (Delhi ISBT -> Himalayan Valley Hub)
    const busCorridors = await busProvider.getCorridors(delBus.id, destValleyBus.id);
    const busCorr = busCorridors[0] || {
      operator: "HRTC / Private Volvo",
      serviceName: "Himsuta Volvo AC Sleeper",
      durationMins: 660, // 11 hrs
      distanceKm: 480,
      estimatedCostInr: 1250,
      frequency: "hourly_evening",
      departureTimes: ["19:30", "20:30", "21:30"],
      bookingUrl: "https://www.redbus.in",
      dataStatus: "scheduled" as const,
    };

    legs.push({
      id: "leg-3",
      legIndex: 3,
      from: {
        name: delBus.name,
        code: delBus.code,
        hubType: delBus.hubType,
        lat: delBus.lat,
        lon: delBus.lon,
      },
      to: {
        name: destValleyBus.name,
        code: destValleyBus.code,
        hubType: destValleyBus.hubType,
        lat: destValleyBus.lat,
        lon: destValleyBus.lon,
      },
      mode: "bus",
      provider: "Interstate Volvo",
      operator: busCorr.operator,
      serviceName: busCorr.serviceName || "Volvo AC Sleeper",
      durationMins: busCorr.durationMins,
      distanceKm: busCorr.distanceKm || 480,
      estimatedCostInr: busCorr.estimatedCostInr,
      departureTime: busCorr.departureTimes[0] || "20:00",
      frequency: busCorr.frequency,
      dataStatus: busCorr.dataStatus,
      bookingUrl: busCorr.bookingUrl,
      instructions: `Overnight Volvo bus from ${delBus.name} to ${destValleyBus.name}`,
    });

    // Leg 4: Last Mile Mountain Transfer (Valley Hub -> Trailhead)
    const leg4Road = roadProvider.calculateRoadLeg(
      { name: destValleyBus.name, lat: destValleyBus.lat, lon: destValleyBus.lon },
      { name: trailhead.name, lat: trailhead.lat, lon: trailhead.lon },
      true
    );

    legs.push({
      id: "leg-4",
      legIndex: 4,
      from: {
        name: destValleyBus.name,
        code: destValleyBus.code,
        hubType: destValleyBus.hubType,
        lat: destValleyBus.lat,
        lon: destValleyBus.lon,
      },
      to: {
        name: trailhead.name,
        hubType: "trailhead",
        lat: trailhead.lat,
        lon: trailhead.lon,
      },
      mode: "local_transit",
      provider: "Local Mountain Transport",
      operator: "HRTC Local / Mountain Taxi",
      serviceName: "Valley to Trailhead Shuttle",
      durationMins: leg4Road.durationMins,
      distanceKm: leg4Road.distanceKm,
      estimatedCostInr: Math.round(leg4Road.estimatedCostInr * 0.4), // shared cab/bus rate
      dataStatus: "estimated",
      instructions: `Take local mountain bus or shared taxi from ${destValleyBus.name} to ${trailhead.name}`,
    });

    const totalDur = legs.reduce((acc, l) => acc + l.durationMins, 0);
    const totalDist = legs.reduce((acc, l) => acc + l.distanceKm, 0);
    const totalCost = legs.reduce((acc, l) => acc + l.estimatedCostInr, 0);

    journeys.push({
      id: "journey-balanced",
      strategy: "balanced",
      title: `${originJunction.name.replace(/ Junction| Railway Station/i, "")} → Delhi → ${destValleyBus.name} → ${trailhead.name}`,
      badge: "Recommended",
      isRecommended: true,
      totalDurationMins: totalDur,
      totalDistanceKm: Math.round(totalDist),
      totalCostInr: totalCost,
      primaryModes: ["train", "bus", "local_transit"],
      legs,
      summary: `Train to Delhi (${originJunction.name}), overnight Volvo to ${destValleyBus.name}, then local transfer to trailhead.`,
    });
  }

  // =========================================================================
  // JOURNEY OPTION 2: FASTEST (Flight-Enabled)
  // =========================================================================
  if (originAirport && delAir && destValleyBus) {
    const legs: JourneyLeg[] = [];

    // Leg 1: Cab to Origin Airport
    const leg1Road = roadProvider.calculateRoadLeg(
      { name: "Current Location", lat: origin.lat, lon: origin.lon },
      { name: originAirport.name, lat: originAirport.lat, lon: originAirport.lon }
    );
    legs.push({
      id: "leg-fast-1",
      legIndex: 1,
      from: { name: "Current Location", lat: origin.lat, lon: origin.lon },
      to: {
        name: originAirport.name,
        code: originAirport.code,
        hubType: originAirport.hubType,
        lat: originAirport.lat,
        lon: originAirport.lon,
      },
      mode: "cab",
      provider: "Prepaid Cab / Taxi",
      operator: null,
      serviceName: "Airport Drop Cab",
      durationMins: leg1Road.durationMins,
      distanceKm: leg1Road.distanceKm,
      estimatedCostInr: leg1Road.estimatedCostInr,
      dataStatus: "estimated",
      instructions: `Direct taxi to ${originAirport.name} (${originAirport.code})`,
    });

    // Leg 2: Domestic Flight (Origin Airport -> Delhi DEL)
    const flightCorridors = await flightProvider.getCorridors(originAirport.id, delAir.id);
    const flightCorr = flightCorridors[0] || {
      operator: "IndiGo / Air India",
      serviceName: `Direct Flight (${originAirport.code} → DEL)`,
      durationMins: 110,
      distanceKm: 850,
      estimatedCostInr: 4200,
      frequency: "multiple_daily",
      departureTimes: ["08:20", "14:15", "19:40"],
      bookingUrl: `https://www.google.com/travel/flights?q=flights+from+${originAirport.code}+to+DEL`,
      dataStatus: "scheduled" as const,
    };

    legs.push({
      id: "leg-fast-2",
      legIndex: 2,
      from: {
        name: originAirport.name,
        code: originAirport.code,
        hubType: originAirport.hubType,
        lat: originAirport.lat,
        lon: originAirport.lon,
      },
      to: {
        name: delAir.name,
        code: delAir.code,
        hubType: delAir.hubType,
        lat: delAir.lat,
        lon: delAir.lon,
      },
      mode: "flight",
      provider: "Domestic Airline",
      operator: flightCorr.operator,
      serviceName: flightCorr.serviceName,
      durationMins: flightCorr.durationMins + 90, // Include airport check-in buffer
      distanceKm: flightCorr.distanceKm || 850,
      estimatedCostInr: flightCorr.estimatedCostInr,
      departureTime: flightCorr.departureTimes[0] || "08:20",
      frequency: flightCorr.frequency,
      dataStatus: flightCorr.dataStatus,
      bookingUrl: flightCorr.bookingUrl,
      instructions: `Flight from ${originAirport.name} to Indira Gandhi International Airport (DEL)`,
    });

    // Leg 3: Connect to Himalayan Airport (Bhuntar KUU) OR Express Mountain Cab from Delhi
    if (destAirport) {
      const hillFlightCorridors = await flightProvider.getCorridors(delAir.id, destAirport.id);
      const hillFlight = hillFlightCorridors[0] || {
        operator: "Alliance Air",
        serviceName: `ATR-72 Direct Flight (DEL → ${destAirport.code})`,
        durationMins: 75,
        distanceKm: 380,
        estimatedCostInr: 5800,
        frequency: "daily_morning",
        departureTimes: ["06:45"],
        bookingUrl: `https://www.google.com/travel/flights?q=flights+from+DEL+to+${destAirport.code}`,
        dataStatus: "scheduled" as const,
      };

      legs.push({
        id: "leg-fast-3",
        legIndex: 3,
        from: {
          name: delAir.name,
          code: delAir.code,
          hubType: delAir.hubType,
          lat: delAir.lat,
          lon: delAir.lon,
        },
        to: {
          name: destAirport.name,
          code: destAirport.code,
          hubType: destAirport.hubType,
          lat: destAirport.lat,
          lon: destAirport.lon,
        },
        mode: "flight",
        provider: "Domestic Airline",
        operator: hillFlight.operator,
        serviceName: hillFlight.serviceName,
        durationMins: hillFlight.durationMins + 60,
        distanceKm: hillFlight.distanceKm || 380,
        estimatedCostInr: hillFlight.estimatedCostInr,
        departureTime: hillFlight.departureTimes[0] || "06:45",
        frequency: hillFlight.frequency,
        dataStatus: hillFlight.dataStatus,
        bookingUrl: hillFlight.bookingUrl,
        instructions: `Scenic mountain flight into ${destAirport.name} (${destAirport.code})`,
      });

      // Leg 4: Airport to Trailhead
      const leg4Road = roadProvider.calculateRoadLeg(
        { name: destAirport.name, lat: destAirport.lat, lon: destAirport.lon },
        { name: trailhead.name, lat: trailhead.lat, lon: trailhead.lon },
        true
      );

      legs.push({
        id: "leg-fast-4",
        legIndex: 4,
        from: {
          name: destAirport.name,
          code: destAirport.code,
          hubType: destAirport.hubType,
          lat: destAirport.lat,
          lon: destAirport.lon,
        },
        to: {
          name: trailhead.name,
          hubType: "trailhead",
          lat: trailhead.lat,
          lon: trailhead.lon,
        },
        mode: "cab",
        provider: "Prepaid Mountain Taxi",
        operator: "Airport Taxi Union",
        serviceName: "Prepaid Mountain Cab",
        durationMins: leg4Road.durationMins,
        distanceKm: leg4Road.distanceKm,
        estimatedCostInr: leg4Road.estimatedCostInr,
        dataStatus: "estimated",
        instructions: `Take a prepaid mountain taxi from ${destAirport.name} directly to ${trailhead.name}`,
      });
    }

    const totalDur = legs.reduce((acc, l) => acc + l.durationMins, 0);
    const totalDist = legs.reduce((acc, l) => acc + l.distanceKm, 0);
    const totalCost = legs.reduce((acc, l) => acc + l.estimatedCostInr, 0);

    journeys.push({
      id: "journey-fastest",
      strategy: "fastest",
      title: `${originAirport.code} → Delhi → ${destAirport ? destAirport.code : destValleyBus.name} → ${trailhead.name}`,
      badge: "Fastest",
      isRecommended: false,
      totalDurationMins: totalDur,
      totalDistanceKm: Math.round(totalDist),
      totalCostInr: totalCost,
      primaryModes: ["flight", "cab"],
      legs,
      summary: `Flight via Delhi to ${destAirport ? destAirport.name : "Himachal"}, cutting journey time down to under ${Math.round(totalDur / 60)} hours.`,
    });
  }

  // =========================================================================
  // JOURNEY OPTION 3: CHEAPEST / BUDGET (Sleeper Rail + Ordinary RTC Bus)
  // =========================================================================
  if ((originLocalStation || originJunction) && delRail && delBus && destValleyBus) {
    const startStation = originLocalStation || originJunction!;
    const legs: JourneyLeg[] = [];

    // Leg 1: Local passenger train or bus to main junction (if starting at local station)
    if (originLocalStation && originJunction && originLocalStation.id !== originJunction.id) {
      legs.push({
        id: "leg-cheap-1",
        legIndex: 1,
        from: { name: "Current Location", lat: origin.lat, lon: origin.lon },
        to: {
          name: originLocalStation.name,
          code: originLocalStation.code,
          hubType: originLocalStation.hubType,
          lat: originLocalStation.lat,
          lon: originLocalStation.lon,
        },
        mode: "walk",
        provider: "Local Walk / Shared Auto",
        operator: null,
        serviceName: "Station Walk",
        durationMins: 15,
        distanceKm: 1.5,
        estimatedCostInr: 20,
        dataStatus: "estimated",
        instructions: `Walk or shared auto to ${originLocalStation.name}`,
      });

      legs.push({
        id: "leg-cheap-2",
        legIndex: 2,
        from: {
          name: originLocalStation.name,
          code: originLocalStation.code,
          hubType: originLocalStation.hubType,
          lat: originLocalStation.lat,
          lon: originLocalStation.lon,
        },
        to: {
          name: originJunction.name,
          code: originJunction.code,
          hubType: originJunction.hubType,
          lat: originJunction.lat,
          lon: originJunction.lon,
        },
        mode: "train",
        provider: "Indian Railways",
        operator: "Indian Railways",
        serviceName: "Local Passenger / Shuttle",
        durationMins: 35,
        distanceKm: 25,
        estimatedCostInr: 30,
        frequency: "multiple_daily",
        dataStatus: "scheduled",
        instructions: `Take local passenger train to ${originJunction.name}`,
      });
    }

    // Leg 2: Sleeper Train to Delhi
    legs.push({
      id: "leg-cheap-rail",
      legIndex: legs.length + 1,
      from: {
        name: originJunction!.name,
        code: originJunction!.code,
        hubType: originJunction!.hubType,
        lat: originJunction!.lat,
        lon: originJunction!.lon,
      },
      to: {
        name: delRail.name,
        code: delRail.code,
        hubType: delRail.hubType,
        lat: delRail.lat,
        lon: delRail.lon,
      },
      mode: "train",
      provider: "Indian Railways",
      operator: "Indian Railways",
      serviceName: "Express (Sleeper Class)",
      durationMins: 1080, // 18 hrs
      distanceKm: 980,
      estimatedCostInr: 520,
      departureTime: "17:15",
      frequency: "daily",
      dataStatus: "scheduled",
      bookingUrl: "https://www.irctc.co.in",
      instructions: `Sleeper Class train from ${originJunction!.name} to ${delRail.name}`,
    });

    // Leg 3: Ordinary State RTC Bus (Delhi ISBT -> Valley Hub)
    legs.push({
      id: "leg-cheap-bus",
      legIndex: legs.length + 1,
      from: {
        name: delBus.name,
        code: delBus.code,
        hubType: delBus.hubType,
        lat: delBus.lat,
        lon: delBus.lon,
      },
      to: {
        name: destValleyBus.name,
        code: destValleyBus.code,
        hubType: destValleyBus.hubType,
        lat: destValleyBus.lat,
        lon: destValleyBus.lon,
      },
      mode: "bus",
      provider: "State Transport (HRTC)",
      operator: "HRTC Ordinary Semi-Deluxe",
      serviceName: "Ordinary Interstate Bus",
      durationMins: 720, // 12 hrs
      distanceKm: 480,
      estimatedCostInr: 680,
      departureTime: "18:00",
      frequency: "multiple_daily",
      dataStatus: "scheduled",
      instructions: `Board HRTC Ordinary / Semi-Deluxe bus from ${delBus.name} to ${destValleyBus.name}`,
    });

    // Leg 4: Local Mountain Bus to Trailhead
    legs.push({
      id: "leg-cheap-local",
      legIndex: legs.length + 1,
      from: {
        name: destValleyBus.name,
        code: destValleyBus.code,
        hubType: destValleyBus.hubType,
        lat: destValleyBus.lat,
        lon: destValleyBus.lon,
      },
      to: {
        name: trailhead.name,
        hubType: "trailhead",
        lat: trailhead.lat,
        lon: trailhead.lon,
      },
      mode: "local_transit",
      provider: "HRTC Rural Bus",
      operator: "HRTC",
      serviceName: "Rural Route Bus",
      durationMins: 110,
      distanceKm: 38,
      estimatedCostInr: 85,
      frequency: "twice_daily",
      dataStatus: "scheduled",
      instructions: `Take HRTC rural mountain bus directly to ${trailhead.name}`,
    });

    const totalDur = legs.reduce((acc, l) => acc + l.durationMins, 0);
    const totalDist = legs.reduce((acc, l) => acc + l.distanceKm, 0);
    const totalCost = legs.reduce((acc, l) => acc + l.estimatedCostInr, 0);

    journeys.push({
      id: "journey-cheapest",
      strategy: "cheapest",
      title: `${startStation.name.replace(/ Junction| Railway Station/i, "")} → Delhi → ${destValleyBus.name} → ${trailhead.name} (Budget)`,
      badge: "Cheapest",
      isRecommended: false,
      totalDurationMins: totalDur,
      totalDistanceKm: Math.round(totalDist),
      totalCostInr: totalCost,
      primaryModes: ["train", "bus", "local_transit"],
      legs,
      summary: `Budget sleeper train and state transport bus, under ₹${Math.ceil(totalCost / 100) * 100}.`,
    });
  }

  // =========================================================================
  // JOURNEY OPTION 4: TRAIN-FOCUSED (Rail via Chandigarh Hub)
  // =========================================================================
  if (originJunction && cdgRail && destValleyBus) {
    const legs: JourneyLeg[] = [];

    // First mile
    const leg1Road = roadProvider.calculateRoadLeg(
      { name: "Current Location", lat: origin.lat, lon: origin.lon },
      { name: originJunction.name, lat: originJunction.lat, lon: originJunction.lon }
    );
    legs.push({
      id: "leg-train-1",
      legIndex: 1,
      from: { name: "Current Location", lat: origin.lat, lon: origin.lon },
      to: {
        name: originJunction.name,
        code: originJunction.code,
        hubType: originJunction.hubType,
        lat: originJunction.lat,
        lon: originJunction.lon,
      },
      mode: "cab",
      provider: "Local Taxi",
      operator: null,
      serviceName: "Station Cab",
      durationMins: leg1Road.durationMins,
      distanceKm: leg1Road.distanceKm,
      estimatedCostInr: leg1Road.estimatedCostInr,
      dataStatus: "estimated",
    });

    // Train directly to Chandigarh (CDG)
    legs.push({
      id: "leg-train-2",
      legIndex: 2,
      from: {
        name: originJunction.name,
        code: originJunction.code,
        hubType: originJunction.hubType,
        lat: originJunction.lat,
        lon: originJunction.lon,
      },
      to: {
        name: cdgRail.name,
        code: cdgRail.code,
        hubType: cdgRail.hubType,
        lat: cdgRail.lat,
        lon: cdgRail.lon,
      },
      mode: "train",
      provider: "Indian Railways",
      operator: "Indian Railways",
      serviceName: "Superfast Express to Chandigarh",
      durationMins: 1320, // 22 hrs
      distanceKm: 1240,
      estimatedCostInr: 920,
      departureTime: "11:45",
      frequency: "daily",
      dataStatus: "scheduled",
      bookingUrl: "https://www.irctc.co.in",
      instructions: `Direct train journey to Chandigarh Junction (CDG)`,
    });

    // Chandigarh to Valley Hub
    legs.push({
      id: "leg-train-3",
      legIndex: 3,
      from: {
        name: cdgRail.name,
        code: cdgRail.code,
        hubType: cdgRail.hubType,
        lat: cdgRail.lat,
        lon: cdgRail.lon,
      },
      to: {
        name: destValleyBus.name,
        code: destValleyBus.code,
        hubType: destValleyBus.hubType,
        lat: destValleyBus.lat,
        lon: destValleyBus.lon,
      },
      mode: "bus",
      provider: "HRTC Volvo",
      operator: "HRTC",
      serviceName: "Himsuta Volvo (ISBT 43)",
      durationMins: 420, // 7 hrs
      distanceKm: 235,
      estimatedCostInr: 780,
      departureTime: "07:00",
      frequency: "multiple_daily",
      dataStatus: "scheduled",
      instructions: `Board HRTC bus from Chandigarh ISBT 43 to ${destValleyBus.name}`,
    });

    // Last mile to trailhead
    const leg4Road = roadProvider.calculateRoadLeg(
      { name: destValleyBus.name, lat: destValleyBus.lat, lon: destValleyBus.lon },
      { name: trailhead.name, lat: trailhead.lat, lon: trailhead.lon },
      true
    );
    legs.push({
      id: "leg-train-4",
      legIndex: 4,
      from: {
        name: destValleyBus.name,
        code: destValleyBus.code,
        hubType: destValleyBus.hubType,
        lat: destValleyBus.lat,
        lon: destValleyBus.lon,
      },
      to: {
        name: trailhead.name,
        hubType: "trailhead",
        lat: trailhead.lat,
        lon: trailhead.lon,
      },
      mode: "local_transit",
      provider: "Local Mountain Shuttle",
      operator: "Local Taxi Union",
      serviceName: "Mountain Shuttle",
      durationMins: leg4Road.durationMins,
      distanceKm: leg4Road.distanceKm,
      estimatedCostInr: Math.round(leg4Road.estimatedCostInr * 0.4),
      dataStatus: "estimated",
      instructions: `Local shuttle from ${destValleyBus.name} to ${trailhead.name}`,
    });

    const totalDur = legs.reduce((acc, l) => acc + l.durationMins, 0);
    const totalDist = legs.reduce((acc, l) => acc + l.distanceKm, 0);
    const totalCost = legs.reduce((acc, l) => acc + l.estimatedCostInr, 0);

    journeys.push({
      id: "journey-train-focused",
      strategy: "train_focused",
      title: `${originJunction.name.replace(/ Junction| Railway Station/i, "")} → Chandigarh → ${destValleyBus.name} → ${trailhead.name}`,
      badge: "Train-Focused",
      isRecommended: false,
      totalDurationMins: totalDur,
      totalDistanceKm: Math.round(totalDist),
      totalCostInr: totalCost,
      primaryModes: ["train", "bus"],
      legs,
      summary: `Scenic long-distance rail straight into Chandigarh, followed by mountain bus up to ${destValleyBus.name}.`,
    });
  }

  // Filter or sort based on user preference
  let sortedJourneys = [...journeys];
  if (input.preference) {
    sortedJourneys.sort((a, b) => {
      if (a.strategy === input.preference) return -1;
      if (b.strategy === input.preference) return 1;
      return 0;
    });
  }

  const result: JourneyDiscoveryResult = {
    origin,
    trek: {
      id: trekId!,
      name: trekName,
      slug: trekSlug,
      region: trekRegion,
    },
    trailhead,
    journeys: sortedJourneys.slice(0, 5),
  };

  // Cache for 10 minutes
  journeyCache.set(cacheKey, {
    expiresAt: Date.now() + 10 * 60 * 1000,
    data: result,
  });

  return result;
}
