# Success Factor - Technical Specification

JAMstack scholarship portal: Vanilla HTML/CSS/JS frontend, Firestore backend, Groq LLM middleware, Cloudflare Pages deployment.

**Production:** https://sahulatafamilytrust.pages.dev

## Stack & Dependencies

| Layer | Technology | Notes |
|-------|-----------|-------|
| **CDN** | Cloudflare Pages | Zero cold-start, automatic redeployment on git push |
| **Frontend** | Vanilla JS | No build/bundling, ES6 modules for Firebase SDK |
| **Auth** | Firebase Auth | Google OAuth 2.0, JWT token in `x-firebase-token` header |
| **Database** | Firestore (Realtime + REST) | `successscholarships-2026` project, multi-region replication |
| **Serverless** | Cloudflare Pages Functions | Node.js runtime, `functions/api/*.js` entry points |
| **LLM** | Groq API | `llama-3.1-8b-instant` (default), 450 max_tokens, T=0.2 |
| **Geoblock** | CF middleware + browser fallback | IP geolocation, Pakistan CIDR validation |

## Data Model

### Firestore Collections (NoSQL)

```firestore
/applications/{application_id}
├─ student_name: string
├─ email: string (indexed)
├─ uid: string (Firebase UID, indexed)
├─ grade: string
├─ school: string
├─ guardian_name: string
├─ guardian_phone: string
├─ city: enum[Karachi|Lahore|Islamabad|Other]
├─ need_statement: string (0-5000 chars)
├─ goals: string (0-5000 chars)
├─ status: string (enum: Received|Under Review|Approved|Rejected)
├─ message: string (admin notes)
├─ created_at: timestamp (serverTimestamp, indexed)
└─ updated_at: timestamp (serverTimestamp)

/application_status/{application_id}
├─ application_id: string (PK reference)
├─ student_name: string (denormalized, indexed)
├─ city: string (denormalized)
├─ status: string (indexed)
├─ message: string
└─ updated_at: ISO8601 date string (YYYY-MM-DD, Asia/Karachi TZ)

/application_submissions/{uid}
├─ uid: string (PK)
├─ email: string (denormalized)
├─ application_id: string (latest app for this user)
└─ updated_at: timestamp (serverTimestamp)

/ai_usage/{composite_key}
├─ date: YYYY-MM-DD (Asia/Karachi TZ, indexed)
├─ ip: string (indexed)
├─ count: integer (auto-incremented)
└─ ttl: timestamp (24h expiry)
```

**Indexes:**
- `applications(email, created_at)` - user app history
- `applications(uid, updated_at)` - duplicate detection
- `application_status(status, updated_at)` - admin queries
- `ai_usage(date, ip)` - rate limit checks

### REST API Payloads

**POST /api/ask-ai**
```typescript
interface AskAiRequest {
  message: string;  // User query, 0-1200 chars
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;  // 0-1200 chars per turn
  }>;  // Last 12 turns retained
}

interface AskAiResponse {
  ok: boolean;
  answer?: string;  // 0-450 chars (max_completion_tokens)
  error?: string;   // Error message
}

// Rate limit headers (inferred):
// X-RateLimit-Limit: 150
// X-RateLimit-Remaining: N
// X-RateLimit-Reset: Unix timestamp (UTC midnight)
```

**Request Headers:**
```
Content-Type: application/json
x-firebase-token: <JWT>  // Firebase ID token (from client SDK)
cf-connecting-ip: <IP>   // Cloudflare header (source IP)
```

**POST /api/send-confirmation** (internal)
```json
{
  "application_id": "SF2026-XXXXX",
  "student_name": "...",
  "email": "...",
  "grade": "...",
  "school": "...",
  "city": "...",
  "created_at": "ISO8601",
  "uid": "firebase-uid"
}
```

## Request/Response Flow

### Application Submission

```
1. Client: [apply.html] getAuth(app).currentUser → Firebase ID token
2. Client: POST /api/ask-ai with x-firebase-token
3. Firestore: Verify JWT → decode email claim
4. Firestore: Check /application_submissions/{uid} for duplicate
5. Firestore: setDoc(/applications/{id}, {...}, {merge: false})
6. Firestore: setDoc(/application_status/{id}, {...}, {merge: false})
7. Firestore: setDoc(/application_submissions/{uid}, {...}, {merge: true})
8. Function: POST /api/send-confirmation async (non-blocking)
9. Response: 200 OK + application_id to client
10. Client: localStorage.setItem(duplicateKey(uid), application_id)
```

### Ask AI Flow

```
1. Client: getIdToken(auth.currentUser)
2. Client: POST /api/ask-ai with history[] (last 12 turns)
3. Function: Verify JWT header via Firebase SDK
4. Function: Extract email from JWT payload (base64 decode)
5. Function: Check rate limit: ai_usage[date:ip]
6. Function: If count >= 150 AND email != admin → 429 Too Many Requests
7. Function: POST to Groq API:
   - model: llama-3.1-8b-instant
   - temperature: 0.2
   - max_completion_tokens: 450
   - system: (hardcoded system prompt)
   - messages: [system, ...history, user]
8. Function: Increment ai_usage[date:ip].count
9. Response: 200 + answer JSON, or error
```

