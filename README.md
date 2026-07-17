# Sahulat Family Scholarship Portal

A lightweight scholarship portal for Sahulat Family. The site helps students and families learn about the program, apply online, check status updates, read eligibility guidance, and get short AI help while preparing an application.

## Live Site

Primary Pages deployment:

```txt
https://successscholarships.pages.dev
```

Cloudflare preview deployments may look like:

```txt
https://<preview-id>.successscholarships.pages.dev
```

## Contact

Official Gmail:

```txt
sahulatfamilypk@gmail.com
```

Students should apply on the website first. Any required PDF documents should be emailed after applying, with the application ID in the email subject.

## Main Features

- Public homepage with scholarship information and Pakistani university links.
- Google sign-in for applications.
- Application form saved to Firebase Firestore.
- Duplicate application warning before resubmitting.
- Status lookup by application ID.
- Eligibility page with simple income and document guidance.
- Ask AI page for short application help.
- Admin dashboard for reviewing applications, updating statuses, exporting CSV, downloading records, and deleting entries.
- Pakistan-only geoblock code exists but is currently disabled in `assets/js/geoblock.js` / `assets/js/script.js`.

## Admin

Admin page:

```txt
/admin
```

Current admin Gmail:

```txt
sahulatfamilypk@gmail.com
```

If the admin page signs in but cannot load applications, check Firestore security rules. The rules must allow the Sahulat Family admin email to read/write the `applications` and `application_status` collections.

Firebase Authentication must also include the deployed Pages domains under authorized domains.

Recommended authorized domains:

```txt
successscholarships.pages.dev
<preview-id>.successscholarships.pages.dev
```

## Firebase

The site currently uses the existing Firebase project:

```txt
successscholarships-2026
```

Collections used:

- `applications`
- `application_status`
- `application_submissions`
- `ai_usage`

Existing application IDs may still use older prefixes. New application IDs use:

```txt
SF2026-XXXXX
```

## AI

Ask AI uses the Cloudflare Pages Function:

```txt
functions/api/ask-ai.js
```

The assistant is branded as Sahulat AI and is scoped to scholarship/application help only.

Required Cloudflare Pages environment variable:

```txt
GROQ_API_KEY
```

Optional:

```txt
GROQ_MODEL
```

The Sahulat Family Gmail has the unlimited AI usage override:

```txt
sahulatfamilypk@gmail.com
```

## Confirmation Email

Application confirmation email is handled by:

```txt
functions/api/send-confirmation.js
```

Cloudflare environment variables may be required depending on the current email provider setup.

## Files

- `index.html` - homepage
- `apply.html` - application form
- `eligibility.html` - eligibility and document guidance
- `ask-ai.html` - AI chat UI
- `status.html` - status lookup
- `auth.html` - Google sign-in
- `contact.html` - contact page
- `admin.html` - admin dashboard
- `assets/js/script.js` - shared public behavior, navigation, runtime branding, disabled geoblock helper
- `assets/js/admin.js` - admin dashboard logic
- `assets/js/geoblock.js` - geoblock code, currently disabled
- `functions/api/ask-ai.js` - AI backend
- `functions/api/send-confirmation.js` - confirmation email backend
- `favicon.svg` - Sahulat Family transparent favicon/logo mark

## Notes

- Keep Firebase project identifiers unchanged unless the backend is actually migrated.
- Change Firestore security rules when changing the admin email.
- Change Firebase Authentication authorized domains when testing on a new Pages preview URL.
- Browser favicon caches are stubborn; hard refresh or clear site data if the old icon appears.
