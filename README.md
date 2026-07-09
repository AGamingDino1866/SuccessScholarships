# Success Club 2026 Scholarship Portal

A scholarship website for the **Success Club 2026 - SDG 4: Quality Education** project.

The website helps underprivileged students learn about scholarship support, prepare their application, submit the official application form, and check their application status.

## Website Pages

### Home

The homepage introduces the mission of the scholarship portal: helping underprivileged students continue their education. It includes a hero image, mission sections, university inspiration cards, and guidance for students.

### My Applications

The My Applications page is the main student action page. It includes an eligibility checker, application checklist, application timeline, FAQ section, and button to open the official application form.

### Resources

The Resources page helps students prepare stronger applications with document tips, essay guidance, a prep tracker, and university research prompts.

### Status

The Status page uses the backend to let students check an application status with an email address or application ID.

### Contact Us

The contact page gives students a way to reach the scholarship team for help. Students are asked to use the same email address they used in the application form so their response can be found quickly.

### Admin Page

The admin page is hidden from the public menu. It is used by the review team to access submitted application responses and manage review notes/status privately.

## Student Flow

```txt
Visit Home -> Open My Applications -> Check eligibility -> Prepare details -> Submit form -> Check status
```

## Application Form

```txt
https://forms.gle/LWNga2iSiBCWmFnD7
```

## Contact Email

```txt
successscholarships2026@gmail.com
```

## Backend Setup

The backend uses Cloudflare Pages Functions and a Cloudflare D1 database.

The status API lives at:

```txt
/api/status
```

The database schema is in:

```txt
schema.sql
```

In Cloudflare, create a D1 database and bind it to the Pages project with this binding name:

```txt
DB
```

After the schema is applied, the demo lookup is:

```txt
SC2026-DEMO
```

## Project Theme

**Success Club 2026**

**SDG 4: Quality Education**

Helping underprivileged students continue their education through a clear and accessible scholarship process.
