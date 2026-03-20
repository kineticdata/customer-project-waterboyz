# Scheduled Jobs — Design Spec

## Problem

The Kinetic Platform has no built-in CRON-style job scheduling. Waterboyz needs recurring background tasks — reminder emails, stale data cleanup, periodic reports — that run without user intervention. The workflow engine's Wait handler and recursive routines provide the primitives to build this, but there is no existing infrastructure for configuring, managing, or monitoring scheduled jobs.

## Goals

- Admin UI for Space Admins to create, configure, and monitor scheduled jobs
- Self-sustaining workflow chains that run independently of user sessions
- Support for both fixed-interval and time-of-day scheduling
- Execution history with output chaining (previous run output informs next run input)
- Guard rails against runaway loops, concurrent execution, and stale chains
- Restart mechanism for recovering from errors or engine restarts
- Cassandra-friendly write patterns (minimize updates to the same row)

## Non-Goals (Deferred)

- Job dependencies (job B runs after job A completes)
- Cron expression syntax (e.g., `*/5 * * * *`)
- Job grouping or tagging
- Email notifications on job failure (can be added per-routine)

---

## Design

The generic pattern is documented in `ai-skills/skills/platform/architectural-patterns/SKILL.md` under "Scheduled Jobs Pattern." This spec covers the Waterboyz-specific implementation.

### 1. Platform Forms

#### `scheduled-jobs` (Datastore)

| Property | Value |
|----------|-------|
| Type | Datastore |
| Status | Active |
| Display Policy | Admins |
| Modification Policy | Admins |

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Job Name | Text | Yes | |
| Description | Text (multi-line) | No | |
| Status | Text | Yes | Choices: Active, Inactive, Paused, Restarting, Error |
| Schedule Type | Text | Yes | Choices: Interval, Time of Day |
| Interval Minutes | Number | No | Required when Schedule Type = Interval. Min 1. |
| Schedule Time | Text | No | Required when Schedule Type = Time of Day. HH:MM 24h format. |
| Schedule Days | Text | No | JSON array of day names. Empty = every day. |
| Timezone | Text | No | IANA timezone. Defaults to America/Detroit. |
| Routine Name | Text | Yes | Name of the workflow routine to execute |
| Routine Inputs | Text (multi-line) | No | JSON object of static input parameters |
| Max Runs | Number | No | Null = unlimited |
| Expires At | Date/Time | No | Null = never |
| Run Count | Number | No | Managed by workflow |
| Current Deferral Token | Text | No | Managed by workflow |

**Index definitions:**
- `values[Status]`

#### `scheduled-job-runs` (Datastore)

| Property | Value |
|----------|-------|
| Type | Datastore |
| Status | Active |
| Display Policy | Admins |
| Modification Policy | Admins |

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Job ID | Text | Yes | Submission ID of parent scheduled-jobs record |
| Run Number | Number | Yes | Sequential per job |
| Status | Text | Yes | Choices: Running, Success, Error, Skipped |
| Started At | Date/Time | Yes | |
| Completed At | Date/Time | No | |
| Duration Ms | Number | No | |
| Routine Output | Text (multi-line) | No | JSON |
| Error Details | Text (multi-line) | No | |
| Next Run At | Date/Time | No | |

**Index definitions:**
- `[values[Job ID], values[Status]]`
- `[values[Job ID], values[Run Number]]`

### 2. Workflow: "Scheduler Start" (on Submission Submitted)

Bound to `scheduled-jobs` form.

**Steps:**

1. **Validate Config** — check Schedule Type-specific required fields, Interval Minutes >= 1 if Interval, Routine Name not empty.
   - If invalid → update job Status = 'Error', STOP.
2. **Call Routine** — invoke "Execute Schedule Tick" with:
   - `Job ID` = submission ID
   - `Run Number` = `1`
   - `Previous Output` = empty string

### 3. Routine: "Execute Schedule Tick"

Inputs: `Job ID`, `Run Number`, `Previous Output`

**Steps:**

