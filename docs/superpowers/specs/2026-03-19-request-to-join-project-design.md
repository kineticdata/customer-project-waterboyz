# Request to Join SWAT Project — Design Spec

## Problem

Volunteers can browse upcoming SWAT projects at `/upcoming-projects` and see project details (date, location, skills needed, equipment needed), but have no way to express interest in joining a project. Currently, only SWAT Leadership and Project Captains can add volunteers to projects — there is no volunteer-initiated flow.

## Goals

- Volunteers can request to join upcoming projects from the detail page
- Project Captains are notified of requests via email
- Captains can review pending requests on the project's Volunteers tab and approve or remove them
- Duplicate requests are prevented (client-side UX + server-side guard)
- Volunteers without a profile are prompted to complete one before requesting

## Non-Goals (Deferred)

- Notification email to volunteer when their request is approved (future: `Submission Updated` workflow on `swat-project-volunteers` where `valuesPrevious[Status] = 'Pending Approval'` and `values[Status] = 'Active'`)
- Decline-specific status — reuses existing "Remove" action for now

---

## Design

### 1. New Platform Form: `request-to-join-swat-project`

| Property | Value |
|----------|-------|
| Type | Utility |
| Status | Active |
| Anonymous | No |
| Display Policy | Authenticated Users |
| Submission Access | Submitter |

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Project ID | Text | Yes | Submission ID of the `swat-projects` record (same value as `project['Project Id']` from the "Upcoming SWAT Projects" integration) |
| Volunteer ID | Text | Yes | Submission ID of the volunteer's `volunteers` record |
| Project Name | Text | No | Display-only, included for email context |
| Notes | Text (multi-line) | No | Optional message from the volunteer ("Why do you want to join?"), max 500 characters |

This form is intentionally minimal — it exists as a trigger for the workflow, not as a data-of-record form. The real record of the volunteer-project relationship lives in `swat-project-volunteers`.

### 2. Workflow: "Request to Join Submitted" (on Submission Submitted)

Bound to `request-to-join-swat-project` form, event: Submission Submitted.

**Steps:**

1. **Duplicate/reactivation check** — Query `swat-project-volunteers` for existing record where `Volunteer ID` and `Project ID` match.
   - If found with `Status = 'Active'` or `Status = 'Pending Approval'` → complete the workflow (no-op).
   - If found with `Status = 'Removed'` → update the existing record to `Status = 'Pending Approval'`, `Present = 'No'`. Skip step 2. (This mirrors the reactivation pattern already used by `handleAddVolunteer` in `Volunteers.jsx`.)

2. **Create association** (only if no existing record found) — Create a `swat-project-volunteers` submission:
   - `Volunteer ID` = request's Volunteer ID
   - `Project ID` = request's Project ID
   - `Status` = `Pending Approval`
   - `Present` = `No`

3. **Retrieve Project** (node name: `Retrieve Project`) — Fetch the `swat-projects` record by Project ID to get the `Project Captain` username.

4. **Get Captain** (node name: `Get Captain`) — Look up the captain's user record to get their email address and display name.

5. **Get Volunteer** (node name: `Get Volunteer`) — Fetch the `volunteers` record by Volunteer ID to get the volunteer's name for the email.

6. **Send email to captain** — Send notification email with:
   - Subject: "[Volunteer Name] wants to join [Project Name]"
   - Body: Volunteer name, optional notes from the request, link to the project's Volunteers tab
   - Link: `${brand.siteUrl}/#/project-captains/{projectId}/volunteers` (hash router path)
   - Template: `project-join-request` (see section 5)
   - ERB references use workflow node names: `@results['Get Volunteer']['First Name']`, `@results['Retrieve Project']['Project Name']`, `@results['Get Captain']['Email']`

7. **Close request submission** — Close the utility form submission.

**Security note:** This workflow runs as the system agent, which has permission to create `swat-project-volunteers` records. The volunteer submitting the request form does NOT need write access to `swat-project-volunteers` — this is the key reason for using a utility form + workflow rather than direct client-side creation.

