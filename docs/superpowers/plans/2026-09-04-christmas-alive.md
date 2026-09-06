# Christmas Alive Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Christmas Alive portal — nominate families, review and approve them, and let account-holders sponsor a family for Christmas.

**Architecture:** A `/christmas-alive/*` route subtree inside the existing React portal (header and main nav unchanged, bronze-accented page content). Family identity lives in the shared `families` datastore with the roster as a JSON array; per-season state lives in a new `christmas-alive-sponsorships` datastore. Sponsors read through kapp-level Operations with server-bound identity; claiming goes through a WebAPI whose mutual exclusion is a unique index on a `christmas-alive-claims` record.

**Tech Stack:** React 18 + Vite, React Router 6, Redux Toolkit, Tailwind v4 + DaisyUI (`k` prefix), `@kineticdata/react`, Kinetic Platform (datastores, Operations, WebAPIs, workflows), Playwright.

**Spec:** `docs/superpowers/specs/2026-09-04-christmas-alive-design.md`

## Global Constraints

- **Space:** `waterboyz` at `https://waterboyz.kinops.io`. **Kapp:** `service-portal`. **Connection:** `1415539c-bb98-48bb-ad33-11be25189ad0`.
- **ONE ENVIRONMENT — it is production with real family PII.** Additive changes only. Do NOT delete `family-members` or the `Can Retrieve Family Member Details` policy; those await explicit sign-off.
- **Statuses are exactly:** `Pending`, `Approved`, `Rejected`, `Adopted`. (Diverges from the requirements PDF; recorded in the spec.)
- **Child = age ≤ 18.** Derived from the roster, never from the nominator's typed totals.
- **Season isolation:** every sponsorship query filters on `Season`. The browse list filters on `programs.Current Season`.
- **Bronze = the existing `accent` token** (`--color-accent: #B2812C`). Do NOT introduce new colors. SWAT keeps `primary` (`#0075a9`).
- **Tailwind v4 safelist:** `portal/src/index.css` uses `@source inline(...)`. Any utility class not matching those patterns will not be generated. Check before inventing class names.
- **Every field element in a platform form PUT needs a unique hex `key` AND all null properties explicitly present** (`requiredMessage`, `omitWhenHidden`, `pattern`, `renderAttributes`, `defaultResourceName`) or the API returns 400/500. Field names "Name" and "Title" collide with reserved keys.
- **Form-level indexes must be created AND built** via a background job before any `submissions-search` Operation against them will work. Kapp-level indexes do not satisfy `values[...]` queries.
- **`PATCH /submissions` does not fire webhooks.** Never use it for `families` unless deliberately skipping sync.
- **WebAPI caller identity is `@requested_by['username']`.** Never accept a username as a client parameter for authorization.
- **Read the relevant `ai-skills/skills/**/SKILL.md` before each platform task.** Do not guess at platform APIs.

### UX requirements (apply to every page)

The user's explicit priority: **the UI must be intuitive for all four user types** — sponsor, nominator, admin, and a first-time visitor who is none of these.

- Every page states **what this is and what to do next** in plain language before any control.
- **Never show a control the user cannot use.** Gate by role, don't disable-and-explain.
- **Empty states are instructional**, never a bare "No results."
- **Every destructive or committing action confirms**, and the confirmation names the specific thing ("Sponsor Family 14?" not "Are you sure?").
- **Every async action shows progress and a definite outcome** — never a silent success.
- **Errors say what happened and what to do**, in the user's terms. "Family 14 was just sponsored by someone else — here are others" not "409 Conflict".
- **Mobile works.** Sponsors will browse on phones. Tables become cards below `md`.

---

## File Structure

**Platform (via MCP, no repo files):** `christmas-alive-sponsorships`, `christmas-alive-claims`, extended `christmas-alive-family-nomination`, extended `families`, extended `programs`, two teams, two Operations, two WebAPIs, three workflows.

**Portal:**

```
portal/src/pages/christmas-alive/
  index.jsx                    ChristmasAliveRouting — subtree + role gating
  ChristmasAliveLayout.jsx     bronze page shell (NOT the header)
  Landing.jsx                  three cards by access
  browse/
    BrowseFamilies.jsx         sponsor-facing list
    FamilyCard.jsx             one anonymized family
    BrowseFilters.jsx          county/city/language/size
    SponsorConfirmModal.jsx    confirm -> claim -> success modal
  my-sponsorships/
    MySponsorships.jsx
  packet/
    FamilyPacket.jsx           print-styled, live data
    Responsibilities.jsx       print-styled static content
  nominate/
    NominateFamily.jsx         CoreForm wrapper
  approvals/
    Approvals.jsx              tabs + table
    ApprovalRow.jsx
    DuplicateCheck.jsx         likely-duplicate surfacing
    ReleaseReassignModal.jsx
    ExportButton.jsx           CSV
  hooks/
    useChristmasAlive.js       season config + role helpers
    useSponsorships.js         browse + my-sponsorships data
    useApprovals.js            admin data + mutations

portal/src/components/family-roster/
  FamilyRoster.jsx             the React component
  familyRoster.widget.js       registerWidget() wrapper

portal/src/helpers/christmasAlive.js   shared: status constants, count derivation
email-templates/build.js               four new templates
frontend-testing/christmas-alive/      test suites
```

---

# Phase 1 — Platform foundation

### Task 1: Audit existing nomination workflows and add season config

Resolves the one remaining spike before anything touches the live nomination form.

**Files:**
- Modify: `docs/platform-config.md` (document findings)
- Platform: `programs` datastore, `christmas-alive-family-nomination` workflows

**Interfaces:**
- Produces: `programs` record for Christmas Alive carries `Active From`, `Active To`, `Current Season` — every later task reads `Current Season` from here.

- [ ] **Step 1: Read the workflow skill**

Read `ai-skills/skills/concepts/workflow-creation/SKILL.md` and `ai-skills/skills/concepts/workflow-engine/SKILL.md`.

- [ ] **Step 2: Export both existing nomination workflows**

Use the MCP `workflows` tool against form `christmas-alive-family-nomination` in kapp `service-portal`. Retrieve "Nomination Process" (Submission Submitted) and "On Update" (Submission Updated).

- [ ] **Step 3: Record what they do**

Write findings into `docs/platform-config.md` under the Christmas Alive workflow entries, replacing the currently-empty flow descriptions. Answer explicitly: does either create a `families` record? Does either send email? Are they stubs?

**Decision gate:** if "Nomination Process" already creates a family record, Task 11 must replace it rather than add alongside it, or every nomination will produce two families.

- [ ] **Step 4: Add season fields to `programs`**

Add three fields to the `programs` datastore form: `Active From` (date), `Active To` (date), `Current Season` (text). Remember the field-key and null-property rules in Global Constraints.

- [ ] **Step 5: Populate the Christmas Alive program record**

Set `Active From` = `2026-09-01`, `Active To` = `2026-12-31`, `Current Season` = `2026`.