1. **Read Job** — fetch `scheduled-jobs` submission by Job ID (fresh state).

2. **Pre-Execution Guards:**
   - Status != 'Active' → STOP
   - Max Runs != null AND Run Count >= Max Runs → update job Status = 'Inactive', STOP
   - Expires At != null AND now > Expires At → update job Status = 'Inactive', STOP
   - Query `scheduled-job-runs` where Job ID matches AND Status = 'Running' → if found, STOP (concurrent lock)

3. **Create Run Record** (write 1/2) — create `scheduled-job-runs` submission:
   - Job ID, Run Number, Status = 'Running', Started At = now

4. **Execute Target Routine:**
   - Read Routine Name and Routine Inputs from job
   - Merge: static Routine Inputs + Previous Output (Previous Output keys override)
   - Call the routine by Routine Name

5. **Update Run Record** (write 2/2):
   - Success → Status = 'Success', Completed At, Duration Ms, Routine Output
   - Error → Status = 'Error', Completed At, Duration Ms, Error Details

6. **On Error** → update job Status = 'Error', STOP (no auto-retry).

7. **Calculate Wait Duration:**
   - Interval → Interval Minutes × 60 seconds
   - Time of Day → seconds until next Schedule Time on a valid Schedule Day in Timezone
   - Enforce minimum floor: max(calculated, 60)

8. **Write Next Run At** on the run record.

9. **Store Deferral Token** on job submission (Current Deferral Token).

10. **Wait** (system Wait handler with calculated duration).

11. **After Wake — Re-Read Job:**
    - Status != 'Active' → STOP
    - Increment Run Count on job submission
    - **Recurse:** call self with Job ID, Run Number + 1, previous Routine Output

### 4. WebAPI: "Restart Scheduled Job"

| Property | Value |
|----------|-------|
| Method | POST |
| Security | Admins |
| Slug | `restart-scheduled-job` |

**Input:** `jobId` (query parameter or request body)

**Steps:**

1. Read job submission by jobId.
2. Query `scheduled-job-runs` for Status = 'Running' on this job.
   - If found and Started At within `max(2 × Interval Minutes, 30) minutes` → return error "Job is still running."
   - If found but stale → update that run to Status = 'Error', Error Details = 'Marked stale by restart'.
3. Set job Status = 'Restarting'.
4. If Current Deferral Token exists → complete it via Create Trigger (old chain wakes, sees Restarting, stops).
5. Set job Status = 'Active', clear Current Deferral Token.
6. Derive next Run Number from most recent run's Run Number + 1 (or 1 if no runs).
7. Call "Execute Schedule Tick" routine.

### 5. Portal: Admin UI

