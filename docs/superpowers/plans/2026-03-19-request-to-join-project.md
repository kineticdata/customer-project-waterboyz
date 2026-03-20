# Request to Join SWAT Project — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow volunteers to request to join upcoming SWAT projects, with captain approval and email notification.

**Architecture:** A utility form (`request-to-join-swat-project`) triggers a workflow that creates a `swat-project-volunteers` record with `Status = 'Pending Approval'` and emails the Project Captain. The portal's Upcoming Project detail page gets a "Request to Join" button, and the project Volunteers tab gets a "Pending Requests" section for captain review.

**Tech Stack:** Kinetic Platform (forms, workflows, security policies), React 18, `@kineticdata/react` SDK, Tailwind CSS / DaisyUI, email-templates (Node.js build script)

**Spec:** `docs/superpowers/specs/2026-03-19-request-to-join-project-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `email-templates/build.js` | Modify | Add `project-join-request` email template |
| `ai-skills/skills/platform/architectural-patterns/SKILL.md` | Modify | Add "Privileged Action via Utility Form" pattern |
| `portal/src/pages/upcoming-projects/UpcomingProjectDetail.jsx` | Modify | Add "Request to Join" button with state management |
| `portal/src/pages/projects/project/Volunteers.jsx` | Modify | Add "Pending Requests" section, fix double `.end()` bug, second query for pending records |
| Platform: `request-to-join-swat-project` form | Create via MCP | Utility form (trigger for workflow) |
| Platform: "Request to Join Submitted" workflow | Create via MCP | Workflow: duplicate check → create association → email captain |

---

## Task 1: AI Skills — Document Privileged Action via Utility Form Pattern

This is a standalone documentation task with no dependencies.

**Files:**
- Modify: `ai-skills/skills/platform/architectural-patterns/SKILL.md` (append new section after "Bulk Operations")

- [ ] **Step 1: Read the current file to find the insertion point**

Read `ai-skills/skills/platform/architectural-patterns/SKILL.md`. The new section goes after the last existing section ("Bulk Operations", ends around line 333).

- [ ] **Step 2: Add the "Privileged Action via Utility Form" section**

Append this section to the end of the file:

```markdown
---

## Privileged Action via Utility Form

When a lower-privilege user needs to trigger an operation on a resource they cannot access directly (due to security policies), use a utility form as a trigger and a workflow (running as system agent) to perform the privileged operation.

### When to Use

- A user needs to create, update, or delete a record on a form they don't have submission access to
- A user action should trigger a side effect (email, external system call, record creation) that requires elevated permissions
- You want an audit trail of the request separate from the target record

### How It Works

```
User submits utility form (minimal fields: IDs + context)
  → Workflow fires as system agent (elevated permissions)
  → Workflow performs guard checks (duplicate detection, validation)
  → Workflow creates/updates the target record
  → Workflow sends notifications, triggers side effects
  → Workflow closes the utility form submission
```

### Setup

1. **Create a utility form** with only the fields needed to identify the action:
   - IDs of the target record(s) — e.g., Project ID, Volunteer ID
   - Context for notifications — e.g., display names, optional notes
   - Do NOT duplicate target record fields — the workflow reads those from the source

2. **Set form security** to allow the requesting user to submit (e.g., "Authenticated Users" or a role-based policy), while the target form's security remains restricted

3. **Build the workflow** (bound to Submission Submitted):
   - Guard logic first — query the target form for existing records before creating duplicates
   - Perform the privileged operation (create/update submissions on the restricted form)
   - Send notifications (email, in-app) with context from both the request and target records
   - Close the utility form submission

### Guard Pattern for Idempotency

Before creating the target record, query for an existing record with the same key fields:

- **If found in an active state** → no-op (workflow completes without error, client gets success)
- **If found in a removed/cancelled state** → reactivate (update status) instead of creating a duplicate
- **If not found** → create the new record

