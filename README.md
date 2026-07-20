# Success Factor - Scholarship Portal

Cloudflare Pages static site for Sahulat Family scholarship applications (Pakistan-focused).

**Live:** https://sahulatafamilytrust.pages.dev

## Architecture

- **Frontend:** Vanilla HTML/CSS/JS (no build step)
- **Auth:** Firebase Authentication (Google OAuth 2.0)
- **Database:** Firestore (collections: `applications`, `application_status`, `application_submissions`, `ai_usage`)
- **Serverless:** Cloudflare Pages Functions (Node.js runtime)
- **Deployment:** Cloudflare Pages
- **Geoblock:** Cloudflare middleware + browser fallback (Pakistan-only)

## Setup

### Prerequisites
- Node.js 18+ (for wrangler CLI)
- Firebase project (`successscholarships-2026`)
- Cloudflare account with Pages deployment
- Groq API key for LLM features

### Environment Variables

**Cloudflare Pages:**
```bash
GROQ_API_KEY=<your-groq-api-key>
GROQ_MODEL=llama-3.1-8b-instant  # optional
```

**Firebase Config** (hardcoded in HTML - keep private, update if migrating):
- `apply.html`
- `status.html`
- `admin.html`
- `auth.html`

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admin full access
    match /{document=**} {
      allow read, write: if request.auth.token.email == 'sahulatfamilypk@gmail.com';
    }
    // Allow users to write their own applications
    match /applications/{appId} {
      allow create: if request.auth != null;
    }
  }
}
```

### Firebase Auth - Authorized Domains
```
sahulatafamilytrust.pages.dev
*.sahulatafamilytrust.pages.dev
```

## File Structure

```
├── index.html              # Homepage (mission, features, institutions, how it works)
├── apply.html              # Application form + Firebase integration
├── eligibility.html        # Eligibility criteria + income/document guidance
├── ask-ai.html             # AI chatbot UI (Groq backend)
├── status.html             # Application status lookup
├── auth.html               # Google OAuth sign-in
├── contact.html            # Contact & support
├── admin.html              # Admin dashboard (Firestore review/management)
├── deny.html               # Geoblock deny page
├── _routes.json            # Cloudflare Pages routing config
├── assets/
│   ├── css/styles.css      # Global styles (CSS variables, typography)
│   ├── js/
│   │   ├── script.js       # Shared utilities (navigation, geoblock fallback)
│   │   ├── admin.js        # Admin dashboard logic
│   │   └── geoblock.js     # Browser-side geoblock detection (IP-based)
│   └── *.{png,jpg}         # Hero images, backgrounds
├── functions/api/
│   ├── ask-ai.js           # POST /api/ask-ai - Groq LLM wrapper
│   └── send-confirmation.js # POST /api/send-confirmation - Email handler
└── CLAUDE.md               # Development guide
```

## Key Features

### Application Form
- Real-time Firestore saves
- Duplicate submission detection (Firestore `application_submissions` collection)
- Application ID format: `SF2026-XXXXX` (5 alphanumeric chars)
- Confirmation email via Cloudflare Function

**Payload:**
```json
{
  "application_id": "SF2026-ABC12",
  "student_name": "string",
  "email": "user@example.com",
  "uid": "firebase-uid",
  "grade": "string",
  "school": "string",
  "guardian_name": "string",
  "guardian_phone": "string",
  "city": "Karachi|Lahore|Islamabad|Other",
  "need_statement": "text",
  "goals": "text",
  "status": "Received",
  "created_at": "firestore-timestamp",
  "updated_at": "firestore-timestamp"
}
```

### Status Lookup
- Query `application_status` collection by application ID
- Supports legacy `SC2026-*` IDs (backward compatible)
- Printable receipt (CSS `@media print`)

### Ask AI / Groq Integration
- Endpoint: `POST /api/ask-ai`
- Auth: Firebase token via `x-firebase-token` header
- Rate limit: 150 requests/day per IP (except `sahulatfamilypk@gmail.com` = unlimited)
- Daily counter resets at UTC midnight (Asia/Karachi TZ)
- Model: `llama-3.1-8b-instant` (configurable via `GROQ_MODEL` env var)

### Admin Dashboard
- Requires `sahulatfamilypk@gmail.com` Firebase auth
- Firestore read/write: `applications`, `application_status`
- Features: status updates, CSV export, record download, test entry deletion

### Geoblock (Pakistan-only)
- **Primary:** Cloudflare Pages middleware (IP-based)
- **Fallback:** Browser-side detection via `assets/js/geoblock.js`
- Blocks non-Pakistan IPs → shows `deny.html`
- Configurable via Cloudflare security settings

## Development

### Local Testing
```bash
# No build step required - static site
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Deployment
```bash
# Automatic via git push to main
# Cloudflare Pages detects push → builds & deploys
```

### Git Workflow
- **Branch:** `main` (production)
- **Commits:** Signed with GPG key `928DF747700C2142`
- **Push to:** `main` only (no feature branches)

## API Endpoints

### POST `/api/ask-ai`
```bash
curl -X POST https://successscholarships.pages.dev/api/ask-ai \
  -H "Content-Type: application/json" \
  -H "x-firebase-token: <jwt-token>" \
  -d '{
    "message": "How do I write about financial need?",
    "history": [
      { "role": "user", "content": "..." },
      { "role": "assistant", "content": "..." }
    ]
  }'
```

**Response:**
```json
{
  "ok": true,
  "answer": "..."
}
```

### POST `/api/send-confirmation`
Internal function (called during application submission).
```json
{
  "application_id": "SF2026-ABC12",
  "student_name": "...",
  "email": "...",
  "...": "..."
}
```

## Troubleshooting

### Admin dashboard blank
- Check Firestore security rules (admin email must have read access)
- Verify Firebase config in `admin.html`
- Check browser console for auth errors

### Confirmation email not sent
- Verify `GROQ_API_KEY` is set in Cloudflare Pages env vars
- Check function logs: Cloudflare Dashboard → Workers → Logs
- Ensure email provider (Apps Script, SendGrid, etc.) is configured

### Geoblock bypass / non-Pakistan access
- Check Cloudflare Page Rules / Security Settings
- Test browser fallback: `assets/js/geoblock.js` executes if middleware fails
- Verify `deny.html` displays for blocked IPs

### Application ID generation
- Format: `SF2026-` + 5 random alphanumeric chars (base-36)
- Uniqueness not guaranteed but collision probability ~1/1679616 per app

## Maintenance

### Updating Firebase
- Only change project ID if actually migrating
- Update config in: `apply.html`, `status.html`, `admin.html`, `auth.html`
- Update Firestore rules & authorized domains
- Update `CLAUDE.md` with new project ID

### Updating Groq Model
- Set `GROQ_MODEL` env var in Cloudflare Pages settings
- Defaults to `llama-3.1-8b-instant` if unset
- Available models: https://console.groq.com/docs/models

### Admin Email Change
- Update Firebase auth config
- Update Firestore security rules
- Update HTML firebase configs
- Update `CLAUDE.md`

## Notes

- No authentication required for read (homepage, eligibility, status lookup)
- Firebase auth required for: application submission, admin dashboard
- Firestore uses single database (`default`)
- Rate limiting is in-memory (resets on function cold start ~every hour)
- Favicon caches aggressively; use hard refresh or clear site data
- All timestamps in Firestore use server-side generation (`serverTimestamp()`)
