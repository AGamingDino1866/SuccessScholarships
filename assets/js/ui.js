(() => {
  const translations = {
    Home: "گھر",
    "My Applications": "درخواستیں",
    "Contact Us": "رابطہ",
    "Start Application": "درخواست شروع کریں",
    "Ask a Question": "سوال پوچھیں",
    "Open Form": "فارم کھولیں",
    "Stay Here": "یہیں رہیں",
    "Helping underprivileged students continue their education.": "ضرورت مند طلبہ کو اپنی تعلیم جاری رکھنے میں مدد دینا۔",
    "Prepare, check, and apply in one place.": "تیاری، جانچ، اور درخواست ایک ہی جگہ۔",
    "Need help with your application?": "درخواست میں مدد چاہیے؟"
  };

  const originalText = new WeakMap();

  const applyLanguage = (lang) => {
    document.documentElement.lang = lang === "ur" ? "ur" : "en";
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";

    document.querySelectorAll("a, button, h1, h2, h3, p, summary, strong, span").forEach((element) => {
      const current = element.textContent.trim();
      if (!originalText.has(element)) originalText.set(element, current);
      const original = originalText.get(element);
      element.textContent = lang === "ur" && translations[original] ? translations[original] : original;
    });
  };

  const setTheme = (theme) => {
    document.body.classList.toggle("dark-mode", theme === "dark");
    localStorage.setItem("successClubTheme", theme);
  };

  const setLanguage = (lang) => {
    localStorage.setItem("successClubLanguage", lang);
    applyLanguage(lang);
  };

  const injectStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
      .site-controls{position:fixed;right:18px;bottom:18px;z-index:60;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.site-controls button{min-height:40px;border:1px solid rgba(23,61,49,.18);border-radius:8px;background:rgba(255,255,255,.9);color:#173d31;padding:9px 12px;font-weight:900;box-shadow:0 12px 28px rgba(23,33,28,.14);cursor:pointer}.dark-mode{background:#111713!important;color:#f4f6f0}.dark-mode .site-header,.dark-mode .centered-header{background:rgba(17,23,19,.78)!important}.dark-mode .nav-links,.dark-mode .application-action-card,.dark-mode .feature-panel,.dark-mode .faq-panel,.dark-mode .contact-card,.dark-mode .modal-card,.dark-mode .scholarship-mini-card{background:#18231d!important;border-color:rgba(255,255,255,.14)!important;color:#f4f6f0!important}.dark-mode p,.dark-mode small,.dark-mode .status-note,.dark-mode .checker-result,.dark-mode .faq-list p{color:#cbd7cf!important}.dark-mode .button.secondary,.dark-mode .site-controls button{background:#223128;color:#f4f6f0;border-color:rgba(255,255,255,.16)}.dark-mode input,.dark-mode select,.dark-mode textarea{background:#111713;color:#f4f6f0;border-color:rgba(255,255,255,.18)}.dark-mode .topic-river p{color:#cbd7cf!important}[dir="rtl"] body,[dir="rtl"] button,[dir="rtl"] input,[dir="rtl"] select,[dir="rtl"] textarea{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}[dir="rtl"] .centered-nav .logo-only{left:auto!important;right:50px}[dir="rtl"] .site-controls{left:18px;right:auto}
      @media(max-width:640px){.site-controls{left:12px;right:12px;bottom:12px}.site-controls button{flex:1}}
    `;
    document.head.appendChild(style);
  };

  const setupControls = () => {
    injectStyles();
    const controls = document.createElement("div");
    controls.className = "site-controls";
    controls.innerHTML = `<button type="button" data-theme-toggle>Dark</button><button type="button" data-lang-toggle>Urdu</button>`;
    document.body.appendChild(controls);

    const themeButton = controls.querySelector("[data-theme-toggle]");
    const langButton = controls.querySelector("[data-lang-toggle]");

    const savedTheme = localStorage.getItem("successClubTheme") || "light";
    const savedLang = localStorage.getItem("successClubLanguage") || "en";
    setTheme(savedTheme);
    setLanguage(savedLang);
    themeButton.textContent = savedTheme === "dark" ? "Light" : "Dark";
    langButton.textContent = savedLang === "ur" ? "English" : "Urdu";

    themeButton.addEventListener("click", () => {
      const next = document.body.classList.contains("dark-mode") ? "light" : "dark";
      setTheme(next);
      themeButton.textContent = next === "dark" ? "Light" : "Dark";
    });

    langButton.addEventListener("click", () => {
      const next = (localStorage.getItem("successClubLanguage") || "en") === "ur" ? "en" : "ur";
      setLanguage(next);
      langButton.textContent = next === "ur" ? "English" : "Urdu";
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupControls);
  } else {
    setupControls();
  }
})();