### Status Lookup

```
1. Client: Input application_id (SF2026-XXXXX or legacy SC2026-XXXXX)
2. Client: getDoc(db, 'application_status', id)
3. Firestore: Return doc fields (student_name, city, status, message)
4. Client: Render result card + printable receipt
5. CSS @media print: Hide header/nav, show print-receipt section
```

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| Firestore read (single doc) | 100-200ms | Regional replication, cached |
| Firestore write (batch) | 50-150ms | Includes index updates |
| Groq API (LLM inference) | 1-2s | Token generation, context-dependent |
| Cloudflare geoblock (middleware) | ~50ms | Cached, edge-computed |
| Firebase Auth (token validation) | 10-50ms | Local JWT decode, minimal network |
| Browser geoblock fallback | 200-500ms | External IP lookup, CIDR validation |

**Cold starts:** Functions restart ~hourly (serverless), in-memory rate limit counters reset.

**Caching strategy:**
- Static assets: CF cache headers (default 30 days)
- Firebase SDK: CDN-cached (gstatic.com)
- Firestore docs: Client-side SDK cache + browser storage

## Security Model

**Auth layers:**
1. Firebase ID token (JWT) in header
2. JWT decoded server-side (Groq function uses Firebase SDK)
3. Email claim extracted from token
4. Admin check: `email == 'sahulatfamilypk@gmail.com'`

**Firestore rules:** Configured in Firebase Console (not versioned in git)
- Users: write-only to `/applications` (create own docs)
- Status lookup: read-only public
- Admin: full CRUD on all collections

**Geoblock:** IP-based geolocation, bypassed by VPN
- Primary: Cloudflare middleware (fast, reliable)
- Fallback: Browser-side CIDR validation (as last resort)

**Secrets management:**
- `GROQ_API_KEY` → Cloudflare Pages environment secret (encrypted at rest)
- Firebase config → hardcoded in HTML (public, API-key only, not sensitive)

## Deployment & Git Ops

**Branch strategy:**
```bash
main (production) only
Commits signed: git -S (GPG key 928DF747700C2142)
Author: Claude <noreply@anthropic.com>
```

**Deploy flow:**
```
git push origin main
  → Cloudflare Pages webhook
  → Clone + build (instant, no build step)
  → Deploy to global edge
  → Cache invalidation (Automatic)
  → ~30s total time to live
```

**Rollback:** Revert commit + push (no manual intervention needed)

## Debugging & Ops

### Query Firestore (local Node.js)
```javascript
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// Find all apps from a user
const snap = await db.collection('applications')
  .where('uid', '==', 'user-123')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get();
```

### Check rate limit counter
```javascript
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' })
  .format(new Date());
const key = `${today}:203.0.113.1`;  // date:ip
const doc = await db.collection('ai_usage').doc(key).get();
console.log(doc.data()?.count || 0);  // Current count
```

### Groq model availability & limits
```bash
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY" | jq '.data[] | .id'

# Check rate limits for your key
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY" -v 2>&1 | grep -i 'ratelimit'
```

## Known Issues & Workarounds

1. **In-memory rate limit reset on function restart**
   - Impact: During cold starts, limit counter resets (users can exceed 150/day)
   - Workaround: Persist to Firestore with TTL (currently not implemented)

2. **Geoblock bypass via VPN**
   - Impact: Non-Pakistan VPNs bypass CF middleware + browser check
   - Workaround: Server-side IP validation required (not current)

3. **Firebase config exposure in HTML**
   - Impact: API key visible in source (not sensitive, scoped to Firestore only)
   - Workaround: Keep API key restrictions tight in Firebase Console

4. **Application ID collision** (1/1.6M probability)
   - Impact: Overwrite previous app (no unique constraint)
   - Workaround: Implement atomic counter or UUID (not critical for scale)

5. **Firestore eventual consistency**
   - Impact: `/application_status` read may lag behind `/applications` write
   - Workaround: Use strong consistency reads (slower, not implemented)

## File Structure

```
├── index.html              # Homepage + mission + stats + HowItWorks flow
├── apply.html              # Application form, Firebase writes, duplicate check
├── eligibility.html        # Criteria breakdown (40% income, 15% family size, etc)
├── ask-ai.html             # Chat UI, Groq integration, rate limit display
├── status.html             # Public status lookup, printable receipt
├── auth.html               # Google OAuth popup, redirect to /apply.html
├── contact.html            # Support info, email link
├── admin.html              # Firestore CRUD dashboard (admin-only)
├── deny.html               # Geoblock page (served by CF middleware)
├── _routes.json            # CF Pages routing config
├── assets/
│   ├── css/styles.css      # Global styles, CSS custom properties
│   ├── js/
│   │   ├── script.js       # Nav toggle, geoblock fallback
│   │   ├── admin.js        # Firestore queries (applications, status updates)
│   │   └── geoblock.js     # Browser-side Pakistan CIDR validation
│   └── *.{png,jpg}         # Hero images
├── functions/api/
│   ├── ask-ai.js           # Groq API wrapper, rate limiting
│   └── send-confirmation.js # Email template, delivery handler
└── CLAUDE.md               # Implementation notes
```
