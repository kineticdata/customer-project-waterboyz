# Christmas Alive Portal — Nomination, Approval, and Sponsorship

## Problem

Christmas Alive exists on the platform as intake only. The `christmas-alive-family-nomination` form is live and two workflows are bound to it, but nothing downstream exists: no review queue, no family registry for the program, no way for anyone to sponsor a family, and no reporting. The `Christmas Alive Nominators` team exists with zero members.

Everything after "a nomination was submitted" is currently run on paper and in email. Last season that was 225 families, 725 children, and 500+ adults; the goal this season is 250 families.

## Context

### Source material

`docs/christmas-alive/`:

| File | What it provides |
|------|------------------|
| `Portal Requirements.pdf` | The requirements themselves — portal split, three menu items, process flow, nominator and admin rosters, sponsor page fields, admin export columns |
| `Sponsor Responsibilites - 2025.jpeg` | What a sponsor commits to; gift guidelines; the Dec 6 portrait and Dec 13 pickup dates; the three-attempts-then-escalate contact rule |
| `Why Christmas ALIVE.jpeg` | Program framing and the published impact numbers |

**Missing:** the requirements PDF highlights *"Check example documents in the email"*. Those examples were not supplied and would pin down the exact packet layout. Not blocking — the packet content is derivable from the responsibilities sheet — but they should be reviewed before the packet template is finalized.

### What exists today

- `christmas-alive-family-nomination` — Nominations type, active. Fields: First Name, Last Name, Email, Phone Number, Address, County, Native Language, Needs Interpreter, Family Members JSON, Support Received, Background on the Family, Total Adults, Total Children, Family Status, Requested By. Two workflows bound ("Nomination Process", "On Update") whose behavior is undocumented and needs verifying.
- `families` — datastore, 12 fields, shared with SWAT, currently SWAT-Leadership-only. Read by `Project.jsx:119` via the `Family - Retrieve By ID` integration.
- `family-members` — datastore. **Unused.** Referenced nowhere in portal source except a generated help page listing datastore names. Confirmed as early prototyping.
- `programs` — datastore driving the home page cards; already has a Christmas Alive record.
- `Christmas Alive Nominators` team — exists, empty.
- Kapp policy `Can Retrieve Family Member Details` — gates `family-members`, and its rule contains a `Christams` typo.

### Decisions (from brainstorming)

- **Portal split.** No second app and no global theme state. The home page shows a seasonal Christmas Alive button; `/christmas-alive/*` is a route subtree with bronze-accented page content. **The header and main nav do not change.**
- **Season window is configurable**, not hardcoded to Sept–Dec.
- **Everything requires an account** — browsing included. No public or anonymous routes.
- **Shared family registry.** Reuse `families` across both programs; per-season state lives in a new `christmas-alive-sponsorships` datastore.
- **`family-members` is deprecated and deleted.** The roster becomes a JSON array on `families`.
- **Review collapses to one stage.** *This diverges from the requirements PDF*, which specifies `In Review` → `In Approval`. Statuses become `Pending, Approved, Rejected, Adopted`, and the admin export's Status column changes accordingly. **Leadership should confirm.**
- **No PDF generation.** A print-styled HTML packet page plus an HTML email; sponsors print to PDF if they want a file.
- **The claim is a WebAPI**, not a client-side write.
- **Reads are kapp-level operations** with server-bound parameters where identity matters; only genuinely multi-step flows use a WebAPI.
- **In scope beyond the three core pages:** My Sponsorships, admin release/reassign, sponsor nudge emails.
- **Out of scope:** portrait scheduling and curb-side pickup logistics.

## Design

### 1. Data model

```
programs (existing)
  + Active From / Active To     controls the seasonal home page button
  + Current Season              e.g. "2025"

christmas-alive-family-nomination (existing, extended)
  IMMUTABLE INTAKE ARTIFACT — never edited after submission
        | Nomination ID
        v
christmas-alive-sponsorships (NEW — one row per family per season)
  CANONICAL for season state, SNAPSHOT of display fields
        |
        | Family ID (set at approval)
        v
families (existing, shared with SWAT)
  CANONICAL for identity, contact, address, and the member roster

christmas-alive-claims (NEW)
  one row per claimed sponsorship, unique index on Sponsorship ID
  -> this index IS the mutual-exclusion lock; deleted on release

family-members -> DELETED
```

**`families` additions:** `Family Members JSON` (the roster: first, last, age, gender, type, optional shirt size, optional shoe size) and `Test Fixture` (boolean, excluded from dedupe — see the test data constraint). No count fields; counts are derived and stored on the sponsorship record.

