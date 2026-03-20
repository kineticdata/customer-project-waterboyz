# Kinetic Platform Configuration

> **Source of truth:** This document is maintained from live platform data via MCP tools. Last synced: 2026-03-20.
> To re-sync, use the `core_listForms`, `core_retrieveSpace`, `core_listKappIntegrations`, `core_listTeams`, and `core_retrieveFormWorkflow` MCP tools.

---

## Space Configuration

- **Space Name:** Waterboyz
- **Space Slug:** `waterboyz`
- **Default Locale:** `en`
- **Default Timezone:** `America/Detroit`
- **Display Type:** Custom (hosted portal)
- **Trusted Frame Domains:** `localhost:3000`

### Space Attribute Definitions

| Attribute | Allows Multiple | Description |
|-----------|:-:|---|
| Service Portal Kapp Slug | No | Slug of the service portal kapp (defaults to "service-portal") |
| System Kapp Slug | No | Slug of the system kapp (defaults to "system") |
| Theme | No | Custom theming configuration (JSON) — do not edit manually |
| Web Server Url | No | Platform URL (`https://waterboyz.kinops.io`) |

### User Attribute Definitions

| Attribute | Description |
|-----------|---|
| Volunteer Id | Links user account to a volunteer record in the `volunteers` datastore |

### User Profile Attribute Definitions

| Attribute | Description |
|-----------|---|
| Volunteer Profile Updated At | Timestamp of the last time the volunteer profile was updated |

---

## Kapp & Forms

All forms live under the **`service-portal`** kapp.

### Kapp Attribute Definitions

| Attribute | Description |
|-----------|---|
| Theme | Kapp-level theme configuration |
| SWAT Support Email | Support contact email for SWAT operations |

### Form Attribute Definitions

| Attribute | Allows Multiple | Description |
|-----------|:-:|---|
| Approvers | No | Approver(s) for the form |
| Departments | Yes | Associated departments |
| Icon | No | Tabler Icons library icon name |

### Category Attribute Definitions

| Attribute | Description |
|-----------|---|
| Hidden | Whether category is hidden from UI ("true"/"false") |
| Icon | Tabler Icons library icon name |
| Parent | Slug of parent category (for nesting) |

---

## Categories

| Category | Slug | Icon | Forms |
|----------|------|------|-------|
| Christmas Alive | `christmas-alive` | `christmas-tree` | `christmas-alive-family-nomination` |
| SWAT | `swat` | `tool` | `swat-project-nomination` |
| Popular Services | `popular-services` | *(none)* | `volunteers` *(hidden category)* |

---

## Forms — Detailed Field Reference

### Nomination Forms (user-facing requests)

#### Christmas Alive Family Nomination (`christmas-alive-family-nomination`)
- **Type:** Nominations | **Status:** Active
- **Category:** `christmas-alive` | **Icon:** `pointer-cancel`
- **Description:** Nominate a family for Christmas Alive
- **Fields:** First Name, Last Name, Email, Phone Number, Address, County, Native Language, Needs Interpreter, Family Members JSON, Support Received, Background on the Family, Total Adults, Total Children, Family Status, Requested By
- **Workflows:** "Nomination Process" (on Submitted), "On Update" (on Updated)

#### Nominate a SWAT Project (`swat-project-nomination`)
- **Type:** Nominations | **Status:** Active
- **Category:** `swat`
- **Description:** Nominate a family in need for a SWAT project
- **Fields:** Nominator Full Name, Nominator Phone Number, Nominator Email, Associated Organization, First Name, Last Name, Phone Number, Email, Project Urgency, Project Photos, Address Line 1, Address Line 2, City, State, Zip, County, Project Notes, Status
- **Workflows:** "SWAT Project Initiation" (on Submitted) — creates a Family record, then routes to SWAT Project Approval

### Datastore Forms (backend data)

