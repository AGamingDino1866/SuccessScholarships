# Success Club 2026 Scholarship Portal

A scholarship website for the **Success Club 2026 - SDG 4: Quality Education** project.

The website helps underprivileged students learn about scholarship support, create an account, submit an in-site application, and check their application status.

## Website Pages

### Home

The homepage introduces the mission of the scholarship portal: helping underprivileged students continue their education. It includes a hero image, mission sections, university inspiration cards, and guidance for students.

### My Applications

The My Applications page is the main student action page. Students sign in, complete the built-in application form, use the eligibility checker, review the application checklist, and see the application timeline.

### Sign In

The Sign In page lets students create an account or sign in with email and password before submitting an application.

### Resources

The Resources page helps students prepare stronger applications with document tips, essay guidance, a prep tracker, and university research prompts.

### Status

The Status page lets students check their application status with an application ID. Status records are stored in Firebase Firestore and updated by the scholarship team.

### Contact Us

The contact page gives students a way to reach the scholarship team for help.

### Admin Page

The admin page is hidden from the public menu. It lets the scholarship team sign in, review submitted applications, and update application statuses.

## Student Flow

```txt
Visit Home -> Sign In -> Open My Applications -> Submit application -> Save application ID -> Check status
```

## Contact Email

```txt
successscholarships2026@gmail.com
```

## Firebase Collections

Student applications are saved in:

```txt
applications
```

Public status lookup reads from:

```txt
application_status
```

Each status record uses the application ID as the document ID, such as:

```txt
SC2026-DEMO
```

## Project Theme

**Success Club 2026**

**SDG 4: Quality Education**

Helping underprivileged students continue their education through a clear and accessible scholarship process.
