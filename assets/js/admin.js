import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAw65XzclDbj2AUyHKlPKP0dufaoqpd8OY",
  authDomain: "successscholarships-2026.firebaseapp.com",
  projectId: "successscholarships-2026",
  storageBucket: "successscholarships-2026.firebasestorage.app",
  messagingSenderId: "548307406445",
  appId: "1:548307406445:web:821b1aa139ecdb0ac2f964",
  measurementId: "G-7X02YSZCZ0"
};

const adminEmail = "successscholarships2026@gmail.com";
const app = initializeApp(firebaseConfig, "success-club-admin");
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
const db = getFirestore(app);

const adminLayout = document.querySelector("#admin-layout");
const adminLoginPanel = document.querySelector("#admin-login-panel");
const adminLoginMessage = document.querySelector("#admin-login-message");
const adminGoogleButton = document.querySelector("#admin-google-signin");
const adminDashboard = document.querySelector("#admin-dashboard");
const adminLogoutButton = document.querySelector("#admin-logout-button");
const applicationsList = document.querySelector("#applications-list");
const refreshButton = document.querySelector("#refresh-button");
const exportCsvButton = document.querySelector("#export-csv-button");
const adminControls = document.querySelector("#admin-controls");
const applicationSearch = document.querySelector("#application-search");
const statusFilter = document.querySelector("#status-filter");
const cityFilter = document.querySelector("#city-filter");
const sortSelect = document.querySelector("#sort-select");
const adminCount = document.querySelector("#admin-count");
const statsGrid = document.querySelector("#stats-grid");
let allApplications = [];