- [ ] **Step 6: Commit**

```bash
git add docs/platform-config.md
git commit -m "docs(platform): document Christmas Alive nomination workflows and season config"
```

---

### Task 2: Create the `christmas-alive-sponsorships` datastore

**Files:**
- Platform: new datastore form
- Modify: `docs/platform-config.md`

**Interfaces:**
- Produces: form slug `christmas-alive-sponsorships` with the field set below. Tasks 7–13 and every portal page read or write it.

- [ ] **Step 1: Read the API and indexing skills**

Read `ai-skills/skills/concepts/api-basics/SKILL.md` and `ai-skills/skills/concepts/kql-and-indexing/SKILL.md`.

- [ ] **Step 2: Create the datastore form**

Slug `christmas-alive-sponsorships`, type Datastore, status Active. Fields:

| Field | Type | Notes |
|---|---|---|
| Family ID | text | → `families` submission id; empty until approval |
| Nomination ID | text | → nomination submission id |
| Season | text | e.g. `2026` |
| Family Number | text | e.g. `14`; empty until approval |
| Status | text | Pending / Approved / Rejected / Adopted |
| Rejection Reason | text | |
| Duplicate Of | text | sponsorship id this duplicates |
| Sponsor Username | text | |
| Sponsor Email | text | |
| Claimed At | text | ISO 8601 |
| Released At | text | ISO 8601 |
| Release Notes | text | |
| Packet Sent At | text | ISO 8601; email idempotency guard |
| Photo Requested | text | Yes / No |
| Support Currently Receiving | text | JSON array |
| City | text | snapshot |
| County | text | snapshot |
| Native Language | text | snapshot |
| Total Members | text | snapshot, derived |
| Total Adults | text | snapshot, derived |
| Total Children | text | snapshot, derived |

Security: Display / Access / Modification = SWAT Leadership **and** Christmas Alive Admins (created in Task 5 — set this to admins-only initially and revisit after Task 5).

- [ ] **Step 3: Add index definitions**

Add to `indexDefinitions`: `values[Family ID]`, `values[Season]`, `values[Status]`, `values[Sponsor Username]`, and a compound `values[Season]+values[Status]`. All `unique: false`.

- [ ] **Step 4: Build every index**

POST a `Build Index` background job per index. Poll until each reports `Completed`. **An unbuilt index makes the Task 7 Operations return 400 forever.**

- [ ] **Step 5: Verify**

Run a `submissions-search` against the form with `q: values[Season]="2026" AND values[Status]="Pending"`. Expect an empty result set, not a 400.

- [ ] **Step 6: Document and commit**

```bash
git add docs/platform-config.md
git commit -m "feat(platform): add christmas-alive-sponsorships datastore"
```

---

### Task 3: Create the `christmas-alive-claims` datastore with the unique lock

The unique index here is the entire concurrency guarantee for sponsoring.

**Files:**
- Platform: new datastore form
- Modify: `docs/platform-config.md`

**Interfaces:**
- Produces: form slug `christmas-alive-claims`; Task 8's WebAPI creates a row here and relies on the unique constraint to reject the loser of a race.

- [ ] **Step 1: Create the datastore form**

Slug `christmas-alive-claims`, type Datastore, status Active. Fields: `Sponsorship ID` (text), `Sponsor Username` (text), `Claimed At` (text). Security: Display/Access/Modification = Christmas Alive Admins only — the WebAPI writes it as the system agent.

- [ ] **Step 2: Add the UNIQUE index**

`indexDefinitions`: `{name: "values[Sponsorship ID]", parts: [{path: "values[Sponsorship ID]"}], unique: true}`.

- [ ] **Step 3: Build the index and wait for Completed**

- [ ] **Step 4: Prove the constraint actually rejects duplicates**

Create a submission with `Sponsorship ID = "TEST-LOCK-1"`. Create a second with the same value. **Expect the second to fail.** If it succeeds, STOP — the claim design does not hold and the spec's resolved spike was wrong. Delete both test rows afterward.

- [ ] **Step 5: Document and commit**

```bash
git add docs/platform-config.md
git commit -m "feat(platform): add christmas-alive-claims datastore with unique claim lock"
```

---

### Task 4: Extend `families` for the roster

**Files:**
- Platform: `families` datastore
- Modify: `docs/platform-config.md`

**Interfaces:**
- Produces: `families` carries `Family Members JSON` (roster array) and `Test Fixture` (boolean-as-text). Tasks 10, 12, and the packet all read the roster from here.

- [ ] **Step 1: Add two fields**

`Family Members JSON` (text) and `Test Fixture` (text, `true`/empty).

Roster element shape — this exact shape is consumed by Task 8's sync workflow, Task 15's `FamilyRoster` component, and Task 21's packet page:

```json
[
  {
    "id": "m1",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "age": 9,
    "gender": "Female",
    "type": "Child",
    "shirtSize": "M",
    "shoeSize": "3"
  }
]
```

`type` is one of `Head of Household`, `Spouse`, `Child`, `Adult`. `age` is a number. `shirtSize` and `shoeSize` are optional strings.

- [ ] **Step 2: Widen security**

Change Display / Access / Modification from SWAT-Leadership-only to also allow Christmas Alive Admins. Do this only after Task 5 creates the team.

- [ ] **Step 3: Add index on `values[Test Fixture]`**

Needed so the Task 12 duplicate matcher can exclude fixtures. Create and build it.

- [ ] **Step 4: Verify no SWAT regression**

Load a SWAT project detail page that renders a family (`/project-captains/:id/details`) and confirm `Family - Retrieve By ID` still returns and renders. The added fields must not break the existing integration's output mapping.

- [ ] **Step 5: Document and commit**

```bash
git add docs/platform-config.md
git commit -m "feat(platform): add roster and fixture fields to families"
```

---

### Task 5: Teams and security policies

**Files:**
- Platform: teams, kapp security policies
- Modify: `docs/platform-config.md`

**Interfaces:**
- Produces: teams `Christmas Alive Admins` and populated `Christmas Alive Nominators`; kapp policies `Christmas Alive Admins` and `Christmas Alive Nominators or Admins`. Every later security binding references these by name.

- [ ] **Step 1: Read the security skill**

Read `ai-skills/skills/concepts/security-policies/SKILL.md` and `ai-skills/skills/concepts/users-and-teams/SKILL.md`.

- [ ] **Step 2: Create `Christmas Alive Admins`**

Members: `juddz@waterboyz.org`, `duanec@waterboyz.org`, `[redacted]`, `paulf@waterboyz.org`. Users who do not yet exist must be created first.

- [ ] **Step 3: Populate `Christmas Alive Nominators`**

From the requirements PDF: `sjackson@afh88.org`, `spresnell@cityouthmatrix.com`, `aje@ibelieveinme.com`, `loveforlochlin@gmail.com`, `director@mtairynet.org`, `jackie@onourownfrederick.org`, `Hillary@solidgroundrecoverymd.com`, plus the table leaders: `childrensministry@damascus.com`, `lspattison@comcast.net`, `lorne.merriett@gmail.com`, `uddermanrichard@gmail.com`, `kyarah@msn.com`, `handy_duane@yahoo.com`, `brittany@stccfrederick.com`.

