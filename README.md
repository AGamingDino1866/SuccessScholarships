# Success Club 2026 Scholarship Portal

A simple scholarship website for the **Success Club 2026 - SDG 4: Quality Education** school project.

The public site explains the scholarship mission and sends students to the official Google application form. Applications are collected in a linked Google Sheet for admin review.

## Live Workflow

- Students open the website.
- Students click **My Applications**.
- The site sends them to the official Google Form.
- Google limits the form to one response per email.
- Responses appear in the connected Google Sheet.
- Admins use the hidden `admin.html` page to open the response sheet.

## Important Links

Application form:

```txt
https://forms.gle/LWNga2iSiBCWmFnD7
```

Applications sheet:

```txt
https://docs.google.com/spreadsheets/d/1gqATBqOnFD4Z8mIuWubuKleWsQqpohmdXu4YwCaFo_4/edit?resourcekey=&gid=348710097#gid=348710097
```

Contact email:

```txt
successscholarships2026@gmail.com
```

## Admin Notes

The admin page is intentionally hidden from the public menu. It links to the Google Sheet where submissions are reviewed.

For review tracking, add these columns in the Sheet:

```txt
Status
Notes
```

Suggested statuses:

```txt
Pending
Approved
Rejected
Needs Info
```

## Theme

**Success Club 2026**

**SDG 4: Quality Education**

Helping underprivileged students continue their education through a clear, accessible scholarship process.
