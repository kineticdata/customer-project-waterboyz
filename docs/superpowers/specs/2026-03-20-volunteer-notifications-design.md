# SWAT Volunteer Base Notifications — Design Spec

**Date:** 2026-03-20
**Status:** Draft

## Overview

A system for SWAT Leadership to send mass email notifications to the volunteer base about upcoming projects that need help. Supports two notification types: "Upcoming Projects" (all volunteers) and "Skills-Based" (filtered by skill match). Includes an admin portal page for sending notifications and viewing history.

## Goals

- Let SWAT Leadership notify volunteers about projects needing help (Status = "Ready to Work", Additional Volunteers Needed = "Yes", no Associated Event)
- Support targeted notifications based on volunteer skills
- Track who received each notification and when
- Provide a history view of past notifications

---

## 1. Platform Form — `swat-volunteer-notifications`

**Name:** SWAT Volunteer Base Notifications
**Type:** Admin | **Kapp:** `service-portal`

### Fields

| Field | Type | Notes |
|-------|------|-------|
| Notification Type | Dropdown | Choices: `Upcoming Projects`, `Skills-Based`. Required. |
| Skills Filter | Text | JSON string array of skill names (e.g., `'["Plumbing","Painting"]'`). Only used when Notification Type = `Skills-Based`. |
| Custom Message | Textarea | Optional freetext message included in the email body. |
| Notification Sent At | DateTime | Set by workflow after all emails are sent. |
| Recipient Count | Integer | Number of volunteers emailed. Set by workflow. |
| Recipients | Text | JSON array of `{volunteerId, name, email}` objects. Set by workflow. |
| Projects Included | Text | JSON array of `{projectId, projectName}` objects. Set by workflow. |
| Status | Dropdown | Choices: `Draft`, `Sending`, `Sent`, `Failed`. Set to `Draft` on creation, managed by workflow thereafter. |

### Security

- **Display:** SWAT Leadership
- **Submission Access:** SWAT Leadership

### Workflow

- **"Send Volunteer Notification"** — triggered on Submission Submitted

---

## 2. Email Template — `volunteer-notification`

Added to `email-templates/build.js` using the existing template system.

### Structure

1. **Heading:** "Volunteers Needed!"
2. **Custom message** (conditional) — only rendered if the Custom Message field is non-empty. Uses ERB conditional: `<% if @results["Get Submission"]["Custom Message"] && !@results["Get Submission"]["Custom Message"].empty? %>`
3. **Divider**
4. **Project listing** — pre-compiled HTML injected via `<%= @results["Build Email Body"]["Project HTML"] %>`. For each project:
   - **Project Name** (bold)
   - **Scheduled Date** (formatted as "Month Day, Year", or "TBD" if empty)
   - **Skills Needed**
   - **Equipment Needed**
   - **Project Captain:** Display Name, email (linked), phone number
5. **CTA button:** "View Projects" → `https://waterboyz.kinops.io/#/upcoming-projects`
6. **Closing:** "Thank you for serving your community!" + "The Waterboyz Team"

### Plaintext Fallback

A `textbody` version with the same content in plain text format, no HTML.

### ERB Data Flow

The workflow builds the project listing HTML as a single string in a "Build Email Body" node. The email template receives it as one variable — no ERB looping within the template itself.

### HTML Injection Format

The "Build Email Body" node output must produce email-table-compatible HTML (`<tr><td>` structure) matching the `email-templates/build.js` layout. The output is injected as a raw table row block within the card body. The workflow script should use the same inline styles (font sizes, colors, padding) as the `paragraph()` and `note()` helpers to maintain visual consistency.

The plaintext version is a simple text block with project details separated by blank lines.

---

## 3. Portal — Admin Notification Page

### Route

`/admin/notify-volunteers` — requires SWAT Leadership (enforced by `AdminRouting`)

### Menu

Add "Volunteer Notifications" to the admin section in the hamburger menu. **Icon:** `mail` (Tabler Icons).

### File Structure

```
portal/src/pages/admin/volunteer-notifications/
  VolunteerNotifications.jsx       # Main page: notification history list
  SendNotification.jsx             # Send new notification: type picker, preview, confirm
```

### Landing View — Notification History

- Table of past notifications from `swat-volunteer-notifications` submissions, sorted newest first
- **Columns:** Date Sent, Notification Type, Recipient Count, Status
- Click a row to expand/view details: recipients list, projects included, custom message
- **"Send New Notification"** button at the top → navigates to `/admin/notify-volunteers/new`

### Send New Notification View

**Route:** `/admin/notify-volunteers/new`

**UX Flow:**

1. **Notification Type** dropdown — `Upcoming Projects` or `Skills-Based`
2. **Skills picker** — only visible when type = `Skills-Based`. Extracts the inner `CategoryPickerInner` component from `categorypicker.js` (the presentational component inside the widget wrapper) and renders it directly as a React component, bypassing `registerWidget()` and `WidgetAPI`. It receives the same props (data source config, onChange callback, selected values) but manages state via React hooks in the parent instead of Kinetic field binding. Data source: `skills` datastore form.
3. **Preview panel** showing:
   - Matching projects in a card/list format (project name, scheduled date, captain, skills needed)
   - Recipient count: "This will be sent to X volunteers"
   - For skills-based: which skills are being matched
