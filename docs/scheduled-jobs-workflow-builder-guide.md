# Scheduled Jobs — Workflow Builder Guide

This guide covers building the two remaining workflow components in the Kinetic Task visual builder. The platform forms, admin UI, and Scheduler Start tree are already created.

## Platform Resources Created

| Resource | Status | Notes |
|----------|--------|-------|
| `scheduled-jobs` form (Datastore) | Done | Job config with Connection/Operation fields |
| `scheduled-job-runs` form (Datastore) | Done | Execution log |
| "Scheduler Start" tree | Done | Validates config on Submission Created, logs start |
| `restart-scheduled-job` WebAPI | Created (shell) | Needs tree definition uploaded |
| "Execute Schedule Tick" routine | **Not created** | Build in workflow builder |

---

## 1. Execute Schedule Tick — Global Routine

**Type:** Global Routine
**Created in:** Kinetic Task Builder > Routines > New Routine

### Routine Interface (taskDefinition)

**Inputs:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `Job ID` | Yes | Submission ID of the `scheduled-jobs` record |
| `Run Number` | Yes | Sequential run number (starts at 1) |
| `Previous Output` | No | JSON output from the previous run's operation |

**Outputs:**
| Result | Description |
|--------|-------------|
| `Status` | `Success`, `Error`, or `Stopped` |
| `Message` | Description of outcome |

### Node-by-Node Build Guide

Build these nodes in the workflow builder in order. Use `kinetic_core_api_v1` for all API calls.

#### Node 1: Start
- Handler: `system_start_v1`
- Standard start node

#### Node 2: Read Job
- Handler: `kinetic_core_api_v1`
- Method: `GET`
- URL: `/app/api/v1/kapps/service-portal/submissions/<%= @inputs['Job ID'] %>?include=values`
- Error Handling: `Error Message`

**Complete connectors from Read Job:**
- "Status Active" → Node 3 (guard check passes)
  - Condition: `@results['Read Job']['Handler Error Message'].to_s.empty? && JSON.parse(@results['Read Job']['Response Body'])['submission']['values']['Status'] == 'Active'`
- "Not Active" → Node 19 (Return Stopped)
  - Condition: everything else

#### Node 3: Check Concurrent Lock
- Handler: `kinetic_core_api_v1`
- Method: `POST`
- URL: `/app/api/v1/kapps/service-portal/forms/scheduled-job-runs/submissions-search`
- Headers: `{"content-type": "application/json"}`
- Body: `{"q": "values[Job ID]=\"<%= @inputs['Job ID'] %>\" AND values[Status]=\"Running\"", "include": "values", "limit": 1}`

**Complete connectors:**
- "No running" → Node 4 (proceed)
  - Condition: Check response submissions array is empty
- "Already running" → Node 19 (Return Stopped)

#### Node 4: Create Run Record
- Handler: `kinetic_core_api_v1`
- Method: `POST`
- URL: `/app/api/v1/kapps/service-portal/forms/scheduled-job-runs/submissions`
- Headers: `{"content-type": "application/json"}`
- Body:
```ruby
{
  "values": {
    "Job ID": "<%= @inputs['Job ID'] %>",
    "Run Number": "<%= @inputs['Run Number'] %>",
    "Status": "Running",
    "Started At": "<%= Time.now.utc.iso8601 %>"
  },
  "coreState": "Submitted"
}
```
- Save the submission ID from the response for later updates

#### Node 5: Execute Operation
- Handler: `kinetic_core_api_v1`
- Method: `POST`
- URL: `/app/integrator/api/execute`
- Headers: `{"content-type": "application/json"}`
- Body:
```ruby
<%=
  job = JSON.parse(@results['Read Job']['Response Body'])['submission']
  conn_id = job['values']['Connection ID']
  op_id = job['values']['Operation ID']
  params = job['values']['Operation Parameters'].to_s
  params = '{}' if params.empty?

  prev = @inputs['Previous Output'].to_s
  prev = '{}' if prev.empty?

  # Merge static params with previous output
  static = JSON.parse(params) rescue {}
  previous = JSON.parse(prev) rescue {}
  merged = static.merge(previous)

  {
    'connectionId' => conn_id,
    'operationId' => op_id,
    'parameters' => merged
  }.to_json
%>
```
- Error Handling: `Error Message`