#### SWAT Projects (`swat-projects`)
- **Type:** Datastore | **Status:** Active
- **Description:** Core project records
- **Fields (26):** Additional Volunteers Needed, Project Name, Project Captain, Scheduled Date, Completion Date, Project Status, Family Type, Skills Needed, Equipment Needed, Family Communication Complete, Project Documents, Project Photos, Address Line 1, Address Line 2, City, State, Zip, County, Tasks JSON, Family ID, Project Notes, Original Request ID, Approval ID, Associated Event, Project Tasks Man Hours Total, Total Project Man Hours
- **Security:** Display = SWAT Leadership, Access/Modification = SWAT Leadership and Project Captain
- **Key Relationships:**
  - `Family ID` → links to `families` datastore
  - `Original Request ID` → links to originating `swat-project-nomination` submission
  - `Approval ID` → links to `swat-project-approval` submission
  - `Project Captain` → username of assigned captain (member of SWAT Project Captains team)
  - `Associated Event` → links to an `events` submission ID

#### Families (`families`)
- **Type:** Datastore | **Status:** Active
- **Description:** Families being served, have been served, or will be served
- **Fields (12):** First Name, Last Name, Email, Phone Number, Address Line 1, Address Line 2, City, State, Zip, County, Native Language, Needs Interpreter
- **Security:** Display/Access/Modification = SWAT Leadership

#### Family Members (`family-members`)
- **Type:** Datastore | **Status:** Active
- **Description:** Individual family member records
- **Fields (6):** First Name, Last Name, Age, Gender, Type, Family ID
- **Security:** Display/Access/Modification = SWAT Leadership
- **Key Relationships:**
  - `Family ID` → links to `families` datastore submission ID

#### Volunteers (`volunteers`)
- **Type:** Datastore | **Status:** Active
- **Description:** Volunteer directory
- **Fields (21):** First Name, Last Name, Email Address, Phone Number, Affiliated Organization, Address Line 1, Address Line 2, City, State, Zip, Bio, Languages You Know, Skill Areas, Other Skills, Tools, How often can you volunteer, Other Availability, Preferred Service Area, Dietary Restrictions, Photo Consent, Username
- **Security:** Display = Authenticated Users, Access/Modification = SWAT Leadership Project Captains and Volunteer
- **Field notes:**
  - `Skill Areas`, `Tools`, `Languages You Know`, `Preferred Service Area`, `Dietary Restrictions` — stored as JSON-serialized string arrays (e.g., `'["Plumbing","Painting"]'`)
  - `Affiliated Organization` — freetext or selected from `affiliates` datastore
- **Key Relationships:**
  - `Username` → links to a user account (user attribute "Volunteer Id" links back)

#### SWAT Project Volunteers (`swat-project-volunteers`)
- **Type:** Datastore | **Status:** Active
- **Description:** Junction table linking volunteers to projects
- **Fields (5):** Volunteer ID, Present, Project ID, Status, Request Notes
- **Security:** Display = Project Captains and SWAT Leadership, Access = Volunteer Association Access, Modification = Project Captains and SWAT Leadership
- **Key Relationships:**
  - `Project ID` → links to `swat-projects` submission ID
  - `Volunteer ID` → links to `volunteers` submission ID

#### Project Notes (`project-notes`)
- **Type:** Datastore | **Status:** Active
- **Description:** Version-controlled notes for SWAT projects. Each submission is a snapshot of the full notes content at a point in time.
- **Fields (2):** Project ID, Content
- **Security:** Display/Access/Modification = Project Captains and SWAT Leadership

#### Reimbursements (`reimbursements`)
- **Type:** Datastore | **Status:** Active
- **Description:** Expense/reimbursement tracking per project
- **Fields (12):** Payee Name, Payee Address Line 1, Payee Address Line 2, Payee City, Payee State, Payee Zip, Project ID, Notes, Total Amount, Receipts, Status, Check Number
- **Key Relationships:**
  - `Project ID` → links to `swat-projects` submission ID

#### Events (`events`)
- **Type:** Datastore | **Status:** Active
- **Description:** Serve day events — records that group volunteers and projects for a given date
- **Fields (6):** Event Name, Event Date, Event Description, Event Status, Sign-up Deadline, Sign Up Form Slug
- **Security:** Display = SWAT Leadership, Access = Everyone, Modification = SWAT Leadership
- **Icon:** `calendar-event`
- **Field notes:**
  - `Event Status` choices: `Planning`, `Open`, `Closed`, `Completed`
  - `Sign Up Form Slug` — slug of the sign-up form to use for this event (defaults to `serve-day-sign-up` if blank)
