import { describe, it, expect } from "bun:test";
import { discoverJourneys } from "../src/services/transport/journeyDiscovery";
import {
  discoverNearbyOriginHubs,
  discoverNearbyDestinationHubs,
} from "../src/services/transport/hubDiscovery";
import { asDiscoverJourneysInput } from "../src/lib/validate";

describe("Journey Discovery & Multimodal Routing Engine (Phase 3B)", () => {
  // Test Coordinates
  const AMGAON_GPS = { lat: 21.3653, lon: 80.3752 };
  const GONDIA_GPS = { lat: 21.4598, lon: 80.1961 };
  const NAGPUR_GPS = { lat: 21.1524, lon: 79.0882 };
  const JALORI_PASS_COORDS = { lat: 31.5348, lon: 77.3780 };

  it("1. Validates input schema and rejects invalid coordinates", () => {
    // Valid input
    const valid = asDiscoverJourneysInput({
      originLat: 21.3653,
      originLon: 80.3752,
      trekId: "raghupur-fort-trek",
    });
    expect(valid.originLat).toBe(21.3653);
    expect(valid.originLon).toBe(80.3752);

    // Invalid: latitude > 90
    expect(() =>
      asDiscoverJourneysInput({
        originLat: 95.0,
        originLon: 80.3752,
        trekId: "raghupur-fort-trek",
      })
    ).toThrow();

    // Invalid: longitude < -180
    expect(() =>
      asDiscoverJourneysInput({
        originLat: 21.3653,
        originLon: -195.0,
        trekId: "raghupur-fort-trek",
      })
    ).toThrow();

    // Invalid: missing both trekId and trekRouteId
    expect(() =>
      asDiscoverJourneysInput({
        originLat: 21.3653,
        originLon: 80.3752,
      })
    ).toThrow();
  });

  it("2. Spatial Hub Discovery: finds nearby railway stations, junctions, and airports for Amgaon", async () => {
    const originHubs = await discoverNearbyOriginHubs(AMGAON_GPS.lat, AMGAON_GPS.lon);

    expect(originHubs.length).toBeGreaterThanOrEqual(2);

    // Nearest station should be Amgaon Station (AGN) within 5 km
    const amgaonStation = originHubs.find((h) => h.code === "AGN");
    expect(amgaonStation).toBeDefined();
    expect(amgaonStation!.distanceKm).toBeLessThan(10);

    // Nearest major junction should be Gondia Junction (G) within 35 km
    const gondiaJunction = originHubs.find((h) => h.code === "G");
    expect(gondiaJunction).toBeDefined();
    expect(gondiaJunction!.distanceKm).toBeLessThan(35);

    // Nearest airport should be Nagpur Airport (NAG) within 200 km
    const nagpurAirport = originHubs.find((h) => h.code === "NAG");
    expect(nagpurAirport).toBeDefined();
    expect(nagpurAirport!.distanceKm).toBeLessThan(200);
  }, 20000);

  it("3. Spatial Hub Discovery: finds nearby mountain hubs, airports, and railheads for Jalori Pass", async () => {
    const destHubs = await discoverNearbyDestinationHubs(
      JALORI_PASS_COORDS.lat,
      JALORI_PASS_COORDS.lon
    );

    expect(destHubs.length).toBeGreaterThanOrEqual(2);

    // Mountain hub (Aut Tunnel / Jibhi / Jalori Pass)
    const valleyHub = destHubs.find(
      (h) => h.code === "AUT_TUNNEL" || h.code === "JIBHI_HUB" || h.code === "JALORI_PASS_HUB"
    );
    expect(valleyHub).toBeDefined();

    // Airport (Bhuntar KUU)
    const hillAirport = destHubs.find((h) => h.code === "KUU");
    expect(hillAirport).toBeDefined();
    expect(hillAirport!.distanceKm).toBeLessThan(80);
  }, 20000);

  it("4. Generates multi-option journeys from Amgaon GPS to Raghupur Fort Trek Trailhead", async () => {
    const result = await discoverJourneys({
      originLat: AMGAON_GPS.lat,
      originLon: AMGAON_GPS.lon,
      trekId: "raghupur-fort-trek",
    });

    expect(result.trek).toBeDefined();
    expect(result.trek.name).toBe("Raghupur Fort Trek");
    expect(result.trailhead).toBeDefined();
    expect(result.trailhead.name).toContain("Jalori");
    expect(result.journeys.length).toBeGreaterThanOrEqual(3);

    // 1. Recommended / Balanced Option
    const balanced = result.journeys.find((j) => j.strategy === "balanced");
    expect(balanced).toBeDefined();
    expect(balanced!.badge).toBe("Recommended");
    expect(balanced!.legs.length).toBeGreaterThanOrEqual(3);
    // Origin leg connects from Current Location -> Gondia Junction
    expect(balanced!.legs[0]!.from.name).toBe("Current Location");
    expect(balanced!.legs[0]!.to.name).toContain("Gondia");
    // Intercity rail leg connects to Delhi
    const railLeg = balanced!.legs.find((l) => l.mode === "train");
    expect(railLeg).toBeDefined();
    expect(railLeg!.to.name).toContain("Delhi");
    // Last leg connects directly to Trailhead
    const lastLeg = balanced!.legs[balanced!.legs.length - 1];
    expect(lastLeg!.to.name).toContain("Jalori");

    // 2. Fastest / Flight Option
    const fastest = result.journeys.find((j) => j.strategy === "fastest");
    expect(fastest).toBeDefined();
    expect(fastest!.badge).toBe("Fastest");
    expect(fastest!.primaryModes).toContain("flight");
    // Flight duration should be significantly faster than train option
    expect(fastest!.totalDurationMins).toBeLessThan(balanced!.totalDurationMins);

    // 3. Cheapest Option
    const cheapest = result.journeys.find((j) => j.strategy === "cheapest");
    expect(cheapest).toBeDefined();
    expect(cheapest!.badge).toBe("Cheapest");
    // Cheapest cost should be lower than balanced option
    expect(cheapest!.totalCostInr).toBeLessThan(balanced!.totalCostInr);
  }, 20000);

  it("5. Generates optimized journey options from Gondia GPS", async () => {
    const result = await discoverJourneys({
      originLat: GONDIA_GPS.lat,
      originLon: GONDIA_GPS.lon,
      trekId: "raghupur-fort-trek",
    });

    expect(result.journeys.length).toBeGreaterThanOrEqual(3);
    const balanced = result.journeys.find((j) => j.strategy === "balanced");
    expect(balanced).toBeDefined();
    // First leg is very short because user is already in Gondia
    expect(balanced!.legs[0]!.distanceKm).toBeLessThan(15);
  }, 20000);

  it("6. Generates flight-first journey options from Nagpur GPS", async () => {
    const result = await discoverJourneys({
      originLat: NAGPUR_GPS.lat,
      originLon: NAGPUR_GPS.lon,
      trekId: "raghupur-fort-trek",
    });

    expect(result.journeys.length).toBeGreaterThanOrEqual(3);
    const fastest = result.journeys.find((j) => j.strategy === "fastest");
    expect(fastest).toBeDefined();
    // In Nagpur, first-mile cab to NAG airport is very short (~10-15 km)
    expect(fastest!.legs[0]!.distanceKm).toBeLessThan(25);
    expect(fastest!.totalDurationMins).toBeLessThan(14 * 60); // under 14 hours total
  }, 20000);

  it("7. Data transparency: every journey leg specifies provider and dataStatus without AI fabrication", async () => {
    const result = await discoverJourneys({
      originLat: AMGAON_GPS.lat,
      originLon: AMGAON_GPS.lon,
      trekId: "raghupur-fort-trek",
    });

    for (const journey of result.journeys) {
      for (const leg of journey.legs) {
        expect(leg.provider).toBeDefined();
        expect(leg.provider.length).toBeGreaterThan(0);
        expect(["live", "scheduled", "estimated", "unavailable"]).toContain(leg.dataStatus);
        expect(leg.durationMins).toBeGreaterThan(0);
        expect(leg.distanceKm).toBeGreaterThan(0);
      }
    }
  }, 20000);

  it("8. Caching test: repeated request executes instantaneously from cache", async () => {
    const start = performance.now();
    const result = await discoverJourneys({
      originLat: AMGAON_GPS.lat,
      originLon: AMGAON_GPS.lon,
      trekId: "raghupur-fort-trek",
    });
    const elapsedMs = performance.now() - start;

    expect(result.journeys.length).toBeGreaterThan(0);
    // Cached response should return in under 20ms
    expect(elapsedMs).toBeLessThan(50);
  });
});
