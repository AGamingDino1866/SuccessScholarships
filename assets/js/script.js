const GEO_BLOCK_ENABLED = false;

const detectVisitorCountry = async () => {
  const lookupUrls = [
    `https://ipapi.co/json/?t=${Date.now()}`,
    `https://ipwho.is/?t=${Date.now()}`
  ];

  for (const url of lookupUrls) {
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
      // Try the next provider before deciding.
    }
  }

  return "";
};

const enforcePakistanOnlyAccess = async () => {
  // Flip GEO_BLOCK_ENABLED to true if Pakistan-only access is approved again.
  if (!GEO_BLOCK_ENABLED) return;

  const allowedCountry = "PK";
  const denyPath = "/deny.html";

  if (window.location.pathname.endsWith("/deny.html")) return;

  const country = await detectVisitorCountry();
  if (country && country !== allowedCountry) window.location.replace(denyPath);
};

enforcePakistanOnlyAccess();

const applySahulatFamilyBranding = () => {
  const oldEmail = "successscholarships2026@gmail.com";
  const newEmail = "sahulatfamilypk@gmail.com";
  const replacements = [
    ["Success Factor", "Sahulat Family"],
    ["Success Club", "Sahulat Family"],
    [oldEmail, newEmail]
  ];

  document.title = replacements.reduce((title, [from, to]) => title.replaceAll(from, to), document.title);

  document.querySelectorAll("a").forEach((link) => {
    replacements.forEach(([from, to]) => {
      if (link.href.includes(from)) link.href = link.href.replaceAll(from, to);
      if (link.textContent.includes(from)) link.textContent = link.textContent.replaceAll(from, to);
    });
    if (link.href.includes(encodeURIComponent("Success Factor"))) {
      link.href = link.href.replaceAll(encodeURIComponent("Success Factor"), encodeURIComponent("Sahulat Family"));
    }
  });

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    replacements.forEach(([from, to]) => {
      if (node.nodeValue.includes(from)) node.nodeValue = node.nodeValue.replaceAll(from, to);
    });
  });

  document.querySelectorAll(".brand-mark").forEach((mark) => {
    mark.textContent = "";
    mark.setAttribute("aria-hidden", "true");
  });
};

const injectNavyTheme = () => {
  if (document.querySelector("style[data-navy-theme]")) return;
  const style = document.createElement("style");
  style.dataset.navyTheme = "true";
  style.textContent = `
    :root{--ink:#2c2c85!important;--muted:#565680!important;--green:#2c2c85!important;--green-2:#4545a3!important;--rose:#2c2c85!important;--rose-dark:#2c2c85!important;--gold:#2c2c85!important;--sky:#2c2c85!important;--blush:#ffffff!important;--cream:#ffffff!important;--paper:#ffffff!important;--card:#ffffff!important;--line:rgba(44,44,133,.16)!important;--shadow:0 24px 70px rgba(44,44,133,.14)!important;--soft-shadow:0 16px 40px rgba(44,44,133,.1)!important}
    body,.centered-header,.site-header,.auth-box,.result-grid div,.receipt-note,.note-band:not(.force-navy){background:#ffffff!important;color:#2c2c85!important}
    .soft-band{background:#ffffff!important;color:#2c2c85!important}
    .button.primary,.button:not(.secondary):not(.light),.nav-links a.active,.nav-links a:hover,.scholarship-card.featured,.cta-panel,.note-band,.step span,.google-dot,.chat-row.user .bubble{background:#2c2c85!important;color:#ffffff!important}
    .brand-mark{display:block!important;overflow:hidden!important;border-radius:50%!important;background:#ffffff url("favicon.svg") center/cover no-repeat!important;color:transparent!important;text-indent:-999px!important;box-shadow:0 10px 24px rgba(44,44,133,.16)!important}
    .button.secondary,.button.light,.google-button,.account-actions .button,.limit-pill,input,select,textarea,.surface-card,.feature-card,.university-card,.portal-card,.scholarship-card,.ai-panel,.tip-card,.lookup-card,.result-card,.contact-card,.auth-panel,.auth-card,.admin-panel,.criteria-card,.docs-card,.income-card{background:#ffffff!important;color:#2c2c85!important;border-color:rgba(44,44,133,.16)!important}
    .hero-card,.auth-hero,.contact-hero,.status-hero,.eligibility-hero,.ai-banner{background:linear-gradient(135deg,rgba(44,44,133,.92),rgba(44,44,133,.62)),url("assets/education-hero.png") center/cover!important;color:#ffffff!important}
    .hero-card p,.auth-hero p,.contact-hero p,.status-hero p,.eligibility-hero p,.ai-banner p,.scholarship-card.featured p,.scholarship-card.featured li,.cta-panel p,.note-band p{color:rgba(255,255,255,.86)!important}
    .eyebrow{color:#2c2c85!important}.hero-card .eyebrow{color:#ffffff!important}
    .surface-card p,.feature-card p,.university-card p,.portal-card p,.scholarship-card p,.scholarship-card li,.tip-card p,.lookup-form small,.result-message,.receipt-note,.contact-card p,.auth-panel p,.criteria-card p,.docs-card p,.income-card p{color:#565680!important}
  `;
  document.head.appendChild(style);
};