- **Portal access:** `/events` (authenticated volunteer list), `/events/:eventId/assign` (leadership assignment view), `/admin/events` (admin CRUD via AdminFormRecords), `/public/events` (public listing, no auth), `/public/events/:formSlug?eventId=<id>` (public sign-up)

#### Programs (`programs`)
- **Type:** Datastore | **Status:** Active
- **Description:** Configurable programs displayed on the home page (SWAT, Christmas Alive, etc.)
- **Fields (7):** Program Name, Description, Icon, Color, Status, Nomination Form Slug, Home Page Order
- **Icon:** `apps`
- **Used by:** `HomeNominator.jsx` fetches active programs to render nomination cards

#### Skills (`skills`)
- **Type:** Datastore | **Status:** Active
- **Description:** Reference data for skill categories
- **Fields (2):** Skill Category, Skill
- **Security:** Display = SWAT Leadership, Access = Authenticated Users, Modification = SWAT Leadership

#### Tools (`tools`)
- **Type:** Datastore | **Status:** Active
- **Description:** Reference data for tool categories
- **Fields (2):** Tool Category, Tool
- **Security:** Display = SWAT Leadership, Access = Authenticated Users, Modification = SWAT Leadership

#### Affiliates (`affiliates`)
- **Type:** Datastore | **Status:** Active
- **Description:** Organizations affiliated with Waterboyz (churches, community orgs)
- **Fields (2):** Name, Primary POC Email

#### States (`states`)
- **Type:** Datastore | **Status:** Active
- **Fields (2):** Name, Abbreviation

#### State Counties (`state-counties`)
- **Type:** Datastore | **Status:** Active
- **Fields (2):** State Abbr, County Name

#### Scheduled Job Runs (`scheduled-job-runs`)
- **Type:** Datastore | **Status:** Active
- **Description:** Execution log for scheduled jobs. One submission per run, providing audit trail.
- **Fields (9):** Job ID, Run Number, Status, Started At, Completed At, Duration Ms, Routine Output, Error Details, Next Run At
- **Security:** Display/Access/Modification = Admins

### Event Sign-Up Forms

Event sign-up forms are Kinetic forms with **type `Event Sign Up`**. They are queried kapp-wide (no form slug filter) by type + `values[Event ID]`. Each event gets its own sign-up form cloned from the template, with a unique slug that serves as the public URL.

Sign-up forms support **anonymous (public) submissions** — `anonymous: true` is set on the form, and the Display security policy is "Everyone". This allows anyone to sign up without an account via the public portal at `/public/events/:formSlug?eventId=<id>`. Authenticated users visiting `/public/events/*` are redirected to `/events`.

#### Serve Day Sign-Up (`serve-day-sign-up`)
- **Type:** Event Sign Up | **Status:** Active | **Anonymous:** Yes
- **Description:** Default sign-up form for serve day events
- **Fields (12):** First Name, Last Name, Email, Phone Number, Who is Serving, Total Number of Volunteers, Who Else Is Serving, Notes, Project Preference, Event ID, Volunteer ID, Signup Status
- **Security:** Display = Everyone, Access/Modification = Submitter or SWAT Leadership
- **Field notes:**
  - `First Name`, `Last Name`, `Email` — required contact fields (captured for anonymous signups)
  - `Who is Serving` — radio: "Just Me" or "With Others" (conditionally shows group fields)
  - `Event ID` — submission ID of the `events` record (pre-populated via `eventId` query param)
  - `Volunteer ID` — optional; auto-populated from user profile if logged in, empty for anonymous signups
  - `Signup Status` choices: `Signed Up` (default), `Pending Assignment`, `Assigned`, `Waitlisted`, `Cancelled`

#### Event Signup Template (`event-signup-template`)
- **Type:** Event Sign Up | **Status:** Inactive | **Anonymous:** Yes
- **Description:** Template for creating event-specific sign-up forms. Clone this form and set a unique slug for each event.
- **Fields:** Same as `serve-day-sign-up` plus `Affiliated Organization`
- **Security:** Display = Everyone, Access/Modification = Submitter or SWAT Leadership

