const BOT_PATTERN =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|uptimerobot/i;
const MIN_REGION_VISITS = 5;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}

function json(data, origin, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");

  Object.entries(corsHeaders(origin)).forEach(([name, value]) => {
    headers.set(name, value);
  });

  return new Response(JSON.stringify(data), { ...init, headers });
}

function isAllowedOrigin(request, allowedOrigin) {
  const origin = request.headers.get("Origin");
  return !origin || origin === allowedOrigin;
}

async function readStats(env) {
  const { results = [] } = await env.DB.prepare(
    "SELECT country, count FROM visits ORDER BY count DESC"
  ).all();

  const totalVisits = results.reduce((sum, row) => sum + row.count, 0);
  const countryCount = results.filter((row) => row.country !== "ZZ").length;
  const visible = [];
  let otherCount = 0;

  results.forEach((row) => {
    if (row.country === "ZZ" || row.count < MIN_REGION_VISITS) {
      otherCount += row.count;
    } else {
      visible.push(row);
    }
  });

  const topRegions = visible.slice(0, 5);
  otherCount += visible.slice(5).reduce((sum, row) => sum + row.count, 0);

  if (otherCount > 0) {
    topRegions.push({ country: "OTHER", count: otherCount });
  }

  return {
    totalVisits,
    countryCount,
    regions: topRegions.map((row) => ({
      country: row.country,
      count: row.count,
      percentage: totalVisits === 0 ? 0 : (row.count / totalVisits) * 100,
    })),
  };
}

async function cachedStats(request, env, origin) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/stats", request.url), { method: "GET" });
  const cached = await cache.match(cacheKey);

  if (cached) {
    return cached;
  }

  const response = json(await readStats(env), origin, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
  await cache.put(cacheKey, response.clone());
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://j1shen.github.io";
    const origin = request.headers.get("Origin") || allowedOrigin;
    const url = new URL(request.url);

    if (!isAllowedOrigin(request, allowedOrigin)) {
      return json({ error: "Origin not allowed" }, allowedOrigin, { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (url.pathname === "/stats" && request.method === "GET") {
      return cachedStats(request, env, origin);
    }

    if (url.pathname === "/visit" && request.method === "POST") {
      const userAgent = request.headers.get("User-Agent") || "";
      const country = request.cf?.country || "ZZ";

      if (!BOT_PATTERN.test(userAgent)) {
        await env.DB.prepare(
          `INSERT INTO visits (country, count, updated_at)
           VALUES (?, 1, CURRENT_TIMESTAMP)
           ON CONFLICT(country) DO UPDATE SET
             count = count + 1,
             updated_at = CURRENT_TIMESTAMP`
        )
          .bind(country)
          .run();

        const cacheKey = new Request(new URL("/stats", request.url), { method: "GET" });
        ctx.waitUntil(caches.default.delete(cacheKey));
      }

      return json(await readStats(env), origin, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    return json({ error: "Not found" }, origin, { status: 404 });
  },
};