**`christmas-alive-sponsorships` fields:**

| Field | Purpose |
|---|---|
| Family ID | → `families` submission; set at approval |
| Nomination ID | → the intake submission |
| Season | `2025` |
| Family Number | `14` — the number sponsors quote at pickup |
| Status | Pending / Approved / Rejected / Adopted |
| Rejection Reason | including "duplicate of Family 9" |
| Sponsor Username, Sponsor Email | who claimed it |
| Claimed At, Released At, Release Notes | claim and reassignment audit |
| Packet Sent At | email idempotency guard |
| Photo Requested | Dec 6 portraits |
| Support Currently Receiving | the six checkboxes, JSON array |
| City, County, Native Language | snapshot, for the browse list |
| Total Members, Total Adults, Total Children | snapshot, derived from the roster |

**Why the snapshot exists:** the browse list is one indexed query against one store, served by a single operation. It is *not* a security measure — an operation projects fields regardless — and it is *not* primarily performance. It is what lets the hot read stay a single call.

**Counts are derived, with child = age ≤ 18**, matching the responsibilities sheet ("gifts for each child 18 years or younger"). The nomination form's own Total Adults / Total Children are intake data only; the derived counts are truth.

**`christmas-alive-family-nomination` extensions:** Head of Household Gender; Spouse First/Last/Gender; Photo Requested; Address Line 1/2, City, State, Zip (replacing the single `Address` field, which is lossy against `families`); Nominator First/Last, Organization, Phone, Email; shirt and shoe size per roster entry.

### 2. Sync

One workflow, bound to **`families` Updated**: parse `Family Members JSON`, derive the counts, and refresh City, County, Native Language, and the three totals on the sponsorship row **where `Season == programs.Current Season`**.

Consequences of that filter:

- Rolling the season over freezes last season's rows automatically. Freezing is the absence of syncing — no archival step.
- Published impact numbers stay stable as the registry evolves.

**Invariant: sync flows child → parent only.** Nothing writes back from `christmas-alive-sponsorships` to `families`. The one self-write is the packet email stamping `Packet Sent At`, which re-triggers its own workflow once and then stops at the guard. Removing that guard creates an infinite loop.

**Where counts are displayed:**

| Surface | Source | Stale? |
|---|---|---|
| Admin approvals table and family editor | Derived locally from the roster in hand | Never |
| Packet page | Derived from the live roster | Never |
| Browse list | Stored snapshot | Seconds; no sponsor is editing families |
| Export | Stored snapshot | Seconds; harmless |

The admin UI never reads the stored count while the roster is loaded, so an admin never watches a number lag behind their own edit.

**Gotcha to honor:** `PATCH /submissions` does not fire webhooks. Any bulk correction to `families` bypasses sync and needs a deliberate resync.

### 3. Routes and pages

```
/christmas-alive                    landing: three cards, filtered by access
/christmas-alive/families           Sponsor a Family        all authenticated
/christmas-alive/my-sponsorships    My Sponsorships         all authenticated
/christmas-alive/packet/:id         live family packet      sponsor of record + admins
/christmas-alive/responsibilities   responsibilities sheet  all authenticated
/christmas-alive/nominate           Nominate a Family       nominators + admins
/christmas-alive/approvals          Nomination Approval     admins
```

**Sponsor a Family.** Approved, unclaimed, current-season families. Exactly the specified fields: Family ID, total in family, adults, children, language, city, county — no names, street, or phone. Filter by county, city, language, and family size; sort by family number. Claim opens the specified modal: confirmation that an email was sent, links to the packet and the responsibilities sheet, and **Sponsor another family** / **Close**. A lost race reads as normal ("Family 14 was just sponsored by someone else") and refreshes in place.

**Nominate a Family.** `christmas-alive-family-nomination` via CoreForm with the `FamilyRoster` widget. Nominator fields prefill from the logged-in profile. Reuses the existing `NominationConfirmed` page.

**Nomination Approval.** Tabs Pending / Approved / Rejected / Adopted, columns matching the export so the screen and the download agree. Approve resolves or creates the family, allocates the next Family Number, and writes the snapshot. Reject requires a reason. Adopted rows offer Release and Reassign. Opening a Pending nomination surfaces likely duplicates from `families` by name, address, and phone similarity — four admins cannot hold 250 families in their heads.

**`FamilyRoster` is one React component used two ways:** wrapped via `registerWidget()` for the Kinetic nomination form, and directly in the pure-React admin screens. This is the existing `CategoryPicker` pattern — a React component storing a JSON array in a bound field. It removes the paper form's 7-member cap.

