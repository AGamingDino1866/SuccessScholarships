# Success Factor - Technical Reference

Cloudflare Pages static site + Firestore + Firebase Auth + Groq LLM.

## ⚠️ Git Workflow

**ALWAYS push to `main` branch only.**
- No feature branches
- All commits go to `main`
- Commits must be GPG signed with key `928DF747700C2142`
- Commit authors must be `Claude <noreply@anthropic.com>`

## Architecture

### Stack
- **CDN/Hosting:** Cloudflare Pages (zero cold start)
- **Auth:** Firebase Authentication (Google OAuth 2.0 + native session)
- **Database:** Firestore (Realtime + REST APIs)
- **Serverless:** Cloudflare Pages Functions (Node.js)
- **LLM:** Groq API (LLama 3.1 8B Instant)
- **Geoblock:** Cloudflare middleware + browser fallback (IP-based, Pakistan-only)
- **Build:** None (vanilla static site)

### Database Schema

**Firestore Project:** `successscholarships-2026`

```
/applications/{application_id}
  - student_name: string
  - email: string
  - uid: string (Firebase UID)
  - grade: string
  - school: string
  - guardian_name: string
  - guardian_phone: string
  - city: string (enum: Karachi, Lahore, Islamabad, Other)
  - need_statement: string (textarea)
  - goals: string (textarea)
  - status: string (default: "Received")
  - message: string
  - created_at: timestamp (serverTimestamp)
  - updated_at: timestamp (serverTimestamp)

/application_status/{application_id}
  - application_id: string
  - student_name: string
  - city: string
  - status: string
  - message: string
  - updated_at: ISO8601 date string

/application_submissions/{uid}
  - uid: string
  - email: string
  - application_id: string
  - updated_at: timestamp (serverTimestamp)

/ai_usage/{date-ip}
  - date: YYYY-MM-DD (Asia/Karachi TZ)
  - ip: string
  - count: integer (incremented with each request)
```

### Pages & Routes

| Route | File | Auth | Purpose |
|-------|------|------|---------|
| `/` | `index.html` | None | Homepage (mission, stats, institutions, flow) |
| `/apply.html` | `apply.html` | Required | Application form (Firestore writes) |
| `/eligibility.html` | `eligibility.html` | None | Criteria breakdown + income tiers |
| `/ask-ai.html` | `ask-ai.html` | Required | Chat UI (calls `/api/ask-ai`) |
| `/status.html` | `status.html` | None | Status lookup (Firestore reads) |
| `/auth.html` | `auth.html` | None | OAuth sign-in flow |
| `/contact.html` | `contact.html` | None | Contact/support info |
| `/admin.html` | `admin.html` | Required | Admin dashboard (Firestore CRUD) |
| `/deny.html` | `deny.html` | None | Geoblock page (served by CF middleware) |

### Firebase Config (Hardcoded)

All HTML files reference:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAw65XzclDbj2AUyHKlPKP0dufaoqpd8OY",
  authDomain: "successscholarships-2026.firebaseapp.com",
  projectId: "successscholarships-2026",
  storageBucket: "successscholarships-2026.firebasestorage.app",
  messagingSenderId: "548307406445",
  appId: "1:548307406445:web:821b1aa139ecdb0ac2f964",
  measurementId: "G-7X02YSZCZ0"
};
```

Update if migrating projects.

### Firestore Security Rules

Admin email: `sahulatfamilypk@gmail.com`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth.token.email == 'sahulatfamilypk@gmail.com';
    }
    match /applications/{appId} {
      allow create: if request.auth != null;
    }
  }
}
```

**Authorized domains:**
- `successscholarships.pages.dev`
- `*.successscholarships.pages.dev` (previews)

## Cloudflare Pages Functions

### POST `/api/ask-ai`

