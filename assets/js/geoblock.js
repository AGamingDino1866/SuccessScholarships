(async () => {
  const GEO_BLOCK_ENABLED = false;
  const allowedCountry = "PK";
  const denyPath = "/deny.html";
  const currentPath = window.location.pathname;

  // Flip GEO_BLOCK_ENABLED to true if Pakistan-only access is approved again.
  if (!GEO_BLOCK_ENABLED) return;

  if (currentPath.endsWith("/deny.html")) return;

  document.documentElement.classList.add("geoblock-checking");

  const lookupCountry = async () => {
    const urls = [
      `https://ipapi.co/json/?t=${Date.now()}`,
      `https://ipwho.is/?t=${Date.now()}`
    ];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 4500);
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        window.clearTimeout(timeout);
        if (!response.ok) continue;
        const data = await response.json();
        const country = String(data.country_code || data.country || data.countryCode || "").toUpperCase();
        if (country) return country;
      } catch (error) {
        // Try the next provider.
      }
    }

    return "";
  };

  const country = await lookupCountry();
  document.documentElement.classList.remove("geoblock-checking");

  if (country && country !== allowedCountry) {
    window.location.replace(new URL(denyPath, window.location.origin).href);
  }
})();
