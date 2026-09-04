# Project Status Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make project status more visible to captains with a contextual banner and a promoted status card on the Details tab.

**Architecture:** Add a status banner in `Project.jsx` between the header and tab content that shows volunteer-visibility context per status. Extract the status dropdown in `ProjectDetails.jsx` into its own card at the top of the tab with a contextual visibility note.

**Tech Stack:** React, Tailwind CSS, DaisyUI (k-prefixed), clsx, Tabler Icons via `Icon` atom

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `portal/src/pages/projects/project/Project.jsx` | Modify | Add status banner between header and content |
| `portal/src/pages/projects/project/ProjectDetails.jsx` | Modify | Extract status dropdown into its own card with visibility note |

---

### Task 1: Add the Status Banner to Project.jsx

**Files:**
- Modify: `portal/src/pages/projects/project/Project.jsx:177-226`

The banner config and JSX are added inline. No new files needed — this is a small, self-contained addition.

- [ ] **Step 1: Add the banner config object after `projectStatus` (line 177)**

Insert the following after line 177 (`const projectStatus = ...`):

```jsx
const STATUS_BANNER = {
  Planning: {
    icon: 'alert-triangle',
    title: 'Not visible to volunteers',
    message:
      'Set status to "Ready to Work" when you\'re ready to recruit volunteers.',
    style: 'bg-warning/10 border-warning text-warning-content',
    linkTo: 'details',
  },
  Active: {
    icon: 'info-circle',
    title: 'Work in progress',
    message: 'This project is no longer listed for new volunteers.',
    style: 'bg-info/10 border-info text-info-content',
    linkTo: 'details',
  },
  Ongoing: {
    icon: 'info-circle',
    title: 'Ongoing project',
    message: 'This project is ongoing and not listed for new volunteers.',
    style: 'bg-info/10 border-info text-info-content',
    linkTo: 'details',
  },
  Completed: {
    icon: 'circle-check',
    title: 'Project completed',
    message:
      'This project is finished and no longer visible to volunteers.',
    style: 'bg-primary/5 border-primary text-primary',
    linkTo: null,
  },
  Canceled: {
    icon: 'circle-x',
    title: 'Project canceled',
    message:
      'This project has been canceled and is not visible to volunteers.',
    style: 'bg-error/10 border-error text-error',
    linkTo: null,
  },
};

const banner = STATUS_BANNER[projectStatus] || null;
```

- [ ] **Step 2: Add the banner JSX between the header and the content area**

Insert the following between the closing `</div>` of the header bar (after line 224) and the `<div className="gutter mt-4 md:mt-6">` (line 226):

