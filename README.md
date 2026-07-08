# Success Club 2026 Scholarship Portal

A local Node.js scholarship portal for the **Success Club 2026 - SDG 4: Quality Education** school project.

The site lets students create an account, verify their email with an OTP, apply for scholarships, and track application status. Admins can review submitted applications, sort them, update statuses, contact students, and delete entries from the local database.

## Features

- Student signup and sign-in
- Gmail OTP email verification
- Separate OTP verification page
- CAPTCHA protection for signup and applications
- Scholarship listing and apply flow
- Account-linked applications
- Student application status page
- Admin dashboard
- Admin sorting by newest, oldest, name, status, city, or scholarship
- Admin status updates and application deletion
- Gmail compose links for contacting students
- Local JSON storage
- Responsive UI

## Tech Stack

- HTML
- CSS
- JavaScript
- Node.js
- Local JSON files
- Gmail SMTP through a local `credentials.env` file

No external npm packages are required.

## Project Structure

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

`data/` is created automatically when the server runs. Real credentials are stored locally in `credentials.env` and are intentionally ignored by Git.

## Run Locally

Install Node.js, then run:

```bash
npm start
```

Open:

```txt
http://localhost:4173
```

The root URL serves `index.html`, so both of these work:

```txt
http://localhost:4173
http://localhost:4173/index.html
```

### Quick Start

Windows:

```txt
Double-click start.bat
```

macOS:

```bash
chmod +x start.command
./start.command
```

## Gmail OTP Setup

Create a local file named `credentials.env` in the same folder as `server.js`.

Recommended format:

```txt
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

This format also works:

```txt
email = your-email@gmail.com
password = abcd efgh ijkl mnop
```

Spaces in the app password are removed automatically before Gmail login.

Do **not** upload `credentials.env` to GitHub. Use `credentials.example.env` as the safe template.

### Generate a Gmail App Password

1. Open your Google Account security settings.
2. Turn on 2-Step Verification.
3. Open App Passwords.
4. Create an app password named `Success Club Website`.
5. Put the generated password in `credentials.env`.

## OTP Behavior

- If `credentials.env` exists and Gmail works, signup sends the OTP by email.
- If `credentials.env` exists but Gmail fails, the app shows an email-sending error instead of revealing a demo code.
- If `credentials.env` is missing, the app runs in demo mode and shows a local verification code.

After signup, students are sent to `verify.html` to enter the OTP.

## Admin Login

```txt
Email: admin@successclub2026.org
Password: admin2026
```

## Student Flow

1. Open the homepage.
2. Go to **Sign Up**.
3. Create a student account.
4. Check Gmail for the OTP code.
5. Enter the OTP on **Verify Email**.
6. Go to **Apply**.
7. Submit a scholarship application.
8. Check status on **Application Status**.

## Admin Flow

1. Open the **Admin** page.
2. Sign in with the admin credentials.
3. View submitted applications.
4. Sort applications.
5. Update application status.
6. Contact students through Gmail links.
7. Delete applications if needed.

## Local Data

Student accounts are saved in:

```txt
data/users.json
```

Applications are saved in:

```txt
data/applications.json
```

These files are ignored by Git because they are local runtime data.

## Notes

- This is a school/demo prototype.
- Do not commit real Gmail credentials.
- Do not use this project for real scholarship applications without improving authentication, privacy, hosting, and database security.

## Theme

**Success Club 2026**  
**SDG 4: Quality Education**  
Helping underprivileged students continue their education through a clear, accessible scholarship process.
