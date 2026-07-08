# Success Club 2026 Scholarship Portal

A school project website and local backend for the **Success Club 2026 - SDG 4 Quality Education** scholarship programme.

The portal is designed to help underprivileged students apply for education support through a clean student-facing website and a protected admin dashboard. Students can create an account, verify their email using a demo verification code, submit a scholarship application, and track their application status. Admins can review, sort, update, contact, and delete applications.

## Project Purpose

Many capable students lose access to quality education because their families cannot afford school fees, supplies, transport, or learning tools. This project demonstrates how a simple digital portal can make the scholarship process clearer, safer, and easier to manage.

The website supports the idea of **UN Sustainable Development Goal 4: Quality Education** by showing how technology can help organize applications for students who need financial support.

## Features

- Student account creation
- Student sign in and sign out
- Demo email verification code system
- CAPTCHA protection for signup and applications
- Scholarship listing page
- Account-linked application form
- Application eligibility check inside the backend
- Student application status page
- Admin login page
- Admin dashboard with all applications
- Admin sorting by:
  - newest
  - oldest
  - student name
  - status
  - city
  - scholarship
- Admin status updates
- Admin application deletion
- Gmail compose links for contacting students
- Local JSON file storage
- Responsive mobile-friendly layout

## Tech Stack

- **HTML**
- **CSS**
- **JavaScript**
- **Node.js**
- Local JSON file storage
- No external backend packages required

## Folder Structure

```txt
success-club-scholarship-portal/
|-- index.html
|-- scholarships.html
|-- signup.html
|-- signin.html
|-- verify.html
|-- apply.html
|-- status.html
|-- admin.html
|-- about.html
|-- contact.html
|-- server.js
|-- package.json
|-- start.bat
|-- start.command
|-- credentials.example.env
|-- favicon.svg
|-- assets/
|   |-- education-hero.png
|   |-- css/
|   |   `-- styles.css
|   `-- js/
|       |-- script.js
|       `-- admin.js
`-- data/
    |-- users.json
    `-- applications.json
```

## How To Run

Make sure Node.js is installed.

Then open the project folder and run:

```bash
npm start
```

Open the website in your browser:

```txt
http://localhost:4173
```

The homepage is served as the default page, so both URLs work:

```txt
http://localhost:4173
http://localhost:4173/index.html
```

### Quick Start Scripts

Windows:

```txt
Double-click start.bat
```

macOS:

```bash
chmod +x start.command
./start.command
```

## Admin Login

```txt
Email: admin@successclub2026.org
Password: admin2026
```

## Student Flow

1. Open the homepage.
2. Go to **Sign Up**.
3. Create a student account.
4. Check Gmail for the OTP verification code.
5. Enter the code on the **Verify Email** page.
6. Sign in if needed.
7. Go to **Apply**.
8. Submit the scholarship application.
9. Go to **Application Status** to view the current status.

## Gmail OTP Setup

The app reads Gmail credentials from a local file named:

```txt
credentials.env
```

Create it in the same folder as `server.js`:

```txt
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

This simpler format also works:

```txt
email = your-email@gmail.com
password = abcd efgh ijkl mnop
```

Spaces in the Gmail app password are removed automatically before sending email.

Do not upload `credentials.env` to GitHub. The repo includes `credentials.example.env` as the safe template.

To generate a Gmail app password:

1. Open your Google Account security settings.
2. Turn on 2-Step Verification.
3. Open App Passwords.
4. Create a password named `Success Club Website`.
5. Paste the generated 16-character app password into `credentials.env`.

If `credentials.env` is missing, the app still works in demo mode by showing the verification code locally after signup or resend.

## Admin Flow

1. Open the **Admin** page.
2. Sign in using the admin credentials.
3. View all submitted applications.
4. Sort applications using the dropdown.
5. Change application status.
6. Contact students through Gmail links.
7. Delete applications if needed.

## Local Backend Storage

This project stores data locally on the device hosting the site.

Student accounts are saved in:

```txt
data/users.json
```

Applications are saved in:

```txt
data/applications.json
```

This is useful for a school project because it demonstrates backend logic without needing a real online database.

## Notes

- This is a prototype for school/demo use.
- Gmail OTP sending uses Gmail SMTP when `credentials.env` is configured.
- Do not use this exact project for real scholarship applications without improving security, privacy, hosting, and database setup.

## Project Theme

**Success Club 2026**  
**SDG 4: Quality Education**  
Helping underprivileged students continue their education through a clear, accessible, and technology-supported scholarship process.
