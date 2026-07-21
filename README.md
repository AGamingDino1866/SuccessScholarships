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
- 
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