const injectMobileNavFix = () => {
  injectNavyTheme();
  if (document.querySelector("style[data-mobile-nav-fix]")) return;
  const style = document.createElement("style");
  style.dataset.mobileNavFix = "true";
  style.textContent = `
    .hero-wrap > .hero-card h1{font-size:clamp(2rem,4.7vw,4.7rem)!important;line-height:1!important}
    .centered-nav{position:relative!important;justify-content:center!important}.centered-nav .logo-only{position:absolute!important;left:50px!important;top:50%!important;transform:translateY(-50%)!important}.centered-nav .nav-links{display:flex!important;align-items:center!important;justify-content:center!important;gap:4px!important;white-space:nowrap!important}
    @media (max-width: 920px) {
      .nav-toggle{display:block!important;flex:0 0 auto!important}.centered-nav{justify-content:space-between!important;gap:12px!important}.centered-nav .logo-only{position:static!important;transform:none!important}.centered-nav .nav-links{position:fixed!important;inset:76px 12px auto 12px!important;display:none!important;flex-direction:column!important;align-items:stretch!important;gap:6px!important;padding:12px!important;border-radius:14px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 24px 70px rgba(44,44,133,.22)!important;z-index:90!important;white-space:normal!important}.centered-nav .nav-links a{width:100%!important;text-align:left!important;padding:13px 14px!important}body.nav-open .centered-nav .nav-links{display:flex!important}
    }
    @media (max-width: 640px) {
      .hero-wrap > .hero-card h1{font-size:clamp(1.9rem,9vw,3rem)!important}.nav-shell,.centered-nav{width:min(100% - 24px,1180px)!important;min-height:68px!important}.brand-mark{width:44px!important;height:44px!important}.button{width:100%;max-width:100%}.hero-card,.resource-hero,.contact-hero{min-height:360px!important;padding:24px!important}.surface-card,.feature-card,.university-card,.resource-card,.prep-panel,.tracker-panel,.portal-card,.scholarship-card,.contact-card{padding:20px!important}.hero-wrap,.portal-shell,.resources-shell,.contact-shell,.status-shell,.ai-shell{width:min(100% - 24px,1180px)!important}.hero-side,.stat-grid,.feature-grid,.university-grid,.resource-grid,.scholarship-grid,.info-grid{grid-template-columns:1fr!important}.section-title h2,.surface-card h2,.portal-card h2{font-size:clamp(1.8rem,9vw,2.55rem)!important;line-height:1.04!important}
    }
  `;
  document.head.appendChild(style);
};

const setupNavigation = () => {
  injectMobileNavFix();

  const navLinks = document.querySelector(".nav-links");
  if (navLinks && !navLinks.classList.contains("admin-nav")) {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const links = [
      ["index.html", "Home"],
      ["apply.html", "Apply"],
      ["eligibility.html", "Eligibility"],
      ["ask-ai.html", "Ask AI"],
      ["status.html", "Status"],
      ["auth.html", "Sign In"],
      ["contact.html", "Contact Us"]
    ];

    navLinks.innerHTML = "";
    links.forEach(([href, label]) => {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      if (currentPage === href) link.classList.add("active");
      navLinks.appendChild(link);
    });
  }

  const navToggle = document.querySelector(".nav-toggle");
  if (!navToggle || !navLinks) return;

  navToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
};

setupNavigation();
applySahulatFamilyBranding();