### 3. Portal: UpcomingProjectDetail — "Request to Join" Button

**File:** `portal/src/pages/upcoming-projects/UpcomingProjectDetail.jsx`

**Data requirements:** The component currently receives `projects` as a prop from the parent `UpcomingProjects` and has no data fetching of its own. We need to add:
- The user's `volunteerId` — use `useSelector` to get `profile` and `getAttributeValue(profile, 'Volunteer Id')` (same pattern as My Volunteering page)
- A `useData` call to query `swat-project-volunteers` where `Volunteer ID = volunteerId` AND `Project ID = project['Project Id']` — to determine existing association status
- Note: `project['Project Id']` from the "Upcoming SWAT Projects" integration IS the submission ID of the `swat-projects` record

**States:**

| Condition | UI |
|-----------|----|
| Association query still loading | Disabled/skeleton button (prevents flash of wrong state) |
| User has no `Volunteer Id` attribute | Info prompt: "Complete your volunteer profile to request to join" with link to `/profile?tab=volunteer` (same pattern as My Volunteering page) |
| Existing association with `Status = 'Active'` | Badge: "You're assigned to this project" (no button) |
| Existing association with `Status = 'Pending Approval'` | Badge: "Request Pending" (no button) |
| No existing association (or only `Removed`) | "Request to Join" button + optional Notes textarea (max 500 chars) |

**On button click:**
1. Create submission on `request-to-join-swat-project` form with `Project ID`, `Volunteer ID`, `Project Name`, and `Notes`
2. On success → toast "Request sent!" + swap button to "Request Pending" state
3. On error → toast error message

The Notes textarea acts as a deliberate step before submission, so no additional confirmation dialog is needed.

### 4. Portal: Volunteers Tab — Pending Requests Section

**File:** `portal/src/pages/projects/project/Volunteers.jsx`

**Changes:**

1. **Expand the query** — `buildVolunteersSearch` currently filters to `Status = 'Active'` only. Add a **second `useData` call** with a separate query for `Status = 'Pending Approval'` records for the same project. Two separate queries merged client-side is cleaner than trying to use `in()` (avoids index concerns). Also fix the pre-existing double `.end()` bug in `buildVolunteersSearch` (line 57 and 60 both call `.end()`).

2. **Separate pending from active** — Split the results into two lists:
   - `pendingVolunteers`: records where `Status = 'Pending Approval'`
   - `activeVolunteers`: records where `Status = 'Active'` (existing behavior)

3. **Pending Requests section** (visible to captains/leadership only, shown above the active volunteers table):
   - Header: "Pending Requests" with count badge
   - Each row shows: volunteer name (clickable → `VolunteerDetailModal`), email, phone
   - Two actions per row:
     - **Approve** (check icon) — calls `updateSubmission` to set `Status = 'Active'`
     - **Remove** (trash icon) — calls `updateSubmission` to set `Status = 'Removed'` (same as existing remove behavior)
   - Both actions trigger `reloadData()` on success
   - If no pending requests, section is hidden entirely

4. **Active volunteers table** — no changes to existing behavior.

### 5. Email Template: `project-join-request`

**File:** `email-templates/build.js`

New template added to the `templates` object:

- **Template name:** `project-join-request`
- **Subject line:** `<%= @results['Get Volunteer']['First Name'] %> <%= @results['Get Volunteer']['Last Name'] %> wants to join <%= @results['Retrieve Project']['Project Name'] %>`
- **Content:**
  - Heading: "New Volunteer Request"
  - Paragraph: "[Volunteer First Name] [Volunteer Last Name] has requested to join your project [Project Name]."
  - If notes present: Note block with the volunteer's message (`@values['Notes']`)
  - Action button: "Review Request" → `${brand.siteUrl}/#/project-captains/<%= @results['Retrieve Project']['Submission Id'] %>/volunteers`
  - Note: "You can approve or remove this request from the project's Volunteers tab."