```jsx
{banner && (
  <div className="gutter">
    <div className="max-w-screen-xl mx-auto">
      {banner.linkTo ? (
        <Link
          to={banner.linkTo}
          className={clsx(
            'flex items-start gap-3 px-4 py-3 mt-3 rounded-lg border-l-4 transition-colors hover:opacity-80',
            banner.style,
          )}
        >
          <Icon name={banner.icon} size={20} className="mt-0.5 flex-none" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{banner.title}</div>
            <div className="text-xs opacity-80">{banner.message}</div>
          </div>
          <Icon name="chevron-right" size={18} className="mt-0.5 flex-none opacity-60" />
        </Link>
      ) : (
        <div
          className={clsx(
            'flex items-start gap-3 px-4 py-3 mt-3 rounded-lg border-l-4',
            banner.style,
          )}
        >
          <Icon name={banner.icon} size={20} className="mt-0.5 flex-none" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{banner.title}</div>
            <div className="text-xs opacity-80">{banner.message}</div>
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify in the browser**

Run: `cd portal && yarn start` (if not already running)

1. Open a project in **Planning** status — amber warning banner with arrow, clicking navigates to Details tab
2. Open a project in **Ready to Work** — no banner shown
3. Open a project in **Active** — blue info banner with arrow
4. Open a project in **Completed** — purple banner, no arrow
5. Check mobile viewport — banner text wraps naturally, no horizontal overflow

- [ ] **Step 4: Commit**

```bash
git add portal/src/pages/projects/project/Project.jsx
git commit -m "feat: add status visibility banner to project captain view"
```

---

### Task 2: Extract Status Into Its Own Card on the Details Tab

**Files:**
- Modify: `portal/src/pages/projects/project/ProjectDetails.jsx:193-271`

Move the Project Status `<select>` from the 2-column grid into a new card at the top of the component return. Add a contextual visibility note below the dropdown.

- [ ] **Step 1: Add the `Icon` import**

Add to the imports at the top of the file (after line 8):

```jsx
import { Icon } from '../../../atoms/Icon.jsx';
```

- [ ] **Step 2: Add the visibility note helper after the constants block**

Insert after line 28 (after `FAMILY_TYPE_OPTIONS`):

```jsx
const STATUS_VISIBILITY_NOTE = {
  Planning:
    'Volunteers can only see projects in "Ready to Work" status. Update the status when you\'re ready to recruit.',
  'Ready to Work':
    'This project is visible to volunteers on the Upcoming Projects page.',
  Active: 'This project is no longer listed for new volunteers.',
  Ongoing: 'This project is no longer listed for new volunteers.',
  Completed: 'This project is closed.',
  Canceled: 'This project is closed.',
};
```

- [ ] **Step 3: Add the new Status Card at the top of the return JSX**

Replace the opening of the return (lines 194-201):

```jsx
  return (
    <>
    <FamilyInformation familyRecord={familyRecord} familyLoading={familyLoading} />
    <div className="krounded-box border kbg-base-100 p-6">
      <div className="text-lg font-semibold">Project Details</div>
      <p className="mt-2 text-base-content/70">
        Update project status and scheduled date.
      </p>
```

with:

```jsx
  return (
    <>
    <FamilyInformation familyRecord={familyRecord} familyLoading={familyLoading} />

    {/* Status Card — promoted for visibility */}
    <div className="krounded-box border kbg-base-100 p-6">
      <div className="text-lg font-semibold">Project Status</div>
      <div className="mt-4">
        <select
          className="kselect kselect-bordered w-full"
          value={status}
          onChange={event => setStatus(event.target.value)}
        >
          <option value="">Select a status</option>
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {status && STATUS_VISIBILITY_NOTE[status] && (
          <div className="flex items-start gap-2 mt-3 text-sm text-base-content/60">
            <Icon
              name={status === 'Ready to Work' ? 'eye' : 'eye-off'}
              size={16}
              className="mt-0.5 flex-none"
            />
            <span>{STATUS_VISIBILITY_NOTE[status]}</span>
          </div>
        )}
      </div>
    </div>

    <div className="krounded-box border kbg-base-100 p-6">
      <div className="text-lg font-semibold">Project Details</div>
      <p className="mt-2 text-base-content/70">
        Update project details and scheduled date.
      </p>
```

- [ ] **Step 4: Remove the old status dropdown from the 2-column grid**

Remove the old Project Status `<label>` block from the grid (lines 255-271 in the original file). This is the block:

```jsx
        <label className="klabel flex flex-col items-start gap-2">
          <span className="klabel-text text-xs uppercase tracking-wide text-base-content/60">
            Project Status
          </span>
          <select
            className="kselect kselect-bordered w-full"
            value={status}
            onChange={event => setStatus(event.target.value)}
          >
            <option value="">Select a status</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
```

The Scheduled Date `<label>` that followed it remains in the grid.

- [ ] **Step 5: Verify in the browser**

1. Open a project's Details tab — new "Project Status" card appears at the top, above "Project Details"
2. Select "Planning" — visibility note shows eye-off icon: *"Volunteers can only see projects in 'Ready to Work' status..."*
3. Select "Ready to Work" — visibility note shows eye icon: *"This project is visible to volunteers..."*
4. Select "Completed" — note shows: *"This project is closed."*
5. Old status dropdown is gone from the 2-column grid
6. Check mobile viewport — card stacks properly, text wraps

- [ ] **Step 6: Commit**

```bash
git add portal/src/pages/projects/project/ProjectDetails.jsx
git commit -m "feat: promote status dropdown into its own card with visibility note"
```