This makes the operation idempotent — submitting the same request twice is harmless.

### Key Benefits vs. Relaxing Security Policies

| Approach | Trade-off |
|----------|-----------|
| **Utility form + workflow** | More setup, but preserves least-privilege, adds audit trail, enables server-side validation and notifications |
| **Relax security policies** | Simpler, but gives users direct write access to the target form — no audit trail, no server-side guards, harder to add side effects |

### Portal Integration

The portal creates the utility form submission via `createSubmission()` from `@kineticdata/react`. The workflow handles everything else — the portal does not need to know about the target form's security or the workflow's logic. The portal should:

1. Check for existing records client-side (for UX — show status instead of button)
2. Submit the utility form on user action
3. Show success/error feedback
4. Optionally poll or refetch to reflect the workflow's result
```

- [ ] **Step 3: Commit**

```bash
git add ai-skills/skills/platform/architectural-patterns/SKILL.md
git commit -m "docs: add Privileged Action via Utility Form pattern to ai-skills"
```

---

## Task 2: Email Template — `project-join-request`

Standalone task. Build and preview the email template before the workflow needs it.

**Files:**
- Modify: `email-templates/build.js` (add new template entry before the closing of the `templates` object)

- [ ] **Step 1: Read `email-templates/build.js` to find the insertion point**

The `templates` object ends with the `volunteer-confirmation` entry (around line 703). The new template goes right before the closing `};` of the object.

- [ ] **Step 2: Add the `project-join-request` template**

Insert this entry after `'volunteer-confirmation'` and before the closing `};`:

```javascript
  'project-join-request': {
    subject: 'New Volunteer Request — Waterboyz',
    preheader: 'A volunteer has requested to join one of your SWAT projects.',
    build: () => {
      const body = [
        heading('New Volunteer Request'),
        paragraph(
          'Hi <%= @results["Get Captain"]["Display Name"] %>,',
        ),
        paragraph(
          '<strong><%= @results["Get Volunteer"]["First Name"] %> <%= @results["Get Volunteer"]["Last Name"] %></strong> has requested to join your project <strong><%= @results["Retrieve Project"]["Project Name"] %></strong>.',
        ),
        '<% if @values["Notes"] && @values["Notes"] != "" %>',
        note(
          '<strong>Message from the volunteer:</strong><br><%= @values["Notes"] %>',
        ),
        '<% end %>',
        paragraph(
          'You can review their volunteer profile and approve or remove this request from the project\'s Volunteers tab:',
        ),
        action(
          'Review Request',
          `${brand.siteUrl}/#/project-captains/<%= @results["Retrieve Project"]["Submission Id"] %>/volunteers`,
        ),
        divider(),
        paragraph(
          'Thank you for leading this project!',
        ),
        paragraph(
          'The Waterboyz Team',
        ),
        spacer(),
      ].join('');

      return layout({
        subject: 'New Volunteer Request — Waterboyz',
        preheader: 'A volunteer has requested to join one of your SWAT projects.',
        body,
      });
    },
  },