**Headers:**
```
Content-Type: application/json
x-firebase-token: <JWT from Firebase Auth>
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
- 401: Missing Firebase token
- 429: Rate limit exceeded (150/day per IP, except admin email)
- 500: Groq API error

**Rate Limiting:**
- Per-IP counter stored in `Durable Object` or memory
- Reset daily at UTC midnight (Asia/Karachi TZ)
- Admin email (`sahulatfamilypk@gmail.com`) = unlimited

**Groq Configuration:**
- Model: `env.GROQ_MODEL` (default `llama-3.1-8b-instant`)
- Temperature: 0.2 (deterministic)
- Max tokens: 450
- API key: `env.GROQ_API_KEY`

### POST `/api/send-confirmation`

Internal function (called during form submission).

**Payload:**
```json
{
  "application_id": "SF2026-ABC12",
  "student_name": "Ali Ahmed",
  "email": "student@example.com",
  "...": "..."
}
```

**Handler:**
- Formats confirmation email
- Sends via configured email service (Apps Script, SendGrid, etc.)
- Logs errors but doesn't block application submission

## Geoblock

### Cloudflare Middleware
- Primary geoblock via Cloudflare Security settings
- Blocks non-Pakistan IPs at edge
- Serves `deny.html` for blocked requests

### Browser Fallback
**File:** `assets/js/geoblock.js`

- Runs on page load
- Fetches user IP from Cloudflare API
- Validates against Pakistan CIDR ranges
- Redirects to `/deny.html` if blocked
- **Note:** Unreliable on VPNs; middleware is authoritative

## Development

### Local Testing
```bash
cd /home/user/SuccessScholarships
python3 -m http.server 8000
# http://localhost:8000
```

No build step required.

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
# Cloudflare automatically detects push → builds → deploys
```

Builds are instant (no build step). Deployment ~30 seconds.

### Debugging

**Admin Console:**
- Cloudflare Dashboard → Pages → `sahulatfamily` → Deployments/Functions
- Check function logs for errors

**Firebase Console:**
- Firestore → Collections (inspect documents)
- Authentication → Users (verify auth state)
- Security Rules → Test Rules (validate rule logic)

**Browser DevTools:**
- Console: Firebase SDK errors, JavaScript exceptions
- Network: Firestore REST API calls (`/v1/projects/.../documents`)
- Local Storage: Firebase session tokens

## Application ID Generation

```javascript
const makeId = () => `SF2026-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
```

- Format: `SF2026-` + 5 random base-36 alphanumeric chars
- Collision probability: ~1 in 1,679,616 per ID
- **No database uniqueness constraint** (applications collection uses ID as doc ID, so collisions overwrite)

## Common Modifications

### Change Admin Email

1. **Firebase Console:**
   - Authentication → Users → Add new user (new admin email)

2. **Firestore Rules:**
   ```javascript
   allow read, write: if request.auth.token.email == 'newemail@example.com';
   ```

3. **HTML Files:**
   - `admin.html`: Update validation (if present)
   - `apply.html`: Update confirmation email logic (if present)
   - `ask-ai.js`: Update unlimited AI email

4. **CLAUDE.md & README.md:**
   - Update admin email references

### Update Eligibility Criteria

Edit `eligibility.html` directly (no code changes needed):
```html
<article class="criteria-card">
  <strong>40%</strong>
  <h2>Family money</h2>
  <p>Description...</p>
</article>
```

### Add New Application Status

1. **Firestore Console:**
   - Add document to `application_status` collection with status value

2. **Status lookup** (`status.html`):
   - Already supports any status string (no hardcoding)

### Migrate Firebase Project

1. Create new Firebase project
2. Update config in ALL HTML files:
   - `apply.html`
   - `status.html`
   - `admin.html`
   - `auth.html`
3. Update Firestore security rules
4. Add authorized domains
5. Re-create collections (or export/import data)
6. Update `CLAUDE.md` & `README.md`
7. Commit with message: `Migrate Firebase to new project: <project-id>`

## Performance Notes

- No build/bundling → served raw HTML/CSS/JS
- Firebase SDK loaded from CDN (gstatic.com)
- Firestore REST API: ~100-200ms latency
- Groq API: ~1-2s response time (LLM inference)
- Geoblock: ~50ms (Cloudflare edge, cached)

## Testing Checklist

- [ ] Application form: Create → Verify Firestore document
- [ ] Duplicate warning: Resubmit → See warning dialog
- [ ] Status lookup: Query own ID → See "Received" status
- [ ] Ask AI: Sign in → Ask question → Get response
- [ ] Admin dashboard: View applications, update status
- [ ] Geoblock: Test non-Pakistan IP → See deny page
- [ ] Mobile: Check responsiveness (max-width: 640px)
- [ ] OAuth flow: Sign in → Redirect to apply → Sign out

## Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/ask-ai` | POST | Required | Groq LLM chat |
| `/api/send-confirmation` | POST | Internal | Email confirmation |