#### Routing

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin/scheduled-jobs` | `ScheduledJobs.jsx` | Job list |
| `/admin/scheduled-jobs/:jobId/history` | `ScheduledJobHistory.jsx` | Run history for a job |

Added to the admin hamburger menu as "Scheduled Jobs".

#### Job List (`ScheduledJobs.jsx`)

**Data:** `useData` fetching all `scheduled-jobs` submissions. For last run info, fetch the most recent `scheduled-job-runs` per job (query by Job ID, ordered by Run Number desc, limit 1 per job — or fetch all recent runs and join client-side).

**Table columns:**

| Column | Source |
|--------|--------|
| Job Name | Job submission |
| Status | Badge: green=Active, gray=Inactive, yellow=Paused, red=Error |
| Schedule | Derived: "Every 30 min" or "Daily at 08:00 ET (Mon, Wed, Fri)" |
| Routine | Routine Name |
| Last Run | Most recent run: timestamp + status badge |
| Next Run | Most recent run's Next Run At |
| Runs | Most recent run's Run Number |

**Actions per row:**
- **Activate** (shown when Inactive/Paused) — calls Restart WebAPI
- **Pause** (shown when Active) — updates job Status = 'Paused'
- **Deactivate** (shown when Active/Paused/Error) — updates job Status = 'Inactive'
- **Restart** (shown when Error or chain appears stalled) — calls Restart WebAPI with confirmation dialog
- **History** — navigates to `/admin/scheduled-jobs/:jobId/history`

**Create button** — opens a modal or inline form with job config fields. On save, creates a `scheduled-jobs` submission with `coreState: 'Submitted'` (triggers the Scheduler Start workflow).

**Edit** — click job name to edit config fields. Editing an Active job updates the submission; the chain will pick up new config on the next re-read.

#### Run History (`ScheduledJobHistory.jsx`)

**Data:** `useData` fetching `scheduled-job-runs` where Job ID matches, ordered by Run Number desc. Paginated.

**Table columns:**

| Column | Source |
|--------|--------|
| Run # | Run Number |
| Status | Badge: green=Success, red=Error, blue=Running, gray=Skipped |
| Started | Started At (formatted) |
| Duration | Duration Ms (formatted as "1.2s", "45s", "2m 30s") |
| Next Run | Next Run At (formatted) |
| Output | Truncated Routine Output (click to expand in a modal or drawer) |
| Error | Error Details (shown only for Error rows, expandable) |

**Back navigation:** Link back to `/admin/scheduled-jobs`.

### 6. Index Requirements

Verify or create:

**`scheduled-jobs`:**
- `values[Status]`

**`scheduled-job-runs`:**
- `[values[Job ID], values[Status]]` — lock check + history filtering
- `[values[Job ID], values[Run Number]]` — most recent run lookup

### 7. Security

| Resource | Policy |
|----------|--------|
| `scheduled-jobs` Display | Admins |
| `scheduled-jobs` Modification | Admins |
| `scheduled-job-runs` Display | Admins |
| `scheduled-job-runs` Modification | Admins |
| Restart WebAPI | Admins |
| Admin UI routes | Space Admin (enforced by AdminRouting) |

Workflows run as system agent — always have read/write access.

---

## Data Flow

```
Admin creates a scheduled job via UI
  → Portal creates scheduled-jobs submission (coreState: Submitted)
  → "Scheduler Start" workflow fires:
      1. Validate config
      2. Call "Execute Schedule Tick" routine (Job ID, Run 1, no previous output)

"Execute Schedule Tick" routine (recursive):
  → Read job (fresh state)
  → Check guards (active? max runs? expired? concurrent lock?)
  → Create scheduled-job-runs record (Status: Running)
  → Call target routine (Routine Name) with merged inputs
  → Update run record (Status: Success/Error, output, duration)
  → If error → mark job as Error, STOP
  → Calculate wait duration (interval or time-of-day)
  → Write Next Run At on run record
  → Store deferral token on job submission
  → Wait (system Wait handler)
  → After wake: re-read job, check guards
  → Recurse (Job ID, Run N+1, previous Routine Output)

Admin restarts a stalled job:
  → POST to Restart WebAPI with jobId
  → Check for active runs (refuse if still running)
  → Set Status = 'Restarting' (race condition guard)
  → Complete old deferral token (old chain wakes, sees non-Active, stops)
  → Set Status = 'Active'
  → Call "Execute Schedule Tick" (fresh chain)
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `scheduled-jobs` form | Create (platform) | Job configuration datastore form |
| `scheduled-job-runs` form | Create (platform) | Execution log datastore form |
| "Scheduler Start" workflow | Create (platform) | Tree on scheduled-jobs, Submission Submitted |
| "Execute Schedule Tick" routine | Create (platform) | Recursive scheduling routine |
| "Restart Scheduled Job" WebAPI | Create (platform) | Admin restart endpoint |
| `portal/src/pages/admin/ScheduledJobs.jsx` | Create | Job list admin page |
| `portal/src/pages/admin/ScheduledJobHistory.jsx` | Create | Run history page |
| `portal/src/pages/admin/index.jsx` | Modify | Add routes for scheduled jobs |
| `portal/src/components/header/Header.jsx` | Modify | Add Scheduled Jobs to admin menu |
| `ai-skills/.../architectural-patterns/SKILL.md` | Modify | Add Scheduled Jobs Pattern (done) |