**Note:** the PDF lists two organizations (New Dimension Worship Center, Restoration Church) with a phone number but no email. Flag these to the user rather than inventing addresses.

- [ ] **Step 4: Create two kapp security policies**

```
Christmas Alive Admins:
  hasIntersection(identity('teams'), ['Christmas Alive Admins'])

Christmas Alive Nominators or Admins:
  hasIntersection(identity('teams'), ['Christmas Alive Nominators','Christmas Alive Admins'])
```

- [ ] **Step 5: Apply to the datastores from Tasks 2–4**

- [ ] **Step 6: Document and commit**

```bash
git add docs/platform-config.md
git commit -m "feat(platform): add Christmas Alive teams and security policies"
```

---

# Phase 2 — Server-side logic

### Task 6: Nomination → sponsorship row workflow

Every nomination gets a season row immediately, so the admin export is uniform across all four statuses.

**Files:**
- Platform: workflow on `christmas-alive-family-nomination`, Submission Submitted

**Interfaces:**
- Consumes: `programs.Current Season` (Task 1), `christmas-alive-sponsorships` (Task 2)
- Produces: a `Pending` sponsorship row per nomination, with `Nomination ID` set

- [ ] **Step 1: Read the workflow XML skill**

Read `ai-skills/skills/concepts/workflow-xml/SKILL.md`. Note: dead-end branches use `utilities_noop_v1`, never `system_tree_return_v1`.

- [ ] **Step 2: Build the tree**

Retrieve `Current Season` from `programs` → create a `christmas-alive-sponsorships` submission with:
- `Nomination ID` = the triggering submission id
- `Season` = current season
- `Status` = `Pending`
- `City`, `County`, `Native Language` copied **from the nomination** (no family record exists yet)
- `Total Members` / `Total Adults` / `Total Children` derived from the nomination's `Family Members JSON` using **child = age ≤ 18**
- `Support Currently Receiving` copied from the nomination's existing **`Support Received`** field. The two names differ — the nomination form has had `Support Received` since before this project, and renaming a live field would orphan existing submissions. Map, don't rename.
- `Photo Requested` copied from the nomination

- [ ] **Step 3: Guard against double-creation**

Before creating, search for an existing sponsorship row with this `Nomination ID`. If one exists, no-op. Resubmission must not produce two rows.

- [ ] **Step 4: Test**

Submit a nomination through the live form with fixture data (`Test Fixture` marker, season `TEST-<runid>`). Confirm exactly one `Pending` row appears with correct derived counts. Delete the fixtures.

- [ ] **Step 5: Commit**

```bash
git add docs/platform-config.md
git commit -m "feat(workflow): create sponsorship row on Christmas Alive nomination"
```

---

### Task 7: Approval workflow — family resolution, numbering, snapshot

**Files:**
- Platform: workflow triggered by the admin approve action

**Interfaces:**
- Consumes: `families` (Task 4), `christmas-alive-sponsorships` (Task 2)
- Produces: on approval, sponsorship row has `Family ID`, `Family Number`, `Status = Approved`, and a fresh snapshot

- [ ] **Step 1: Build the approve path**

1. If the admin selected an existing family (dedupe match), use that `Family ID`. Otherwise create a `families` record from the nomination, writing `Family Members JSON` from the nomination roster.
2. Allocate `Family Number`: query the max `Family Number` among sponsorship rows for this `Season`, add 1. Numbers start at 1.
3. Write `Family ID`, `Family Number`, `Status = Approved`, and refresh `City` / `County` / `Native Language` / the three counts **from the family record**.

- [ ] **Step 2: Guard**

Only act when the row's current `Status` is `Pending`. A second approve must no-op, not allocate a second number.

- [ ] **Step 3: Build the reject path**

Set `Status = Rejected`, `Rejection Reason`, and `Duplicate Of` when rejecting as a duplicate. Do **not** create a `families` record.

- [ ] **Step 4: Test numbering under concurrent approval**

Approve two fixture nominations simultaneously. Assert two distinct, sequential numbers — never a duplicate.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(workflow): Christmas Alive approval, numbering, and snapshot"
```

---

### Task 8: `families` → sponsorship sync workflow

**Files:**
- Platform: workflow on `families`, Submission Updated

**Interfaces:**
- Consumes: `families.Family Members JSON`, `programs.Current Season`
- Produces: current-season sponsorship rows stay fresh

- [ ] **Step 1: Build the tree**

On `families` update: find sponsorship rows with this `Family ID` **and `Season == Current Season`**. For each, parse `Family Members JSON`, derive the three counts (child = age ≤ 18), and write them plus `City`, `County`, `Native Language`.

- [ ] **Step 2: Enforce the invariant**

This workflow writes **only** to `christmas-alive-sponsorships`. It must never write back to `families` — that is an infinite loop.

- [ ] **Step 3: Test the season filter**

Create fixture sponsorship rows in the current season and in a past season for the same family. Edit the family. Assert the current-season row updated and the past-season row did **not**.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(workflow): sync families changes to current-season sponsorships"
```

---

### Task 9: Read Operations

**Files:**
- Platform: two kapp-level Operations on connection `1415539c-bb98-48bb-ad33-11be25189ad0`

**Interfaces:**
- Produces:
  - `CA - Available Families` — params: `Season`. Returns `Items[]` of `{sponsorshipId, familyNumber, totalMembers, totalAdults, totalChildren, nativeLanguage, city, county}`. **No names, street, or phone.**
  - `CA - My Sponsorships` — param `Season`; `Sponsor Username` **bound server-side**. Returns the same shape plus `claimedAt` and `status`.

- [ ] **Step 1: Read the integrations skill**

Read `ai-skills/skills/concepts/integrations/SKILL.md`, especially Operation Outputs and the `submissions-search` index requirement.

- [ ] **Step 2: Create `CA - Available Families`**

`submissions-search` against `christmas-alive-sponsorships` with `q: values[Season]="{{Season}}" AND values[Status]="Approved"`. Output mapping projects **only** the eight fields above. Expose at kapp level with the `Authenticated Users` policy.

- [ ] **Step 3: Verify the projection leaks nothing**

Call it and inspect the raw response. If any name, street address, or phone appears, the output mapping is wrong. This is the PII boundary.

- [ ] **Step 4: Create `CA - My Sponsorships`**

Same store, `q: values[Season]="{{Season}}" AND values[Sponsor Username]="{{Sponsor Username}}"`, with `Sponsor Username` bound server-side so the caller cannot override it.

- [ ] **Step 5: Verify identity cannot be spoofed**

Call it while passing an explicit `Sponsor Username` parameter for a different user. Assert the response still reflects the **caller**, not the supplied value.

