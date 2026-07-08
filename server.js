const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const tls = require("tls");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const APPLICATIONS_FILE = path.join(DATA_DIR, "applications.json");
const CREDENTIALS_FILE = path.join(ROOT, "credentials.env");
const SESSIONS = new Map();
const CAPTCHAS = new Map();
let EMAIL_CONFIG = null;

const ADMIN = {
  id: "admin-1",
  name: "Success Club Admin",
  email: "admin@successclub2026.org",
  password: "admin2026",
  role: "admin",
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const scholarships = [
  "Foundation Learning Grant",
  "Quality Education Scholarship",
  "Digital Study Support",
];

const allowedStatuses = ["Submitted", "Under Review", "Shortlisted", "Approved", "Rejected"];

const loadCredentials = async () => {
  try {
    const contents = await fs.readFile(CREDENTIALS_FILE, "utf8");
    const values = {};

    contents.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const equals = trimmed.indexOf("=");
      if (equals === -1) return;

      const key = trimmed.slice(0, equals).trim();
      const value = trimmed.slice(equals + 1).trim().replace(/^["']|["']$/g, "");
      values[key] = value;
    });

    const gmailUser = values.GMAIL_USER || values.email || values.EMAIL;
    const gmailPassword = values.GMAIL_APP_PASSWORD || values.password || values.PASSWORD;

    if (gmailUser && gmailPassword) {
      EMAIL_CONFIG = {
        user: gmailUser,
        appPassword: gmailPassword.replace(/\s/g, ""),
      };
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
};

const writeJson = async (file, data) => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
};

const sendJson = (response, statusCode, data) => {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
};

const readBody = async (request) =>
  new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request is too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });
  });

const clean = (value) => String(value || "").trim();

const normalizeEmail = (email) => clean(email).toLowerCase();

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 120;

const normalizePhone = (phone) => {
  const compact = clean(phone).replace(/[\s-]/g, "");
  if (/^\+923\d{9}$/.test(compact)) return `0${compact.slice(3)}`;
  return compact;
};

const isValidPakistanMobile = (phone) => /^03\d{9}$/.test(phone);

const hasRealWords = (value, minLength = 4) => {
  const text = clean(value);
  return text.length >= minLength && /[a-zA-Z]{2,}/.test(text) && !/(.)\1{5,}/.test(text);
};

const requireFields = (body, fields) => {
  const missing = fields.filter((field) => !clean(body[field]));
  if (missing.length) throw new Error(`Missing required field: ${missing.join(", ")}`);
};

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, savedPassword) => {
  const [salt, originalHash] = savedPassword.split(":");
  const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(testHash, "hex"));
};

const createToken = (user) => {
  const token = crypto.randomBytes(32).toString("hex");
  SESSIONS.set(token, { id: user.id, role: user.role, email: user.email, name: user.name });
  return token;
};

const getSession = (request) => {
  const auth = request.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return SESSIONS.get(token);
};

const requireSession = (request, role) => {
  const session = getSession(request);
  if (!session || (role && session.role !== role)) return null;
  return session;
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  city: user.city,
  role: user.role,
  emailVerified: Boolean(user.emailVerified),
});