```

- [ ] **Step 3: Build and preview the template**

```bash
cd email-templates && node build.js --preview project-join-request
```

Expected: Opens browser with the rendered email. Verify layout, heading, conditional notes block, action button. ERB placeholders will show as literal text in preview — that's expected.

**Note:** The `subject` field in the template object is for the CLI `--list` output and the HTML `<title>` tag. The **actual email subject** with dynamic ERB (`<%= @results['Get Volunteer']['First Name'] %> wants to join...`) is set in the workflow's `smtp_email_send_v1` node Subject parameter, not in `build.js`. This is how all other templates work.

- [ ] **Step 4: Commit**

```bash
git add email-templates/build.js
git commit -m "feat: add project-join-request email template"
```

---

## Task 3: Platform Form — Create `request-to-join-swat-project`

Create the utility form on the Kinetic Platform via MCP tools.

**Tools:** MCP `create_form`, `create_kapp_security_policy_definition` (if needed)

**Reference:** Read `@ai-skills/skills/platform/form-engine/SKILL.md` for form JSON schema and field structure. Read `@ai-skills/skills/platform/api-basics/SKILL.md` for submission CRUD. Every field element MUST have a unique hex `key` property AND all null properties explicitly present (requiredMessage, omitWhenHidden, pattern, renderAttributes, defaultResourceName) or the API returns 400/500 errors.

- [ ] **Step 1: Verify existing security policies**

Use MCP `list_kapp_security_policy_definitions` (kappSlug: `service-portal`) to confirm these policies exist:
- `Project Captains and SWAT Leadership`
- `Is Volunteer`

Note their exact names for the form's security policies.

- [ ] **Step 2: Create the form**

Use MCP `create_form` with:
- `kappSlug`: `service-portal`
- `slug`: `request-to-join-swat-project`
- `name`: `Request to Join SWAT Project`
- `description`: `Utility form for volunteers to request joining a SWAT project. Triggers a workflow that creates the volunteer-project association.`
- `type`: `Utility`
- `status`: `Active`
- `anonymous`: `false`

Fields (each must have a unique hex `key`, and all nullable properties explicitly set to `null`):
1. `Project ID` — text, required
2. `Volunteer ID` — text, required
3. `Project Name` — text, not required
4. `Notes` — text (textarea/multi-line), not required, max 500 chars

Security policies on the form:
- Display: `["Project Captains and SWAT Leadership", "Is Volunteer"]`
- Submission Access: `["Submitter"]`

- [ ] **Step 3: Verify the form was created**

Use MCP `retrieve_form` (kappSlug: `service-portal`, formSlug: `request-to-join-swat-project`, include: `fields,securityPolicies`) to confirm all fields and policies are set correctly.

- [ ] **Step 4: Commit a note about the form creation**

No file to commit — the form lives on the platform. But document in a commit message:

```bash
git commit --allow-empty -m "platform: create request-to-join-swat-project utility form