- [ ] **Step 6: Commit**

```bash
git add docs/platform-config.md
git commit -m "feat(platform): add Christmas Alive read operations"
```

---

### Task 10: Claim WebAPI

**Files:**
- Platform: kapp-level WebAPI + bound workflow tree

**Interfaces:**
- Produces: `POST /app/api/v1/kapps/service-portal/webApis/christmas-alive-claim` with body `{"sponsorshipId": "<id>"}`. Returns `{"ok": true, "sponsorshipId": "...", "familyNumber": "14"}` or `{"ok": false, "reason": "ALREADY_CLAIMED" | "NOT_AVAILABLE" | "SEASON_CLOSED"}`.

- [ ] **Step 1: Read the WebAPI skill**

Read `ai-skills/skills/concepts/webapis-and-webhooks/SKILL.md`, especially "WebAPI Return Node Configuration (Critical)".

- [ ] **Step 2: Build the tree**

1. `username = @requested_by['username']` — **never** from the request body
2. Retrieve the sponsorship row
3. If `Season != Current Season` → return `SEASON_CLOSED`
4. If `Status != "Approved"` → return `NOT_AVAILABLE`
5. **Create the `christmas-alive-claims` row** with `Sponsorship ID`. If it fails on the unique constraint → return `ALREADY_CLAIMED`
6. Only on success: update sponsorship to `Status = Adopted`, `Sponsor Username`, `Sponsor Email` (looked up from the user record), `Claimed At`
7. Return `ok: true` with the family number

- [ ] **Step 3: Order matters**

The claim record must be created **before** the sponsorship update. Reversing them reintroduces the race the unique index exists to prevent.

- [ ] **Step 4: Test the race for real**

Fire two simultaneous requests for the same fixture sponsorship. Assert exactly one `ok: true` and one `ALREADY_CLAIMED`, and that the sponsorship has exactly one sponsor.

- [ ] **Step 5: Commit**

```bash
git add docs/platform-config.md
git commit -m "feat(platform): add Christmas Alive claim WebAPI with unique-index lock"
```

---

### Task 11: Family Packet WebAPI

**Files:**
- Platform: kapp-level WebAPI + bound workflow tree

**Interfaces:**
- Produces: `POST .../webApis/christmas-alive-packet` with `{"sponsorshipId": "<id>"}`. Returns the full family packet, or `{"ok": false, "reason": "NOT_AUTHORIZED"}`.

- [ ] **Step 1: Build the authorization check**

1. `username = @requested_by['username']`
2. Retrieve the sponsorship row
3. Authorized if `Sponsor Username == username` **OR** the caller is in `Christmas Alive Admins`
4. If not authorized → return `NOT_AUTHORIZED` and **no family data whatsoever**
5. Only then retrieve `families` and return: family number, head-of-household name, email, phone, full address, native language, interpreter flag, photo-requested flag, support-receiving list, and the full parsed roster

- [ ] **Step 2: Test the authorization boundary**

Call it as a logged-in user who is not the sponsor and not an admin. Assert `NOT_AUTHORIZED` and that the response body contains no family data at all. **This is the single most important security test in the build.**

- [ ] **Step 3: Commit**

```bash
git add docs/platform-config.md
git commit -m "feat(platform): add Christmas Alive family packet WebAPI"
```

---

# Phase 3 — Portal foundation

### Task 12: Shared helpers and the season/role hook

**Files:**
- Create: `portal/src/helpers/christmasAlive.js`
- Create: `portal/src/pages/christmas-alive/hooks/useChristmasAlive.js`
- Test: `frontend-testing/christmas-alive/helpers.spec.js`

**Interfaces:**
- Produces:
  - `CA_STATUS = { PENDING, APPROVED, REJECTED, ADOPTED }`
  - `deriveCounts(roster) -> { totalMembers, totalAdults, totalChildren }`
  - `parseRoster(json) -> Array` (never throws; returns `[]` on bad input)
  - `useChristmasAlive() -> { season, inSeason, isCANominator, isCAAdmin, loading }`

- [ ] **Step 1: Write the failing test**

```js
import { deriveCounts, parseRoster } from '../../portal/src/helpers/christmasAlive.js';

test('child is age 18 or younger', () => {
  const roster = [
    { age: 18, type: 'Child' },
    { age: 19, type: 'Adult' },
    { age: 4, type: 'Child' },
  ];
  expect(deriveCounts(roster)).toEqual({
    totalMembers: 3, totalAdults: 1, totalChildren: 2,
  });
});

test('parseRoster tolerates garbage', () => {
  expect(parseRoster(null)).toEqual([]);
  expect(parseRoster('not json')).toEqual([]);
  expect(parseRoster('{"a":1}')).toEqual([]);
  expect(parseRoster('[{"age":5}]')).toEqual([{ age: 5 }]);
});
```

- [ ] **Step 2: Run it and watch it fail**

- [ ] **Step 3: Implement `christmasAlive.js`**

```js
export const CA_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ADOPTED: 'Adopted',
};

export const CHILD_MAX_AGE = 18;

export const parseRoster = json => {
  if (!json) return [];
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const deriveCounts = roster => {
  const members = Array.isArray(roster) ? roster : [];
  const totalChildren = members.filter(
    m => Number(m?.age) <= CHILD_MAX_AGE,
  ).length;
  return {
    totalMembers: members.length,
    totalAdults: members.length - totalChildren,
    totalChildren,
  };
};
```

- [ ] **Step 4: Run tests, confirm pass**

- [ ] **Step 5: Implement `useChristmasAlive.js`**

Reads the Christmas Alive `programs` record (reuse the `searchSubmissions` pattern from `HomeNominator.jsx`) for `Current Season`, `Active From`, `Active To`. `inSeason` is true when today falls in the window. Extends the `useRoles()` pattern in `portal/src/helpers/hooks/useRoles.js` with `isCANominator` and `isCAAdmin` from team memberships `Christmas Alive Nominators` / `Christmas Alive Admins`.

- [ ] **Step 6: Commit**

```bash
git add portal/src/helpers/christmasAlive.js portal/src/pages/christmas-alive/hooks/useChristmasAlive.js frontend-testing/christmas-alive/helpers.spec.js
git commit -m "feat(christmas-alive): add shared helpers and season/role hook"
```

---

### Task 13: Route subtree, bronze layout, and landing page

**UX is the point of this task.** The landing page is where all four user types arrive and must immediately understand what they can do.

**Files:**
- Create: `portal/src/pages/christmas-alive/index.jsx`, `ChristmasAliveLayout.jsx`, `Landing.jsx`
- Modify: `portal/src/pages/PrivateRoutes.jsx` (add the lazy route)

**Interfaces:**
- Consumes: `useChristmasAlive()` (Task 12)
- Produces: `ChristmasAliveRouting` mounted at `/christmas-alive/*`

- [ ] **Step 1: Add the lazy import and route**

In `PrivateRoutes.jsx`, alongside the other lazy chunks:

```jsx
const ChristmasAliveRouting = lazy(() =>
  import('./christmas-alive/index.jsx').then(m => ({ default: m.ChristmasAliveRouting })),
);
```

And in the inner `<Routes>`, before the catch-all:

```jsx
<Route path="/christmas-alive/*" element={<ChristmasAliveRouting />} />
```

- [ ] **Step 2: Build `ChristmasAliveLayout.jsx`**

A bronze-accented page shell — **not** a header replacement. Uses the existing `accent` token. Renders a program banner (Christmas Alive wordmark + season year), then `children` inside the standard `gutter` class. The global `<Header />` and `<SiteFooter />` still come from `PrivateRoutes`.

- [ ] **Step 3: Build `Landing.jsx` with role-filtered cards**

Three cards, each showing **only** if the user can use it:

| Card | Shown to | Copy |
|---|---|---|
| Sponsor a Family | everyone | "Choose a family and provide their Christmas. You'll get their details and a shopping guide by email." |
| Nominate a Family | `isCANominator \|\| isCAAdmin` | "Recommend a family in your community to receive Christmas gifts." |
| Nomination Approval | `isCAAdmin` | "Review nominations, catch duplicates, and approve families for sponsorship." |

Below the cards, if the user already has sponsorships, a link to My Sponsorships showing the count.

**Never render a disabled card.** A sponsor who is not a nominator sees one card and no hint that others exist.

- [ ] **Step 4: Handle out-of-season**

If `!inSeason`, the landing page still works for admins (they run the pipeline year-round) but sponsors see: "Christmas Alive sponsorship opens in September. Check back then." — not an empty page.

- [ ] **Step 5: Verify on mobile**

Cards stack below `md`. Run `cd portal && yarn start` and check at 375px width.

- [ ] **Step 6: Commit**

```bash
git add portal/src/pages/christmas-alive portal/src/pages/PrivateRoutes.jsx
git commit -m "feat(christmas-alive): add route subtree, bronze layout, and landing page"
```

---

### Task 14: Seasonal home page button

**Files:**
- Modify: `portal/src/pages/home/HomeNominator.jsx` or the relevant home section

**Interfaces:**
- Consumes: `useChristmasAlive().inSeason`

- [ ] **Step 1: Add the seasonal entry point**

When `inSeason`, render a prominent Christmas Alive button on the home page linking to `/christmas-alive`. Use the `accent` token so it reads as a different program at a glance.

- [ ] **Step 2: Keep the existing nomination card behavior intact**

`HomeNominator.jsx` already renders a Christmas Alive **nomination** card from the `programs` datastore. The new button is the **portal** entry point and is distinct. Verify both do not appear as confusing duplicates — if they do, the nomination card should link into `/christmas-alive/nominate` rather than straight to the form.

- [ ] **Step 3: Verify out-of-season hides it**

Temporarily set `Active To` to yesterday, reload, confirm the button disappears. Restore.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(christmas-alive): add seasonal home page entry point"
```

---

### Task 15: `FamilyRoster` component and widget wrapper

The single most UX-critical component in the build — admins enter 250 families through it.

**Files:**
- Create: `portal/src/components/family-roster/FamilyRoster.jsx`
- Create: `portal/src/components/family-roster/familyRoster.widget.js`
- Modify: `portal/src/components/kinetic-form/widgets/widgets.js` (register)
- Test: `frontend-testing/christmas-alive/family-roster.spec.js`

**Interfaces:**
- Consumes: `parseRoster`, `deriveCounts` (Task 12)
- Produces: `<FamilyRoster value={jsonString} onChange={fn} />`; widget `bundle.widgets.FamilyRoster({container, config, id})` with API `getRoster()`, `setRoster(arr)`, `destroy()`, `container()`

- [ ] **Step 1: Read the widget infrastructure**

Read `portal/src/components/kinetic-form/widgets/index.js` for `registerWidget`, `WidgetAPI`, `validateContainer`, `validateField`, and `categorypicker.js` as the closest working precedent (React component, JSON array in a bound field).

- [ ] **Step 2: Build `FamilyRoster.jsx`**

Requirements:
- A row per member: first name, last name, age, gender, type, shirt size, shoe size
- **Add member** button; per-row remove with confirmation only if the row has data
- `type` defaults intelligently: first row `Head of Household`, second `Spouse`, subsequent rows `Child` if age ≤ 18 else `Adult`
- **Live count summary**: "4 members — 2 adults, 2 children", derived locally via `deriveCounts` so it never lags
- Shirt/shoe size clearly marked **optional**
- Keyboard-first: tab order runs across a row then to the next; Enter on the last field adds a row
- Below `md`, rows become stacked cards, not a squeezed table
- Empty state: "No family members added yet. Add the head of household first."

- [ ] **Step 3: Write the component test**

Cover: adding a row, removing a row, the count updating live, `onChange` emitting valid JSON matching the Task 4 shape, and bad incoming JSON rendering as empty rather than crashing.

- [ ] **Step 4: Build the widget wrapper**

Mirror `categorypicker.js`: factory validates container and field, calls `registerWidget()`, syncs the JSON string to the bound Kinetic field on change.

- [ ] **Step 5: Register in `widgets.js`**

- [ ] **Step 6: Commit**

```bash
git add portal/src/components/family-roster portal/src/components/kinetic-form/widgets/widgets.js frontend-testing/christmas-alive/family-roster.spec.js
git commit -m "feat(christmas-alive): add FamilyRoster component and widget"
```

---

# Phase 4 — The three core pages

### Task 16: Nominate a Family

**Files:**
- Create: `portal/src/pages/christmas-alive/nominate/NominateFamily.jsx`
- Platform: extend `christmas-alive-family-nomination` fields and mount the widget
- Modify: `portal/src/pages/christmas-alive/index.jsx` (route)

**Interfaces:**
- Consumes: `FamilyRoster` widget (Task 15), `useChristmasAlive` (Task 12)

- [ ] **Step 1: Extend the nomination form**

Add: `Head of Household Gender`, `Spouse First Name`, `Spouse Last Name`, `Spouse Gender`, `Photo Requested`, `Address Line 1`, `Address Line 2`, `City`, `State`, `Zip`, `Nominator First Name`, `Nominator Last Name`, `Nominator Organization`, `Nominator Phone`, `Nominator Email`.

**The existing single `Address` field is lossy against `families`.** Keep it present but hidden so historical submissions still render; new submissions write the split fields.

- [ ] **Step 2: Mount `FamilyRoster` on `Family Members JSON`**

In the form's event code, following the `CategoryPicker` usage pattern documented in `CLAUDE.md`.

- [ ] **Step 3: Build the page wrapper**

`NominateFamily.jsx` renders the form via the existing `KineticForm`/`CoreForm` pattern (see `portal/src/pages/forms/Form.jsx`) inside `ChristmasAliveLayout`. Above the form, one sentence: "Recommend a family in your community to receive Christmas gifts. A Christmas Alive admin will review your nomination."

- [ ] **Step 4: Prefill nominator fields from the profile**

- [ ] **Step 5: Gate the route**

`isCANominator || isCAAdmin`; anyone else redirects to `/christmas-alive`.

- [ ] **Step 6: Confirm end-to-end**

Submit a fixture nomination. Confirm Task 6's workflow created exactly one `Pending` sponsorship row with correct counts. Delete fixtures.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(christmas-alive): add nomination page and extend the nomination form"
```