const createCaptcha = () => {
  const left = crypto.randomInt(12, 40);
  const right = crypto.randomInt(4, 16);
  const multiplier = crypto.randomInt(2, 6);
  const id = crypto.randomUUID();
  CAPTCHAS.set(id, {
    answer: String(left + right * multiplier),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  return { id, question: `${left} + (${right} x ${multiplier})` };
};

const verifyCaptcha = (captchaId, captchaAnswer) => {
  const captcha = CAPTCHAS.get(clean(captchaId));
  CAPTCHAS.delete(clean(captchaId));

  if (!captcha || Date.now() > captcha.expiresAt) {
    throw new Error("CAPTCHA expired. Please reload it and try again.");
  }

  if (clean(captchaAnswer) !== captcha.answer) {
    throw new Error("CAPTCHA answer is incorrect.");
  }
};

const createVerificationCode = () => String(crypto.randomInt(100000, 999999));

const smtpCommand = (socket, command, expectedCode) =>
  new Promise((resolve, reject) => {
    const onData = (chunk) => {
      const text = chunk.toString("utf8");
      const lines = text.trim().split(/\r?\n/);
      const lastLine = lines[lines.length - 1] || "";
      if (!/^\d{3}[ -]/.test(lastLine)) return;

      socket.off("data", onData);
      if (!lastLine.startsWith(String(expectedCode))) {
        reject(new Error(`SMTP error after ${command || "connect"}: ${text.trim()}`));
        return;
      }
      resolve(text);
    };

    socket.on("data", onData);
    if (command) socket.write(`${command}\r\n`);
  });

const sendMail = async ({ to, subject, text }) => {
  if (!EMAIL_CONFIG) return false;

  const socket = tls.connect(465, "smtp.gmail.com", { servername: "smtp.gmail.com" });
  await new Promise((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
  });

  const encodedUser = Buffer.from(EMAIL_CONFIG.user).toString("base64");
  const encodedPassword = Buffer.from(EMAIL_CONFIG.appPassword).toString("base64");
  const safeBody = text.replace(/\r?\n\./g, "\r\n..").replace(/\n/g, "\r\n");
  const message = [
    `From: Success Club 2026 <${EMAIL_CONFIG.user}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    safeBody,
  ].join("\r\n");

  try {
    await smtpCommand(socket, "", 220);
    await smtpCommand(socket, "EHLO localhost", 250);
    await smtpCommand(socket, "AUTH LOGIN", 334);
    await smtpCommand(socket, encodedUser, 334);
    await smtpCommand(socket, encodedPassword, 235);
    await smtpCommand(socket, `MAIL FROM:<${EMAIL_CONFIG.user}>`, 250);
    await smtpCommand(socket, `RCPT TO:<${to}>`, 250);
    await smtpCommand(socket, "DATA", 354);
    await smtpCommand(socket, `${message}\r\n.`, 250);
    await smtpCommand(socket, "QUIT", 221);
    socket.end();
    return true;
  } catch (error) {
    socket.destroy();
    throw error;
  }
};

const sendVerificationEmail = async (user) => {
  try {
    const sent = await sendMail({
      to: user.email,
      subject: "Your Success Club verification code",
      text: `Hi ${user.name},

Your Success Club 2026 verification code is:

${user.verificationCode}

This code expires in 15 minutes.

Success Club 2026 Scholarship Portal`,
    });

    if (sent) console.log(`Verification email sent to ${user.email}`);
    return sent;
  } catch (error) {
    console.warn(`Verification email failed for ${user.email}: ${error.message}`);
    return false;
  }
};

const findUserBySession = async (session) => {
  const users = await readJson(USERS_FILE, []);
  return users.find((user) => user.id === session.id);
};

const validateAccountInput = (body) => {
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);

  if (!hasRealWords(body.name, 5)) throw new Error("Please enter a real full name.");
  if (!isValidEmail(email)) throw new Error("Please enter a valid email address.");
  if (!isValidPakistanMobile(phone)) {
    throw new Error("Phone must be a Pakistan mobile number like 03XXXXXXXXX.");
  }
  if (!["Karachi", "Lahore", "Islamabad", "Other"].includes(clean(body.city))) {
    throw new Error("Please select a valid city.");
  }
  if (clean(body.password).length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  return { email, phone };
};

const validateApplicationInput = (body) => {
  const grade = Number(body.grade);
  const statement = clean(body.statement);
  const school = clean(body.school);
  const guardianName = clean(body.guardianName);

  if (!scholarships.includes(clean(body.program))) throw new Error("Please choose a valid scholarship.");
  if (!hasRealWords(school, 5)) throw new Error("Please enter a real school name.");
  if (!Number.isInteger(grade) || grade < 6 || grade > 12) {
    throw new Error("Grade must be between 6 and 12.");
  }
  if (!["Below PKR 60,000", "PKR 60,000 - 100,000", "Above PKR 100,000"].includes(clean(body.income))) {
    throw new Error("Please choose a valid household income range.");
  }
  if (clean(body.income) === "Above PKR 100,000") {
    throw new Error("This scholarship is for low-income families, so this application is not eligible.");
  }
  if (!hasRealWords(guardianName, 4)) throw new Error("Please enter a real guardian name.");
  if (statement.length < 40) throw new Error("Statement must be at least 40 characters.");
  if (statement.length > 900) throw new Error("Statement must be under 900 characters.");

  return { grade, statement, school, guardianName };
};

const handleApi = async (request, response, pathname) => {
  if (request.method === "GET" && pathname === "/api/captcha") {
    return sendJson(response, 200, { captcha: createCaptcha() });
  }

  if (request.method === "POST" && pathname === "/api/student/register") {
    const body = await readBody(request);
    requireFields(body, ["name", "email", "phone", "city", "password", "captchaId", "captchaAnswer"]);
    verifyCaptcha(body.captchaId, body.captchaAnswer);

    const { email, phone } = validateAccountInput(body);
    const users = await readJson(USERS_FILE, []);

    if (users.some((user) => user.email === email)) {
      return sendJson(response, 409, { error: "An account with this email already exists." });
    }

    if (users.some((user) => user.phone === phone)) {
      return sendJson(response, 409, { error: "An account with this phone number already exists." });
    }

    const verificationCode = createVerificationCode();
    const user = {
      id: crypto.randomUUID(),
      role: "student",
      name: clean(body.name),
      email,
      phone,
      city: clean(body.city),
      password: hashPassword(clean(body.password)),
      emailVerified: false,
      verificationCode,
      verificationExpiresAt: Date.now() + 15 * 60 * 1000,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    await writeJson(USERS_FILE, users);

    console.log(`Verification code for ${email}: ${verificationCode}`);
    const emailSent = await sendVerificationEmail(user);

    return sendJson(response, 201, {
      token: createToken(user),
      user: publicUser(user),
      demoVerificationCode: emailSent ? null : verificationCode,
      emailSent,
      message: emailSent
        ? "Account created. Verification code sent to your email."
        : "Account created. Email is not configured, so the demo verification code is shown locally.",
    });
  }

  if (request.method === "POST" && pathname === "/api/student/login") {
    const body = await readBody(request);
    requireFields(body, ["email", "password"]);

    const users = await readJson(USERS_FILE, []);
    const user = users.find((item) => item.email === normalizeEmail(body.email));

    if (!user || !verifyPassword(clean(body.password), user.password)) {
      return sendJson(response, 401, { error: "Incorrect student email or password." });
    }

    return sendJson(response, 200, { token: createToken(user), user: publicUser(user) });
  }

  if (request.method === "POST" && pathname === "/api/student/verify-email") {
    const session = requireSession(request, "student");
    if (!session) return sendJson(response, 401, { error: "Please sign in as a student first." });

    const body = await readBody(request);
    requireFields(body, ["code"]);

    const users = await readJson(USERS_FILE, []);
    const user = users.find((item) => item.id === session.id);
    if (!user) return sendJson(response, 404, { error: "Student account not found." });
    if (user.emailVerified) return sendJson(response, 200, { user: publicUser(user) });

    if (Date.now() > user.verificationExpiresAt || clean(body.code) !== user.verificationCode) {
      return sendJson(response, 400, { error: "Verification code is incorrect or expired." });
    }

    user.emailVerified = true;
    user.verificationCode = null;
    user.verificationExpiresAt = null;
    user.verifiedAt = new Date().toISOString();
    await writeJson(USERS_FILE, users);

    return sendJson(response, 200, { user: publicUser(user) });
  }

  if (request.method === "POST" && pathname === "/api/student/resend-code") {
    const session = requireSession(request, "student");
    if (!session) return sendJson(response, 401, { error: "Please sign in as a student first." });

    const users = await readJson(USERS_FILE, []);
    const user = users.find((item) => item.id === session.id);
    if (!user) return sendJson(response, 404, { error: "Student account not found." });
    if (user.emailVerified) return sendJson(response, 400, { error: "Email is already verified." });

    user.verificationCode = createVerificationCode();
    user.verificationExpiresAt = Date.now() + 15 * 60 * 1000;
    await writeJson(USERS_FILE, users);

    console.log(`Verification code for ${user.email}: ${user.verificationCode}`);
    const emailSent = await sendVerificationEmail(user);
    return sendJson(response, 200, {
      demoVerificationCode: emailSent ? null : user.verificationCode,
      emailSent,
      message: emailSent
        ? "New verification code sent to your email."
        : "Email is not configured, so the new demo code is shown locally.",
    });
  }

  if (request.method === "POST" && pathname === "/api/admin/login") {
    const body = await readBody(request);
    requireFields(body, ["email", "password"]);

    if (normalizeEmail(body.email) !== ADMIN.email || clean(body.password) !== ADMIN.password) {
      return sendJson(response, 401, { error: "Incorrect admin email or password." });
    }

    return sendJson(response, 200, { token: createToken(ADMIN), user: publicUser(ADMIN) });
  }

  if (request.method === "GET" && pathname === "/api/me") {
    const session = requireSession(request);
    if (!session) return sendJson(response, 401, { error: "Please sign in first." });

    if (session.role === "student") {
      const user = await findUserBySession(session);
      if (!user) return sendJson(response, 404, { error: "Student account not found." });
      return sendJson(response, 200, { user: publicUser(user) });
    }

    return sendJson(response, 200, { user: session });
  }

  if (request.method === "POST" && pathname === "/api/applications") {
    const session = requireSession(request, "student");
    if (!session) return sendJson(response, 401, { error: "Please sign in as a student first." });

    const body = await readBody(request);
    requireFields(body, [
      "program",
      "school",
      "grade",
      "income",
      "guardianName",
      "statement",
      "captchaId",
      "captchaAnswer",
    ]);
    verifyCaptcha(body.captchaId, body.captchaAnswer);

    const users = await readJson(USERS_FILE, []);
    const user = users.find((item) => item.id === session.id);
    if (!user) return sendJson(response, 404, { error: "Student account not found." });
    if (!user.emailVerified) {
      return sendJson(response, 403, { error: "Please verify your email before applying." });
    }

    const validated = validateApplicationInput(body);
    const applications = await readJson(APPLICATIONS_FILE, []);

    if (
      applications.some(
        (application) => application.studentId === user.id && application.program === clean(body.program)
      )
    ) {
      return sendJson(response, 409, {
        error: "You already submitted an application for this scholarship.",
      });
    }

    const application = {
      id: crypto.randomUUID(),
      studentId: user.id,
      studentAccountEmail: user.email,
      studentName: user.name,
      city: user.city,
      email: user.email,
      phone: user.phone,
      program: clean(body.program),
      school: validated.school,
      grade: String(validated.grade),
      income: clean(body.income),
      guardianName: validated.guardianName,
      statement: validated.statement,
      status: "Submitted",
      createdAt: new Date().toISOString(),
    };

    applications.unshift(application);
    await writeJson(APPLICATIONS_FILE, applications);

    return sendJson(response, 201, { application });
  }

  if (request.method === "GET" && pathname === "/api/my-applications") {
    const session = requireSession(request, "student");
    if (!session) return sendJson(response, 401, { error: "Please sign in as a student first." });

    const applications = await readJson(APPLICATIONS_FILE, []);
    return sendJson(response, 200, {
      applications: applications.filter((application) => application.studentId === session.id),
    });
  }

  if (request.method === "GET" && pathname === "/api/admin/applications") {
    const session = requireSession(request, "admin");
    if (!session) return sendJson(response, 401, { error: "Please sign in as an admin first." });

    return sendJson(response, 200, { applications: await readJson(APPLICATIONS_FILE, []) });
  }

  const deleteMatch = pathname.match(/^\/api\/admin\/applications\/([^/]+)$/);
  if (request.method === "DELETE" && deleteMatch) {
    const session = requireSession(request, "admin");
    if (!session) return sendJson(response, 401, { error: "Please sign in as an admin first." });

    const applications = await readJson(APPLICATIONS_FILE, []);
    const nextApplications = applications.filter((item) => item.id !== deleteMatch[1]);

    if (nextApplications.length === applications.length) {
      return sendJson(response, 404, { error: "Application not found." });
    }

    await writeJson(APPLICATIONS_FILE, nextApplications);
    return sendJson(response, 200, { deleted: true });
  }

  const statusMatch = pathname.match(/^\/api\/admin\/applications\/([^/]+)\/status$/);
  if (request.method === "PATCH" && statusMatch) {
    const session = requireSession(request, "admin");
    if (!session) return sendJson(response, 401, { error: "Please sign in as an admin first." });

    const body = await readBody(request);
    if (!allowedStatuses.includes(body.status)) {
      return sendJson(response, 400, { error: "Invalid application status." });
    }

    const applications = await readJson(APPLICATIONS_FILE, []);
    const application = applications.find((item) => item.id === statusMatch[1]);

    if (!application) return sendJson(response, 404, { error: "Application not found." });

    application.status = body.status;
    application.updatedAt = new Date().toISOString();
    await writeJson(APPLICATIONS_FILE, applications);

    return sendJson(response, 200, { application });
  }

  return sendJson(response, 404, { error: "API route not found." });
};

const serveStatic = async (request, response, pathname) => {
  const requestedPath = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^[/\\]+/, "");
  const safePath = path.normalize(requestedPath);

  if (path.isAbsolute(safePath) || safePath.startsWith("..")) {
    response.writeHead(403);
    return response.end("Forbidden");
  }

  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403);
    return response.end("Forbidden");
  }

  try {
    const contents = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(contents);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url.pathname);
      return;
    }

    await serveStatic(request, response, url.pathname);
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Request failed." });
  }
});

const start = async () => {
  await loadCredentials();
  await writeJson(USERS_FILE, await readJson(USERS_FILE, []));
  await writeJson(APPLICATIONS_FILE, await readJson(APPLICATIONS_FILE, []));
  server.listen(PORT, () => {
    console.log(`Success Club portal running at http://localhost:${PORT}`);
    console.log(`Admin login: ${ADMIN.email} / ${ADMIN.password}`);
    console.log(`Email delivery: ${EMAIL_CONFIG ? "Gmail SMTP enabled" : "demo/local codes only"}`);
  });
};

start();
