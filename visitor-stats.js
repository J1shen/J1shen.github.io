(function () {
  const container = document.querySelector(".visitor-stats");
  const endpoint = (document.body.dataset.statsApi || "").trim().replace(/\/$/, "");

  if (!container || !endpoint) {
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
    const total = container.querySelector("[data-visit-total]");
    const countries = container.querySelector("[data-country-total]");
    const regionList = container.querySelector("[data-region-list]");

    total.textContent = formatter.format(stats.totalVisits);
    countries.textContent = formatter.format(stats.countryCount);
    regionList.replaceChildren();

    stats.regions.forEach((region) => {
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
  }

  async function loadStats() {
    let counted = false;

    try {
      counted = sessionStorage.getItem("visitor-counted") === "1";
    } catch {
      counted = false;
    }

    const response = await fetch(`${endpoint}/${counted ? "stats" : "visit"}`, {
      method: counted ? "GET" : "POST",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Visitor statistics request failed: ${response.status}`);
    }

    if (!counted) {
      try {
        sessionStorage.setItem("visitor-counted", "1");
      } catch {
        // Storage can be unavailable in strict privacy modes.
      }
    }

    render(await response.json());
  }

  loadStats().catch(() => {
    container.hidden = true;
  });
})();
