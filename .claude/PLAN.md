# Waterboyz Portal UX Redesign — Implementation Plan

**Goal:** Rebuild the portal UX to serve three distinct user types — Nominators, Volunteers, and Admins/Captains — replacing the generic IT service portal feel with a mission-driven community portal.

**Status legend:** ✅ Done | 🚧 In Progress | ⬜ Pending

---

## Phase 0: Role Utility Hook ✅ DONE
*Foundation — everything else depends on this.*

**Create:** `portal/src/helpers/hooks/useRoles.js`
- Returns: `{ isVolunteer, isProjectCaptain, isLeadership, isAdmin, isBookkeeper, hasProjectAccess }`
- `isVolunteer`: `!!getAttributeValue(profile, 'Volunteer Id')`
- `isProjectCaptain`: membership in `'SWAT Project Captains'`
- `isLeadership`: membership in `'SWAT Leadership'`
- `isAdmin`: `profile?.spaceAdmin`
- `hasProjectAccess`: `isProjectCaptain || isLeadership`
- `isBookkeeper`: membership in `'Bookkeepers'`

---

## Phase 1: Language Rename ✅ DONE
*High visibility, zero risk. Ships fast.*

| Current | New |
|---|---|
| My Requests | My Nominations |
| Submit a Request | *(removed — replaced by contextual CTAs)* |
| Check Status | My Nominations |
| My Work | My Tasks *(captains/leadership only)* |
| Upcoming Projects | Serve Days |
| Project Captains (nav label) | Projects |

**Files to modify:**
- `portal/src/components/header/Header.jsx` — all nav labels + menu items, use `useRoles()`
- `portal/src/pages/home/Home.jsx` — quick action card labels + hero copy
- `portal/src/pages/tickets/requests/RequestsList.jsx` — page heading + empty state
- `portal/src/pages/tickets/actions/ActionsList.jsx` — page heading
- `portal/src/pages/upcoming-projects/UpcomingProjectsList.jsx` — page heading + empty state

---

## Phase 2: Role-Aware Navigation ✅ DONE
*Reduce cognitive load — show each user only what's relevant.*

**Nav visibility by role:**

| Nav Item | Who Sees It |
|---|---|
| Home | Everyone |
| My Nominations | Everyone |
| Serve Days | Everyone |
| My Volunteering | Volunteers only (`isVolunteer`) |
| My Tasks | Captains/Leadership only (`hasProjectAccess`) |
| Projects | Captains/Leadership only |
| Admin *(hamburger only)* | Admins or Leadership |

**Mobile bottom nav (5 slots, role-priority):**
- Home, Serve Days, Events/Search (volunteers get Events, others get search), My Nominations, Projects (if hasProjectAccess)

**Files to modify:**
- `portal/src/components/header/Header.jsx`
- `portal/src/pages/PrivateRoutes.jsx` — role guard on `/events/*`, move volunteer prompt condition

---

## Phase 3: Role-Aware Home Page ✅ DONE
*Home page dispatches to one of four role-specific views.*

**`Home.jsx` dispatcher** — role priority: Admin > Captain/Leadership > Volunteer > Default

**Files to create:**
- `portal/src/pages/home/HomeNominator.jsx`
  - Mission statement hero (org mission, not "Welcome back")
  - Program cards (fallback hardcoded; dynamic in Phase 5)
  - "How It Works" 3-step static section
  - Shortcuts (reuse existing `<Shortcuts />`)
- `portal/src/pages/home/HomeVolunteer.jsx`
  - Personalized hero
  - My Upcoming Events (from event-signups)
  - Open Events with "Sign Up" CTA → `/events`
  - My Nominations last 3 (reuse `<ActivityList />`)
  - Profile completeness nudge if stale
- `portal/src/pages/home/HomeCaptain.jsx`
  - Active projects summary by status
  - Pending tasks (reuse `<WorkList />`, cap 5)
  - In-flight nomination pipeline count
  - Quick actions → `/project-captains`, `/actions`
- `portal/src/pages/home/HomeAdmin.jsx`
  - Inherits captain view + admin area shortcuts → `/admin`

**Files to modify:**
- `portal/src/pages/home/Home.jsx` — becomes dispatcher, keeps `<Shortcuts />` / `<ActivityList />` / `<WorkList />` as shared sub-components

---

## Phase 4: Admin Area ✅ DONE
*Dedicated `/admin` route. Management out of Settings.*

**New routes under `/admin`:**
- `/admin` — landing with cards
- `/admin/events` — event CRUD (replaces `/settings/datastore/events`)
- `/admin/programs` — programs CRUD (wired in Phase 5)
- `/admin/volunteers` — volunteer directory
- `/admin/shortcuts` — portal shortcuts (moved from settings)

All pages reuse the `DatastoreRecords.jsx` + `TableComponent` + `CoreForm` pattern from settings.