#### Node 6: Calculate Duration
- Handler: `utilities_echo_v1`
- Input: Duration calculation (or use a No-op and calculate in the next node's ERB)

#### Node 7a: Update Run — Success
- Condition: `@results['Execute Operation']['Handler Error Message'].to_s.empty?`
- Handler: `kinetic_core_api_v1`
- Method: `PUT`
- URL: `/app/api/v1/submissions/<%= JSON.parse(@results['Create Run Record']['Response Body'])['submission']['id'] %>`
- Body: Update with Status=Success, Completed At, Duration Ms, Routine Output (from Execute Operation response)

#### Node 7b: Update Run — Error
- Condition: `!@results['Execute Operation']['Handler Error Message'].to_s.empty?`
- Handler: `kinetic_core_api_v1`
- Method: `PUT`
- URL: Same as 7a
- Body: Update with Status=Error, Error Details, Completed At

Then from 7b:

#### Node 8: Update Job Error Status
- Handler: `kinetic_core_api_v1`
- Method: `PUT`
- URL: `/app/api/v1/submissions/<%= @inputs['Job ID'] %>`
- Body: `{"values": {"Status": "Error"}}`
- Then → Node 19 (Return Error)

From Node 7a (success path):

#### Node 9: Re-read Job (check guards)
- Same as Node 2 — re-read to check Max Runs, Expires At

#### Node 10: Guard — Max Runs
- Conditional connector checking if Max Runs is set and current Run Number >= Max Runs
- If exceeded → update job Status to Inactive → Return Stopped

#### Node 11: Guard — Expiry
- Conditional connector checking if Expires At is set and now > Expires At
- If expired → update job Status to Inactive → Return Stopped

#### Node 12: Calculate Wait Duration
- Handler: `utilities_echo_v1`
- Input: ERB to calculate wait seconds based on Schedule Type
```ruby
<%=
  job = JSON.parse(@results['Re-read Job']['Response Body'])['submission']
  v = job['values']
  if v['Schedule Type'] == 'Interval'
    seconds = (v['Interval Minutes'].to_i * 60)
    seconds = 60 if seconds < 60
    seconds.to_s
  else
    # Time of Day calculation — compute seconds until next target
    # (requires timezone handling — see spec for pseudocode)
    '3600' # placeholder — implement proper time-of-day logic
  end
%>
```

#### Node 13: Update Run — Next Run At
- Handler: `kinetic_core_api_v1`
- Update the run record with `Next Run At` calculated from now + wait duration

#### Node 14: Wait
- Handler: `system_wait_v1`
- **CRITICAL:** Set `defers: true`, `deferrable: true`
- Parameter `Time to wait`: `<%= @results['Calculate Wait Duration']['output'] %>`
- Parameter `Time unit`: `Second`

**Create connector** (fires immediately when Wait enters deferral):
→ Node 15: Store Token

**Complete connector** (fires when Wait completes):
→ Node 16: Post-Wake Read Job

#### Node 15: Store Token (on Create connector from Wait)
- Handler: `kinetic_core_api_v1`
- Method: `PUT`
- URL: `/app/api/v1/submissions/<%= @inputs['Job ID'] %>`
- Body:
```json
{
  "values": {
    "Current Deferral Token": "<%= @task['Deferral Token'] %>",
    "Last Run ID": "<%= JSON.parse(@results['Create Run Record']['Response Body'])['submission']['id'] %>"
  }
}
```

#### Node 16: Post-Wake Read Job (on Complete connector from Wait)
- Handler: `kinetic_core_api_v1`
- Same as Node 2 — re-read job after waking

#### Node 17: Post-Wake Guard
- Conditional connector checking Status == 'Active'
- If not Active → Node 19 (Return Stopped)

#### Node 18: Recurse — Call Self
- Call this same routine with:
  - `Job ID` = `<%= @inputs['Job ID'] %>`
  - `Run Number` = `<%= @inputs['Run Number'].to_i + 1 %>`
  - `Previous Output` = `<%= @results['Execute Operation']['Response Body'] %>`

#### Node 19: Return
- Handler: `system_tree_return_v1`
- Multiple instances for different exit points (Stopped, Error, Success)
- Parameters: `Status` and `Message`

---

## 2. Scheduler Start Tree — Wire Up Routine Call

The Scheduler Start tree currently validates config and logs. It needs to be updated to call the Execute Schedule Tick routine after validation passes.

**Update in workflow builder:**
1. Open the "Scheduler Start" tree on the `scheduled-jobs` form
2. After the "Log Start" echo node, add a node that calls the "Execute Schedule Tick" routine
3. Pass inputs:
   - `Job ID` = `<%= @source['Id'] %>`
   - `Run Number` = `1`
   - `Previous Output` = (empty)

---

## 3. Restart Scheduled Job WebAPI Tree

The WebAPI endpoint is created at `service-portal/restart-scheduled-job`. Build its tree in the workflow builder.

### Nodes

1. **Start** → Read `jobId` from `@request_query_params.fetch('jobId', '')`

2. **Read Job** — GET the job submission
   - Error → Return 404

3. **Query Running Runs** — Search `scheduled-job-runs` where Job ID matches AND Status = 'Running'
   - If found and recent (Started At within reasonable threshold) → Return 409 "Job is still running"
   - If found but stale → Update that run to Status = 'Error'

4. **Set Restarting** — PUT job Status = 'Restarting'

5. **Complete Old Deferral** — If `Current Deferral Token` is not empty, call `utilities_create_trigger_v1`:
   - `action_type` = `Complete`
   - `deferral_token` = the token value
   - `deferred_variables` = `<results></results>`

6. **Set Active** — PUT job Status = 'Active', clear Current Deferral Token

7. **Get Last Run** — Query most recent `scheduled-job-runs` for this job to get Run Number

8. **Call Execute Schedule Tick** — Call the routine with:
   - `Job ID` = jobId
   - `Run Number` = last Run Number + 1 (or 1 if no runs)
   - `Previous Output` = (empty)

9. **Return Success** — on **Create connector** from the routine call (fires immediately, don't wait):
   - `response_code` = `200`
   - `content_type` = `application/json`
   - `content` = `{"status": "restarted", "jobId": "<%= @request_query_params['jobId'] %>"}`

10. **Return Error** — for the "still running" case:
    - `response_code` = `409`
    - `content` = `{"error": "Job is still running"}`

11. **Return Not Found** — for invalid jobId:
    - `response_code` = `404`
    - `content` = `{"error": "Job not found"}`

**CRITICAL:** The Return Success node must be on the **Create connector** from the routine call, not the Complete connector. The routine runs indefinitely — waiting for it would timeout the WebAPI's 30-second limit.

---

## Testing Checklist

After building the workflows:

- [ ] Create a test Operation on the "Kinetic Platform" connection (e.g., GET /space — a harmless read)
- [ ] Create a Scheduled Job via the admin UI selecting that operation, Interval = 2 min, Status = Active
- [ ] Verify the Scheduler Start tree fires (check workflow runs in the Task builder)
- [ ] Verify a `scheduled-job-runs` record is created with Status = Running → Success
- [ ] Verify the Wait node is in Deferred state
- [ ] Wait 2+ minutes, verify a second run appears
- [ ] Set job Status to Paused, verify chain stops on next wake
- [ ] Test the Restart WebAPI via the admin UI's Activate button
- [ ] Test error handling: create a job pointing to a non-existent operation ID