4. **Custom Message** textarea (optional)
5. **"Send Notification" button** → confirmation modal: "You're about to email X volunteers about Y projects. Proceed?"
6. On confirm: creates a submission on `swat-volunteer-notifications`, which triggers the workflow. Redirect to the notification history list.

### Data Fetching

- **History:** `searchSubmissions` on `swat-volunteer-notifications`, sorted by `createdAt` desc
- **Preview projects:** `searchSubmissions` on `swat-projects` filtered by KQL:
  - `values[Project Status]` = "Ready to Work" AND `values[Additional Volunteers Needed]` = "Yes"
  - **Client-side filtering** (KQL cannot express "is empty" or JSON array containment):
    - Exclude projects where `values[Associated Event]` is non-empty
    - (Skills-Based only) Filter to projects whose `values[Skills Needed]` (JSON array) contains at least one selected skill — parse the JSON and check intersection
  - Use `limit: 1000` to fetch all projects in one call
- **Preview recipients:** `searchSubmissions` on `volunteers` with `limit: 1000`. Client-side filter to volunteers with non-empty `values[Email Address]`. For skills-based, further filter by `values[Skill Areas]` (JSON array) containing at least one matching skill.
- **Pagination note:** Both queries use `limit: 1000` (the Kinetic API max). If the volunteer or project base exceeds 1000, implement paginated fetching with `pageToken`. For the initial build, the assumption is both datasets are well under 1000.

---

## 4. Workflow — "Send Volunteer Notification"

**Trigger:** Submission Submitted on `swat-volunteer-notifications`

### Flow

```
1. Update Status → "Sending"
    │
2. Branch on Notification Type
    ├── "Upcoming Projects"
    │   ├── Query swat-projects (Status = Ready to Work, Additional Volunteers Needed = Yes, Associated Event = empty)
    │   └── Query all volunteers (Email Address not empty)
    │
    └── "Skills-Based"
        ├── Read Skills Filter from submission
        ├── Query swat-projects (same filters + Skills Needed matches selected skills)
        └── Query volunteers (Email Address not empty + Skill Areas matches selected skills)
    │
3. Extract unique Project Captain usernames from project results
    │
4. Loop 1: Resolve Captains
    │   For each unique captain username → fetch user record (display name, email, phone)
    │
5. Build Email Body
    │   Compile project listing into HTML string + plaintext string
    │   Uses captain lookup from step 4 for contact info
    │   Includes conditional custom message
    │
6. Build Recipients JSON
    │   Compile volunteer list into [{volunteerId, name, email}, ...]
    │
7. Update Submission with Tracking Data
    │   Write: Recipients, Projects Included, Recipient Count
    │
8. Loop 2: Send Emails
    │   For each volunteer → smtp_email_send_v1
    │   htmlbody = compiled email template with project HTML injected
    │   textbody = plaintext fallback
    │   to = volunteer's Email Address
    │   subject = "Volunteers Needed — Waterboyz"
    │
9. Update Status → "Sent" + set Notification Sent At = now
    │
10. Error Handling
    └── On failure at any step → Update Status → "Failed"
```

### Project Query Criteria

All notification types share these base filters on `swat-projects`:
- **KQL filters:** `values[Project Status]` = `"Ready to Work"` AND `values[Additional Volunteers Needed]` = `"Yes"`
- **Post-query filtering (in script/echo node):**
  - Exclude projects where `Associated Event` is non-empty (KQL cannot express "is null/empty")
  - For Skills-Based: filter to projects whose `Skills Needed` (JSON string array) contains at least one skill from the Skills Filter — parse JSON and check intersection
- Use `limit: 1000` on the bridge/integration call. If results exceed 1000, paginate with `pageToken`.

### Volunteer Query Criteria

Fetch all volunteers with `limit: 1000` from the `volunteers` datastore, then filter in a script/echo node:

**Upcoming Projects:** Keep volunteers where `Email Address` is non-empty.

**Skills-Based:** Keep volunteers where `Email Address` is non-empty AND `Skill Areas` (JSON string array) contains at least one skill from the Skills Filter.

### Captain Resolution

After fetching projects, extract unique `Project Captain` usernames. Loop once per unique captain to fetch the user record. Build a lookup map of `{username → {displayName, email, phone}}` for use in email body compilation.

---

## Data Flow Diagram

```
SWAT Leadership (portal)
    │
    ├── /admin/notify-volunteers        → View notification history
    │                                      (searchSubmissions on swat-volunteer-notifications)
    │
    └── /admin/notify-volunteers/new    → Send new notification
         │
         ├── Select type, optional skills, preview projects + recipient count
         ├── Optional custom message
         ├── Confirm → createSubmission on swat-volunteer-notifications
         │
         └── Triggers workflow: "Send Volunteer Notification"
              │
              ├── Queries swat-projects (Ready to Work, needs volunteers, no event)
              ├── Queries volunteers (has email, optional skill filter)
              ├── Resolves unique captains (loop 1)
              ├── Builds email body HTML
              ├── Tracks recipients + projects on submission
              ├── Sends emails (loop 2)
              └── Updates status → Sent
```

---

## Out of Scope

- Duplicate notification prevention (e.g., preventing sending about the same projects twice in a row) — can be added later
- Scheduling notifications for a future date
- Opt-out/unsubscribe for individual volunteers
- Email open/click tracking
