# Expand Volunteer Project Visibility to Planning & Active

## Problem

Volunteers can only see projects once they reach **"Ready to Work"** status. Waterboyz wants volunteers to also discover **upcoming** projects that are still in **Planning**, and projects that are already **Active** but still recruiting — so volunteers can see the pipeline of work, not just what's ready today.

## Context

The volunteer-facing "Upcoming Projects" list (`portal/src/pages/upcoming-projects/`) and the home-page widget (`HomeVolunteer.jsx`) both render whatever the server-side Kapp integration **`Upcoming SWAT Projects`** returns. There is **no status filter in the portal client** — the filtering happens entirely inside that integration's operation.

### Current filter (operation `e393ff26-d6ab-4179-82dd-343c10fc1d80`, connection `1415539c-bb98-48bb-ad33-11be25189ad0`)

```
values[Associated Event]=null
  AND values[Project Status]="Ready to Work"
  AND values[Additional Volunteers Needed]="Yes"
```

### Project Status values (lifecycle order)

Planning → Ready to Work → Active → Ongoing → Completed → Canceled

### Decisions (from brainstorming)

- **Visible statuses:** Planning, Ready to Work, **and** Active. (Ongoing, Completed, Canceled remain hidden.)
- **`Additional Volunteers Needed = "Yes"` still required for all statuses** — a project only appears once its captain has flagged it as recruiting.
- **No UI distinction** — Planning/Active projects render identically to Ready to Work; no "Coming soon" badge, no separate section. The existing Request to Join flow works on all of them unchanged.

## Design

### 1. Operation query change (the only functional change)

Update the KQL `q` in the `Upcoming SWAT Projects` operation body:

```diff
- values[Associated Event]=null AND values[Project Status]="Ready to Work" AND values[Additional Volunteers Needed]="Yes"
+ values[Associated Event]=null AND values[Project Status] IN ("Planning", "Ready to Work", "Active") AND values[Additional Volunteers Needed]="Yes"
```

`IN` is a KQL **equality** operator — it needs no `orderBy` and matches the same compound index the current `=` query already uses (all three conditions remain equality), so **no reindex is required**. Outputs, `limit`, and every other condition are unchanged. **No portal code change** is needed for the list itself.

Applied via the MCP integrator update/patch operation call, preserving the current `lockVersion`.

### 2. Captain-facing messaging cleanup

The captain view currently tells captains that Planning and Active projects are hidden — now false. Reword to a positive visibility statement.

**`portal/src/pages/projects/project/Project.jsx` — `STATUS_BANNER`:**

- Planning, Ready to Work, Active → a single "visible" banner:
  - icon `eye`, title **"Visible to volunteers"**
  - message: **"Visible to volunteers when status is Planning, Ready to Work and Active."**
  - success/info green style, `linkTo: 'details'`
  - (Ready to Work becomes a new banner key; previously it showed none.)
- Ongoing → unchanged ("Ongoing project / not listed for new volunteers").
- Completed → unchanged.
- Canceled → unchanged.

**`portal/src/pages/projects/project/ProjectDetails.jsx` — `STATUS_VISIBILITY_NOTE`:**

- Planning, Ready to Work, Active → "Visible to volunteers when status is Planning, Ready to Work and Active. Requires *Additional Volunteers Needed = Yes*."
- Ongoing → "This project is no longer listed for new volunteers."
- Completed → "Project has been completed."
- Canceled → "This project is closed."

The `eye` / `eye-off` icon logic (`ProjectDetails.jsx:~268`) updates so the `eye` icon shows for Planning, Ready to Work, and Active.

### 3. Doc consistency

Update the prior spec `docs/superpowers/specs/2026-04-02-project-status-visibility-design.md` "Context" note (and its Planning/Active banner rows) so it no longer states Planning is invisible.

## Verification

1. Execute the operation via MCP **before** the change and capture the returned project count/ids.
2. Apply the query change.
3. Execute again — confirm it returns Planning and Active projects (with `Additional Volunteers Needed = Yes`) and does **not** 400 (proves the index still matches).
4. In the portal, load Upcoming Projects and the home widget as a volunteer — Planning/Active recruiting projects now appear.
5. Load a Planning and an Active project in the captain view — banner + details note read "Visible to volunteers…".

## Out of scope

Badges, "Coming soon" sections, request-to-join gating, and any change to the `Additional Volunteers Needed` requirement.

## Files / artifacts to change

| Artifact | Action |
|----------|--------|
| Operation `Upcoming SWAT Projects` (platform, via MCP) | Modify KQL `q` |
| `portal/src/pages/projects/project/Project.jsx` | Reword `STATUS_BANNER` for Planning/Ready to Work/Active |
| `portal/src/pages/projects/project/ProjectDetails.jsx` | Reword `STATUS_VISIBILITY_NOTE` + icon logic |
| `docs/superpowers/specs/2026-04-02-project-status-visibility-design.md` | Correct outdated visibility statements |
