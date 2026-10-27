(function () {
  const container = document.querySelector(".visitor-stats");
  const endpoint = (document.body.dataset.statsApi || "").trim().replace(/\/$/, "");
  const status = container && container.querySelector(".stats-status");
  const retry = container && container.querySelector(".stats-retry");
  const details = container && container.querySelector(".region-details");
  const cacheKey = `visitor-stats:${endpoint}`;
  let hasStats = false;

  if (!container || !status || !retry || !details) return;
  if (!endpoint) {
    status.textContent = "Visitor statistics are not configured.";
    return;
  }

  const formatter = new Intl.NumberFormat("en");
  const displayNames =
    typeof Intl.DisplayNames === "function"
      ? new Intl.DisplayNames(["en"], { type: "region" })
      : null;

  function regionName(code) {
    if (code === "OTHER") {
      return "Other";
    }

    return displayNames ? displayNames.of(code) || code : code;
  }

  function render(stats) {
    if (!Number.isFinite(stats.totalVisits) || !Number.isFinite(stats.countryCount) ||
        !Array.isArray(stats.regions)) throw new Error("Invalid visitor statistics");
    const total = container.querySelector("[data-visit-total]");
    const countries = container.querySelector("[data-country-total]");
    const regionList = container.querySelector("[data-region-list]");

    total.textContent = formatter.format(stats.totalVisits);
    countries.textContent = formatter.format(stats.countryCount);
    regionList.replaceChildren();

    const regions = stats.regions.filter((region) => region.country !== "TW" && region.country !== "OTHER");
    const otherPercentage = stats.regions
      .filter((region) => region.country === "TW" || region.country === "OTHER")
      .reduce((sum, region) => sum + region.percentage, 0);
    if (otherPercentage > 0) regions.push({ country: "OTHER", percentage: otherPercentage });

    regions.forEach((region) => {
      const row = document.createElement("div");
      const name = document.createElement("span");
      const bar = document.createElement("span");
      const fill = document.createElement("span");
      const value = document.createElement("span");

      row.className = "region-row";
      name.textContent = regionName(region.country);
      bar.className = "region-bar";
      fill.style.width = `${Math.max(0, Math.min(region.percentage, 100))}%`;
      value.className = "region-value";
      value.textContent = `${region.percentage.toFixed(1)}%`;

      bar.append(fill);
      row.append(name, bar, value);
      regionList.append(row);
    });

    container.hidden = false;
    details.hidden = false;
    hasStats = true;
  }

  async function requestStats(path, method) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${endpoint}/${path}`, {
        method,
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Visitor statistics request failed: ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function loadStats(readOnly = false) {
    retry.hidden = true;
    status.textContent = hasStats ? "Updating visitor statistics..." : "Loading visitor statistics...";
    let counted = false;

    try {
      counted = sessionStorage.getItem("visitor-counted") === "1";
    } catch {
      counted = false;
    }

    try {
      let stats;
      let recorded = false;
      if (counted || readOnly) {
        stats = await requestStats("stats", "GET");
      } else {
        try {
          stats = await requestStats("visit", "POST");
          recorded = true;
        } catch {
          // Do not retry a POST that may already have recorded the visit.
          stats = await requestStats("stats", "GET");
        }
      }
      render(stats);
      try {
        if (recorded) sessionStorage.setItem("visitor-counted", "1");
        localStorage.setItem(cacheKey, JSON.stringify({ stats, savedAt: Date.now() }));
      } catch {
        // Storage can be unavailable in strict privacy modes.
      }
      status.textContent = "";
    } catch {
      status.textContent = hasStats
        ? "Showing previously loaded statistics. Live updates are temporarily unavailable."
        : "Visitor statistics are temporarily unavailable. Please try again.";
      retry.hidden = false;
    }
  }

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (cached && Date.now() - cached.savedAt < 7 * 24 * 60 * 60 * 1000) render(cached.stats);
  } catch {
    // A missing or invalid cache must not prevent a live request.
  }
  retry.addEventListener("click", () => loadStats(true));
  loadStats();
})();
