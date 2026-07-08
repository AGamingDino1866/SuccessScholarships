const studentTokenKey = "successClubStudentToken";
const studentUserKey = "successClubStudentUser";

const apiRequest = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
};

const getStudent = () => {
  try {
    return JSON.parse(localStorage.getItem(studentUserKey));
  } catch {
    return null;
  }
};

const setStudentSession = (data) => {
  localStorage.setItem(studentTokenKey, data.token);
  localStorage.setItem(studentUserKey, JSON.stringify(data.user));
  updateAccountWidgets();
};

const clearStudentSession = () => {
  localStorage.removeItem(studentTokenKey);
  localStorage.removeItem(studentUserKey);
  updateAccountWidgets();
};

const showMessage = (selector, message, isSuccess = false) => {
  const element = document.querySelector(selector);
  if (!element) return;
  element.classList.add("show");
  element.classList.toggle("warning", !isSuccess);
  element.textContent = message;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const loadCaptcha = async (targetId) => {
  const box = document.querySelector(targetId);
  if (!box) return;
  const data = await apiRequest("/api/captcha");
  box.querySelector("[data-captcha-question]").textContent = data.captcha.question;
  box.querySelector("[name='captchaId']").value = data.captcha.id;
  box.querySelector("[name='captchaAnswer']").value = "";
};

const updateAccountWidgets = () => {
  const student = getStudent();

  document.querySelectorAll("[data-student-status]").forEach((element) => {
    if (!student) {
      element.textContent = "Not signed in.";
      return;
    }

    element.textContent = `${student.name} signed in. Email ${
      student.emailVerified ? "verified" : "not verified"
    }.`;
  });

  document.querySelectorAll("[data-student-name]").forEach((element) => {
    element.textContent = student?.name || "Student";
  });

  document.querySelectorAll("[data-student-email]").forEach((element) => {
    element.textContent = student?.email || "Sign in first";
  });

  document.querySelectorAll("[data-student-phone]").forEach((element) => {
    element.textContent = student?.phone || "Sign in first";
  });

  document.querySelectorAll("[data-student-city]").forEach((element) => {
    element.textContent = student?.city || "Sign in first";
  });
};

const setupNavigation = () => {
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (!navToggle || !navLinks) return;

  navToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
};

const setupScholarshipButtons = () => {
  document.querySelectorAll("[data-program]").forEach((button) => {
    button.addEventListener("click", () => {
      localStorage.setItem("selectedScholarship", button.dataset.program);
      window.location.href = "apply.html";
    });
  });
};

const setupRegister = () => {
  const form = document.querySelector("#register-form");
  if (!form) return;

  loadCaptcha("#register-captcha");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    try {
      const data = await apiRequest("/api/student/register", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      setStudentSession(data);
      form.reset();
      const params = new URLSearchParams();
      if (data.demoVerificationCode) params.set("demoCode", data.demoVerificationCode);
      params.set("emailSent", String(Boolean(data.emailSent)));
      window.location.href = `verify.html?${params.toString()}`;
    } catch (error) {
      showMessage("#register-message", error.message);
      loadCaptcha("#register-captcha");
    }
  });
};

const setupLogin = () => {
  const form = document.querySelector("#login-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    try {
      const data = await apiRequest("/api/student/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      setStudentSession(data);
      showMessage("#login-message", "Signed in successfully.", true);
      form.reset();
      if (!data.user.emailVerified) window.location.href = "verify.html";
    } catch (error) {
      showMessage("#login-message", error.message);
    }
  });
};

