const adminLoginForm = document.querySelector("#admin-login-form");
const adminLoginMessage = document.querySelector("#admin-login-message");
const adminDashboard = document.querySelector("#admin-dashboard");
const adminLogoutButton = document.querySelector("#admin-logout-button");

const adminSessionKey = "successClubAdminSheetAccess";
const adminEmail = "successscholarships2026@gmail.com";
const adminPassword = "admin2026";

const showAdminMessage = (message, isSuccess = false) => {
  adminLoginMessage.classList.toggle("show", Boolean(message));
  adminLoginMessage.classList.toggle("success", isSuccess);
  adminLoginMessage.textContent = message;
};

const showDashboard = () => {
  adminLoginForm.hidden = true;
  adminDashboard.hidden = false;
};

if (localStorage.getItem(adminSessionKey) === "active") {
  showDashboard();
}

adminLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(adminLoginForm);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (email !== adminEmail || password !== adminPassword) {
    showAdminMessage("Admin email or password is incorrect.");
    return;
  }

  localStorage.setItem(adminSessionKey, "active");
  showAdminMessage("Signed in successfully.", true);
  showDashboard();
});

adminLogoutButton.addEventListener("click", () => {
  localStorage.removeItem(adminSessionKey);
  adminDashboard.hidden = true;
  adminLoginForm.hidden = false;
  adminLoginForm.reset();
});
