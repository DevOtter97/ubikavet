import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ── Overpass clinic search (radius-based) ──────────────────────────────
  app.post("/api/clinics/search", async (req, res) => {
    const { lat, lng, radius = 5000 } = req.body;
    if (lat == null || lng == null) {
      res.status(400).json({ error: "lat and lng are required" });
      return;
    }

    const OVERPASS_MIRRORS = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ];

    async function fetchOverpass(query: string): Promise<{ elements: OverpassElement[] }> {
      let lastErr: Error = new Error("No mirrors available");
      for (const mirror of OVERPASS_MIRRORS) {
        try {
          console.log(`[clinics/search] Trying mirror: ${mirror}`);
          const r = await fetch(mirror, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `data=${encodeURIComponent(query)}`,
            signal: AbortSignal.timeout(25000),
          });
          if (!r.ok) {
            const text = await r.text().catch(() => "");
            console.warn(`[clinics/search] Mirror ${mirror} returned ${r.status}:`, text.slice(0, 100));
            lastErr = new Error(`HTTP ${r.status}`);
            continue;
          }
          return r.json() as Promise<{ elements: OverpassElement[] }>;
        } catch (e) {
          console.warn(`[clinics/search] Mirror ${mirror} failed:`, e);
          lastErr = e instanceof Error ? e : new Error(String(e));
        }
      }
      throw lastErr;
    }

    const query = `
      [out:json][timeout:25];
      (
        node[~"^(amenity|healthcare)$"~"^veterinary$"]["name"]["disused"!="yes"]["operational_status"!="closed"](around:${radius},${lat},${lng});
        way[~"^(amenity|healthcare)$"~"^veterinary$"]["name"]["disused"!="yes"]["operational_status"!="closed"](around:${radius},${lat},${lng});
        relation[~"^(amenity|healthcare)$"~"^veterinary$"]["name"]["disused"!="yes"]["operational_status"!="closed"](around:${radius},${lat},${lng});
      );
      out center qt;
    `;

    console.log(`[clinics/search] Querying Overpass, radius=${radius}m near ${lat},${lng}`);

    let data: { elements: OverpassElement[] };
    try {
      data = await fetchOverpass(query);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[clinics/search] All Overpass mirrors failed:", msg);
      res.status(502).json({ error: `Overpass no disponible: ${msg}` });
      return;
    }

    const elements = data.elements ?? [];
    console.log(`[clinics/search] Got ${elements.length} elements from Overpass`);

    const clinics = elements
      .map((el) => {
        const elLat = el.type === "node" ? el.lat : el.center?.lat;
        const elLng = el.type === "node" ? el.lon : el.center?.lon;
        if (!elLat || !elLng) return null;

        const tags = el.tags ?? {};

        // Exclude permanently closed or incorrectly tagged places
        if (tags.amenity !== "veterinary" && tags.healthcare !== "veterinary") return null;
        if (
          tags["disused"] === "yes" ||
          tags["abandoned"] === "yes" ||
          tags["operational_status"] === "closed" ||
          tags["opening_hours"] === "closed" ||
          tags["opening_hours"] === "off"
        ) return null;

        // Exclude non-clinic businesses (pet shops, groomers, boarding, shelters)
        if (tags.shop) return null;
        if (tags.craft) return null;

        const name =
          tags.name ?? tags["name:es"] ?? tags["name:en"] ?? "Clínica Veterinaria";

        // Only keep entries whose name indicates a veterinary clinic/hospital
        const nameLower = name.toLowerCase();
        const allowedWords = ["vet", "clínic", "clinic", "hospital", "consultorio"];
        if (!allowedWords.some(w => nameLower.includes(w))) return null;

        const street = tags["addr:street"];
        const number = tags["addr:housenumber"];
        const city =
          tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"];
        const postcode = tags["addr:postcode"];

        const addressParts = [
          street && number ? `${street} ${number}` : street,
          city,
          postcode,
        ].filter(Boolean);

        const phone =
          tags.phone ??
          tags["contact:phone"] ??
          tags["phone:es"] ??
          null;

        const website =
          tags.website ?? tags["contact:website"] ?? null;

        const dist = haversine(lat, lng, elLat, elLng);

        return {
          name,
          address: addressParts.length ? addressParts.join(", ") : null,
          phone: phone ? phone.replace(/;.*/, "").trim() : null,
          website,
          openingHours: tags.opening_hours ?? null,
          rating: null,
          reviewCount: null,
          distance: formatDistance(dist),
          _dist: dist,
          lat: elLat,
          lng: elLng,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${name} ${addressParts[0] ?? ""}`.trim()
          )}&query_place_id=${elLat},${elLng}`,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a._dist - b._dist)
      .map(({ _dist, ...c }: any) => c);

    console.log(`[clinics/search] Returning ${clinics.length} clinics for radius ${radius}m`);
    res.json({ clinics });
  });

  // Global error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("Unhandled error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  );

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
