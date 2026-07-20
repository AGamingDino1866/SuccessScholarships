# Success Factor - Development Guide

**Success Factor** (Sahulat Family Scholarship Portal) is a full-stack scholarship application platform built by a 13-year-old developer for Pakistani students seeking educational support.

## Project Overview

### What It Does
- Public homepage with scholarship information
- Google OAuth sign-in for students
- Online scholarship application form
- Real-time application status lookup
- Eligibility criteria and document guidance
- AI chatbot for application help (Groq API)
- Admin dashboard for reviewing and managing applications
- Pakistan-only geoblock (Cloudflare + browser fallback)

### Tech Stack
- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Firebase Firestore (database), Firebase Auth (Google OAuth)
- **AI:** Groq API (Ask AI feature)
- **Email:** Cloudflare Pages Functions (confirmation emails)
- **Deployment:** Cloudflare Pages
- **Status:** Live at https://successscholarships.pages.dev

## File Structure

```
├── index.html              # Homepage - mission, features, Pakistani universities
├── apply.html              # Application form with Firebase integration
├── eligibility.html        # Eligibility criteria and income guide
├── ask-ai.html             # AI chatbot UI (Groq backend)
├── status.html             # Application status lookup by ID
├── auth.html               # Google OAuth sign-in page
├── contact.html            # Contact information and support
├── admin.html              # Admin dashboard (application review)
├── deny.html               # Geoblock message (Pakistan-only)
├── favicon.svg             # Logo/brand mark
├── assets/
│   ├── css/styles.css      # Shared styles (color vars, typography, layout)
│   ├── js/script.js        # Shared functionality, navigation, geoblock fallback
│   ├── js/admin.js         # Admin dashboard logic
│   ├── js/geoblock.js      # Pakistan geoblock detection (browser fallback)
│   └── *.png/jpg           # Hero images, backgrounds
├── functions/api/
│   ├── ask-ai.js           # Groq AI backend (Cloudflare Pages Function)
│   └── send-confirmation.js # Confirmation email backend
├── _routes.json            # Cloudflare Pages routing config
└── CLAUDE.md               # This file
```

## Key Features

### Language Simplification
All pages use simplified text aimed at younger students and non-native English speakers:
- Shorter sentences
- Simpler vocabulary
- Clear, direct language
- No jargon

### Application System
- Form saves to Firestore in real-time
- Application ID: `SF2026-XXXXX`
- Duplicate submission warning
- Confirmation email with application ID

### Status Lookup
- Students enter their ID to check progress
- Statuses: Received, Under Review, Approved, Rejected, etc.
- Printable receipt
- Email notifications for updates

### Admin Dashboard
- Review applications in Firestore
- Update application status
- Export CSV reports
- Download full records
- Delete test submissions

### AI Chat (Ask AI)
- Groq LLM (fast, free tier available)
- Scoped to scholarship/application questions only
- Daily usage limits (tracked per user)
- Unlimited for admin email

### Geoblock
- Pakistan-only access via Cloudflare Pages middleware
- Browser fallback in `assets/js/geoblock.js`
- Blocks other countries with `deny.html` message
- Enabled by default

## Firebase Setup

### Project
```
Project ID: successscholarships-2026
```

### Collections
- `applications` - Form submissions from students
- `application_status` - Status records for lookup
- `application_submissions` - Duplicate check records
- `ai_usage` - Track daily AI usage per user

### Security Rules
Must allow admin email (sahulatfamilypk@gmail.com) to read/write all collections.

### Authorized Domains
```
successscholarships.pages.dev
<preview-id>.successscholarships.pages.dev
```

## Cloudflare Pages Setup

### Environment Variables
```
GROQ_API_KEY     # Required for Ask AI
GROQ_MODEL       # Optional (defaults to mixtral-8x7b-32768)
```

### Functions
- `functions/api/ask-ai.js` - AI responses
- `functions/api/send-confirmation.js` - Email on submit

## Local Development

### No build step
This is a static site. Just open files in a browser or use a local server:

```bash
cd /home/user/SuccessScholarships
python3 -m http.server 8000
# Then visit http://localhost:8000
```

### Firebase Setup
Update Firebase config in these files if switching projects:
- `apply.html` - Application form
- `status.html` - Status lookup
- `admin.html` - Admin dashboard
- `auth.html` - Google sign-in

Look for `firebaseConfig` object in `<script>` tags.

### Git Workflow
- Branch: `claude/age-guess-github-repo-rf6ww2` (feature branch for language simplification)
- Main: Production-ready code
- Commits signed with GPG key `928DF747700C2142`

## Important Notes

### Firebase
- Do NOT change project ID unless actually migrating
- Update Firestore rules if admin email changes
- Add preview domains to authorized domains list
- Browser favicon caches stubbornly; hard refresh if icon doesn't update

### Geoblock
- Currently enabled and working
- Cloudflare middleware handles primary block
- Browser fallback shows `deny.html` if blocked

### Admin Access
- Admin Gmail: sahulatfamilypk@gmail.com
- Must be in Firebase authenticated users
- Must have Firestore read/write permissions
- Can be changed but requires Firebase config update

### AI Usage
- Free tier: 100+ requests/month on Groq
- Admin email has unlimited usage
- Daily limit of 5 uses for other students
- Limit resets at midnight UTC

## Recent Changes

### Language Simplification (July 20, 2026)
Simplified all page text for easier reading:
- Homepage: "Help for school" instead of technical language
- Application form: Clearer labels, simpler descriptions
- Status page: Shorter error messages
- All other pages: Simplified vocabulary and sentence structure
- Commit: `6994e98` (GPG signed)

## Common Tasks

### Add a new page
1. Create `.html` file
2. Include header/footer from `index.html` (copy structure)
3. Use shared styles from `assets/css/styles.css`
4. Include `assets/js/script.js` for navigation
5. Add link to `apply.html` navigation

### Change admin email
1. Update Firebase Authentication
2. Update Firestore security rules
3. Update config in `admin.html`, `auth.html`
4. Update README.md

### Update eligibility criteria
Edit the eligibility guide section in `eligibility.html`. No code changes needed.

### Add new application status
Add status to Firestore `application_status` collection. Status lookup will automatically display it.

## Support

- Official email: sahulatfamilypk@gmail.com
- Student support: Contact page or email
- Admin support: Check Firebase logs and Firestore rules

## License

Built with care for Pakistani students. All rights reserved.