### 6. AI Skills Update: Privileged Action via Utility Form Pattern

**File:** `ai-skills/skills/platform/architectural-patterns/SKILL.md`

Add a new section documenting the generic pattern for when a lower-privilege user needs to trigger an action that creates or modifies records they don't have direct access to.

**Pattern name:** "Privileged Action via Utility Form"

**When to use:** A user needs to trigger a side effect (record creation, status change, external system call) on a resource they cannot access directly due to security policies.

**How it works:**
1. Create a utility form with minimal fields (just enough to identify the action)
2. Set the form's security to allow the requesting user to submit
3. Bind a workflow (runs as system agent) that performs the privileged operation
4. The workflow includes guard logic (duplicate checks, validation) since the form itself is simple
5. The utility form submission serves as an audit trail of the request

**Key benefits vs. relaxing security policies:**
- Principle of least privilege — users never get direct write access to the target resource
- Audit trail — each request is a discrete submission
- Server-side validation — the workflow can enforce business rules the client can't
- Notification hooks — the workflow can send emails, create tasks, etc. as part of the same flow

**Guard pattern for idempotency:**
- Before creating the target record, query for an existing record with the same key fields
- If found in an active state → no-op (workflow completes without error)
- If found in a removed/cancelled state → optionally reactivate or create new

---

## Data Flow

```
Volunteer clicks "Request to Join"
  → Portal creates submission on `request-to-join-swat-project`
      (Project ID, Volunteer ID, Project Name, Notes)
  → "Request to Join Submitted" workflow fires (system agent):
      1. Check for existing swat-project-volunteers record
         → If active/pending exists: stop (no-op)
         → If removed exists: update to "Pending Approval" (reactivate), skip step 2
      2. Create swat-project-volunteers (Status: "Pending Approval")
      3. Retrieve Project → get captain username
      4. Get Captain → get email
      5. Get Volunteer → get name
      6. Send email to captain
      7. Close request submission

Captain opens project Volunteers tab
  → Portal fetches swat-project-volunteers (Active + Pending Approval)
  → Pending section shows requests with Approve/Remove buttons
  → Captain clicks "Approve"
      → updateSubmission: Status → "Active"
      → reloadData()
  → (Future) Submission Updated workflow sends approval email to volunteer
```

## Status Values for `swat-project-volunteers`

| Status | Meaning | Set By |
|--------|---------|--------|
| Active | Volunteer is assigned to the project | Captain (manual add) or Captain (approve request) |
| Pending Approval | Volunteer has requested to join | Workflow (from request form) |
| Removed | Volunteer was removed or request was declined | Captain (remove action) |

## Additional Volunteers Needed

The "Upcoming SWAT Projects" integration already filters to projects where `Additional Volunteers Needed = 'Yes'`. Projects set to "No" won't appear in the list. If a volunteer navigates directly to a detail URL for a project not in the integration results, they'll see the existing "Project not found" empty state — no additional gating needed.

## Index Requirements

The `swat-project-volunteers` form needs:
- A compound index on `[Volunteer ID, Project ID]` for the duplicate check (both in the workflow and the portal's button-state query). Verify this exists; if not, add it.
- The existing `[Project ID, Status]` index (used by `buildVolunteersSearch`) is sufficient for the new pending query since it will be a separate call with the same index shape.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `request-to-join-swat-project` form | Create (platform) | New utility form |
| "Request to Join Submitted" workflow | Create (platform) | Workflow on the new form |
| `project-join-request` email template | Create | New email template in `build.js` |
| `UpcomingProjectDetail.jsx` | Modify | Add Request to Join button with state management |
| `Volunteers.jsx` | Modify | Add Pending Requests section, expand query |
| `ai-skills/.../architectural-patterns/SKILL.md` | Modify | Add Privileged Action via Utility Form pattern |
