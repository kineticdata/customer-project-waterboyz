# Scheduled Jobs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-sustaining scheduled job system on the Kinetic Platform with admin UI for managing recurring background tasks.

**Architecture:** Two datastore forms (`scheduled-jobs` for config, `scheduled-job-runs` for execution log) with a recursive workflow routine ("Execute Schedule Tick") that runs the job, sleeps via the Wait handler, wakes, checks guards, and repeats. A WebAPI provides restart capability for stalled chains. Admin UI at `/admin/scheduled-jobs` for Space Admins.

**Tech Stack:** Kinetic Platform (forms, workflows, WebAPIs, routines), React 18, `@kineticdata/react` SDK, Tailwind CSS / DaisyUI

**Spec:** `docs/superpowers/specs/2026-03-19-scheduled-jobs-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| Platform: `scheduled-jobs` form | Create via MCP | Job configuration datastore form |
| Platform: `scheduled-job-runs` form | Create via MCP | Execution log datastore form |
| Platform: "Scheduler Start" workflow | Create via MCP | Tree on scheduled-jobs, Submission Submitted |
| Platform: "Execute Schedule Tick" routine | Create via MCP | Recursive scheduling routine |
| Platform: "Restart Scheduled Job" WebAPI | Create via MCP | Admin restart endpoint |
| `portal/src/pages/admin/ScheduledJobs.jsx` | Create | Job list + create/edit UI |
| `portal/src/pages/admin/ScheduledJobHistory.jsx` | Create | Run history per job |
| `portal/src/pages/admin/index.jsx` | Modify | Add routes |
| `portal/src/components/header/Header.jsx` | Modify | Add menu item |

---

## Task 1: Platform Form — Create `scheduled-jobs`

Create the job configuration datastore form on the Kinetic Platform via MCP tools.

**Tools:** MCP `create_form`

**Reference:** Read `@ai-skills/skills/platform/form-engine/SKILL.md` for form JSON schema and field structure. Every field element MUST have a unique hex `key` property AND all null properties explicitly present (requiredMessage, omitWhenHidden, pattern, renderAttributes, defaultResourceName) or the API returns 400/500 errors.

- [ ] **Step 1: Create the form**

Use MCP `create_form` with:
- `kappSlug`: `service-portal`
- `slug`: `scheduled-jobs`
- `name`: `Scheduled Jobs`
- `description`: `Configuration for recurring scheduled jobs. Each submission defines a job that runs on a fixed interval or time-of-day schedule.`
- `type`: `Datastore`
- `status`: `Active`
- `anonymous`: `false`

Fields (each must have a unique hex `key`, and all nullable properties explicitly set to `null`):

1. `Job Name` — text, required
2. `Description` — text, not required, rows: 3 (textarea)
3. `Status` — dropdown, required, choices: Active, Inactive, Paused, Restarting, Error. Default: `Inactive`
4. `Schedule Type` — radio, required, choices: Interval, Time of Day
5. `Interval Minutes` — text, not required, visible expression: `values('Schedule Type') === "Interval"`
6. `Schedule Time` — text, not required, visible expression: `values('Schedule Type') === "Time of Day"`
7. `Schedule Days` — text, not required, visible expression: `values('Schedule Type') === "Time of Day"`
8. `Timezone` — text, not required, default: `America/Detroit`
9. `Routine Name` — text, required
10. `Routine Inputs` — text, not required, rows: 5 (textarea)
11. `Max Runs` — text, not required
12. `Expires At` — datetime, not required
13. `Current Deferral Token` — text, not required, visible: false
14. `Last Run ID` — text, not required, visible: false

Security policies:
- Display: `["Admins"]`
- Modification: `["Admins"]`

Index definitions:
- `values[Status]`

- [ ] **Step 2: Verify the form was created**

Use MCP `retrieve_form` (kappSlug: `service-portal`, formSlug: `scheduled-jobs`, include: `fields,securityPolicies,indexDefinitions`) to confirm all fields, policies, and indexes are set correctly.

- [ ] **Step 3: Build the index**

Use MCP `create_kapp_background_job` (kappSlug: `service-portal`, body: `{"job": "indexing"}`) to build the index. Then poll `retrieve_kapp` (kappSlug: `service-portal`, include: `indexDefinitions`) until the index status is "Built".

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "platform: create scheduled-jobs datastore form

Form created on Kinetic Platform via MCP.
Type: Datastore, Status: Active
Fields: Job Name, Description, Status, Schedule Type, Interval Minutes,
  Schedule Time, Schedule Days, Timezone, Routine Name, Routine Inputs,
  Max Runs, Expires At, Current Deferral Token, Last Run ID
Display/Modification: Admins
Index: values[Status]"
```

