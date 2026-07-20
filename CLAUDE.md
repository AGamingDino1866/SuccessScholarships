# Success Factor - Implementation Reference

Cloudflare Pages static site + Firestore + Firebase Auth + Groq LLM.

## ⚠️ Git Workflow (CRITICAL)

**ALWAYS push to `main` branch only.**
- No feature branches
- All commits go to `main`
- Commits must be GPG signed with key `928DF747700C2142`
- Commit authors must be `Claude <noreply@anthropic.com>`

Violating this breaks the deployment CI/CD pipeline.

## Architecture

### Stack
- **CDN/Hosting:** Cloudflare Pages (zero cold start, auto-redeploy on git push)
- **Auth:** Firebase Authentication (Google OAuth 2.0 + ID token JWT)
- **Database:** Firestore (Realtime + REST APIs, `successscholarships-2026` project)
- **Serverless:** Cloudflare Pages Functions (Node.js runtime, `functions/api/*.js`)
- **LLM:** Groq API (LLama 3.1 8B Instant, T=0.2, max_tokens=450)
- **Geoblock:** Cloudflare middleware (IP geolocation) + browser fallback (CIDR validation)
- **Build:** None (vanilla static site, instant deployment)

### Database Schema

**Firestore Project:** `successscholarships-2026`

```firestore
/applications/{application_id}
  - student_name: string
  - email: string (indexed)
  - uid: string (Firebase UID, indexed)
  - grade: string
  - school: string
  - guardian_name: string
  - guardian_phone: string
  - city: string (enum: Karachi, Lahore, Islamabad, Other)
  - need_statement: string (textarea, 0-5000 chars)
  - goals: string (textarea, 0-5000 chars)
  - status: string (default: "Received", enum-like)
  - message: string (admin notes)
  - created_at: timestamp (serverTimestamp, server-generated)
  - updated_at: timestamp (serverTimestamp, server-generated)

/application_status/{application_id}
  - application_id: string (reference to /applications/{id})
  - student_name: string (denormalized for public queries)
  - city: string (denormalized)
  - status: string (indexed)
  - message: string (admin-provided update message)
  - updated_at: ISO8601 date string (YYYY-MM-DD, Asia/Karachi TZ)

/application_submissions/{uid}
  - uid: string (Firebase UID, PK)
  - email: string (denormalized from auth token)
  - application_id: string (most recent submission for this UID)
  - updated_at: timestamp (serverTimestamp)
  [Used for duplicate detection on client + server]

/ai_usage/{date-ip}
  - date: YYYY-MM-DD (Asia/Karachi TZ, computed on request, indexed)
  - ip: string (from cf-connecting-ip header, indexed)
  - count: integer (incremented per request, no transaction needed)
  [In-memory fallback: Map<string, number> reset on function cold start]
```

**Composite Key Pattern:**
- `/ai_usage/{YYYY-MM-DD}:{ip}` e.g. `2026-07-20:203.0.113.1`
- Automatic TTL deletion (24h after creation) via Firestore TTL policy

### Routes & Auth

| Route | File | Auth Required | Purpose |
|-------|------|---|---------|
| `/` | `index.html` | None | Homepage (mission, stats, institutions, flow) |
| `/apply.html` | `apply.html` | Firebase Auth | Application form (writes to Firestore) |
| `/eligibility.html` | `eligibility.html` | None | Criteria breakdown (40% income weight, etc) |
| `/ask-ai.html` | `ask-ai.html` | Firebase Auth | Chat UI (calls `POST /api/ask-ai`) |
| `/status.html` | `status.html` | None | Public status lookup (reads `/application_status`) |
| `/auth.html` | `auth.html` | None | OAuth sign-in popup (redirects to apply.html) |
| `/contact.html` | `contact.html` | None | Support info, email links |
| `/admin.html` | `admin.html` | Firebase Auth (admin email) | Admin dashboard (full Firestore CRUD) |
| `/deny.html` | `deny.html` | None | Geoblock page (served by CF middleware) |

**Firebase Config** (hardcoded in HTML - keep private):
- Located in `<script type="module">` tags
- Files: `apply.html`, `status.html`, `admin.html`, `auth.html`
- Do NOT commit to git; update in Firebase Console only

**Authorized Domains** (Firebase Console → Auth → Settings):
```
sahulatafamilytrust.pages.dev
*.sahulatafamilytrust.pages.dev
```

### Security Rules

Admin email: `sahulatfamilypk@gmail.com`