---

### Task 17: Nomination Approval page

**Files:**
- Create: `portal/src/pages/christmas-alive/approvals/Approvals.jsx`, `ApprovalRow.jsx`, `DuplicateCheck.jsx`, `ReleaseReassignModal.jsx`, `ExportButton.jsx`
- Create: `portal/src/pages/christmas-alive/hooks/useApprovals.js`

**Interfaces:**
- Consumes: `christmas-alive-sponsorships` and `families` via `searchSubmissions` (admins have direct access)
- Produces: `useApprovals() -> { rows, loading, approve, reject, release, reassign, reload }`

- [ ] **Step 1: Build `useApprovals.js`**

Fetch all current-season sponsorship rows plus the families they reference (two queries, joined client-side — never N+1). Expose the four mutations, each calling `reload()` on success.

- [ ] **Step 2: Build the tabbed table**

Tabs `Pending` / `Approved` / `Rejected` / `Adopted` with live counts in each tab label. Columns match the export exactly, so the screen and the download agree: Family ID, Status, head-of-household first/last/email/phone, street, city, state, zip, members, adults, children.

Below `md`, rows become cards.

- [ ] **Step 3: Build `DuplicateCheck.jsx`**

On opening a `Pending` row, search `families` for likely matches on last name, address, or phone — **excluding records where `Test Fixture` is set**. Show matches with a "Reject as duplicate of Family N" action and a "Not a duplicate — approve as new" action.

If there are no matches, say so explicitly: "No likely duplicates found." Silence would read as a broken feature.

- [ ] **Step 4: Wire approve and reject**

Approve calls the Task 7 workflow path. Reject requires a reason before the button enables. Both confirm by name: "Approve the Martinez family as Family 15?"

- [ ] **Step 5: Build `ReleaseReassignModal.jsx`**

On `Adopted` rows only. Release returns the family to the pool (clears sponsor and `Packet Sent At`, deletes the claim record, stamps `Released At` and `Release Notes`). Reassign does the same and sets a new sponsor. Both confirm and both state the consequence: "Family 14 will return to the sponsor list and Jane Smith will be notified."

- [ ] **Step 6: Build `ExportButton.jsx`**

CSV of the current tab, or all. Columns exactly as the spec: Family ID, Status, House Head First Name, House Head Last Name, House Head Email, House Head Phone, Street, City, State, Zip, Number of Members, Adults, Children. Filename `christmas-alive-<season>-<tab>-<yyyy-mm-dd>.csv`.

- [ ] **Step 7: Gate the route to `isCAAdmin`**

- [ ] **Step 8: Commit**

```bash
git commit -m "feat(christmas-alive): add nomination approval page with dedupe and export"
```

---

### Task 18: Sponsor a Family — browse

**Files:**
- Create: `portal/src/pages/christmas-alive/browse/BrowseFamilies.jsx`, `FamilyCard.jsx`, `BrowseFilters.jsx`
- Create: `portal/src/pages/christmas-alive/hooks/useSponsorships.js`

**Interfaces:**
- Consumes: `CA - Available Families` Operation (Task 9) via `executeIntegration` from `portal/src/helpers/api.js`
- Produces: `useSponsorships() -> { families, loading, error, reload }`

- [ ] **Step 1: Build the data hook**

Call the Operation with the current season. **Never** call `searchSubmissions` against `christmas-alive-sponsorships` here — sponsors have no access to it, and going direct would be the PII leak the Operation exists to prevent.

- [ ] **Step 2: Build `FamilyCard.jsx`**

Shows exactly the seven spec'd fields: Family number (prominent — it's their identifier), total in family, adults, children, language, city, county. A clear **Sponsor this family** button.

Make the household composition scannable at a glance — "Family 14 · 5 people · 2 adults, 3 children" reads faster than a field grid.

- [ ] **Step 3: Build `BrowseFilters.jsx`**

Filter by county, city, language, and family size. Each filter shows result counts. A "Clear filters" control appears only when filters are active.

- [ ] **Step 4: Empty and error states**

- No families at all: "All families have been sponsored — thank you! Check back as new nominations are approved."
- No families matching filters: "No families match these filters" + a clear-filters button.
- Operation error: a real message and a retry button, never a blank page.

- [ ] **Step 5: Mobile**

Cards in a single column below `md`; filters collapse into a disclosure.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(christmas-alive): add sponsor browse page with filters"
```

---

### Task 19: The claim flow and confirmation modal

**Files:**
- Create: `portal/src/pages/christmas-alive/browse/SponsorConfirmModal.jsx`
- Modify: `portal/src/pages/christmas-alive/hooks/useSponsorships.js` (add `claim`)

**Interfaces:**
- Consumes: the claim WebAPI (Task 10)
- Produces: `claim(sponsorshipId) -> { ok, familyNumber } | { ok: false, reason }`

- [ ] **Step 1: Build the confirm step**

Names the family and states the commitment before the user commits: "Sponsor Family 14? You'll be providing Christmas gifts for 3 children and 2 adults. We'll email you their details and a shopping guide."

- [ ] **Step 2: Build the success state**

Per the requirements: a message that an email has been sent with further instructions, links to view the family packet and the sponsor responsibilities, and two buttons — **Sponsor another family** and **Close**.

- [ ] **Step 3: Handle every failure by name**

| Reason | Message |
|---|---|
| `ALREADY_CLAIMED` | "Family 14 was just sponsored by someone else. Here are other families who still need one." + refresh the list |
| `NOT_AVAILABLE` | "Family 14 is no longer available." + refresh |
| `SEASON_CLOSED` | "Christmas Alive sponsorship has closed for this season." |
| network / unknown | "Something went wrong — your card was not charged and no family was claimed. Try again." + retry |

`ALREADY_CLAIMED` must read as normal, not as an error. It will happen.

- [ ] **Step 4: Show progress**

The claim button enters a pending state and cannot be double-clicked. Double-submission must be impossible from the UI even though the server would reject it.

- [ ] **Step 5: Test the race from the UI**

Two browser sessions, same family, click together. Both must end in a coherent state.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(christmas-alive): add sponsor claim flow and confirmation modal"
```

---

### Task 20: My Sponsorships

**Files:**
- Create: `portal/src/pages/christmas-alive/my-sponsorships/MySponsorships.jsx`

**Interfaces:**
- Consumes: `CA - My Sponsorships` Operation (Task 9)

- [ ] **Step 1: Build the page**

One row per sponsored family: family number, household composition, claim date, and links to the packet and the responsibilities sheet.