const setupVerifyEmail = () => {
  const form = document.querySelector("#verify-form");
  const resendButton = document.querySelector("#resend-code-button");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const demoCode = params.get("demoCode");
  const emailSent = params.get("emailSent") === "true";

  if (demoCode) {
    showMessage("#verify-message", `Email is not configured yet. Demo code: ${demoCode}`, true);
  } else if (emailSent) {
    showMessage("#verify-message", "We sent a verification code to your email.", true);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = localStorage.getItem(studentTokenKey);
    const formData = new FormData(form);

    try {
      const data = await apiRequest("/api/student/verify-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      localStorage.setItem(studentUserKey, JSON.stringify(data.user));
      updateAccountWidgets();
      showMessage("#verify-message", "Email verified. You can apply now.", true);
      form.reset();
      setTimeout(() => {
        window.location.href = "apply.html";
      }, 900);
    } catch (error) {
      showMessage("#verify-message", error.message);
    }
  });

  resendButton?.addEventListener("click", async () => {
    const token = localStorage.getItem(studentTokenKey);

    try {
      const data = await apiRequest("/api/student/resend-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      showMessage(
        "#verify-message",
        data.demoVerificationCode
          ? `Email is not configured yet. New demo code: ${data.demoVerificationCode}`
          : "New verification code sent to your email.",
        true
      );
    } catch (error) {
      showMessage("#verify-message", error.message);
    }
  });
};

const setupLogout = () => {
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      clearStudentSession();
      showMessage("#login-message", "Signed out.", true);
    });
  });
};

const setupApply = () => {
  const form = document.querySelector("#application-form");
  if (!form) return;

  const selected = localStorage.getItem("selectedScholarship");
  if (selected) document.querySelector("#program-select").value = selected;
  loadCaptcha("#application-captcha");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = localStorage.getItem(studentTokenKey);
    const student = getStudent();

    if (!token || !student) {
      showMessage("#application-result", "Please sign in before submitting an application.");
      return;
    }

    if (!student.emailVerified) {
      showMessage("#application-result", "Please verify your email before applying.");
      return;
    }

    try {
      const formData = new FormData(form);
      const data = await apiRequest("/api/applications", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      form.reset();
      localStorage.removeItem("selectedScholarship");
      showMessage(
        "#application-result",
        `Application saved for ${data.application.studentName}. Admins can now see it.`,
        true
      );
      loadCaptcha("#application-captcha");
    } catch (error) {
      showMessage("#application-result", error.message);
      loadCaptcha("#application-captcha");
    }
  });
};

const setupStudentStatus = async () => {
  const list = document.querySelector("#student-status-list");
  if (!list) return;

  const token = localStorage.getItem(studentTokenKey);
  if (!token) {
    list.innerHTML = `<div class="empty-state">Please sign in first, then come back to this page.</div>`;
    return;
  }

  try {
    const data = await apiRequest("/api/my-applications", {
      headers: { Authorization: `Bearer ${token}` },
    });

    list.innerHTML = data.applications.length
      ? data.applications
          .map(
            (application) => `
              <article class="application-record status-record">
                <div class="record-head">
                  <div>
                    <span class="tag">${escapeHtml(application.status)}</span>
                    <h3>${escapeHtml(application.program)}</h3>
                    <p>Submitted ${new Date(application.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <dl class="record-grid">
                  <div><dt>School</dt><dd>${escapeHtml(application.school)}</dd></div>
                  <div><dt>Grade</dt><dd>${escapeHtml(application.grade)}</dd></div>
                  <div><dt>Income</dt><dd>${escapeHtml(application.income)}</dd></div>
                  <div><dt>Guardian</dt><dd>${escapeHtml(application.guardianName)}</dd></div>
                </dl>
                <div class="statement-box">
                  <strong>Latest status</strong>
                  <p>${escapeHtml(application.status)}</p>
                </div>
              </article>
            `
          )
          .join("")
      : `<div class="empty-state">You have not submitted any applications yet.</div>`;
  } catch (error) {
    list.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
};

setupNavigation();
setupScholarshipButtons();
setupRegister();
setupLogin();
setupVerifyEmail();
setupLogout();
setupApply();
updateAccountWidgets();
setupStudentStatus();