---

## Task 2: Platform Form — Create `scheduled-job-runs`

Create the execution log datastore form.

**Tools:** MCP `create_form`

- [ ] **Step 1: Create the form**

Use MCP `create_form` with:
- `kappSlug`: `service-portal`
- `slug`: `scheduled-job-runs`
- `name`: `Scheduled Job Runs`
- `description`: `Execution log for scheduled jobs. One submission per run, providing audit trail and output chaining.`
- `type`: `Datastore`
- `status`: `Active`
- `anonymous`: `false`

Fields:

1. `Job ID` — text, required
2. `Run Number` — text, required
3. `Status` — dropdown, required, choices: Running, Success, Error, Skipped
4. `Started At` — datetime, required
5. `Completed At` — datetime, not required
6. `Duration Ms` — text, not required
7. `Routine Output` — text, not required, rows: 10 (textarea)
8. `Error Details` — text, not required, rows: 5 (textarea)
9. `Next Run At` — datetime, not required

Security policies:
- Display: `["Admins"]`
- Modification: `["Admins"]`

Index definitions:
- `[values[Job ID], values[Status]]`
- `[values[Job ID], values[Run Number]]`

- [ ] **Step 2: Verify the form**

Use MCP `retrieve_form` (kappSlug: `service-portal`, formSlug: `scheduled-job-runs`, include: `fields,securityPolicies,indexDefinitions`).

- [ ] **Step 3: Build the indexes**

Use MCP `create_kapp_background_job` to trigger index build. Poll until built.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "platform: create scheduled-job-runs datastore form

Form created on Kinetic Platform via MCP.
Type: Datastore, Status: Active
Fields: Job ID, Run Number, Status, Started At, Completed At,
  Duration Ms, Routine Output, Error Details, Next Run At