- [ ] **Step 2: Empty state that leads somewhere**

"You haven't sponsored a family yet." + a button to browse families.

- [ ] **Step 3: State that the portal is authoritative**

A short line: "Your emailed details are a snapshot from when you sponsored. This page is always current — check here before you shop or deliver." This is the mitigation for a stale email carrying a corrected address.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(christmas-alive): add my sponsorships page"
```

---

### Task 21: Family packet and responsibilities pages

**Files:**
- Create: `portal/src/pages/christmas-alive/packet/FamilyPacket.jsx`, `Responsibilities.jsx`

**Interfaces:**
- Consumes: the packet WebAPI (Task 11)

- [ ] **Step 1: Build `FamilyPacket.jsx`**

Renders live from the WebAPI: family number prominently, head-of-household contact, full address, native language and interpreter flag, photo-requested flag, support-receiving list, and the full roster with ages, genders, and sizes.

Print-styled: a `@media print` block that drops navigation and chrome so browser Save-as-PDF produces a clean sheet. Include a visible **Print / Save as PDF** button — the docs promised sponsors a downloadable file, and this is how they get one.

- [ ] **Step 2: Handle `NOT_AUTHORIZED` gracefully**

"You don't have access to this family's details." No hint about whether the family exists.

- [ ] **Step 3: Build `Responsibilities.jsx`**

The Sponsor Responsibilities sheet as HTML, replacing the 2.3 MB JPEG. Content from `docs/christmas-alive/Sponsor Responsibilites - 2025.jpeg`: the commitment, the contact-three-times-then-escalate rule, the gift guidelines by age band, the Dec 6 portrait and Dec 13 pickup details, and the contact addresses. Print-styled the same way.

Season-specific dates should read from the `programs` record where practical so next year is an edit, not a code change.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(christmas-alive): add printable family packet and responsibilities pages"
```

---

### Task 22: Email templates and the packet-send workflow

**Files:**
- Modify: `email-templates/build.js`
- Platform: workflow on `christmas-alive-sponsorships` Submission Updated

**Interfaces:**
- Consumes: the `heading()`, `paragraph()`, `action()`, `note()`, `divider()`, `spacer()` helpers already in `build.js`

- [ ] **Step 1: Add four templates**

`christmas-alive-sponsor-packet`, `christmas-alive-nudge`, `christmas-alive-pickup-reminder`, `christmas-alive-reassigned`. Follow the existing template structure and brand config.

Packet contents: family number in large type; full family details and roster; a link to the live packet page with the "portal is current, this email is a snapshot" note; a link to the responsibilities page; the Dec 6 and Dec 13 dates; the escalation path.

- [ ] **Step 2: Preview each**

```bash
cd email-templates && node build.js --preview christmas-alive-sponsor-packet
```

- [ ] **Step 3: Build the send workflow**

Bound to `christmas-alive-sponsorships` Submission Updated. Guard: act only when `Status == Adopted` **and** `Packet Sent At` is empty. Send, then stamp `Packet Sent At`.

**The guard is load-bearing.** Stamping re-triggers this same workflow; the guard is what stops it. Removing it creates an infinite loop.

- [ ] **Step 4: Add the +7 day nudge**

A deferral in the same workflow: wait 7 days, then send `christmas-alive-nudge` if the sponsorship is still `Adopted`.

- [ ] **Step 5: Add the admin-triggered pickup reminder**

A button on the Approvals page that sends `christmas-alive-pickup-reminder` to every current sponsor. Show the recipient count and confirm before sending — this is a bulk outbound email and must not be a one-click accident.

- [ ] **Step 6: Add plaintext fallbacks to every template**

- [ ] **Step 7: Commit**

```bash
git add email-templates
git commit -m "feat(christmas-alive): add sponsor email templates and send workflow"
```

---

# Phase 5 — Verification

### Task 23: Test fixtures and teardown

**Must land before the suites in Task 24.** There is one environment and it is production.

**Files:**
- Create: `frontend-testing/christmas-alive/fixtures.js`

**Interfaces:**
- Produces: `seedFamily(opts) -> {familyId, sponsorshipId}`, `seedSponsorship(opts)`, `teardownAll(runId)`

- [ ] **Step 1: Implement seeding under an isolated season**

Every fixture uses `Season = "TEST-<runId>"`, which is never `Current Season`. This makes fixtures structurally incapable of appearing in the browse list, the export, or the sync workflow even if teardown fails.

- [ ] **Step 2: Mark every fixture family**

Set `Test Fixture = "true"` and use a reserved surname prefix (`ZZTEST-`). The Task 17 duplicate matcher already excludes flagged records.

- [ ] **Step 3: Implement teardown**

Delete by `Test Fixture` flag and `TEST-` season. Run it **on start as well as on finish**, so a crashed run cannot leak rows into the next one.

- [ ] **Step 4: Add the guardrails**

Assert no fixture helper can ever target a record it did not create, and that nothing writes `programs.Current Season` — that would move the live season for real users.

- [ ] **Step 5: Verify cleanliness**

Seed, tear down, then query for anything matching `ZZTEST-` or `TEST-`. Expect zero rows.

- [ ] **Step 6: Commit**

```bash
git add frontend-testing/christmas-alive/fixtures.js
git commit -m "test(christmas-alive): add isolated fixtures and teardown"
```

---

### Task 24: The suites

**Files:**
- Create: `frontend-testing/christmas-alive/claim-race.spec.js`, `authorization.spec.js`, `regression.spec.js`

- [ ] **Step 1: The claim race**

Genuinely concurrent requests against one fixture family. Assert exactly one success, exactly one `ALREADY_CLAIMED`, one sponsor on the record, and one claim row.

- [ ] **Step 2: Authorization, at the API**

- Packet WebAPI called by a non-sponsor non-admin → `NOT_AUTHORIZED`, no family data in the body
- Admin operations called by a non-admin → denied
- `CA - My Sponsorships` with a spoofed username parameter → returns the caller's data, not the spoofed user's
- `CA - Available Families` response contains no name, street, or phone

- [ ] **Step 3: Regression**

Count derivation at 18 and 19; sync after a roster edit; family numbering sequential and gapless under concurrent approval; release then re-claim; season rollover freezing; export columns; and the nominate → approve → sponsor → packet happy path.

- [ ] **Step 4: Commit**

```bash
git add frontend-testing/christmas-alive
git commit -m "test(christmas-alive): add race, authorization, and regression suites"
```

---

# Deferred — requires explicit sign-off

Not tasks. Do not execute without the user saying so.

- Delete the `family-members` datastore
- Delete the `Can Retrieve Family Member Details` kapp policy (has the `Christams` typo; exists to gate `family-members`)

Both are irreversible on a production space. Nothing in Tasks 1–24 depends on either.

---

# Addendum — discovered during Phase 3-4 (portal build)

Recorded 2026-09-04 while building the portal. These change the platform work
still outstanding; the tasks above are otherwise accurate.