**Files to create:**
- `portal/src/pages/admin/index.jsx` — routing shell (mirrors `settings/index.jsx`)
- `portal/src/pages/admin/Admin.jsx` — landing page with cards
- `portal/src/pages/admin/AdminEvents.jsx` — event CRUD
- `portal/src/pages/admin/AdminVolunteers.jsx` — volunteer directory table
- `portal/src/pages/admin/AdminShortcuts.jsx` — portal shortcuts CRUD

**Files to modify:**
- `portal/src/pages/PrivateRoutes.jsx` — add `/admin/*` route with role guard
- `portal/src/pages/settings/index.jsx` — remove portal-shortcuts from datastore list
- `portal/src/pages/events/EventsList.jsx` — update "Manage Events" link to `/admin/events`

---

## Phase 5: Programs Datastore + Dynamic Home Cards ✅ DONE
*Admins can add programs (SWAT, Christmas Alive, etc.) without code changes.*

**Platform changes (MCP):**
- `core_createForm` — create `programs` datastore on `service-portal` kapp
  - Fields: Program Name, Description, Icon (Tabler), Color, Status (Active/Inactive), Nomination Form Slug, Volunteer Form Slug, Home Page Order
- `core_createSubmission` ×2 — seed SWAT Projects + Christmas Alive records

**Files to create:**
- `portal/src/pages/admin/AdminPrograms.jsx` — CRUD page for programs

**Files to modify:**
- `portal/src/pages/home/HomeNominator.jsx` — fetch active programs, render dynamic cards; hardcoded fallback if empty

---

## Phase 6: My Volunteering Page ✅ DONE
*Dedicated page for volunteers: commitments, history, profile.*

**Route:** `/my-volunteering` (guard: redirect to `/profile?tab=volunteer` if `!isVolunteer`)

**Page sections:**
1. Profile Summary — skills, availability, "Edit Profile" link
2. Upcoming Commitments — event-signups joined with events (reuse `EventsList.jsx` fetch pattern)
3. Assigned Projects — from `swat-project-volunteers`
4. Past Service History — attended/past events
5. "Find More Events" CTA → `/events`

**Files to create:**
- `portal/src/pages/my-volunteering/MyVolunteering.jsx` — route shell
- `portal/src/pages/my-volunteering/MyVolunteeringPage.jsx` — page content

**Files to modify:**
- `portal/src/components/header/Header.jsx` — add "My Volunteering" nav link (volunteers only)
- `portal/src/pages/PrivateRoutes.jsx` — add `/my-volunteering` route

---

## Phase 7: Nomination Confirmation Screen ✅ DONE
*Post-submission "What happens next" page. URL rename /requests → /nominations.*

**New route:** `/nominations/confirmed?form=[formSlug]`

**Confirmation content by form:**
- `swat-project-nomination` — SWAT-specific next steps messaging
- `christmas-alive-family-nomination` — Christmas Alive messaging
- *(any other)* — generic fallback

**URL rename:** `/requests/*` → `/nominations/*` with redirect from old path. Update all internal links.

**Files to create:**
- `portal/src/pages/nominations/NominationConfirmed.jsx`

**Files to modify:**
- `portal/src/pages/forms/Form.jsx` — redirect to confirmation after nominating forms submit
- `portal/src/pages/PrivateRoutes.jsx` — add `/nominations/*` + redirect from `/requests`
- `portal/src/components/header/Header.jsx` — update links from `/requests` to `/nominations`
- `portal/src/pages/home/Home.jsx` (and home variants) — update links

---

## Dependency Order

```
Phase 0 (useRoles)
    ↓
Phase 1 (language rename) ─────────────────────────────┐
    ↓                                                   │
Phase 2 (nav)                                   Phase 7 (confirmation)
    ↓
Phase 3 (home)      Phase 4 (admin)
                         ↓
                    Phase 5 (programs)

Phase 6 (my volunteering) — needs Phase 0 + 2, runs parallel to 3–5
```

---

## Platform MCP Changes Summary

| Phase | Tool | Action |
|---|---|---|
| 5 | `core_createForm` | Create `programs` datastore form |
| 5 | `core_createSubmission` ×2 | Seed SWAT Projects + Christmas Alive records |

---

## Key Files Reference

| File | Role |
|---|---|
| `portal/src/helpers/hooks/useRoles.js` | Role detection — used everywhere |
| `portal/src/components/header/Header.jsx` | Nav — modified in phases 0, 1, 2, 4, 6 |
| `portal/src/pages/home/Home.jsx` | Home dispatcher — phases 1, 3 |
| `portal/src/pages/PrivateRoutes.jsx` | Route registry — phases 2, 4, 6, 7 |
| `portal/src/pages/events/EventsList.jsx` | Canonical event/signup fetch pattern |
| `portal/src/pages/settings/DatastoreRecords.jsx` | Generic CRUD pattern for admin pages |
| `portal/src/helpers/hooks/useData.js` | Data fetching hook |
| `portal/src/helpers/records.js` | `getAttributeValue()` helper |