Display/Modification: Admins
Indexes: [Job ID, Status], [Job ID, Run Number]"
```

---

## Task 3: Platform Routine — Create "Execute Schedule Tick"

Create the recursive routine that is the core of the scheduling system. This must be created BEFORE the Scheduler Start tree (which calls it) and the Restart WebAPI (which also calls it).

**Tools:** MCP `create_form_workflow` (for routine creation), or Task API

**Reference:** Read `@ai-skills/skills/platform/workflow-xml/SKILL.md` for workflow XML schema, handler IDs, and node structure. Read `@ai-skills/skills/platform/architectural-patterns/SKILL.md` "Scheduled Jobs Pattern" for the full routine logic.

- [ ] **Step 1: Study existing routines on the platform**

Use the Task API to list existing routines and understand the naming/structure patterns:

```
GET /app/components/task/app/api/v2/trees?limit=500
```

Filter for routines (type = "Global Routine") to understand the title format and structure. Also export one routine to study its XML structure:

```
GET /app/components/task/app/api/v2/trees/{routine-title}/export
```

- [ ] **Step 2: Design the routine's node structure**

The "Execute Schedule Tick" routine needs these nodes:

1. **Start** (`system_start_v1`) — entry point
2. **Read Job** (`kinetic_core_api_v1`) — GET `/app/api/v1/kapps/service-portal/submissions/{jobId}?include=values`
3. **Guard: Status Check** — conditional connector: `@results['Read Job']` parsed, check Status == 'Active'
4. **Guard: Max Runs** — check last run number vs Max Runs
5. **Guard: Expiry** — check Expires At vs now
6. **Guard: Concurrent Lock** — query `scheduled-job-runs` for Status = 'Running' on this Job ID
7. **Create Run Record** (`kinetic_core_api_v1`) — POST to create `scheduled-job-runs` submission
8. **Execute Target Routine** — call the routine named in the job's `Routine Name` field
9. **Update Run: Success** (`kinetic_core_api_v1`) — PUT to update run with Success status
10. **Update Run: Error** (`kinetic_core_api_v1`) — PUT to update run with Error status
11. **Update Job: Error** (`kinetic_core_api_v1`) — PUT to set job Status = 'Error'
12. **Calculate Wait** — Echo or No-op node to calculate wait duration
13. **Update Run: Next Run At** (`kinetic_core_api_v1`) — PUT to write Next Run At
14. **Wait** (`system_wait_v1`) — sleep for calculated duration (deferrable)
15. **Store Token** (`kinetic_core_api_v1`) — on Create connector from Wait: write deferral token + Last Run ID to job
16. **Post-Wake Read Job** (`kinetic_core_api_v1`) — re-read job after wake
17. **Post-Wake Guard** — check Status == 'Active'
18. **Recurse** — call self with updated inputs
19. **Return** (`system_tree_return_v1`) — various exit points

**Routine inputs** (defined in `<taskDefinition>`):
- `Job ID` (required)
- `Run Number` (required)
- `Previous Output` (not required)

**Routine outputs:**
- `Status` — `Success`, `Error`, `Stopped`
- `Message` — description of outcome

- [ ] **Step 3: Build the routine XML**

This is a complex workflow. Build the treeXml or treeJson programmatically following the patterns in the Workflow XML skill. Key considerations:

- Every node must have `visible: true`, `configured: true`
- Node IDs must have globally unique suffixes
- Wait node must have `defers: true`, `deferrable: true` with Create/Update/Complete messages
- The Create connector from the Wait node fires the "Store Token" node
- The Complete connector from the Wait node fires the "Post-Wake Read Job" node
- Guard failures branch to the Return node with appropriate status
- Error handling on all API calls (check `Handler Error Message`)

**Important:** The routine needs to call itself recursively. The recursive call uses the routine's own `definition_id` as a task definition. The inputs for the recursive call are:
- `Job ID` = same Job ID
- `Run Number` = current Run Number + 1 (calculated via ERB)
- `Previous Output` = output from the target routine execution

- [ ] **Step 4: Create the routine on the platform**

Use the Task API to create the global routine:

```
POST /app/components/task/app/api/v2/trees
```

With the routine XML. Verify it appears in the workflow builder.

- [ ] **Step 5: Test the routine manually**

Create a simple test routine (e.g., "Test Echo Job") that just echoes back its inputs. Then create a test `scheduled-jobs` submission manually and trigger the Execute Schedule Tick routine via the Task API's `POST /runs` endpoint to verify:

1. It reads the job config
2. It creates a run record
3. It calls the test routine
4. It updates the run record
5. It enters Wait state

Verify by checking the run's tasks in the workflow builder.

- [ ] **Step 6: Commit**

```bash
git commit --allow-empty -m "platform: create Execute Schedule Tick routine

Global routine created on Kinetic Platform.
Recursive scheduling routine: read job → check guards → create run →
execute target routine → update run → calculate wait → Wait → recurse.
Deferral token captured via Create connector from Wait node."
```

---

## Task 4: Platform Workflow — Create "Scheduler Start"

Create the tree that fires when a `scheduled-jobs` submission is submitted, kicking off the recursive loop.

**Tools:** MCP `create_form_workflow`

- [ ] **Step 1: Create the workflow**

Use MCP `create_form_workflow` with:
- `kappSlug`: `service-portal`
- `formSlug`: `scheduled-jobs`
- `name`: `Scheduler Start`
- `event`: `Submission Submitted`
- `type`: `Tree`
- `status`: `Active`

This returns a workflow ID (UUID).

- [ ] **Step 2: Build the tree XML**

Simple tree with these nodes:

1. **Start** (`system_start_v1`)
2. **Validate: Schedule Type** — conditional branch checking `@values['Schedule Type']` is present
3. **Validate: Routine Name** — check `@values['Routine Name']` is present
4. **Validate: Interval** — if Schedule Type is Interval, check Interval Minutes >= 1
5. **Set Error Status** (`kinetic_core_api_v1`) — on validation failure, PUT to set Status = 'Error'
6. **Call Execute Schedule Tick** — call the routine with:
   - `Job ID` = `<%= @source['Id'] %>` (the submission ID that triggered the tree)
   - `Run Number` = `1`
   - `Previous Output` = (empty)
7. **Return** (`system_tree_return_v1`) — status = 'Complete'

- [ ] **Step 3: Upload the tree definition**

Use MCP `update_form_workflow` to upload the treeXml to the workflow:
- `kappSlug`: `service-portal`
- `formSlug`: `scheduled-jobs`
- `workflowId`: (ID from step 1)
- `treeXml`: (the built XML — must be ONLY the `<taskTree>` inner element)

- [ ] **Step 4: Test the workflow**

Create a test `scheduled-jobs` submission via CoreForm or MCP `create_submission` with required fields. Check the workflow run in the workflow builder to verify:
1. Validation passes
2. The routine is called with correct inputs
3. The recursive chain starts

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "platform: create Scheduler Start workflow on scheduled-jobs

Tree bound to Submission Submitted event.
Validates config, then calls Execute Schedule Tick routine to start the
recursive scheduling loop."
```

