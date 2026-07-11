const injectMobileNavFix = () => {
  if (document.querySelector("style[data-mobile-nav-fix]")) return;
  const style = document.createElement("style");
  style.dataset.mobileNavFix = "true";
  style.textContent = `
    .hero-wrap > .hero-card h1{font-size:clamp(2rem,4.7vw,4.7rem)!important;line-height:1!important}
    .centered-nav{position:relative!important;justify-content:center!important}.centered-nav .logo-only{position:absolute!important;left:50px!important;top:50%!important;transform:translateY(-50%)!important}.centered-nav .nav-links{display:flex!important;align-items:center!important;justify-content:center!important;gap:4px!important;white-space:nowrap!important}
    @media (max-width: 920px) {
      .nav-toggle{display:block!important;flex:0 0 auto!important}.centered-nav{justify-content:space-between!important;gap:12px!important}.centered-nav .logo-only{position:static!important;transform:none!important}.centered-nav .nav-links{position:fixed!important;inset:76px 12px auto 12px!important;display:none!important;flex-direction:column!important;align-items:stretch!important;gap:6px!important;padding:12px!important;border-radius:14px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 24px 70px rgba(23,33,28,.22)!important;z-index:90!important;white-space:normal!important}.centered-nav .nav-links a{width:100%!important;text-align:left!important;padding:13px 14px!important}body.nav-open .centered-nav .nav-links{display:flex!important}
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