### Workflow/Approval Forms

#### Approval (`approval`)
- **Type:** Approval | **Status:** Inactive
- **Icon:** `circle-dashed-check`
- **Description:** Auto-created by workflow engine for generic approval tasks
- **Fields (12):** Decision, Reason, Notes for Customer, Assigned Individual, Assigned Individual Display Name, Assigned Team, Assigned Team Display Name, Deferral Token, Status, Summary, Due Date, Details
- **Workflows:** "Approval Submitted" (on Submitted)

#### SWAT Project Approval (`swat-project-approval`)
- **Type:** Approval | **Status:** Active
- **Icon:** `circle-dashed-check`
- **Description:** Leadership review of SWAT project nominations
- **Fields (18):** Decision, Reason, Project Name, Initial Project Captain, Approved Budget, Assigned Individual, Assigned Individual Display Name, Assigned Team, Assigned Team Display Name, Deferral Token, Status, Summary, Due Date, Details, Originating Id, Family Last Name, Family ID, Project Notes
- **Workflows:** "Complete Approval" (on Submitted) — triggers parent workflow via deferral token, passing the Decision back
- **Key Relationships:**
  - `Originating Id` → links back to `swat-project-nomination` submission
  - `Family ID` → links to `families` datastore

### Utility Forms

#### Account Password Reset (`account-password-reset`)
- **Type:** Utility | **Status:** Active
- **Fields (3):** Username, Display Name, Password Reset URL
- **Workflows:** "Account Password Reset Submitted" (on Submitted)

#### Account Registration (`account-registration`)
- **Type:** Utility | **Status:** Active
- **Fields (2):** Email Address, Display Name
- **Workflows:** "Account Registration" (on Submitted)

#### Request to Join SWAT Project (`request-to-join-swat-project`)
- **Type:** Utility | **Status:** Active
- **Description:** Utility form for volunteers to request joining a SWAT project. Triggers a workflow that creates or reactivates the volunteer-project association.
- **Fields (4):** Project ID, Volunteer ID, Project Name, Notes
- **Security:** Display = SWAT Leadership Project Captains and All Volunteers, Access = Submitter
- **Workflows:** "Request to Join Submitted" (on Submitted)

---

## Data Relationships Diagram

```
swat-project-nomination (Nominations)
  |  [Submission Submitted -> "SWAT Project Initiation" workflow]
  |
  |--creates--> families (Datastore)
  |                |
  |                +--referenced by--> family-members.Family ID
  |
  +--creates--> swat-project-approval (Approval)
                   |  Originating Id -> nomination submission ID
                   |  Family ID -> families submission ID
                   |
                   |  [Submission Submitted -> "Complete Approval" workflow]
                   |  (triggers parent via deferral token)
                   |
                   +--on approve, creates--> swat-projects (Datastore)
                                               |  Original Request ID -> nomination ID
                                               |  Approval ID -> approval ID
                                               |  Family ID -> families ID
                                               |  Project Captain -> username
                                               |  Associated Event -> events ID (optional)
                                               |
                                               |--referenced by--> swat-project-volunteers
                                               |                    Project ID -> project ID
                                               |                    Volunteer ID -> volunteers ID
                                               |
                                               |--referenced by--> reimbursements.Project ID
                                               |
                                               |--referenced by--> project-notes.Project ID
                                               |
                                               +--volunteers linked via--> volunteers (Datastore)
                                                                            Username -> user account

events (Datastore)
  |  Sign Up Form Slug -> slug of the sign-up form for this event
  |
  |--referenced by--> swat-projects.Associated Event
  |
  +--signups via--> serve-day-sign-up (Event Sign Up) [or custom event form]
                      |  Event ID -> events submission ID
                      |  Volunteer ID -> volunteers submission ID
                      |  Signup Status: Signed Up -> Assigned / Waitlisted / Cancelled
                      |
                      +--assigned via--> swat-project-volunteers
                                          (created by leadership in EventsAssign)

request-to-join-swat-project (Utility)
  |  [Submission Submitted -> "Request to Join Submitted" workflow]
  |
  +--creates or reactivates--> swat-project-volunteers
                                 Status = "Pending Approval"
                                 Notifies Project Captain via email

Note: sign-up forms are queried kapp-wide by type = "Event Sign Up" (not by form slug).
The kapp must have a compound index on [type, values[Event ID]] for EventsAssign to work.
```

