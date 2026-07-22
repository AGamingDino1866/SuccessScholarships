# Success Factor - Project Structure

## Directory Layout

```
SuccessScholarships/
├── 📄 Root Files (Cloudflare Pages Configuration)
│   ├── index.html              # Homepage (entry point)
│   ├── _routes.json            # Cloudflare Pages routing config
│   ├── robots.txt              # Search engine bot rules
│   ├── sitemap.xml             # SEO sitemap for indexing
│   └── favicon.svg             # Website icon
│
├── 📄 Page Files (Served at root by Cloudflare Pages)
│   ├── apply.html              # 14-question scholarship application form
│   ├── status.html             # Application status lookup & receipt printing
│   ├── ask-ai.html             # AI assistant for writing help
│   ├── auth.html               # Google OAuth sign-in popup
│   ├── admin.html              # Admin dashboard (applications management)
│   ├── contact.html            # Support & contact information
│   ├── eligibility.html        # Scholarship criteria breakdown
│   ├── faq.html                # Frequently asked questions
│   ├── affordable-schools.html # List of low-cost educational institutions
│   └── test.html               # System diagnostics & testing console
│
├── 📁 assets/                  # Static assets (served from CDN)
│   ├── css/
│   │   └── styles.css          # Global styles (shared across all pages)
│   ├── js/
│   │   ├── script.js           # Navigation toggle
│   │   ├── admin.js            # Admin dashboard logic (CRUD operations)
│   │   └── read-aloud.js       # Global text-to-speech functionality
│   └── *.{png,svg,webp}        # Hero images & media assets
│
├── 📁 functions/               # Cloudflare Pages Functions (serverless APIs)
│   └── api/
│       ├── ask-ai.js           # Groq LLM integration + rate limiting
│       └── send-confirmation.js # Email webhook (Google Apps Script)
│
├── 📄 Documentation Files
│   ├── README.md               # Project overview & feature guide
│   ├── CLAUDE.md               # Implementation reference & architecture
│   └── PROJECT_STRUCTURE.md    # This file (directory layout guide)
│
├── 🔧 Configuration Files
│   ├── .gitignore              # Git exclusion rules
│   └── .gitattributes          # Line ending configuration
│
└── 📦 Version Control
    └── .git/                   # Git repository metadata
```

## Why This Structure?

### Root-Level HTML Files
- **Cloudflare Pages Requirement:** Static HTML files at root are served with clean URLs (e.g., `/apply.html` not `/pages/apply.html`)
- **SEO Friendly:** Each page has its own meta tags, OG tags, and schema markup
- **User Experience:** No nested URLs = simpler, more memorable links

### assets/ Directory
- **Performance:** Separated from logic, enabling aggressive CDN caching (30 days default)
- **Organization:** CSS, JS, and images grouped by type
- **Scalability:** Easy to add new assets without cluttering root

### functions/ Directory
- **Serverless APIs:** Cloudflare-managed, auto-scaled endpoints
- **No Cold Starts:** Pre-warmed by Cloudflare edge network
- **Security:** Environment variables stored in Cloudflare, not in repo

### Documentation
- **README.md:** User-facing guide (features, eligibility, getting started)
- **CLAUDE.md:** Developer reference (architecture, API specs, troubleshooting)
- **PROJECT_STRUCTURE.md:** This guide (directory rationale & maintainability)

## File Organization by Purpose

### Pages by Function
| File | Purpose | Auth | Features |
|------|---------|------|----------|
| `index.html` | Homepage | None | Mission, stats, institutions, how-it-works flow |
| `apply.html` | Application Form | Required | 14-question questionnaire, auto-save, duplicate detection |
| `status.html` | Status Lookup | None | Application tracking, printable receipt, JSON response |
| `ask-ai.html` | AI Assistant | Required | Groq LLM chat, rate limiting, conversation history |
| `auth.html` | Sign In | None | Google OAuth popup, redirects to apply.html |
| `admin.html` | Admin Dashboard | Admin Only | Applications management, status updates, CSV export |
| `contact.html` | Support | None | Contact info, email form, FAQ links |
| `eligibility.html` | Criteria | None | Weighted scoring breakdown (40% income, etc) |
| `faq.html` | Q&A | None | Common questions, expandable answers |
| `affordable-schools.html` | Resources | None | Low-cost institution directory |
| `test.html` | Diagnostics | None | System health checks, API validation |

### Asset Organization
- **styles.css:** Global design system (colors, typography, spacing)
- **script.js:** Cross-page utilities (navigation)
- **admin.js:** Dashboard-specific logic (Firestore CRUD)
- **read-aloud.js:** Text-to-speech for accessibility

### API Endpoints
- **POST /api/ask-ai:** Chat with LLM, rate-limited
- **POST /api/send-confirmation:** Email webhook for application submissions

## Deployment Flow

1. **Local Development** → Edit HTML/CSS/JS files
2. **Version Control** → `git push origin main`
3. **Cloudflare Hook** → Automatically pulls from repo
4. **Build Step** → None (instant, static deployment)
5. **Cache Invalidation** → Automatic
6. **Deploy** → ~30 seconds to all edge locations

## Key Design Principles

✅ **Clean URLs** - No file extensions in user-facing routes  
✅ **Fast Caching** - Static assets cached for 30 days  
✅ **Zero Build** - No compilation, instant updates  
✅ **Scalable** - Serverless APIs handle any traffic spike  
✅ **Secure** - Admin-only routes protected by Firebase Auth  
✅ **SEO Optimized** - Meta tags, sitemap, robots.txt, JSON-LD  
✅ **Accessible** - ARIA labels, keyboard navigation, read-aloud  
✅ **Mobile-First** - Responsive design (mobile, tablet, desktop)

## Adding New Features

### New Page
1. Create `newpage.html` in root
2. Add navigation link in existing pages
3. Update `sitemap.xml` with URL
4. Update `robots.txt` if needed
5. Add meta tags & OG tags to page header

### New API
1. Create `functions/api/new-endpoint.js`
2. Update `_routes.json` to include `/api/new-endpoint`
3. Add Firebase rules if needed
4. Document in CLAUDE.md

### New Style
1. Add CSS to `assets/css/styles.css`
2. Or create new file and import in HTML
3. Use CSS custom properties for consistency

## Git Workflow

```bash
# Make changes
git add .
git commit -m "Feature: description"

# Push to main (auto-deploys)
git push -u origin main
```

**Note:** GPG signing required per CLAUDE.md

## Performance Metrics

- **Page Load:** ~1-2s (Firebase SDK cached)
- **Firestore Read:** 100-200ms (regional replication)
- **API Response:** 1-2s (Groq inference time)
- **Geoblock Check:** ~50ms (edge-computed)

## Support & Troubleshooting

See **CLAUDE.md** for:
- Architecture deep-dive
- Security rules
- Database schema
- Environment setup
- Common issues
