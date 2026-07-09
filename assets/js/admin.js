import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, setDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

const adminLayout = document.querySelector("#admin-layout");
const adminLoginPanel = document.querySelector("#admin-login-panel");
const adminLoginMessage = document.querySelector("#admin-login-message");
const adminGoogleButton = document.querySelector("#admin-google-signin");
const adminDashboard = document.querySelector("#admin-dashboard");
const adminLogoutButton = document.querySelector("#admin-logout-button");
const applicationsList = document.querySelector("#applications-list");
const refreshButton = document.querySelector("#refresh-button");

const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

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

const renderApplications = (records) => {
  if (!records.length) {
    applicationsList.innerHTML = '<p class="empty-state">No applications have been submitted yet.</p>';
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
      </form>
    </article>
  `).join("");
};

const loadApplications = async () => {
  applicationsList.innerHTML = '<p class="empty-state">Loading applications...</p>';
  const snapshot = await getDocs(query(collection(db, "applications"), orderBy("created_at", "desc")));
  const records = snapshot.docs.map((item) => item.data());
  renderApplications(records);
};

adminGoogleButton.addEventListener("click", async () => {
  showAdminMessage("Opening Google sign-in...");
  try {
    const credential = await signInWithPopup(auth, provider);
    if (credential.user.email.toLowerCase() !== adminEmail) {
      await signOut(auth);
      showAdminMessage("That Google account is not the admin account.");
      return;
    }
    showAdminMessage("Signed in.", true);
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