Form created on Kinetic Platform via MCP.
Type: Utility, Status: Active
Fields: Project ID, Volunteer ID, Project Name, Notes
Display: Project Captains and SWAT Leadership OR Is Volunteer
Submission Access: Submitter"
```

---

## Task 4: Platform Workflow — "Request to Join Submitted"

Create the workflow bound to the `request-to-join-swat-project` form.

**Tools:** MCP `create_form_workflow` or Task API
**Reference:** Read `@ai-skills/skills/platform/workflow-engine/SKILL.md` and `@ai-skills/skills/platform/workflow-xml/SKILL.md` for workflow structure, node types, handler definition IDs, and ERB context variables.

- [ ] **Step 1: Read the workflow XML skill for handler IDs and structure**

Read `ai-skills/skills/platform/workflow-xml/SKILL.md` in full — you need:
- Handler definition IDs for: submission search, submission create, submission update, user retrieve, smtp email send
- ERB variable syntax for accessing submission values (`@values['Field Name']`)
- Tree XML schema for building the workflow

- [ ] **Step 2: Read existing workflow examples**

Use MCP to export an existing workflow for reference (e.g., the "SWAT Project Initiation" workflow on `swat-project-nomination`). This shows the real handler IDs and parameter patterns used in this space.

```
retrieve_form_workflows(kappSlug: "service-portal", formSlug: "swat-project-nomination")
```

Then export the workflow XML to see the actual structure.

- [ ] **Step 3: Build the workflow**

Create a workflow with these nodes:

1. **Start** → connector to "Check Existing"
2. **Check Existing** — Search `swat-project-volunteers` where `Volunteer ID = @values['Volunteer ID']` AND `Project ID = @values['Project ID']`
   - If results found with Status Active or Pending Approval → connector to "Complete" (no-op)
   - If results found with Status Removed → connector to "Reactivate Record"
   - If no results → connector to "Create Association"
3. **Reactivate Record** — Update the found submission: `Status = 'Pending Approval'`, `Present = 'No'` → connector to "Retrieve Project"
4. **Create Association** — Create submission on `swat-project-volunteers`: `Volunteer ID`, `Project ID`, `Status = 'Pending Approval'`, `Present = 'No'` → connector to "Retrieve Project"
5. **Retrieve Project** — Fetch `swat-projects` submission by `@values['Project ID']` → connector to "Get Captain"
6. **Get Captain** — Retrieve user by `@results['Retrieve Project']['Project Captain']` → connector to "Get Volunteer"
7. **Get Volunteer** — Fetch `volunteers` submission by `@values['Volunteer ID']` → connector to "Send Email"
8. **Send Email** — `smtp_email_send_v1` handler:
   - `To`: `@results['Get Captain']['Email']`
   - `Subject`: from email template ERB
   - `Html Body`: built HTML from `project-join-request` template (with ERB placeholders)
   - `Text Body`: plain text fallback
9. **Complete** — Close the request submission

- [ ] **Step 4: Create the workflow via MCP**

Use `create_form_workflow` to create the workflow on the platform. Bind to form `request-to-join-swat-project`, event `Submission Submitted`.

- [ ] **Step 5: Test the workflow manually**

Create a test submission on `request-to-join-swat-project` via MCP `create_submission`:
- `Project ID`: use an existing test project's submission ID
- `Volunteer ID`: use an existing test volunteer's submission ID
- `Project Name`: "Test Project"
- `Notes`: "Testing the request to join workflow"

Then verify:
1. A `swat-project-volunteers` record was created with `Status = 'Pending Approval'`
2. The Project Captain received an email (or check workflow run logs)

- [ ] **Step 6: Commit**

```bash
git commit --allow-empty -m "platform: create 'Request to Join Submitted' workflow

