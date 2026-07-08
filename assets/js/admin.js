const adminLoginForm = document.querySelector("#admin-login-form");
const adminLoginMessage = document.querySelector("#admin-login-message");
const adminDashboard = document.querySelector("#admin-dashboard");
const applicationsList = document.querySelector("#applications-list");
const adminCount = document.querySelector("#admin-count");
const adminLogoutButton = document.querySelector("#admin-logout-button");
const applicationSort = document.querySelector("#application-sort");

const adminTokenKey = "successClubAdminToken";
let currentApplications = [];

const showAdminMessage = (message, isSuccess = false) => {
  adminLoginMessage.classList.toggle("show", isSuccess);
  adminLoginMessage.textContent = message;
};

const apiRequest = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const gmailComposeUrl = (email, name) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    email
  )}&su=${encodeURIComponent(`Success Club Scholarship Application - ${name}`)}`;

const sortApplications = (applications) => {
  const sorted = [...applications];
  const mode = applicationSort?.value || "newest";

  const byText = (field) =>
    sorted.sort((a, b) => String(a[field] || "").localeCompare(String(b[field] || "")));

  if (mode === "oldest") sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (mode === "newest") sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (mode === "name") byText("studentName");
  if (mode === "status") byText("status");
  if (mode === "city") byText("city");
  if (mode === "program") byText("program");

  return sorted;
};

const renderApplications = () => {
  const applications = sortApplications(currentApplications);

  adminCount.textContent = `${applications.length} application${
    applications.length === 1 ? "" : "s"
  } found.`;
  applicationsList.innerHTML = applications.length
    ? applications.map(applicationTemplate).join("")
    : `<div class="empty-state">No student applications have been submitted yet.</div>`;
};

const applicationTemplate = (application) => `
  <article class="application-record">
    <div class="record-head">
      <div>
        <span class="tag">${escapeHtml(application.status)}</span>
        <h3>${escapeHtml(application.studentName)}</h3>
        <p>${escapeHtml(application.program)}</p>
      </div>
      <div class="record-actions">
        <select class="status-select" data-id="${application.id}">
          ${["Submitted", "Under Review", "Shortlisted", "Approved", "Rejected"]
            .map(
              (status) =>
                `<option ${status === application.status ? "selected" : ""}>${status}</option>`
            )
            .join("")}
        </select>
        <button class="delete-button" type="button" data-delete-id="${application.id}">Delete</button>
      </div>
    </div>
    <dl class="record-grid">
      <div><dt>Email</dt><dd><a target="_blank" rel="noopener" href="${gmailComposeUrl(application.email, application.studentName)}">${escapeHtml(application.email)}</a></dd></div>
      <div><dt>Phone</dt><dd><a href="tel:${escapeHtml(application.phone)}">${escapeHtml(application.phone)}</a></dd></div>
      <div><dt>City</dt><dd>${escapeHtml(application.city)}</dd></div>
      <div><dt>School</dt><dd>${escapeHtml(application.school)}</dd></div>
      <div><dt>Grade</dt><dd>${escapeHtml(application.grade)}</dd></div>
      <div><dt>Income</dt><dd>${escapeHtml(application.income)}</dd></div>
      <div><dt>Guardian</dt><dd>${escapeHtml(application.guardianName)}</dd></div>
      <div><dt>Submitted</dt><dd>${new Date(application.createdAt).toLocaleString()}</dd></div>
    </dl>
    <div class="statement-box">
      <strong>Student statement</strong>
      <p>${escapeHtml(application.statement)}</p>
    </div>
  </article>
`;

const loadApplications = async () => {
  const token = localStorage.getItem(adminTokenKey);
  if (!token) return;

  const data = await apiRequest("/api/admin/applications", {
    headers: { Authorization: `Bearer ${token}` },
  });

  adminLoginForm.hidden = true;
  adminDashboard.hidden = false;
  currentApplications = data.applications;
  renderApplications();
};

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(adminLoginForm);

  try {
    const data = await apiRequest("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    localStorage.setItem(adminTokenKey, data.token);
    showAdminMessage("Signed in successfully.", true);
    await loadApplications();
  } catch (error) {
    showAdminMessage(error.message);
  }
});

applicationsList.addEventListener("change", async (event) => {
  if (!event.target.matches(".status-select")) return;

  const token = localStorage.getItem(adminTokenKey);
  await apiRequest(`/api/admin/applications/${event.target.dataset.id}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: event.target.value }),
  });
  await loadApplications();
});

applicationsList.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete-id]");
  if (!deleteButton) return;

  const confirmed = confirm("Delete this application from the local database?");
  if (!confirmed) return;

  const token = localStorage.getItem(adminTokenKey);
  await apiRequest(`/api/admin/applications/${deleteButton.dataset.deleteId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  await loadApplications();
});

applicationSort.addEventListener("change", renderApplications);

adminLogoutButton.addEventListener("click", () => {
  localStorage.removeItem(adminTokenKey);
  adminDashboard.hidden = true;
  adminLoginForm.hidden = false;
});

loadApplications().catch(() => localStorage.removeItem(adminTokenKey));