const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const normalize = (value) => String(value || "").toLowerCase().trim();
const csv = (value) => `"${String(value || "").replace(/"/g, '""')}"`;
const dateValue = (value) => {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};
const downloadText = (filename, text, type = "text/plain") => {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const showAdminMessage = (message, isSuccess = false) => {
  adminLoginMessage.classList.toggle("success", isSuccess);
  adminLoginMessage.textContent = message;
};

const showDashboard = () => {
  adminLoginPanel.classList.add("hidden");
  adminDashboard.classList.remove("hidden");
  adminLayout.classList.add("dashboard-open");
};

const showLogin = () => {
  adminDashboard.classList.add("hidden");
  adminLoginPanel.classList.remove("hidden");
  adminLayout.classList.remove("dashboard-open");
};

const updateCityFilter = (records) => {
  const current = cityFilter.value;
  const cities = [...new Set(records.map((record) => record.city).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
  cityFilter.innerHTML = '<option value="all">All cities</option>' + cities.map((city) => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`).join("");
  if (cities.includes(current)) cityFilter.value = current;
};

const renderStats = () => {
  const statusCount = (status) => allApplications.filter((record) => (record.status || "Received") === status).length;
  statsGrid.innerHTML = [
    [allApplications.length, "total"],
    [statusCount("Received"), "received"],
    [statusCount("Under Review"), "under review"],
    [statusCount("Needs Info"), "needs info"],
    [statusCount("Approved"), "approved"]
  ].map(([count, label]) => `<div class="stat-card"><strong>${count}</strong><span>${label}</span></div>`).join("");
};

const getVisibleApplications = () => {
  const search = normalize(applicationSearch.value);
  const status = statusFilter.value;
  const city = cityFilter.value;
  const sort = sortSelect.value;

  const visible = allApplications.filter((record) => {
    const searchText = normalize([
      record.application_id,
      record.student_name,
      record.email,
      record.city,
      record.grade,
      record.school,
      record.guardian_name,
      record.guardian_phone,
      record.need_statement,
      record.goals,
      record.status
    ].join(" "));
    return (!search || searchText.includes(search)) && (status === "all" || record.status === status) && (city === "all" || record.city === city);
  });

  visible.sort((a, b) => {
    if (sort === "created-asc") return dateValue(a.created_at) - dateValue(b.created_at);
    if (sort === "name-asc") return String(a.student_name || "").localeCompare(String(b.student_name || ""));
    if (sort === "name-desc") return String(b.student_name || "").localeCompare(String(a.student_name || ""));
    if (sort === "city-asc") return String(a.city || "").localeCompare(String(b.city || ""));
    if (sort === "status-asc") return String(a.status || "Received").localeCompare(String(b.status || "Received"));
    return dateValue(b.created_at) - dateValue(a.created_at);
  });

  return visible;
};

const applicationText = (record) => `Success Club 2026 Application\n\nApplication ID: ${record.application_id || ""}\nStudent: ${record.student_name || ""}\nEmail: ${record.email || ""}\nCity: ${record.city || ""}\nGrade: ${record.grade || ""}\nSchool: ${record.school || ""}\nGuardian: ${record.guardian_name || ""} / ${record.guardian_phone || ""}\nStatus: ${record.status || "Received"}\n\nNeed:\n${record.need_statement || ""}\n\nGoals:\n${record.goals || ""}\n`;

const renderApplications = () => {
  const records = getVisibleApplications();
  adminCount.textContent = `${records.length} of ${allApplications.length} applications shown`;
  renderStats();

  if (!records.length) {
    applicationsList.innerHTML = '<p class="empty-state">No applications match the current search or filters.</p>';
    return;
  }

  applicationsList.innerHTML = records.map((record) => `
    <article class="application-row" data-id="${escapeHtml(record.application_id)}" data-city="${escapeHtml(record.city)}" data-student="${escapeHtml(record.student_name)}">
      <header><h2>${escapeHtml(record.student_name)}</h2><span class="pill">${escapeHtml(record.status || "Received")}</span></header>
      <div class="application-grid">
        <div><strong>Application ID</strong>${escapeHtml(record.application_id)}</div>
        <div><strong>Email</strong>${escapeHtml(record.email)}</div>
        <div><strong>City</strong>${escapeHtml(record.city)}</div>
        <div><strong>Grade</strong>${escapeHtml(record.grade)}</div>
        <div><strong>School</strong>${escapeHtml(record.school)}</div>
        <div><strong>Guardian</strong>${escapeHtml(record.guardian_name)} / ${escapeHtml(record.guardian_phone)}</div>
        <div class="wide"><strong>Need</strong>${escapeHtml(record.need_statement)}</div>
        <div class="wide"><strong>Goals</strong>${escapeHtml(record.goals)}</div>
      </div>
      <form class="status-editor">
        <select name="status"><option ${record.status === "Received" ? "selected" : ""}>Received</option><option ${record.status === "Under Review" ? "selected" : ""}>Under Review</option><option ${record.status === "Needs Info" ? "selected" : ""}>Needs Info</option><option ${record.status === "Approved" ? "selected" : ""}>Approved</option><option ${record.status === "Rejected" ? "selected" : ""}>Rejected</option></select>
        <input name="message" value="${escapeHtml(record.message || "Your application has been received and is waiting for review.")}" />
        <button class="button secondary" type="submit">Update Status</button>
        <button class="button secondary" type="button" data-download-application>Download</button>
        <button class="danger-button" type="button" data-delete-application>Delete</button>
      </form>
    </article>
  `).join("");
};

const loadApplications = async () => {
  applicationsList.innerHTML = '<p class="empty-state">Loading applications...</p>';
  adminCount.textContent = "Loading applications...";
  const snapshot = await getDocs(query(collection(db, "applications"), orderBy("created_at", "desc")));
  allApplications = snapshot.docs.map((item) => item.data());
  updateCityFilter(allApplications);
  renderApplications();
};

getRedirectResult(auth).then(async (result) => {
  if (!result?.user) return;
  if (result.user.email.toLowerCase() !== adminEmail) {
    await signOut(auth);
    showAdminMessage("That Google account is not the admin account.");
    return;
  }
  showAdminMessage("Signed in.", true);
}).catch((error) => {
  showAdminMessage(error.message.replace("Firebase: ", ""));
});

adminGoogleButton.addEventListener("click", async () => {
  showAdminMessage("Opening Google sign-in...");
  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    showAdminMessage(error.message.replace("Firebase: ", ""));
  }
});

applicationsList.addEventListener("submit", async (event) => {
  const form = event.target.closest(".status-editor");
  if (!form) return;
  event.preventDefault();
  const row = form.closest(".application-row");
  const applicationId = row.dataset.id;
  const data = new FormData(form);
  const status = String(data.get("status") || "Received");
  const message = String(data.get("message") || "");
  await updateDoc(doc(db, "applications", applicationId), { status, message, updated_at: new Date() });
  await setDoc(doc(db, "application_status", applicationId), {
    application_id: applicationId,
    student_name: row.dataset.student,
    city: row.dataset.city,
    status,
    message,
    updated_at: new Date().toISOString().slice(0, 10)
  }, { merge: true });
  await loadApplications();
});

applicationsList.addEventListener("click", async (event) => {
  const row = event.target.closest(".application-row");
  if (!row) return;
  const applicationId = row.dataset.id;
  const record = allApplications.find((item) => item.application_id === applicationId);

  if (event.target.closest("[data-download-application]") && record) {
    downloadText(`${applicationId || "application"}.txt`, applicationText(record));
    return;
  }

  const deleteButton = event.target.closest("[data-delete-application]");
  if (!deleteButton) return;
  const student = row.dataset.student || "this applicant";
  if (!window.confirm(`Delete ${student}'s application (${applicationId})? This also removes their status lookup.`)) return;
  deleteButton.disabled = true;
  deleteButton.textContent = "Deleting...";
  await deleteDoc(doc(db, "applications", applicationId));
  await deleteDoc(doc(db, "application_status", applicationId));
  allApplications = allApplications.filter((item) => item.application_id !== applicationId);
  updateCityFilter(allApplications);
  renderApplications();
});

exportCsvButton.addEventListener("click", () => {
  const rows = getVisibleApplications();
  const header = ["Application ID", "Student", "Email", "City", "Grade", "School", "Guardian", "Guardian Phone", "Status", "Need", "Goals"];
  const lines = [header.map(csv).join(",")].concat(rows.map((record) => [record.application_id, record.student_name, record.email, record.city, record.grade, record.school, record.guardian_name, record.guardian_phone, record.status || "Received", record.need_statement, record.goals].map(csv).join(",")));
  downloadText("success-club-applications.csv", lines.join("\n"), "text/csv");
});

adminControls.addEventListener("input", renderApplications);
adminControls.addEventListener("change", renderApplications);
refreshButton.addEventListener("click", loadApplications);
adminLogoutButton.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (user && user.email.toLowerCase() === adminEmail) {
    showDashboard();
    await loadApplications();
  } else {
    showLogin();
  }
});