### 4. Operations and WebAPIs

| Need | Mechanism | Rationale |
|---|---|---|
| Browse list | Operation, authenticated | One indexed query, projected output |
| My Sponsorships | Operation, `Sponsor Username` bound server-side | Single store; caller cannot spoof identity |
| Family packet | **WebAPI** | Multi-step: authorization fact and protected data are in different stores |
| Claim | **WebAPI** | Guarded read-check-write |
| Approvals, export | Direct `searchSubmissions` | Admins already have datastore access |

The packet cannot collapse into an operation. The authorization fact — *is this caller the sponsor of this family, this season?* — lives on `christmas-alive-sponsorships`; the protected data lives on `families`. A server-bound username can return the sponsorship row only if the caller owns it, but reaching the family PII is a second call, and an independently invokable second call lets a sponsor pass any family ID and skip the check.

**Indexes** — form-level, each requiring an explicit build job (kapp-level indexes do not satisfy `values[...]` queries):

- `christmas-alive-sponsorships`: `Family ID`, `Season`, `Status`, `Sponsor Username`, compound `Season + Status`
- `christmas-alive-claims`: `Sponsorship ID`, **unique**

### 5. Claim flow

1. Client POSTs the sponsorship record ID to the Claim WebAPI
2. Workflow reads caller identity server-side
3. **Creates the claim record** — the unique index on `Sponsorship ID` is the lock
4. On success, writes Status `Adopted`, sponsor, `Claimed At`
5. Returns the sponsorship ID; failures are typed (`ALREADY_CLAIMED`, `NOT_AVAILABLE`, `SEASON_CLOSED`)

A read-then-write inside a workflow is **not** atomic — two concurrent claims would both pass a naive guard, both write, and both receive a packet, undiscovered until Dec 13. The unique index provides the actual mutual exclusion. See Spikes.

**Release** sets Status back to `Approved`, clears sponsor and `Packet Sent At`, stamps `Released At` and `Release Notes`, and **deletes the claim record** so the unique index does not block the next sponsor. **Reassign** does the same but writes the new sponsor immediately; the cleared `Packet Sent At` triggers their packet.

### 6. Email

Sending is decoupled from claiming: a workflow bound to sponsorship-Updated sends the packet, guarded on `Packet Sent At`. The claim stays fast, a mail failure cannot roll back a valid claim, and re-sending is a re-trigger.

New templates in `email-templates/build.js`:

| Template | Trigger |
|---|---|
| `christmas-alive-sponsor-packet` | Status → Adopted |
| `christmas-alive-nudge` | Deferral, +7 days after claim |
| `christmas-alive-pickup-reminder` | Admin-triggered, once a season |
| `christmas-alive-reassigned` | On release, to the former sponsor |

Packet contents: family number in large type; full family details and roster with ages, genders, and sizes; a link to the live packet page noting that the portal is current and the email is a snapshot; a link to the responsibilities page; the Dec 6 and Dec 13 dates; and the three-attempts-then-escalate path.

The **Sponsor Responsibilities sheet becomes an HTML page**, not the 2.3 MB JPEG — printable, linkable, and editable each season without a graphic designer.

The pre-pickup reminder is a button on the approvals page rather than a scheduled job. It fires once a season; admins see the count before sending and can re-send.

### 7. Security

**Teams:** create `Christmas Alive Admins` (Judd Ziegler, Duane Chipman, Jim Baker, Paul Foss). Populate `Christmas Alive Nominators` from the requirements roster. Nomination access is the union of both.

| Resource | Access |
|---|---|
| `christmas-alive-sponsorships` | Admins only; sponsors reach it only through operations |
| `christmas-alive-claims` | Written by the claim workflow; visible to admins |
| `families` | SWAT Leadership **+ Christmas Alive Admins** |
| `christmas-alive-family-nomination` | Nominators + admins submit; submitter sees their own |
| Browse and My Sponsorships operations | Authenticated |
| Claim and Packet WebAPIs | Authenticated; guard and ownership check do the real work |

**React route guards are UX, not security.** Every guard has a server-side counterpart. `/christmas-alive/packet/:id` is not a secret — guessing an ID returns nothing, because the WebAPI decides whether the caller is the sponsor of record.

PII boundary: sponsors see the anonymized browse, and full details only for families they have personally claimed. Nominators see their own submissions. Admins see everything. Nothing is reachable unauthenticated.

**Cleanup:** delete the `Can Retrieve Family Member Details` kapp policy along with `family-members`, after confirming nothing else binds to it.