---

## Task 5: Platform WebAPI — Create "Restart Scheduled Job"

Create the kapp-level WebAPI for restarting stalled job chains.

**Tools:** MCP `create_kapp_web_api`

**Reference:** Read `@ai-skills/skills/platform/webapis-and-webhooks/SKILL.md` for WebAPI patterns. Read the Workflow XML skill for the `system_tree_return_v1` WebAPI parameter rules (content, content_type, response_code).

- [ ] **Step 1: Create the WebAPI**

Use MCP `create_kapp_web_api` with:
- `kappSlug`: `service-portal`
- `slug`: `restart-scheduled-job`
- `method`: `POST`
- `securityPolicy`: `Admins` (or the appropriate policy name — verify with `list_kapp_security_policy_definitions`)

- [ ] **Step 2: Build the WebAPI tree**

Nodes:

1. **Start** (`system_start_v1`)
2. **Read Job** (`kinetic_core_api_v1`) — GET the job submission by `jobId` from `@request_query_params.fetch('jobId', '')`
3. **Check Job Exists** — branch on error
4. **Query Running Runs** (`kinetic_core_api_v1`) — search `scheduled-job-runs` where Job ID matches AND Status = 'Running'
5. **Check If Running** — if found and recent, return error via Return node
6. **Mark Stale Run** (`kinetic_core_api_v1`) — if found but stale, update to Status = 'Error'
7. **Set Restarting** (`kinetic_core_api_v1`) — PUT job Status = 'Restarting'
8. **Complete Old Deferral** — if Current Deferral Token exists, call `utilities_create_trigger_v1` with action_type = 'Complete'
9. **Set Active** (`kinetic_core_api_v1`) — PUT job Status = 'Active', clear Current Deferral Token
10. **Get Last Run** (`kinetic_core_api_v1`) — query most recent `scheduled-job-runs` for this job to get Run Number
11. **Call Execute Schedule Tick** — call the routine (on Create connector → proceed to Return; routine runs async)
12. **Return Success** (`system_tree_return_v1`) — `response_code: 200`, `content_type: application/json`, `content: {"status": "restarted"}`
13. **Return Error** (`system_tree_return_v1`) — `response_code: 409`, `content: {"error": "Job is still running"}`
14. **Return Not Found** (`system_tree_return_v1`) — `response_code: 404`

**Critical:** The Return Success node must be on the **Create connector** from the routine call node (step 11), not the Complete connector. This ensures the WebAPI returns within the 30-second timeout while the routine runs indefinitely.

- [ ] **Step 3: Upload the tree definition**

Use MCP `update_kapp_web_api` or the appropriate tool to upload the treeXml.

- [ ] **Step 4: Test the WebAPI**

Call the WebAPI directly:
```
POST /app/api/v1/kapps/service-portal/webApis/restart-scheduled-job?jobId={testJobId}
```

Verify it returns 200 and the job chain restarts.

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "platform: create Restart Scheduled Job WebAPI

Kapp-level WebAPI at service-portal/restart-scheduled-job.
Handles stale run cleanup, Restarting race-condition guard,
deferral token completion, and fresh chain start."
```

---

## Task 6: Portal — Admin UI: Job List Page

Create the main scheduled jobs admin page.

**Files:**
- Create: `portal/src/pages/admin/ScheduledJobs.jsx`
- Modify: `portal/src/pages/admin/index.jsx`
- Modify: `portal/src/components/header/Header.jsx`

**Reference:** Follow the pattern in `portal/src/pages/admin/Reports.jsx` for data fetching, layout, and table rendering. Use `useData` from `portal/src/helpers/hooks/useData.js`.

- [ ] **Step 1: Create the ScheduledJobs component**

Create `portal/src/pages/admin/ScheduledJobs.jsx`:

```jsx
import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchSubmissions, updateSubmission } from '@kineticdata/react';
import { useData } from '../../helpers/hooks/useData.js';
import { Loading } from '../../components/states/Loading.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { Icon } from '../../atoms/Icon.jsx';
import { toastError, toastSuccess } from '../../helpers/toasts.js';
import clsx from 'clsx';

