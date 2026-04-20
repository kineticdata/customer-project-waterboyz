# Create Volunteer from Volunteer Management

**Date:** 2026-04-20
**Status:** Approved

## Context

SWAT Leadership manages volunteers from the Volunteer Management admin page
(`/admin/volunteer-management`). Today they can only edit existing volunteer
records — there is no way to create a new volunteer from the portal. When
leadership encounters a volunteer through an offline channel (phone call,
paper form, in-person conversation), they have to either ask the person to
self-register or create the record in the Kinetic console directly.

This spec adds an "Add Volunteer" action to Volunteer Management so
leadership can create the `volunteers` datastore record themselves. The
existing workflow attached to the `volunteers` form will take care of
sending the new volunteer an invitation email to finish setting up their
portal account.

## Goals

- Let SWAT Leadership create a new volunteer record directly from
  `/admin/volunteer-management`.
- Capture only the minimum information needed for the workflow to invite
  the volunteer: name, email, phone, organization.
- Rely on the existing `volunteers` form workflow to create the user
  account and send the invitation — do not duplicate that logic in the
  client.
- Match the interaction and visual pattern already in use on the Captain
  Management admin page.

## Non-goals

- No CoreForm rendering of the full `volunteers` form. Leadership doesn't
  need to fill out skills/tools/availability/etc. — the invited volunteer
  will complete that themselves.
- No bulk import / CSV upload.
- No manual user-account creation or invitation-email logic in the portal.
  That stays in the platform workflow.
- No changes to the `volunteers` form schema or the workflow.

## UI

### Toolbar button

Add a primary button to the `PageHeading` children in
[VolunteerManagement.jsx](../../portal/src/pages/admin/volunteer-management/VolunteerManagement.jsx),
matching the placement and styling used on
[CaptainManagement.jsx:89-98](../../portal/src/pages/admin/CaptainManagement.jsx#L89-L98):

```jsx
<PageHeading title="Volunteer Management" backTo="/admin" className="!mb-0">
  <div className="ml-auto">
    <button
      className="kbtn kbtn-primary kbtn-sm"
      onClick={() => setCreateOpen(true)}
    >
      <Icon name="plus" size={16} />
      Add Volunteer
    </button>
  </div>
</PageHeading>
```

The existing count / clear-filters row below the heading is unchanged.

### Create modal

A new component `CreateVolunteerModal.jsx` — a small hand-built form (no
CoreForm), rendered inside the shared `Modal` atom used elsewhere in the
portal. Fields:

| Field | Required | Input |
|---|---|---|
| First Name | ✓ | text |
| Last Name | ✓ | text |
| Email Address | ✓ | text, validated with `validateEmail` from `helpers/index.js` |
| Phone Number |  | text (display-only formatting via `formatPhone` on blur) |
| Affiliated Organization |  | `<select>` populated from the `affiliates` datastore |

Affiliates are already fetched by
[useVolunteerManagementData.js](../../portal/src/pages/admin/volunteer-management/useVolunteerManagementData.js);
pass the list into the modal so there is no extra fetch.

Modal footer: a **Cancel** ghost button and a **Create Volunteer** primary
button. The primary button is disabled while a submission is in flight and
shows a spinner.

### Validation

Client-side validation before submit:

- First Name, Last Name, Email Address are non-empty.
- Email Address passes `validateEmail`.

Each field shows an inline error message immediately below it (same pattern
as [Profile.jsx](../../portal/src/pages/profile/Profile.jsx)'s account tab).

### Success flow

On a successful `createSubmission`:

1. Show a success toast: _"Volunteer added — invitation sent."_
2. Close the modal.
3. Call `reload()` from `useVolunteerManagementData` to refresh the table.
4. Open the detail drawer for the newly created volunteer by calling
   `setSelectedVolunteer(newSubmission)`, so leadership can immediately
   assign the volunteer to a project or sign them up for an event. The
   returned submission from `createSubmission` has the shape the drawer
   expects (`id`, `values`, etc.).

### Error flow

On failure:

- Display an error banner at the top of the modal body with the error
  message from the platform.
- Leave the form values in place so the user can adjust and retry.
- Common case: if the platform rejects the submission because a volunteer
  with that email already exists, the platform error message will surface
  through this banner (no custom client-side dedup logic).

## Data flow

```
User clicks "Add Volunteer"
  → setCreateOpen(true)
  → CreateVolunteerModal renders

User fills form, clicks "Create Volunteer"
  → Client-side validation
  → createSubmission({
      kappSlug: 'service-portal',
      formSlug: 'volunteers',
      values: { 'First Name', 'Last Name', 'Email Address',
                'Phone Number', 'Affiliated Organization' },
      completed: true,   // runs the workflow → invitation email
    })
  → On success:
      - toastSuccess
      - reload() the management data
      - setSelectedVolunteer(newSubmission) to open the drawer
      - close modal
  → On error:
      - show error banner inside modal, keep form open
```

`completed: true` is required so the form workflow fires. Without it, the
submission would stay in draft and no invitation email would be sent.

## Files

### New

- `portal/src/pages/admin/volunteer-management/CreateVolunteerModal.jsx` —
  the create form modal.

### Modified

- `portal/src/pages/admin/volunteer-management/VolunteerManagement.jsx`:
  - Add the `Add Volunteer` button inside `PageHeading`'s children.
  - Add `createOpen` state and render `<CreateVolunteerModal />`.
  - Wire the `onCreated(newSubmission)` callback to `reload()` and
    `setSelectedVolunteer(newSubmission)`.

No other files change. `useVolunteerManagementData`, `VolunteerDetailDrawer`,
and `EditVolunteerModal` are untouched.

## Testing

Manual verification checklist:

- [ ] Button appears only for SWAT Leadership / Space Admins (inherits
      existing route guard on `/admin/volunteer-management`, no new
      permission logic needed).
- [ ] Button placement matches Captain Management visually.
- [ ] Required-field validation triggers on empty First Name, Last Name,
      Email.
- [ ] Invalid email shows an inline error.
- [ ] Affiliated Organization dropdown lists all active affiliates.
- [ ] On successful create:
  - Toast appears.
  - Modal closes.
  - Table refreshes and the new volunteer row is visible.
  - Detail drawer opens on the new volunteer.
  - The `volunteers` workflow fires (verify in the Kinetic console that
    the invitation email goes out).
- [ ] On create failure (e.g., simulate by passing an invalid value), the
      error banner appears and the form stays open with values preserved.

## Open questions

None.
