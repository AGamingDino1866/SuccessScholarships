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

## File Structure

```
├── index.html              # Homepage + mission + stats + HowItWorks flow
├── apply.html              # Step-by-step questionnaire (14 questions), Firebase writes, duplicate check, read-aloud buttons
├── eligibility.html        # Criteria breakdown (40% income, 15% family size, etc)
├── ask-ai.html             # Chat UI, Groq integration, rate limit display, read-aloud button
├── status.html             # Public status lookup, printable receipt, read-aloud button
├── auth.html               # Google OAuth popup, redirect to /apply.html
├── contact.html            # Support info, email link, read-aloud button
├── admin.html              # Compact application dashboard with expandable cards, status editor, read-aloud button
├── deny.html               # Geoblock page (served by CF middleware)
├── faq.html                # Frequently asked questions, read-aloud button
├── affordable-schools.html # Low-cost school and university options, read-aloud button
├── test.html               # Testing page
├── _routes.json            # CF Pages routing config
├── assets/
│   ├── css/styles.css      # Global styles, CSS custom properties
│   ├── js/
│   │   ├── script.js       # Nav toggle, geoblock fallback
│   │   ├── admin.js        # Firestore CRUD for applications, status updates, message customization
│   │   ├── read-aloud.js   # Global text-to-speech button on all pages using Web Speech API
│   │   └── geoblock.js     # Browser-side Pakistan CIDR validation
│   └── *.{png,jpg}         # Hero images
├── functions/api/
│   ├── ask-ai.js           # Groq API wrapper, rate limiting (150/day per IP)
│   └── send-confirmation.js # Student confirmation + admin notification emails via Google Apps Script
└── CLAUDE.md               # Implementation reference
```

## Application Form Features

**Step-by-Step Questionnaire (14 Questions)**
- One question per screen for better UX
- Progress bar showing "Question X of 14"
- Auto-save to localStorage with draft recovery
- Duplicate application detection (prevents accidental resubmission)

**Question Types:**
- Text inputs (name, grade, school)
- Number inputs (sibling count)
- Select dropdowns (city, employment status, contact preference)
- Radio buttons (yes/no questions)
- Textareas with character counters (financial need, career goals, character contribution)

**Accessibility:**
- Proper labels and ARIA attributes for screen readers
- Read-aloud button 🔊 for each question
- "Read my answer" button for textarea fields
- Keyboard-only navigation (Tab, Enter/Space)
- Progress bar announces current question
- Form messages announced via aria-live regions

## Accessibility & Read-Aloud

**Global Read-Aloud Button (🔊)**
- Floating button on all pages (bottom-right corner)
- Reads main page content aloud using Web Speech API
- Click to start/stop, press Escape to cancel
- Works in Chrome, Safari, Edge, Firefox

**Form-Specific Read-Aloud:**
- Question read button for each question
- Answer review button for textareas before submission
- Character count announcements on input

## Email System

**Student Confirmation Email**
- Auto-sent when application submitted
- Includes Application ID for status tracking
- Next steps and timeline

**Admin Notification Email**
- Sent to sahulatfamilypk@gmail.com
- Contains full application details
- Formatted for easy review and follow-up

**Autoreply to Incoming Emails**
- Automatic response to students who email
- Gmail trigger setup (manual one-time configuration)
- Provides links to application, status, and AI help

## Admin Dashboard

**Application Management:**
- Compact list view with expandable cards
- Search by student name
- Filter by application status
- View/edit application details

**Status Updates:**
- Customize message shown to student
- Internal admin notes (not visible to student)
- Change application status (Received, Under Review, Needs Info, Approved, Rejected)
- Download application as .txt
- Delete application (with confirmation)

**Batch Operations:**
- Export all visible applications as CSV
- Refresh application list
- Sign out