// Format schedule for display
const formatSchedule = job => {
  const v = job.values;
  if (v['Schedule Type'] === 'Interval') {
    const mins = parseInt(v['Interval Minutes'], 10);
    if (mins >= 1440) return `Every ${Math.round(mins / 1440)} day(s)`;
    if (mins >= 60) return `Every ${Math.round(mins / 60)} hour(s)`;
    return `Every ${mins} min`;
  }
  if (v['Schedule Type'] === 'Time of Day') {
    const time = v['Schedule Time'] || '?';
    const tz = v['Timezone'] || 'America/Detroit';
    const days = (() => {
      try { return JSON.parse(v['Schedule Days'] || '[]'); }
      catch { return []; }
    })();
    const dayStr = days.length > 0
      ? ` (${days.map(d => d.slice(0, 3)).join(', ')})`
      : '';
    return `Daily at ${time} ${tz.split('/')[1] || tz}${dayStr}`;
  }
  return '—';
};

// Status badge color mapping
const statusColors = {
  Active: 'kbadge-success',
  Inactive: 'kbadge-ghost',
  Paused: 'kbadge-warning',
  Restarting: 'kbadge-info',
  Error: 'kbadge-error',
};

const runStatusColors = {
  Success: 'kbadge-success',
  Error: 'kbadge-error',
  Running: 'kbadge-info',
  Skipped: 'kbadge-ghost',
};