## Spikes (must resolve before dependent work)

1. **Unique-index enforcement on submission create under concurrency.** The `unique` flag exists in the index schema; that the platform enforces it against simultaneous creates is unverified. Fallback is optimistic concurrency on `lockVersion`; if neither holds, the claim needs redesigning. **Everything in the claim flow depends on this.** Probe it against a throwaway form under a `TEST-` season, per the test data constraint — not against `christmas-alive-claims` once real claims exist.
2. **Caller identity inside a WebAPI workflow.** The docs show `@request['Headers']` and `@request['Parameters']`. If identity must be passed in by the client rather than read server-side, the packet authorization does not hold as designed.
3. **Behavior of the two existing nomination workflows.** "Nomination Process" and "On Update" are bound to the live form and undocumented. They may be stubs or may conflict with the new flow.

## Verification

**The two that matter:**

- **Claim race** — genuinely concurrent claims against one family; assert exactly one success and exactly one packet queued. This is the acceptance test for Spike 1.
- **Authorization at the API, not the UI** — call the packet WebAPI with a family the caller does not sponsor and assert nothing returns; call admin operations from a non-admin. Testing via the UI proves only that a button is hidden.

**Regression cover:** PII projection (assert the browse response shape contains no name, street, or phone); count derivation at the 18/19 boundary; sync after a roster edit; Family Number sequential and gapless under concurrent approval; release then re-claim; season rollover freezing; export columns; and the nominate → approve → sponsor → packet happy path.

### Test data constraint

There is **one environment**. There is no local platform and no separate test space, so every test runs against the same space that holds real family PII and real sponsorships. Seeding and teardown are therefore a design concern, not a test-harness detail.

**The season field is the natural isolation boundary.** Every query in this design filters on `Season`, and the browse list filters on `programs.Current Season`. Seeding fixtures under a season value that is never current — `TEST-<run id>` — means test families are structurally incapable of appearing in the sponsor browse list, the export, or the sync workflow, even if teardown fails.

**What the season filter does not isolate:** `families` is the shared registry and has no season. Test families land in the same store SWAT uses, and the approval-stage dedupe matcher scans all of it — so an abandoned fixture family will surface as a duplicate candidate against a real nomination months later. Two protections, both required:

- Every fixture family carries an unambiguous marker (a reserved surname prefix, plus a `Test Fixture` flag), and the dedupe matcher excludes flagged records
- Teardown deletes fixture families by that flag, and runs as cleanup-on-start as well as cleanup-on-finish, so a crashed run cannot leak rows into the next one

**Rules for the suite:** tests create their own fixtures and never assert against pre-existing records; nothing destructive ever targets a record it did not create; the concurrency test allocates its own family per run so parallel runs cannot contend; and no test writes to `programs.Current Season`, which would move the live season for real users.

## Out of scope

Portrait scheduling (Dec 6) and curb-side pickup logistics (Dec 13) stay on the flyer. No public or anonymous access. No PDF generation. No per-person queryability of roster members — nothing in the requirements asks a question about members across families.

## Files / artifacts to change

| Artifact | Action |
|----------|--------|
| `families` (platform) | Add `Family Members JSON` and `Test Fixture`; widen security to Christmas Alive Admins |
| `family-members` (platform) | Delete |
| `Can Retrieve Family Member Details` policy | Delete after confirming no other binding |
| `christmas-alive-sponsorships` (platform) | Create datastore + indexes + build jobs |
| `christmas-alive-claims` (platform) | Create datastore + unique index + build job |
| `christmas-alive-family-nomination` (platform) | Extend fields; mount `FamilyRoster`; audit existing workflows |
| `programs` (platform) | Add Active From, Active To, Current Season |
| Teams (platform) | Create Christmas Alive Admins; populate Christmas Alive Nominators |
| Operations (platform) | `CA - Available Families`, `CA - My Sponsorships` |
| WebAPIs (platform) | Claim, Family Packet |
| Workflows (platform) | families-sync, packet email, nudge deferral, reassignment notice |
| `portal/src/pages/christmas-alive/*` | New: landing, browse, my-sponsorships, packet, responsibilities, nominate, approvals |
| `portal/src/components/FamilyRoster.jsx` | New React component |
| `portal/src/components/kinetic-form/widgets/` | Register `FamilyRoster` as a widget |
| `portal/src/pages/home/` | Seasonal Christmas Alive button |
| `email-templates/build.js` | Four new templates |
| `frontend-testing/` | Race, authorization, and regression suites |
| `docs/platform-config.md` | Document the new forms, teams, policies, operations, WebAPIs |