---

## Workflows — Detailed

### Space-Level

#### User Created
- **Event:** User Created
- **Flow:** Start → Get User (integration) → Get Password Reset URL (routine) → Send Welcome Email (SMTP)
- **Email:** "Welcome to Waterboyz — Set Up Your Account" from `wally@kinops.io`
- **Includes:** Password reset link (24h expiry), branded HTML + plaintext fallback

### Form-Level

#### SWAT Project Initiation (`swat-project-nomination`)
- **Event:** Submission Submitted
- **Flow:**
  1. **Leadership Approval** — Defers (pauses) the workflow, waiting for leadership to act
  2. **Create Approval Record** — Creates a `swat-project-approval` submission (Draft state) assigned to SWAT Leadership team, with deferral token
  3. **Activity - Approval** — Logs activity on the nomination
  4. **Get SWAT Project Approvers** — Fetches email list from SWAT Project Approvers team
  5. **Notify SWAT Project Approvers** — Sends email with "Review Nomination" link to `/#/actions/<approvalId>`
  6. *(workflow pauses until approval is submitted)*
  7. **Lookup Approval** — Reads the submitted approval decision
  8. **Activity - Approval Update** — Logs the decision
  9. **Branch: Approved** → Retrieve Family Record → Get Captain → Create Project Record (`swat-projects` with status "Planning", seed tasks, address from family) → Add Captain as First Volunteer (`swat-project-volunteers`) → Copy Nominator Attachments (photos)
  10. **Branch: Denied** → Send Denial Email to nominator

#### Complete Approval (`swat-project-approval`)
- **Event:** Submission Submitted
- **Flow:** Start → Trigger Parent Workflow (sends `Complete` action with Decision back to the deferred SWAT Project Initiation workflow via deferral token)

#### Account Registration (`account-registration`)
- **Event:** Submission Submitted
- **Flow:**
  1. **Check if User Exists** — Looks up user by email
  2. **Branch: User Doesn't Exist** → Create User (random password, enabled) → *(triggers "User Created" space workflow which sends welcome email)*
  3. **Branch: User Already Exists** → Generate Password Reset Link → Send "Account Already Exists" email with reset link

#### Account Password Reset Submitted (`account-password-reset`)
- **Event:** Submission Submitted
- **Flow:** Start → Get User → Get Password Reset URL → Update Submission with Display Name → Send Reset Password Email from `noreply@waterboyz.org`

#### Request to Join Submitted (`request-to-join-swat-project`)
- **Event:** Submission Submitted
- **Flow:**
  1. **Check Existing** — Searches for existing `swat-project-volunteers` record for this volunteer + project
  2. **Branch: No Record** → Create Association (status = "Pending Approval")
  3. **Branch: Reactivate Removed** → Update existing record (status = "Pending Approval", store Request Notes)
  4. **Branch: Already Active/Pending** → No-op (complete duplicate)
  5. *(after create or reactivate)* → Retrieve Project → Get Captain → Get Volunteer → Send Email to captain ("[Name] wants to join [Project]" with link to volunteers tab) → Close Request submission

#### Nomination Process (`christmas-alive-family-nomination`)
- **Event:** Submission Submitted

#### On Update (`christmas-alive-family-nomination`)
- **Event:** Submission Updated

#### Approval Submitted (`approval`)
- **Event:** Submission Submitted

---

## Server-Side Integrations (Kapp-Level)

All integrations share the same connection (`1415539c-bb98-48bb-ad33-11be25189ad0`) to the Kinetic Platform bridge.