export const ScheduledJobs = () => {
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch all scheduled jobs
  const jobsParams = useMemo(() => ({
    kapp: 'service-portal',
    form: 'scheduled-jobs',
    search: { limit: 1000 },
    include: 'values',
  }), []);
  const { loading: jobsLoading, response: jobsResponse, actions: { reloadData } } = useData(searchSubmissions, jobsParams);
  const jobs = jobsResponse?.submissions ?? [];

  // Fetch most recent run per job (fetch recent runs, join client-side)
  const runsParams = useMemo(() => ({
    kapp: 'service-portal',
    form: 'scheduled-job-runs',
    search: { limit: 1000, orderBy: 'values[Run Number]', direction: 'DESC' },
    include: 'values',
  }), []);
  const { response: runsResponse } = useData(searchSubmissions, runsParams);
  const allRuns = runsResponse?.submissions ?? [];

  // Map: jobId → most recent run
  const latestRunByJob = useMemo(() => {
    const map = {};
    for (const run of allRuns) {
      const jobId = run.values['Job ID'];
      if (!map[jobId]) map[jobId] = run;
    }
    return map;
  }, [allRuns]);

  // Handle status change (pause, deactivate)
  const handleStatusChange = useCallback(async (job, newStatus) => {
    setActionLoading(job.id);
    try {
      await updateSubmission({
        id: job.id,
        values: { Status: newStatus },
        include: 'values',
      });
      toastSuccess(`Job ${newStatus.toLowerCase()}.`);
      reloadData();
    } catch (e) {
      toastError(`Failed to update job: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  }, [reloadData]);

  // Handle restart via WebAPI
  const handleRestart = useCallback(async (job) => {
    if (!confirm(`Restart "${job.values['Job Name']}"? This will start a new scheduling chain.`)) return;
    setActionLoading(job.id);
    try {
      const response = await fetch(
        `${bundle.apiLocation()}/kapps/service-portal/webApis/restart-scheduled-job?jobId=${job.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': bundle.csrfToken(),
          },
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      toastSuccess('Job restarted.');
      reloadData();
    } catch (e) {
      toastError(`Failed to restart: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  }, [reloadData]);

  if (jobsLoading) return <Loading />;

  return (
    <div className="gutter">
      <div className="flex-sb mb-4">
        <PageHeading title="Scheduled Jobs" icon="clock" />
        {/* TODO: Create button — opens CoreForm modal for scheduled-jobs form */}
      </div>

      <div className="overflow-x-auto">
        <table className="ktable ktable-zebra w-full">
          <thead>
            <tr>
              <th>Job Name</th>
              <th>Status</th>
              <th>Schedule</th>
              <th>Routine</th>
              <th>Last Run</th>
              <th>Next Run</th>
              <th>Runs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr><td colSpan={8} className="text-center ktext-base-content/60 py-8">No scheduled jobs configured.</td></tr>
            )}
            {jobs.map(job => {
              const v = job.values;
              const latestRun = latestRunByJob[job.id];
              const rv = latestRun?.values;
              const isLoading = actionLoading === job.id;

              return (
                <tr key={job.id}>
                  <td className="font-medium">{v['Job Name']}</td>
                  <td>
                    <span className={clsx('kbadge kbadge-sm', statusColors[v['Status']] || 'kbadge-ghost')}>
                      {v['Status']}
                    </span>
                  </td>
                  <td className="text-sm">{formatSchedule(job)}</td>
                  <td className="text-sm font-mono">{v['Routine Name']}</td>
                  <td className="text-sm">
                    {rv ? (
                      <span className="flex-sc gap-1">
                        <span className={clsx('kbadge kbadge-xs', runStatusColors[rv['Status']] || '')}>
                          {rv['Status']}
                        </span>
                        <span className="ktext-base-content/60">
                          {rv['Started At'] ? new Date(rv['Started At']).toLocaleString() : '—'}
                        </span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="text-sm ktext-base-content/60">
                    {rv?.['Next Run At'] ? new Date(rv['Next Run At']).toLocaleString() : '—'}
                  </td>
                  <td className="text-sm">{rv?.['Run Number'] ?? 0}</td>
                  <td>
                    <div className="flex gap-1">
                      {(v['Status'] === 'Inactive' || v['Status'] === 'Paused') && (
                        <button
                          className="kbtn kbtn-ghost kbtn-xs"
                          onClick={() => handleRestart(job)}
                          disabled={isLoading}
                          title="Activate"
                        >
                          <Icon name="player-play" size={14} />
                        </button>
                      )}
                      {v['Status'] === 'Active' && (
                        <button
                          className="kbtn kbtn-ghost kbtn-xs"
                          onClick={() => handleStatusChange(job, 'Paused')}
                          disabled={isLoading}
                          title="Pause"
                        >
                          <Icon name="player-pause" size={14} />
                        </button>
                      )}
                      {v['Status'] === 'Error' && (
                        <button
                          className="kbtn kbtn-ghost kbtn-xs text-error"
                          onClick={() => handleRestart(job)}
                          disabled={isLoading}
                          title="Restart"
                        >
                          <Icon name="refresh" size={14} />
                        </button>
                      )}
                      {['Active', 'Paused', 'Error'].includes(v['Status']) && (
                        <button
                          className="kbtn kbtn-ghost kbtn-xs"
                          onClick={() => handleStatusChange(job, 'Inactive')}
                          disabled={isLoading}
                          title="Deactivate"
                        >
                          <Icon name="player-stop" size={14} />
                        </button>
                      )}
                      <button
                        className="kbtn kbtn-ghost kbtn-xs"
                        onClick={() => navigate(`/admin/scheduled-jobs/${job.id}/history`)}
                        title="View History"
                      >
                        <Icon name="history" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Add routing in admin index**

Modify `portal/src/pages/admin/index.jsx`:

1. Import `ScheduledJobs` and `ScheduledJobHistory`
2. Add routes inside the `<Routes>` — `ScheduledJobs` should be in the standard gutter routes (it manages its own gutter), and `ScheduledJobHistory` likewise:

```jsx
import { ScheduledJobs } from './ScheduledJobs.jsx';
import { ScheduledJobHistory } from './ScheduledJobHistory.jsx';
```

Add inside the gutter `<Routes>`:
```jsx
<Route path="/scheduled-jobs" element={<ScheduledJobs />} />
<Route path="/scheduled-jobs/:jobId/history" element={<ScheduledJobHistory />} />
```

Place them after the `/reports` route and before the `/:formSlug` catch-all route.

- [ ] **Step 3: Add menu item in Header**

Modify `portal/src/components/header/Header.jsx`. In the `getMenuItems` function, find the `System Admin` section (line ~226) and add "Scheduled Jobs" to its items array:

```javascript
{ label: 'Scheduled Jobs', to: '/admin/scheduled-jobs', icon: 'clock' },
```

This goes in the `System Admin` section (requires `profile?.spaceAdmin`), not the general Admin section.

- [ ] **Step 4: Verify the page renders**

Start the dev server (`cd portal && yarn start`), log in as a space admin, and navigate to `/admin/scheduled-jobs`. Verify:
1. The page renders with the table (empty state)
2. The menu item appears in the System Admin section
3. No console errors

- [ ] **Step 5: Commit**

```bash
git add portal/src/pages/admin/ScheduledJobs.jsx portal/src/pages/admin/index.jsx portal/src/components/header/Header.jsx
git commit -m "feat: add Scheduled Jobs admin page with job list table"
```

---

## Task 7: Portal — Admin UI: Run History Page

Create the per-job run history page.

**Files:**
- Create: `portal/src/pages/admin/ScheduledJobHistory.jsx`

- [ ] **Step 1: Create the ScheduledJobHistory component**

Create `portal/src/pages/admin/ScheduledJobHistory.jsx`:

```jsx
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchSubmission, searchSubmissions } from '@kineticdata/react';
import { useData } from '../../helpers/hooks/useData.js';
import { Loading } from '../../components/states/Loading.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { Icon } from '../../atoms/Icon.jsx';
import clsx from 'clsx';

const runStatusColors = {
  Success: 'kbadge-success',
  Error: 'kbadge-error',
  Running: 'kbadge-info',
  Skipped: 'kbadge-ghost',
};

const formatDuration = ms => {
  if (!ms) return '—';
  const num = parseInt(ms, 10);
  if (num < 1000) return `${num}ms`;
  if (num < 60000) return `${(num / 1000).toFixed(1)}s`;
  const mins = Math.floor(num / 60000);
  const secs = Math.round((num % 60000) / 1000);
  return `${mins}m ${secs}s`;
};

export const ScheduledJobHistory = () => {
  const { jobId } = useParams();

  // Fetch the job record for the heading
  const jobParams = useMemo(() => jobId ? { id: jobId, include: 'values' } : null, [jobId]);
  const { response: jobResponse } = useData(fetchSubmission, jobParams);
  const job = jobResponse?.submission;

  // Fetch runs for this job, ordered by Run Number desc
  const runsParams = useMemo(() => jobId ? {
    kapp: 'service-portal',
    form: 'scheduled-job-runs',
    search: {
      limit: 50,
      orderBy: 'values[Run Number]',
      direction: 'DESC',
      q: `values[Job ID] = "${jobId}"`,
    },
    include: 'values',
  } : null, [jobId]);
  const { loading, response: runsResponse } = useData(searchSubmissions, runsParams);
  const runs = runsResponse?.submissions ?? [];

  if (loading || !job) return <Loading />;

  return (
    <div className="gutter">
      <div className="mb-4">
        <Link to="/admin/scheduled-jobs" className="klink text-sm flex-sc gap-1 mb-2">
          <Icon name="arrow-left" size={14} /> Back to Scheduled Jobs
        </Link>
        <PageHeading
          title={`${job.values['Job Name']} — Run History`}
          icon="history"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="ktable ktable-zebra w-full">
          <thead>
            <tr>
              <th>Run #</th>
              <th>Status</th>
              <th>Started</th>
              <th>Duration</th>
              <th>Next Run</th>
              <th>Output</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr><td colSpan={7} className="text-center ktext-base-content/60 py-8">No runs recorded yet.</td></tr>
            )}
            {runs.map(run => {
              const v = run.values;
              return (
                <tr key={run.id}>
                  <td>{v['Run Number']}</td>
                  <td>
                    <span className={clsx('kbadge kbadge-sm', runStatusColors[v['Status']] || 'kbadge-ghost')}>
                      {v['Status']}
                    </span>
                  </td>
                  <td className="text-sm">
                    {v['Started At'] ? new Date(v['Started At']).toLocaleString() : '—'}
                  </td>
                  <td className="text-sm">{formatDuration(v['Duration Ms'])}</td>
                  <td className="text-sm ktext-base-content/60">
                    {v['Next Run At'] ? new Date(v['Next Run At']).toLocaleString() : '—'}
                  </td>
                  <td className="text-sm max-w-xs">
                    {v['Routine Output'] ? (
                      <details>
                        <summary className="cursor-pointer ktext-base-content/60">
                          {v['Routine Output'].slice(0, 50)}{v['Routine Output'].length > 50 ? '...' : ''}
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-base-200 rounded overflow-x-auto whitespace-pre-wrap">
                          {v['Routine Output']}
                        </pre>
                      </details>
                    ) : '—'}
                  </td>
                  <td className="text-sm max-w-xs">
                    {v['Error Details'] ? (
                      <details>
                        <summary className="cursor-pointer text-error">
                          {v['Error Details'].slice(0, 50)}{v['Error Details'].length > 50 ? '...' : ''}
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-error/10 rounded overflow-x-auto whitespace-pre-wrap">
                          {v['Error Details']}
                        </pre>
                      </details>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TODO: Add pageToken-based pagination for large run histories */}
    </div>
  );
};
```

- [ ] **Step 2: Verify the page renders**

Navigate to `/admin/scheduled-jobs/{testJobId}/history`. Verify:
1. Job name shows in the heading
2. Back link works
3. Run table renders (may be empty if no test runs yet)
4. No console errors

- [ ] **Step 3: Commit**

```bash
git add portal/src/pages/admin/ScheduledJobHistory.jsx
git commit -m "feat: add Scheduled Job run history page"
```

---

## Task 8: Integration Test — End-to-End

Test the full flow: create a job via the UI, verify the chain starts, runs, sleeps, and wakes.

- [ ] **Step 1: Create a test routine**

Before testing, create a simple "Test Echo" global routine on the platform that:
- Accepts input: `Message`
- Echoes it back as output: `Output` = the Message value
- This gives us a harmless routine to schedule

- [ ] **Step 2: Create a test job via the admin UI**

Navigate to `/admin/scheduled-jobs`. Create a job (manually via the platform or future Create button):
- Job Name: `Test Job`
- Status: `Active`
- Schedule Type: `Interval`
- Interval Minutes: `2`
- Routine Name: `Test Echo` (or whatever the test routine is named)
- Routine Inputs: `{"Message": "Hello from scheduled job"}`

- [ ] **Step 3: Verify the chain started**

1. Check `scheduled-job-runs` for a new submission with Status = 'Running' → 'Success'
2. Check the Routine Output field contains the echo output
3. Check the Next Run At field is approximately 2 minutes from Started At
4. Check the job's Current Deferral Token is populated
5. Wait 2+ minutes and verify a second run appears

- [ ] **Step 4: Test the guards**

1. Set the job Status to 'Paused' via the admin UI
2. Wait for the chain to wake — verify it creates no new run (the chain stops)
3. Use the Restart button to reactivate — verify a new run starts

- [ ] **Step 5: Test error handling**

1. Create a job pointing to a non-existent routine name
2. Verify the first run has Status = 'Error'
3. Verify the job Status is set to 'Error'
4. Verify the chain does NOT continue

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during scheduled jobs integration testing"
```

---

## Task 9: Polish — Create Job Modal

Add the ability to create new jobs from the admin UI via CoreForm.

**Files:**
- Modify: `portal/src/pages/admin/ScheduledJobs.jsx`

**Reference:** Follow the pattern in `portal/src/pages/admin/volunteer-management/EditVolunteerModal.jsx` for CoreForm in a modal.

- [ ] **Step 1: Add a create job button and CoreForm modal**

Add to `ScheduledJobs.jsx`:
- A "New Job" button in the header area
- A modal that renders `CoreForm` for the `scheduled-jobs` form
- On successful submission (CoreForm `onCompleted` callback), close the modal and `reloadData()`

The CoreForm will handle the Draft → Submitted transition naturally, which triggers the Scheduler Start workflow.

**Important:** The form's Status field defaults to `Inactive`. The admin should set it to `Active` in the form to start the chain immediately, or leave it Inactive and activate later via the list actions.

- [ ] **Step 2: Test creating a job**

1. Click "New Job"
2. Fill out the form with a test configuration
3. Submit
4. Verify the modal closes, the job appears in the list
5. If Status was set to Active, verify the chain starts (check runs)

- [ ] **Step 3: Commit**

```bash
git add portal/src/pages/admin/ScheduledJobs.jsx
git commit -m "feat: add Create Job modal with CoreForm to scheduled jobs admin"
```