### Two more WebAPIs are needed

Task 17 originally had the admin approve/reject/release actions writing the
submission directly. They can't: approval resolves or creates a family,
**allocates the next Family Number**, and writes the snapshot — multi-step, and
two admins approving at the same moment must not be able to allocate the same
number. That is the same reasoning that put the sponsor claim behind a WebAPI.

Add to Phase 2:

- **`christmas-alive-approve`** — body `{sponsorshipId, action: 'approve'|'reject', existingFamilyId?, reason?, duplicateOf?}`. Implements the Task 7 logic.
- **`christmas-alive-release`** — body `{sponsorshipId, action: 'release'|'reassign', username?, notes?}`. Implements the Task 17 Step 5 logic, including deleting the claim record so the unique index doesn't block the next sponsor.

The portal already calls both (`useApprovals.js`).

### WebAPIs need `?timeout` or they return a run id

`webapis-and-webhooks/SKILL.md:98` — by default a WebAPI call returns
`{"messageType":"success","message":"Initiated run #N","runId":"N"}`, **not** the
workflow's response. Without `?timeout=<seconds>` the sponsor would see
"Initiated run #N" instead of whether they won the race.

Handled portal-side in `executeWebApi` (`portal/src/helpers/api.js`), which
defaults to 20s and treats a bare `runId` as a `TIMEOUT` outcome rather than
reporting an unconfirmed success. WebAPIs are also served from
`/app/kapps/{kapp}/webApis/{slug}` — **not** the `/app/api/v1` base that
`bundle.apiLocation()` returns.

### Operation response shape

`useSponsorships.js` accepts both camelCase (`sponsorshipId`) and
Kinetic-style (`Sponsorship Id`) keys from the `Items` output mapping, so the
Task 9 operations can use either convention. Prefer camelCase.

### `Test Fixture` must reach the duplicate matcher

The matcher excludes rows flagged `isTestFixture`, which `useApprovals`
populates from `families.Test Fixture`. Task 4 must create that field or the
exclusion silently never fires.

### No unit test runner existed

The portal has no test dependency. Rather than adding one, the pure helpers are
tested with Node's built-in runner: `cd frontend-testing && yarn test:unit`.
Tasks 23-24 (Playwright, platform-dependent) remain outstanding.

### Lint baseline is already red

`yarn lint` uses `--max-warnings 0` and there are **5 pre-existing warnings**
in `volunteer-notifications/` and related files, so the command exits non-zero
on a clean checkout. All Christmas Alive files are clean; don't read a red lint
as this work's failure.

---

# Progress — 2026-09-04

**Done on the platform:**

- Task 1 — `programs` gained Active From / Active To / Current Season; Christmas Alive set to 2026-09-01 → 2026-12-31, season `2026`. Spike resolved (see spec).
- Task 2 — `christmas-alive-sponsorships` created, 21 fields, 12 indexes all Built, policies applied. A `Season + Status` query returns an empty set rather than 400, so the index genuinely serves it.
- Task 3 — `christmas-alive-claims` created with `values[Sponsorship ID]:UNIQUE` Built. **Lock proven empirically:** duplicate insert → HTTP 400, `errorKey: "uniqueness_violation"`, case-insensitive. That errorKey is what the claim WebAPI maps to `ALREADY_CLAIMED`.
- Task 5 — `Christmas Alive Admins` team created with Judd, Duane, Paul. Three kapp policies created: `Christmas Alive Admins`, `Christmas Alive Nominators or Admins`, `SWAT Leadership or Christmas Alive Admins`.

**Task 4 deliberately NOT done — read before attempting.**

Adding `Family Members JSON` and `Test Fixture` to `families` requires PUTting the whole `pages` array, and that array carries two large hand-written JavaScript blocks (~4,000 chars each, escaped) for the Family Members and Projects table widgets. There is no field-level partial update. Retyping them risks silently corrupting a working production form. Do this from a script that round-trips the export rather than by hand.

**Correction to the plan's premise:** `family-members` is **not** unused. The `families` form's own event code mounts the Table widget against the `Family Members - Retrieve` integration with add/edit/delete wired up. The earlier "unused" finding only covered `portal/src` and missed platform-side form JavaScript. There are **2 records** (one created by juddz@waterboyz.org on 2026-03-24).

That does not block deprecation, but it means Task 4 also has to replace that section's UI, and the 2 records need a decision. Both belong with the deferred deletions.

**Also outstanding for Task 5:** One nominator has no account, and none of the 14 nominators from the requirements PDF do. Creating users fires the space `User Created` workflow, which emails a welcome and password reset to a real person — held for explicit sign-off.

---

# Live-testing findings — 2026-09-05

Four bugs found by exercising the running app. All fixed.

### 1. `programs` has no index on `values[Program Name]`

`useChristmasAlive` queried it and got a 400, which the hook swallowed into
"no season configured" — silently hiding every Christmas Alive entry point.
Now queries `values[Status]="Active"` (the only value-level index on that form)
and filters client-side, mirroring `HomeNominator.jsx`. The hook also returns
`error` now, and the landing page surfaces it, so a failed lookup can never
again look identical to "out of season".

### 2. Prefilling a field that does not exist breaks CoreForm

`NominateFamily` prefilled `Nominator First Name` and four siblings. Those
fields don't exist on the form yet, and CoreForm fails to render rather than
ignoring them — the whole page errors. Prefill is narrowed to `Requested By`
until Task 16 adds the rest.

### 3. **A kapp integration silently drops undeclared parameters**

Worth knowing generally. `CA - Available Families` was registered with
`inputMappings: {}`. Client-supplied `Season` never reached the operation,
`{{Season}}` resolved empty, and the query returned **an empty list with
`Error: null`** — a wrong answer that looks like a successful one. Declaring
the parameter in `inputMappings` fixes it.

This is not in the Integrations skill and should be added: an undeclared
parameter fails silently rather than erroring.

### 4. Print CSS was scoped globally — a real SWAT regression

`print.css` used bare `header, nav, footer { display: none }`, which applied to
every print in the portal, including the SWAT Reports page that tells users to
Ctrl+P to export. Now scoped with `body:has(.print-sheet)`. **Do not unscope.**

### SWAT regression audit (clean)

- `programs`: all 7 original fields with original keys, `Get Nomination Forms`
  integration and its dropdown binding, and the label expression all intact.
- `families`: not modified. Security still SWAT-Leadership-only.
- All 10 pre-existing kapp integrations unchanged; `Upcoming SWAT Projects`
  smoke-tested live and returns 9 projects.
- Portal: all shared-file changes additive. The home banner returns null on
  loading, error, or out-of-season, so it cannot break a SWAT home page.

### Demo fixtures on production — delete when done

Three rows in `christmas-alive-sponsorships`, season 2026, Family Numbers 1-3,
each with `Release Notes = "ZZTEST FIXTURE - demo row, safe to delete"`. They
exist so the browse page and filters can be exercised. No `families` records
were created.