Security rules configured in Firebase Console (not versioned in git). Key constraints:
- Admin email: full read/write on all collections
- Users: create-only on `/applications` (cannot read others' apps)
- `/application_status`: public read (no auth required)
- `/application_submissions`: write-only during app submission (dedup check)

## Cloudflare Pages Functions

### POST `/api/ask-ai`

**Headers:**
```
Content-Type: application/json
x-firebase-token: <JWT from Firebase Auth>
cf-connecting-ip: <Source IP from Cloudflare>
```

**Request:**
```json
{
  "message": "How do I write my need statement?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response (200):**
```json
{
  "ok": true,
  "answer": "Write about specific financial needs..."
}
```

**Errors:**
- `401 Unauthorized`: Missing `x-firebase-token` header or invalid JWT
- `429 Too Many Requests`: Rate limit exceeded (150/day per IP, except admin)
- `400 Bad Request`: Invalid JSON or missing message field
- `500 Internal Server Error`: Groq API error or Firebase SDK error

**Rate Limiting Implementation:**
```javascript
const ipUsage = new Map();  // Key: `${date}:${ip}`, Value: count
const IP_DAILY_LIMIT = 150;
const unlimitedAiEmail = "sahulatfamilypk@gmail.com";

// Check limit
const key = `${todayKey()}:${getClientIp(request)}`;
const current = ipUsage.get(key) || 0;
if (current >= IP_DAILY_LIMIT && !hasUnlimitedAi(request)) {
  return json({ ok: false, error: "Too many Sahulat AI messages..." }, 429);
}
ipUsage.set(key, current + 1);
```

**Groq Configuration:**
- Model: `env.GROQ_MODEL` (default `llama-3.1-8b-instant`)
- Temperature: 0.2 (deterministic, low variance)
- Max tokens: 450 (response length limit)
- API key: `env.GROQ_API_KEY` (Cloudflare Pages environment secret)

**Payload to Groq:**
```json
{
  "model": "llama-3.1-8b-instant",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "temperature": 0.2,
  "max_completion_tokens": 450
}
```

### POST `/api/send-confirmation`

**Internal function** (called during form submission, non-blocking).

**Payload:**
```json
{
  "application_id": "SF2026-ABC12",
  "student_name": "Ali Ahmed",
  "email": "student@example.com",
  "uid": "firebase-uid",
  "grade": "Class 10",
  "school": "Lahore Grammar School",
  "city": "Lahore",
  "created_at": "2026-07-20T15:30:00Z"
}
```

**Handler:**
- Formats confirmation email (HTML template)
- Sends via configured email service (Apps Script, SendGrid, etc.)
- Logs errors to Cloudflare function logs (non-blocking)
- Does NOT block application submission if email fails
- Return code: always 200 (fire-and-forget)

## Geoblock Implementation

### Cloudflare Middleware
- Primary geoblock via Cloudflare Security → Settings
- Blocks non-Pakistan IPs at edge (fast, reliable)
- Serves `deny.html` for blocked requests
- Configurable via Cloudflare Dashboard

### Browser Fallback
**File:** `assets/js/geoblock.js`

```javascript
// Runs on page load
fetch('https://cloudflare.com/cdn-cgi/trace')
  .then(r => r.text())
  .then(text => {
    const ip = text.match(/ip=([^\n]+)/)?.[1];
    // Validate against Pakistan CIDR ranges
    if (!isPakistan(ip)) {
      window.location.href = '/deny.html';
    }
  });
```

**Characteristics:**
- Unreliable on VPNs (no way to detect from client-side IP)
- Fallback only; middleware is authoritative
- ~200-500ms latency (network + geolocation lookup)

## Local Development

### No Build Step
Static site served as-is:
```bash
cd /home/user/SuccessScholarships
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Firestore Local Emulator (Optional)
```bash
firebase emulators:start --only firestore
# Update config in HTML:
# const db = getFirestore(app);
# connectFirestoreEmulator(db, 'localhost', 8080);
```

### Deploying
```bash
git push origin main
# Cloudflare Pages webhook triggered
# → Clone repo
# → No build step (instant)
# → Deploy to edge
# → Cache invalidation
# ~30 seconds total
```

## Debugging

### Admin Console
```
Cloudflare Dashboard
  → Workers & Pages
  → Pages
  → sahulatfamily
  → Deployments
  → Functions logs
```

### Firebase Console
```
Firestore → Collections (inspect documents)
Authentication → Users (verify auth state)
Security Rules → Test Rules (validate rule logic)
```

### Browser DevTools
```
Console: Firebase SDK errors, JS exceptions
Network: Firestore REST API calls (/v1/projects/.../documents)
Local Storage: Firebase session tokens, duplicate markers
```

### Test Groq API locally
```bash
curl -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-8b-instant",
    "messages": [{"role": "user", "content": "Hello"}],
    "temperature": 0.2,
    "max_completion_tokens": 450
  }'
```

## Application ID Generation

```javascript
const makeId = () => `SF2026-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
```

**Analysis:**
- Format: `SF2026-` + 5 random base-36 alphanumeric chars (0-9, a-z)
- Total entropy: 36^5 = 60,466,176 possible IDs
- Birthday problem collision: ~1 in 1,679,616 after 1000 IDs
- **No database uniqueness constraint** (applications collection uses ID as doc ID)
- Collision behavior: Later submission overwrites earlier one (data loss risk)
- **Workaround:** Implement atomic counter or UUID v4 (not current)

## Migration Procedures

### Change Admin Email

1. **Firebase Console:**
   - Authentication → Users → Add new user (new admin email)

2. **Firestore Rules** (Firebase Console):
   ```javascript
   allow read, write: if request.auth.token.email == 'newemail@example.com';
   ```

3. **HTML Files:**
   - `admin.html`: Check for hardcoded validation (if present)
   - `ask-ai.js`: Update unlimited AI email in function
   - `apply.html`: Update confirmation email logic (if present)

4. **Documentation:**
   - `CLAUDE.md`: Update admin email references
   - `README.md`: Update admin email references

### Update Eligibility Criteria

Edit `eligibility.html` directly (static content, no code changes needed):
```html
<article class="criteria-card">
  <strong>40%</strong>
  <h2>Family money</h2>
  <p>Description...</p>
</article>
```

### Add New Application Status

1. **Firestore Console:**
   - Add document to `application_status` collection
   - Set status field to new value (e.g., "Appeal Under Review")

2. **Status lookup** (`status.html`):
   - Already supports any status string (no hardcoding)
   - Frontend renders whatever is in Firestore

### Migrate Firebase Project

1. Create new Firebase project
2. Update config in ALL HTML files:
   - `apply.html`
   - `status.html`
   - `admin.html`
   - `auth.html`
3. Update Firestore security rules (copy/recreate)
4. Add new domain to Firebase Auth → Authorized Domains
5. Re-create collections (or export/import data via Firebase tools)
6. Update `CLAUDE.md` & `README.md` with new project ID
7. Commit with message: `Migrate Firebase to new project: <project-id>`

## Performance Notes

- **No build/bundling** → served raw HTML/CSS/JS
- **Firebase SDK from CDN** → gstatic.com (slow first load, cached thereafter)
- **Firestore REST API** → ~100-200ms latency (regional replication)
- **Groq API** → ~1-2s response time (LLM inference)
- **Geoblock (middleware)** → ~50ms (Cloudflare edge, cached)
- **Function cold starts** → ~5-10s first request, then instant (warm)
- **Rate limiting** → in-memory Map, resets on cold start (~hourly)

## Testing Checklist

- [ ] Application form: Create → Verify Firestore document populated
- [ ] Duplicate warning: Resubmit → See warning dialog + marker in localStorage
- [ ] Status lookup: Query own ID → See "Received" status card
- [ ] Ask AI: Sign in → Ask question → Get response within 2-3s
- [ ] Admin dashboard: Load `/admin.html` → Verify auth redirect if not admin
- [ ] Geoblock: Test non-Pakistan IP → See deny page (or browser fallback)
- [ ] Mobile: Check responsiveness (max-width: 640px breakpoint)
- [ ] OAuth flow: Sign in → Redirect to apply → Sign out (token refresh)
- [ ] Rate limit: Submit 150+ requests from single IP → See 429 response
- [ ] Confirmation email: Submit application → Verify email delivered (async, may fail silently)

## Endpoints Summary

| Endpoint | Method | Auth | Rate Limit | Purpose |
|----------|--------|------|-----------|---------|
| `/api/ask-ai` | POST | Required (JWT) | 150/day per IP | Groq LLM chat |
| `/api/send-confirmation` | POST | Internal | None | Email handler |

## Known Limitations

1. **In-memory rate limiting** - Resets on function cold start (~hourly), users can exceed 150/day
2. **No uniqueness constraint on application IDs** - Collisions (~1/1.6M) overwrite previous submission
3. **Geoblock bypass via VPN** - Cannot detect VPN from client-side IP alone
4. **Firebase config in HTML** - API key visible in source (not a secret, scoped to Firestore)
5. **Eventual consistency** - Status updates may lag behind application writes (~few seconds)
6. **No offline support** - Requires active internet connection for Firestore operations