| Integration Name | Input Mappings | Purpose |
|------------------|----------------|---------|
| Events - List | *(none)* | Fetch all event records |
| Families - Retrieve | *(none)* | Fetch all family records |
| Family - Retrieve By ID | `Family ID` ← `values('Family ID')` | Fetch a single family by Family ID field |
| Family Members - Retrieve | `Family ID` ← `values('Family ID')` | Fetch family members for a given Family ID |
| Project Captains Retrieve | *(none)* | Fetch list of project captains |
| Project Retrieve | `Project ID` ← `values('Project ID')` | Fetch a single project by ID |
| Project Volunteers - Retrieve | `Project ID` ← `values('Project ID')` | Fetch volunteers assigned to a project |
| Projects - Retrieve | `COMMA SEPARATED LIST OF PROJECT IDs` ← `values('CSV of Project IDs')` | Fetch multiple projects by ID list |
| Projects by Family ID | `Family ID` ← `values('Family ID')` | Fetch projects associated with a family |
| Upcoming SWAT Projects | *(none)* | Fetch upcoming/active SWAT projects |

---

## Teams & Roles

| Team | Slug | Description | Members |
|------|------|-------------|---------|
| Bookkeepers | `79996d3f...` | Financial record keeping / reimbursement processing | james.davies@kineticdata.com |
| Christmas Alive Nominators | `cd0f441a...` | People with nomination access for Christmas Alive | *(none currently)* |
| SWAT Leadership | `4f93f090...` | Project approvals and oversight | james.davies@kineticdata.com, jameswd89+leadership@gmail.com, juddz@waterboyz.org, lad12der@gmail.com, mr.currence@gmail.com, paulf@waterboyz.org |
| SWAT Project Approvers | `aa1c27fd...` | Receive email notifications when new nominations need approval | james.davies@kineticdata.com, juddz@waterboyz.org, lad12der@gmail.com |
| SWAT Project Captains | `c9e76136...` | People who lead SWAT projects | james.davies@kineticdata.com, jameswd89+captain@gmail.com, lad12der@gmail.com, mr.currence@gmail.com |

---

## Security Policies

### Space-Level
| Policy | Type | Rule | Description |
|--------|------|------|-------------|
| Admins | Space | `false` | Only space admins (denies all others) |
| Authenticated Users | Space | `identity('authenticated')` | Must be logged in |
| Everyone | Space | `true` | Open access |
| SWAT Leadership | Space | `hasIntersection(identity('teams'), ['SWAT Leadership'])` | Must be SWAT Leadership team member |

### Kapp-Level
| Policy | Type | Description |
|--------|------|-------------|
| Admins | Kapp | Only space admins |
| Authenticated Users | Kapp | Must be authenticated |
| Bookkeepers Project Captains and SWAT Leadership | Kapp | Must be member of Bookkeepers, SWAT Leadership, or SWAT Project Captains team |
| Can Retrieve Family Member Details | Kapp | Must be a Christmas Alive Nominator (**Note:** rule has typo "Christams" — should be "Christmas") |
| Everyone | Kapp | Open access |
| Is Volunteer | Kapp | User must have a non-empty "Volunteer Id" attribute |
| Project Captains and SWAT Leadership | Kapp | Must be member of SWAT Leadership or SWAT Project Captains team |
| Submitter | Submission | Must be the user who created the submission (supports anonymous sessions) |
| Submitter or SWAT Leadership | Submission | Submitter OR member of SWAT Leadership team |
| SWAT Leadership | Kapp | Must be member of SWAT Leadership team |
| SWAT Leadership and Project Captain | Submission | SWAT Leadership OR the captain assigned to the project (`values['Project Captain']`) |
| SWAT Leadership Project Captains and All Volunteers | Kapp | SWAT Leadership, Project Captains, or any user with a Volunteer Id attribute |
| SWAT Leadership Project Captains and Volunteer | Submission | SWAT Leadership, Project Captains, or the specific volunteer (matched by Email, Username, or Volunteer ID) |
| Volunteer Association Access | Submission | SWAT Leadership, Project Captains, or the volunteer referenced in the record |

---

## Bridge Models

| Model | Active Mapping | Structure | Attributes | Qualifications |
|-------|---------------|-----------|------------|----------------|
| Users | Users | Users (kinetic-platform bridge, system agent) | username | All Users (Multiple) |