Workflow created on Kinetic Platform via MCP.
Bound to: request-to-join-swat-project (Submission Submitted)
Steps: duplicate check → create/reactivate association → retrieve project → get captain → get volunteer → send email → close"
```

---

## Task 5: Portal — "Request to Join" Button on UpcomingProjectDetail

Add the volunteer-facing UI to request joining a project.

**Depends on:** Task 3 (form must exist), Task 4 (workflow must exist), Task 7 (index for association query). Run Task 7 before this if not done yet.

**Files:**
- Modify: `portal/src/pages/upcoming-projects/UpcomingProjectDetail.jsx`

**Reference:** Read `@ai-skills/skills/front-end/data-fetching/SKILL.md` for `useData` and `defineKqlQuery` patterns. Read `@ai-skills/skills/front-end/mutations/SKILL.md` for `createSubmission`.

- [ ] **Step 1: Read the current file**

Read `portal/src/pages/upcoming-projects/UpcomingProjectDetail.jsx` in full.

- [ ] **Step 2: Add imports and data fetching**

Add these imports at the top:

```javascript
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { createSubmission, defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { useData } from '../../helpers/hooks/useData.js';
import { getAttributeValue } from '../../helpers/records.js';
import { toastError, toastSuccess } from '../../helpers/toasts.js';
```

Note: `useParams` and `Icon` are already imported. Check which imports already exist and only add what's missing. `useCallback` is needed for the request handler.

Add state and data fetching inside the component, after the `project` lookup:

```javascript
const { kappSlug } = useSelector(state => state.app);
const profile = useSelector(state => state.app.profile);
const volunteerId = getAttributeValue(profile, 'Volunteer Id');

// Check for existing association with this project
const associationQuery = defineKqlQuery()
  .equals('values[Volunteer ID]', 'volunteerId')
  .equals('values[Project ID]', 'projectId')
  .end();

const associationParams = useMemo(
  () =>
    volunteerId && project
      ? {
          kapp: kappSlug,
          form: 'swat-project-volunteers',
          search: {
            q: associationQuery({ volunteerId, projectId: project['Project Id'] }),
            include: ['details', 'values'],
            limit: 5,
          },
        }
      : null,
  [kappSlug, volunteerId, project],
);

const { initialized: assocInit, loading: assocLoading, response: assocResponse } =
  useData(searchSubmissions, associationParams);

// Find active or pending association (ignore Removed)
const existingAssociation = useMemo(() => {
  const submissions = assocResponse?.submissions ?? [];
  return submissions.find(
    s =>
      s.values?.['Status'] === 'Active' ||
      s.values?.['Status'] === 'Pending Approval',
  );
}, [assocResponse]);

const [notes, setNotes] = useState('');
const [submitting, setSubmitting] = useState(false);
const [submitted, setSubmitted] = useState(false);
```

- [ ] **Step 3: Add the request handler**

```javascript
// Note: project['Project Id'] from the "Upcoming SWAT Projects" integration
// IS the submission ID of the swat-projects record.
const handleRequestToJoin = useCallback(async () => {
  if (!volunteerId || !project) return;
  setSubmitting(true);

  const result = await createSubmission({
    kappSlug,
    formSlug: 'request-to-join-swat-project',
    values: {
      'Project ID': project['Project Id'],
      'Volunteer ID': volunteerId,
      'Project Name': project['Project Name'] || '',
      Notes: notes.slice(0, 500),
    },
  });

  if (result?.error) {
    toastError({
      title: 'Unable to send request',
      description: result.error.message,
    });
  } else {
    toastSuccess({ title: 'Request sent!' });
    setSubmitted(true);
  }
  setSubmitting(false);
}, [kappSlug, volunteerId, project, notes]);
```

- [ ] **Step 4: Add the UI section**

After the existing skills/equipment sections and before the closing `</div>` of the main content area, add the "Request to Join" card:

```jsx
{/* Request to Join */}
<div className="bg-base-100 rounded-box border border-base-200 p-6">
  {!profile ? null : !volunteerId ? (
    // No volunteer profile
    <div className="text-center">
      <Icon name="user-heart" size={36} className="mx-auto text-base-content/20 mb-3" />
      <p className="text-base-content/50 font-medium text-sm">
        Complete your volunteer profile to request to join this project
      </p>
      <Link
        to="/profile?tab=volunteer"
        className="kbtn kbtn-primary kbtn-sm mt-3"
      >
        Complete Volunteer Profile
      </Link>
    </div>
  ) : !assocInit || assocLoading ? (
    // Loading association check (assocInit is true when params is set, but assocLoading
    // remains true until the response arrives — must check both to prevent flash)
    <div className="flex-cc py-2">
      <span className="kloading kloading-spinner kloading-sm" />
    </div>
  ) : submitted || existingAssociation?.values?.['Status'] === 'Pending Approval' ? (
    // Pending request
    <div className="flex-sc gap-3">
      <div className="flex-cc w-10 h-10 rounded-lg bg-warning/10 text-warning">
        <Icon name="clock" size={20} />
      </div>
      <div>
        <p className="font-semibold text-sm">Request Pending</p>
        <p className="text-xs text-base-content/50">
          Your request to join this project is awaiting captain approval.
        </p>
      </div>
    </div>
  ) : existingAssociation?.values?.['Status'] === 'Active' ? (
    // Already assigned
    <div className="flex-sc gap-3">
      <div className="flex-cc w-10 h-10 rounded-lg bg-success/10 text-success">
        <Icon name="circle-check" size={20} />
      </div>
      <div>
        <p className="font-semibold text-sm">You&apos;re assigned to this project</p>
        <p className="text-xs text-base-content/50">
          Check My Volunteering for project details.
        </p>
      </div>
    </div>
  ) : (
    // Can request to join
    <div>
      <h3 className="text-base font-semibold mb-2 flex-sc gap-2">
        <Icon name="heart-handshake" size={20} className="text-primary" />
        Interested in This Project?
      </h3>
      <p className="text-sm text-base-content/60 mb-4">
        Request to join and the Project Captain will review your volunteer profile.
      </p>
      <textarea
        className="ktextarea ktextarea-bordered w-full mb-3"
        placeholder="Optional: Why do you want to join this project?"
        maxLength={500}
        rows={3}
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      <div className="flex-sc gap-2">
        <button
          type="button"
          className="kbtn kbtn-primary kbtn-sm"
          onClick={handleRequestToJoin}
          disabled={submitting}
        >
          {submitting ? 'Sending...' : 'Request to Join'}
        </button>
        {notes.length > 0 && (
          <span className="text-xs text-base-content/40">
            {notes.length}/500
          </span>
        )}
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 5: Verify in the browser**

```bash
cd portal && yarn start
```

Navigate to `http://localhost:3000/#/upcoming-projects` and click a project. Verify:
1. With no volunteer profile → shows "Complete your volunteer profile" prompt
2. With a volunteer profile, no existing association → shows "Request to Join" button + Notes textarea
3. Click "Request to Join" → toast "Request sent!", button swaps to "Request Pending"
4. Refresh page → still shows "Request Pending" (server-side record was created by workflow)

- [ ] **Step 6: Commit**

```bash
git add portal/src/pages/upcoming-projects/UpcomingProjectDetail.jsx
git commit -m "feat: add Request to Join button on upcoming project detail page"
```

---

## Task 6: Portal — Pending Requests Section on Volunteers Tab

Add the captain-facing UI to review and approve/remove pending requests.

**Files:**
- Modify: `portal/src/pages/projects/project/Volunteers.jsx`

- [ ] **Step 1: Read the current file**

Read `portal/src/pages/projects/project/Volunteers.jsx` in full. Note the existing `buildVolunteersSearch` function (line 53-64) with the double `.end()` bug.

- [ ] **Step 2: Fix the double `.end()` bug in `buildVolunteersSearch`**

The current code calls `.end()` twice — once on line 57 and again on line 60. Fix it:

Replace lines 53-64:

```javascript
const buildVolunteersSearch = projectId => {
  const search = defineKqlQuery();
  search.equals(`values[${FIELD_PROJECT_ID}]`, 'projectId');
  search.equals(`values[${FIELD_STATUS}]`, 'status');
  search.end();

  return {
    q: search.end()({ projectId, status: 'Active' }),
    include: ['details', 'values'],
    limit: 200,
  };
};
```

With:

```javascript
const buildVolunteersSearch = (projectId, status = 'Active') => {
  const q = defineKqlQuery()
    .equals(`values[${FIELD_PROJECT_ID}]`, 'projectId')
    .equals(`values[${FIELD_STATUS}]`, 'status')
    .end();

  return {
    q: q({ projectId, status }),
    include: ['details', 'values'],
    limit: 200,
  };
};
```

This fixes the bug AND makes the function reusable for different statuses.

- [ ] **Step 3: Add a second `useData` call for pending volunteers**

Inside the `Volunteers` component, after the existing `useData(searchSubmissions, params)` call (around line 183), add a parallel query for pending records:

```javascript
// Query pending-approval relationship submissions for the current project.
const pendingParams = useMemo(
  () =>
    projectId
      ? {
          kapp: kappSlug,
          form: RELATIONSHIP_FORM,
          search: buildVolunteersSearch(projectId, 'Pending Approval'),
        }
      : null,
  [kappSlug, projectId],
);

const {
  initialized: pendingInit,
  loading: pendingLoading,
  response: pendingResponse,
  actions: { reloadData: reloadPending },
} = useData(searchSubmissions, pendingParams);

const pendingData = useMemo(() => pendingResponse?.submissions || [], [pendingResponse]);
```

Update the existing `reloadData` calls to also call `reloadPending` — create a combined reload:

```javascript
const reloadAll = useCallback(() => {
  reloadData();
  reloadPending();
}, [reloadData, reloadPending]);
```

Replace all existing `reloadData()` calls in the handlers with `reloadAll()`.

- [ ] **Step 4: Fetch volunteer details for pending volunteers too**

The existing `volunteerIds` memo (around line 190) only collects IDs from `data` (active volunteers). Expand it to include pending:

```javascript
const volunteerIds = useMemo(
  () => [...new Set([
    ...data.map(item => item?.values?.[FIELD_VOLUNTEER_ID]).filter(Boolean),
    ...pendingData.map(item => item?.values?.[FIELD_VOLUNTEER_ID]).filter(Boolean),
  ])],
  [data, pendingData],
);
```

- [ ] **Step 5: Add approve handler**

Add a new handler after the existing `handleRemoveVolunteer`:

```javascript
const handleApproveVolunteer = useCallback(
  async submission => {
    if (!submission?.id) return;
    setSaving(s => ({ ...s, [submission.id]: true }));
    const result = await updateSubmission({
      id: submission.id,
      values: { [FIELD_STATUS]: 'Active' },
    });

    if (result?.error) {
      toastError({
        title: 'Unable to approve volunteer',
        description: result.error.message,
      });
    } else {
      toastSuccess({ title: 'Volunteer approved' });
      reloadAll();
    }

    setSaving(s => ({ ...s, [submission.id]: false }));
  },
  [reloadAll],
);
```

- [ ] **Step 6: Add the Pending Requests UI section**

Inside the JSX, add the pending requests section **before** the existing volunteers table (after the "Additional Volunteers Needed" section, before the `<div className="rounded-box border bg-base-100 p-6">` that contains the volunteers heading). Only render when `canRemove` is true (captains/leadership) and there are pending requests:

```jsx
{canRemove && pendingData.length > 0 && (
  <div className="rounded-box border border-warning/30 bg-warning/5 p-6">
    <div className="flex items-center gap-2 mb-4">
      <Icon name="clock" size={20} className="text-warning" />
      <span className="text-base font-semibold">Pending Requests</span>
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-warning text-warning-content">
        {pendingData.length}
      </span>
    </div>
    <div className="flex flex-col gap-3">
      {pendingData.map(submission => {
        const values = getVolunteerValues(submission, volunteerDetails);
        const name = formatVolunteerName(values);
        return (
          <div
            key={submission.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-base-100 border border-base-200 px-4 py-3"
          >
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => openVolunteerDetail(submission)}
            >
              <div className="font-medium text-sm truncate">
                {name || 'Volunteer'}
              </div>
              <div className="flex gap-3 text-xs text-base-content/60 mt-0.5">
                {values[FIELD_EMAIL] && <span>{values[FIELD_EMAIL]}</span>}
                {values[FIELD_PHONE] && (
                  <span>{formatPhone(values[FIELD_PHONE])}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-none">
              <Tooltip content="Approve">
                <button
                  slot="trigger"
                  type="button"
                  className="kbtn kbtn-sm kbtn-success kbtn-circle"
                  onClick={() => handleApproveVolunteer(submission)}
                  disabled={!!saving[submission.id]}
                  aria-label="Approve volunteer"
                >
                  <Icon name="check" size={16} />
                </button>
              </Tooltip>
              <Tooltip content="Remove">
                <button
                  slot="trigger"
                  type="button"
                  className="kbtn kbtn-sm kbtn-ghost text-error kbtn-circle"
                  onClick={() => handleRemoveVolunteer(submission)}
                  disabled={!!saving[submission.id]}
                  aria-label="Remove request"
                >
                  <Icon name="x" size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 7: Verify in the browser**

Navigate to a project's Volunteers tab as a captain/leadership user. Verify:
1. If there are pending requests → "Pending Requests" section appears with count badge
2. Clicking a volunteer name → opens detail modal
3. Clicking Approve → toast "Volunteer approved", moves to active list
4. Clicking Remove → toast "Volunteer removed", disappears from pending list
5. If no pending requests → section is hidden

- [ ] **Step 8: Commit**

```bash
git add portal/src/pages/projects/project/Volunteers.jsx
git commit -m "feat: add Pending Requests section to project Volunteers tab

- Fix double .end() bug in buildVolunteersSearch
- Add second query for Pending Approval status
- Pending section with approve/remove actions (captains/leadership only)
- Volunteer name clickable to open detail modal"
```

---

## Task 7: Platform — Verify Index on `swat-project-volunteers`

The duplicate check query needs a compound index on `[Volunteer ID, Project ID]`.

**Tools:** MCP `retrieve_form` with `include=indexDefinitions`

- [ ] **Step 1: Check existing indexes**

Use MCP `retrieve_form` (kappSlug: `service-portal`, formSlug: `swat-project-volunteers`, include: `indexDefinitions`) to see current indexes.

- [ ] **Step 2: Add compound index if missing**

If `[values[Volunteer ID], values[Project ID]]` compound index doesn't exist, add it via MCP `update_form` with the new index added to `indexDefinitions`. Include ALL existing indexes in the update (the API replaces the full array).

- [ ] **Step 3: Build the index**

Use MCP `create_form_background_job` to trigger an index rebuild. Then poll `retrieve_form?include=indexDefinitions` until the index status is "Built".

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "platform: verify/add compound index on swat-project-volunteers [Volunteer ID, Project ID]"
```

---

## Task 8: End-to-End Verification

Full flow test across all components.

- [ ] **Step 1: Test the happy path as a volunteer**

1. Log in as a volunteer user (not captain/leadership)
2. Navigate to `/#/upcoming-projects` → click a project
3. Verify "Request to Join" button appears
4. Enter notes, click "Request to Join"
5. Verify toast "Request sent!" and button changes to "Request Pending"
6. Refresh — verify "Request Pending" persists

- [ ] **Step 2: Test duplicate prevention**

1. On the same project, verify "Request Pending" is shown (no button)
2. Verify the workflow did NOT create a duplicate `swat-project-volunteers` record

- [ ] **Step 3: Test captain approval**

1. Log in as the Project Captain
2. Navigate to the project's Volunteers tab
3. Verify the "Pending Requests" section shows the volunteer's request
4. Click the volunteer name → verify detail modal opens
5. Click "Approve" → verify toast, volunteer moves to active list
6. Verify the `swat-project-volunteers` record now has `Status = 'Active'`

- [ ] **Step 4: Test volunteer sees updated state**

1. Log back in as the volunteer
2. Navigate to `/#/upcoming-projects` → click the same project
3. Verify "You're assigned to this project" badge appears

- [ ] **Step 5: Test the no-volunteer-profile state**

1. Log in as a user without a Volunteer Id attribute
2. Navigate to an upcoming project detail
3. Verify "Complete your volunteer profile" prompt with link

- [ ] **Step 6: Test the remove-then-re-request reactivation path**

1. As the captain, remove the volunteer from the project (Status → Removed)
2. As the volunteer, navigate to the same project's detail page
3. Verify "Request to Join" button appears again (Removed associations are ignored)
4. Click "Request to Join" → verify toast, button swaps to "Request Pending"
5. Verify the workflow REACTIVATED the existing record (Status changed from Removed to Pending Approval) rather than creating a duplicate

- [ ] **Step 7: Test email delivery**

Check that the Project Captain received the "New Volunteer Request" email with:
- Correct volunteer name
- Project name
- Notes (if provided)
- Working "Review Request" link

- [ ] **Step 8: Final commit**

```bash
git commit --allow-empty -m "test: verify end-to-end Request to Join flow"
```
