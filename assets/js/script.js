const injectMobileNavFix = () => {
  if (document.querySelector("style[data-mobile-nav-fix]")) return;
  const style = document.createElement("style");
  style.dataset.mobileNavFix = "true";
  style.textContent = `
    .hero-wrap > .hero-card h1{font-size:clamp(2rem,4.7vw,4.7rem)!important;line-height:1!important}
    @media (max-width: 920px) {
      .nav-toggle{display:block!important;flex:0 0 auto!important}.centered-nav{justify-content:space-between!important;gap:12px!important}.centered-nav .logo-only{position:static!important;transform:none!important}.centered-nav .nav-links{position:fixed!important;inset:76px 12px auto 12px!important;display:none!important;flex-direction:column!important;align-items:stretch!important;gap:6px!important;padding:12px!important;border-radius:14px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 24px 70px rgba(23,33,28,.22)!important;z-index:90!important}.centered-nav .nav-links a{width:100%!important;text-align:left!important;padding:13px 14px!important}body.nav-open .centered-nav .nav-links{display:flex!important}
    }
    @media (max-width: 640px) {
      .hero-wrap > .hero-card h1{font-size:clamp(1.9rem,9vw,3rem)!important}.nav-shell,.centered-nav{width:min(100% - 24px,1180px)!important;min-height:68px!important}.brand-mark{width:44px!important;height:44px!important}.button{width:100%;max-width:100%}.hero-card,.resource-hero,.contact-hero{min-height:360px!important;padding:24px!important}.surface-card,.feature-card,.university-card,.resource-card,.prep-panel,.tracker-panel,.portal-card,.tool-panel,.faq-panel,.timeline-card,.contact-card{padding:20px!important}.hero-wrap,.portal-shell,.resources-shell,.contact-shell,.status-shell{width:min(100% - 24px,1180px)!important}.hero-side,.stat-grid,.feature-grid,.university-grid,.resource-grid,.tool-grid,.timeline-grid,.scholarship-grid,.info-grid{grid-template-columns:1fr!important}.section-title h2,.surface-card h2,.portal-card h2,.tool-panel h2,.faq-panel h2{font-size:clamp(1.8rem,9vw,2.55rem)!important;line-height:1.04!important}
    }
  `;
  document.head.appendChild(style);
};

const upsertNavLink = ({ href, label, beforeHref }) => {
  const navLinks = document.querySelector(".nav-links");
  if (!navLinks || navLinks.querySelector(`a[href="${href}"]`)) return;

  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  if (window.location.pathname.endsWith(href)) link.classList.add("active");

  const beforeLink = navLinks.querySelector(`a[href="${beforeHref}"]`);
  if (beforeLink) {
    navLinks.insertBefore(link, beforeLink);
  } else {
    navLinks.appendChild(link);
  }
};

const setupNavigation = () => {
  injectMobileNavFix();
  upsertNavLink({ href: "resources.html", label: "Resources", beforeHref: "contact.html" });
  upsertNavLink({ href: "status.html", label: "Status", beforeHref: "contact.html" });

  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (!navToggle || !navLinks) return;

  navToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
};

setupNavigation();
