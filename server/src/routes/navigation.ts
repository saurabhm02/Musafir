export type NavigationStep = {
  instruction: string;
  streetName: string;
  distanceM: number;
  durationSec: number;
  maneuver: {
    type: string;
    modifier: string | null;
    location: [number, number];
    bearingBefore: number;
    bearingAfter: number;
  };
};

export type NavigationRouteResponse = {
  coordinates: [number, number][]; // [lng, lat]
  distanceKm: number;
  durationMin: number;
  mode: "driving" | "walking";
  steps: NavigationStep[];
  provider: string;
};

// Generates human-friendly turn-by-turn text instruction from OSRM maneuver
function formatManeuverInstruction(
  type: string,
  modifier: string | null,
  streetName: string,
  mode: "driving" | "walking",
): string {
  const road = streetName && streetName !== "" ? streetName : "the route";
  const verb = mode === "walking" ? "Walk" : "Drive";

  switch (type) {
    case "depart":
      return `Head ${modifier ? modifier + " " : ""}on ${road}`;
    case "turn":
      return `Turn ${modifier || "ahead"} onto ${road}`;
    case "continue":
      return `Continue on ${road}`;
    case "new name":
      return `Continue onto ${road}`;
    case "fork":
      return `Keep ${modifier || "straight"} at the fork onto ${road}`;
    case "merge":
      return `Merge ${modifier || ""} onto ${road}`;
    case "on ramp":
      return `Take the ramp onto ${road}`;
    case "off ramp":
      return `Take the exit toward ${road}`;
    case "roundabout":
    case "rotary":
      return `At the roundabout, proceed onto ${road}`;
    case "end of road":
      return `Turn ${modifier || "left"} at the end of the road onto ${road}`;
    case "arrive":
      return `You have reached your destination`;
    default:
      return `${verb} on ${road}`;
  }
}

export const navigationRoutes: Record<string, Record<string, (req: Request) => Promise<Response>>> = {
  "/navigation/route": {
    POST: async (req: Request) => {
      try {
        const body = (await req.json()) as {
          origin: { lat: number; lon: number };
          destination: { lat: number; lon: number };
          mode?: "driving" | "walking";
        };

        if (
          !body.origin ||
          typeof body.origin.lat !== "number" ||
          typeof body.origin.lon !== "number" ||
          !body.destination ||
          typeof body.destination.lat !== "number" ||
          typeof body.destination.lon !== "number"
        ) {
          return new Response(JSON.stringify({ error: "Invalid origin or destination coordinates" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const mode = body.mode === "walking" ? "walking" : "driving";
        const profile = mode === "walking" ? "foot" : "driving";
        const coords = `${body.origin.lon},${body.origin.lat};${body.destination.lon},${body.destination.lat}`;
        const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true&annotations=true`;

        const osrmRes = await fetch(osrmUrl, {
          headers: { "User-Agent": "Musafir-Navigation-Engine/1.0" },
        });

        if (!osrmRes.ok) {
          return new Response(JSON.stringify({ error: `Routing provider returned status ${osrmRes.status}` }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        const data = (await osrmRes.json()) as {
          routes?: Array<{
            geometry: { coordinates: [number, number][] };
            distance: number;
            duration: number;
            legs?: Array<{
              steps?: Array<{
                name?: string;
                distance?: number;
                duration?: number;
                maneuver?: {
                  type?: string;
                  modifier?: string;
                  location?: [number, number];
                  bearing_before?: number;
                  bearing_after?: number;
                };
              }>;
            }>;
          }>;
        };
        const route = data.routes?.[0];

        if (!route) {
          return new Response(JSON.stringify({ error: "No route found between coordinates" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const steps: NavigationStep[] = [];
        const rawSteps = route.legs?.[0]?.steps ?? [];

        for (const s of rawSteps) {
          const m = s.maneuver ?? {};
          const street = s.name || "";
          const instruction = formatManeuverInstruction(m.type || "turn", m.modifier ?? null, street, mode);

          steps.push({
            instruction,
            streetName: street,
            distanceM: Math.round(s.distance ?? 0),
            durationSec: Math.round(s.duration ?? 0),
            maneuver: {
              type: m.type || "turn",
              modifier: m.modifier ?? null,
              location: m.location || [0, 0],
              bearingBefore: m.bearing_before ?? 0,
              bearingAfter: m.bearing_after ?? 0,
            },
          });
        }

        const result: NavigationRouteResponse = {
          coordinates: route.geometry.coordinates,
          distanceKm: route.distance / 1000,
          durationMin: route.duration / 60,
          mode,
          steps,
          provider: "osrm",
        };

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err instanceof Error ? err.message : "Internal routing error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    },
  },
};
