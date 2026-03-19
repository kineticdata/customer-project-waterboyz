# Waterboyz Project

## Organization Context

Waterboyz is a nonprofit organization affiliated with local churches and Christian organizations. They help underserved families — foster families, single-parent households, and others in need — with home repair and improvement projects. Waterboyz recruits volunteers from the community and matches them with projects based on skills and availability.

## Application Overview

This is a **project management and volunteer coordination portal** built on the [Kinetic Platform](https://waterboyz.kinops.io). The portal is a React (Vite) app located in the `portal/` directory that uses the `@kineticdata/react` SDK to interact with the Kinetic API.

### Core Workflow

1. **Intake** — Families in need are nominated by churches, community orgs, or individuals via service request forms (`swat-project-nomination`, `christmas-alive-family-nomination`).
2. **Approval** — SWAT Leadership reviews nominations (`swat-project-approval`), sets an approved budget, and assigns an initial Project Captain.
3. **Project Management** — Once approved, the project is tracked in `swat-projects`. The Project Captain manages tasks, recruits volunteers, submits expenses, and documents the project with photos and notes.
4. **Volunteer Management** — Volunteers register their skills, tools, and availability (`volunteers` form) and are matched to projects through the `swat-project-volunteers` junction form.
5. **Events & Serve Days** — SWAT Leadership creates serve day `events`. Each event gets its own sign-up form (cloned from `event-signup-template`) with a unique slug. **Public sign-up** is available at `/public/events/:formSlug` — anyone can sign up without an account by providing their name, email, and phone. After signup, users are prompted to create an account and volunteer profile. Leadership uses the Assign page (`/events/:eventId/assign`) to match signed-up volunteers to specific SWAT projects. The Assign page shows an "Unregistered" badge for anonymous signups that haven't created an account yet.

## Tech Stack

- **Frontend:** React 18, Vite, React Router 6, Redux Toolkit
- **Styling:** Tailwind CSS v4, DaisyUI (prefixed with `k`)
- **Table:** `@tanstack/react-table` v8 (used by Volunteer Management)
- **Platform:** Kinetic Data Platform (REST API + workflow engine)
- **SDK:** `@kineticdata/react` for API interactions (submissions, forms, integrations)
- **Testing:** Playwright (in `frontend-testing/`)
- **Package Manager:** Yarn

## Project Structure

```
portal/
  src/
    components/       # Reusable UI components (header, home sections, modals)
      PublicLayout.jsx # Minimal branded layout for public (unauthenticated) pages
    helpers/           # API helpers, state management utilities
    pages/             # Route-based pages (home, projects, login, settings)
      admin/
        volunteer-management/  # Volunteer Management admin page (see below)
      public/          # Public (no auth required) pages
        PublicEventsList.jsx      # Browse open events
        PublicEventSignup.jsx     # CoreForm-based event sign-up
        PublicEventConfirmed.jsx  # Post-signup confirmation + kiosk re-signup
      projects/
        project/       # Individual project views (details, volunteers, expenses, photos)
    assets/            # Static assets
frontend-testing/      # Playwright test configuration
```

---

## Kinetic Platform — Space Configuration

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
| Manager | The user's manager |
| Volunteer Id | Links user account to a volunteer record in the `volunteers` datastore |

### User Profile Attribute Definitions

| Attribute | Description |
|-----------|---|
| First Name | User's first name |
| Last Name | User's last name |
| Cell Phone Number | User's cell phone |
| Theme | Selected portal theme name |
| Address - Street | Street address |
| Address - City | City |
| Address - State | State |
| Address - Zip | Zip code |
| Profile Last Updated Date | Timestamp of last profile update |

---

## Kinetic Platform — Kapp & Forms

All forms live under the **`service-portal`** kapp.

### Kapp Attribute Definitions

| Attribute | Description |
|-----------|---|
| Theme | Kapp-level theme configuration |
| Department Head | Department head reference |

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
- **Fields:** Nominator Type, Nominator Full Name, Nominator Phone Number, Nominator Email, Associated Organization, First Name, Last Name, Phone Number, Email, Project Urgency, Project Photos, Address Line 1, Address Line 2, City, State, Zip, County, Project Notes, Status
- **Workflows:** "SWAT Project Initiation" (on Submitted) — creates a Family record, then routes to SWAT Project Approval

### Datastore Forms (backend data)

#### SWAT Projects (`swat-projects`)
- **Type:** Datastore | **Status:** Active
- **Description:** Core project records
- **Fields (24):** Additional Volunteers Needed, Project Name, Project Captain, Scheduled Date, Completion Date, Project Status, Skills Needed, Equipment Needed, Project Documents, Project Photos, Address Line 1, Address Line 2, City, State, Zip, County, Tasks JSON, Family ID, Project Notes, Original Request ID, Approval ID, Associated Event, Project Tasks Man Hours Total, Total Project Man Hours
- **Key Relationships:**
  - `Family ID` → links to `families` datastore
  - `Original Request ID` → links to originating `swat-project-nomination` submission
  - `Approval ID` → links to `swat-project-approval` submission
  - `Project Captain` → username of assigned captain (member of SWAT Project Captains team)
  - `Associated Event` → links to an `events` submission ID (set by Project Captain when scheduling a project for a serve day)

#### Families (`families`)
- **Type:** Datastore | **Status:** Active
- **Description:** Families being served, have been served, or will be served
- **Fields (12):** First Name, Last Name, Email, Phone Number, Address Line 1, Address Line 2, City, State, Zip, County, Native Language, Needs Interpreter

#### Family Members (`family-members`)
- **Type:** Datastore | **Status:** New
- **Description:** Individual family member records
- **Fields (6):** First Name, Last Name, Age, Gender, Type, Family ID
- **Key Relationships:**
  - `Family ID` → links to `families` datastore submission ID

#### Volunteers (`volunteers`)
- **Type:** Datastore | **Status:** Active
- **Description:** Volunteer directory
- **Fields (21):** First Name, Last Name, Email Address, Phone Number, Affiliated Organization, Address Line 1, Address Line 2, City, State, Zip, Bio, Languages You Know, Skill Areas, Other Skills, Tools, How often can you volunteer, Other Availability, Preferred Service Area, Dietary Restrictions, Photo Consent, Username
- **Field notes:**
  - `Skill Areas`, `Tools`, `Languages You Know`, `Preferred Service Area`, `Dietary Restrictions` — stored as JSON-serialized string arrays (e.g., `'["Plumbing","Painting"]'`)
  - `Affiliated Organization` — freetext or selected from `affiliates` datastore
- **Key Relationships:**
  - `Username` → links to a user account (user attribute "Volunteer Id" links back)

#### SWAT Project Volunteers (`swat-project-volunteers`)
- **Type:** Datastore | **Status:** New
- **Description:** Junction table linking volunteers to projects
- **Fields (4):** Volunteer ID, Present, Project ID, Status
- **Key Relationships:**
  - `Project ID` → links to `swat-projects` submission ID
  - `Volunteer ID` → links to `volunteers` submission ID

#### Reimbursements (`reimbursements`)
- **Type:** Datastore | **Status:** Active
- **Description:** Expense/reimbursement tracking per project
- **Fields (12):** Payee Name, Payee Address Line 1, Payee Address Line 2, Payee City, Payee State, Payee Zip, Project ID, Notes, Total Amount, Receipts, Status, Check Number
- **Key Relationships:**
  - `Project ID` → links to `swat-projects` submission ID

#### Skills (`skills`)
- **Type:** Datastore | **Status:** New
- **Description:** Reference data for skill categories
- **Fields (2):** Skill Category, Skill

#### States (`states`)
- **Type:** Datastore | **Status:** Active
- **Fields (2):** Name, Abbreviation

#### State Counties (`state-counties`)
- **Type:** Datastore | **Status:** Active
- **Fields (2):** State Abbr, County Name

#### Tools (`tools`)
- **Type:** Datastore | **Status:** Active
- **Description:** Reference data for tool categories
- **Fields (2):** Tool Category, Tool

#### Affiliates (`affiliates`)
- **Type:** Datastore | **Status:** Active
- **Description:** Organizations affiliated with Waterboyz (churches, community orgs)
- **Fields (2):** Name, Primary POC Email

#### Portal Shortcuts (`portal-shortcuts`)
- **Type:** Datastore | **Status:** Active
- **Description:** Home page shortcuts configuration
- **Fields (8):** Status, Title, Description, URL, New Tab, Image, Icon Name, Sort Order

### Admin Forms

#### Events (`events`)
- **Type:** Admin | **Status:** Active
- **Description:** Serve day events — records that group volunteers and projects for a given date
- **Fields (6):** Event Name, Event Date, Event Description, Event Status, Sign-up Deadline, Sign Up Form Slug
- **Field notes:**
  - `Event Status` choices: `Planning`, `Open`, `Closed`, `Completed`
  - `Sign Up Form Slug` — slug of the sign-up form to use for this event (defaults to `serve-day-sign-up` if blank)
- **Portal access:** `/events` (authenticated volunteer list), `/events/:eventId/assign` (leadership assignment view), `/admin/events` (admin CRUD via AdminFormRecords), `/public/events` (public listing, no auth), `/public/events/:formSlug?eventId=<id>` (public sign-up — `eventId` query param sets the Event ID field on the form)

#### Programs (`programs`)
- **Type:** Admin | **Status:** Active
- **Description:** Configurable programs displayed on the home page (SWAT, Christmas Alive, etc.)
- **Fields (7):** Program Name, Description, Icon, Color, Status, Nomination Form Slug, Home Page Order
- **Used by:** `HomeNominator.jsx` fetches active programs to render nomination cards; falls back to hardcoded SWAT/Christmas Alive if no programs are configured

### Event Sign-Up Forms

Event sign-up forms are Kinetic forms with **type `Event Sign Up`**. They are queried kapp-wide (no form slug filter) by type + `values[Event ID]`. Each event gets its own sign-up form cloned from the template, with a unique slug that serves as the public URL.

Sign-up forms support **anonymous (public) submissions** — `anonymous: true` is set on the form, and the Display security policy is "Everyone". This allows anyone to sign up without an account via the public portal at `/public/events/:formSlug?eventId=<id>`. The `eventId` query parameter is passed from the public events listing and propagated through the signup → confirmation → re-signup (kiosk) flow so that the `Event ID` field is always pre-populated via CoreForm's `values` prop. Authenticated users visiting `/public/events/*` are redirected to `/events`.

#### Serve Day Sign-Up (`serve-day-sign-up`)
- **Type:** Event Sign Up | **Status:** Active | **Anonymous:** Yes
- **Description:** Default sign-up form for serve day events
- **Fields (12):** First Name, Last Name, Email, Phone Number, Who is Serving, Total Number of Volunteers, Who Else Is Serving, Notes, Project Preference, Event ID, Volunteer ID, Signup Status
- **Field notes:**
  - `First Name`, `Last Name`, `Email` — required contact fields (captured for anonymous signups)
  - `Who is Serving` — radio: "Just Me" or "With Others" (conditionally shows group fields)
  - `Event ID` — submission ID of the `events` record (pre-populated by the portal via `eventId` query param on public pages, or via `values` prop in `EventSignupModal` for authenticated users)
  - `Volunteer ID` — optional; auto-populated from user profile attribute if logged in, empty for anonymous signups
  - `Signup Status` choices: `Signed Up` (default), `Pending Assignment`, `Assigned`, `Waitlisted`, `Cancelled`
- **Security:** Display = Everyone, Submission Access = Submitter or SWAT Leadership

#### Event Signup Template (`event-signup-template`)
- **Type:** Event Sign Up | **Status:** Inactive | **Anonymous:** Yes
- **Description:** Template for creating event-specific sign-up forms. Clone this form and set a unique slug for each event.
- **Fields:** Same as `serve-day-sign-up` (First Name, Last Name, Email, Phone Number, Who is Serving, etc.)
- **Security:** Display = Everyone, Submission Access = Submitter or SWAT Leadership

### Workflow/Approval Forms

#### Approval (`approval`)
- **Type:** Approval | **Status:** Active
- **Icon:** `circle-dashed-check`
- **Description:** Auto-created by workflow engine for generic approval tasks
- **Fields (12):** Decision, Reason, Notes for Customer, Assigned Individual, Assigned Individual Display Name, Assigned Team, Assigned Team Display Name, Deferral Token, Status, Summary, Due Date, Details
- **Workflows:** "Approval Submitted" (on Submitted)

#### SWAT Project Approval (`swat-project-approval`)
- **Type:** Approval | **Status:** Active
- **Icon:** `circle-dashed-check`
- **Description:** Leadership review of SWAT project nominations
- **Fields (18):** Decision, Reason, Project Name, Initial Project Captain, Approved Budget, Assigned Individual, Assigned Individual Display Name, Assigned Team, Assigned Team Display Name, Deferral Token, Status, Summary, Due Date, Details, Originating Id, Family Last Name, Family ID, Project Notes
- **Workflows:** "Complete Approval" (on Submitted) — creates a `swat-projects` record when approved
- **Key Relationships:**
  - `Originating Id` → links back to `swat-project-nomination` submission
  - `Family ID` → links to `families` datastore

#### Task (`task`)
- **Type:** Task | **Status:** Active
- **Fields (10):** Status, Notes, Assigned Individual, Assigned Individual Display Name, Assigned Team, Assigned Team Display Name, Deferral Token, Details, Due Date, Summary
- **Workflows:** "Task Submitted" (on Submitted)

### Utility Forms

#### Account Password Reset (`account-password-reset`)
- **Type:** Utility | **Status:** Active
- **Fields (3):** Username, Display Name, Password Reset URL
- **Workflows:** "Account Password Reset Submitted" (on Submitted)

#### Account Registration (`account-registration`)
- **Type:** Utility | **Status:** Active
- **Fields (2):** Email Address, Display Name
- **Workflows:** "Account Registration" (on Submitted)

---

## Data Relationships Diagram

```
swat-project-nomination (Nominations)
  │  [Submission Submitted → "SWAT Project Initiation" workflow]
  │
  ├──creates──→ families (Datastore)
  │                │
  │                └──referenced by──→ family-members.Family ID
  │
  └──creates──→ swat-project-approval (Approval)
                   │  Originating Id → nomination submission ID
                   │  Family ID → families submission ID
                   │
                   │  [Submission Submitted → "Complete Approval" workflow]
                   │
                   └──on approve, creates──→ swat-projects (Datastore)
                                               │  Original Request ID → nomination ID
                                               │  Approval ID → approval ID
                                               │  Family ID → families ID
                                               │  Project Captain → username
                                               │  Associated Event → events submission ID (optional)
                                               │
                                               ├──referenced by──→ swat-project-volunteers
                                               │                    Project ID → project ID
                                               │                    Volunteer ID → volunteers ID
                                               │
                                               ├──referenced by──→ reimbursements.Project ID
                                               │
                                               └──volunteers linked via──→ volunteers (Datastore)
                                                                            Username → user account

events (Admin)
  │  Sign Up Form Slug → slug of the sign-up form for this event
  │
  ├──referenced by──→ swat-projects.Associated Event
  │
  └──signups via──→ serve-day-sign-up (Event Sign Up) [or custom event form]
                      │  Event ID → events submission ID
                      │  Volunteer ID → volunteers submission ID
                      │  Signup Status: Pending → Assigned / Waitlisted / Attended / Cancelled
                      │
                      └──assigned via──→ swat-project-volunteers
                                          (created by leadership in EventsAssign)
                                          Project ID → swat-projects submission ID
                                          Volunteer ID → volunteers submission ID

Note: sign-up forms are queried kapp-wide by type = "Event Sign Up" (not by form slug).
The kapp must have a compound index on [type, values[Event ID]] for EventsAssign to work.
```

---

## Workflows Summary

### Space-Level Workflows
| Workflow | Event | Description |
|----------|-------|-------------|
| User Created | User Created | Triggered when a new user is created in the space |

### Form-Level Workflows
| Form | Workflow | Event | Description |
|------|----------|-------|-------------|
| `swat-project-nomination` | SWAT Project Initiation | Submission Submitted | Creates family record, routes to SWAT Project Approval |
| `swat-project-approval` | Complete Approval | Submission Submitted | On approval, creates `swat-projects` record with linked data |
| `christmas-alive-family-nomination` | Nomination Process | Submission Submitted | Processes Christmas Alive family nominations |
| `christmas-alive-family-nomination` | On Update | Submission Updated | Handles updates to Christmas Alive nominations |
| `approval` | Approval Submitted | Submission Submitted | Completes generic approval workflow |
| `task` | Task Submitted | Submission Submitted | Completes generic task workflow |
| `account-password-reset` | Account Password Reset Submitted | Submission Submitted | Sends password reset email |
| `account-registration` | Account Registration | Submission Submitted | Creates user account and sends welcome email |

---

## Server-Side Integrations (Kapp-Level)

| Integration Name | Input Mappings | Purpose |
|------------------|----------------|---------|
| Families - Retrieve | *(none)* | Fetch all family records |
| Family - Retrieve By ID | `Family ID` ← `values('Family ID')` | Fetch a single family by Family ID field |
| Family Members - Retrieve | `Family ID` ← `values('Family ID')` | Fetch family members for a given Family ID |
| Projects - Retrieve | `Family ID` ← `values('Family ID')` | Fetch projects associated with a family |
| Project Volunteers - Retrieve | `Project ID` ← `values('Project ID')` | Fetch volunteers assigned to a project |
| Upcoming SWAT Projects | *(none)* | Fetch upcoming/active SWAT projects |

All integrations share the same connection (`1415539c-bb98-48bb-ad33-11be25189ad0`) to the Kinetic Platform bridge.

---

## Teams & Roles

| Team | Slug | Description | Members |
|------|------|-------------|---------|
| Bookkeepers | `79996d3f...` | Financial record keeping / reimbursement processing | james.davies@kineticdata.com |
| Christmas Alive Nominators | `cd0f441a...` | People with nomination access for Christmas Alive | *(none currently)* |
| SWAT Leadership | `4f93f090...` | Project approvals and oversight | james.davies@kineticdata.com, leadership |
| SWAT Project Captains | `c9e76136...` | People who lead SWAT projects | captain, james.davies@kineticdata.com |

---

## Security Policies

### Space-Level
| Policy | Rule | Description |
|--------|------|-------------|
| Admins | `false` | Only space admins (denies all others) |
| Authenticated Users | `identity('authenticated')` | Must be logged in |
| Everyone | `true` | Open access |

### Kapp-Level
| Policy | Type | Description |
|--------|------|-------------|
| Admins | Kapp | Only space admins |
| Authenticated Users | Kapp | Must be authenticated |
| Bookkeepers Project Captains and SWAT Leadership | Kapp | Must be member of Bookkeepers, SWAT Leadership, or SWAT Project Captains team |
| Can Retrieve Family Member Details | Kapp | Must be a Christmas Alive Nominator |
| Everyone | Kapp | Open access |
| Is Volunteer | Kapp | User must have a non-empty "Volunteer Id" attribute |
| Project Captains and SWAT Leadership | Kapp | Must be member of SWAT Leadership or SWAT Project Captains team |
| Submitter | Submission | Must be the user who created the submission |
| SWAT Leadership | Kapp | Must be member of SWAT Leadership team |

---

## Bridge Models

| Model | Active Mapping | Structure | Attributes | Qualifications |
|-------|---------------|-----------|------------|----------------|
| Users | Users | Users (kinetic-platform bridge, system agent) | username | All Users (Multiple) |

---

## Custom Widgets

Widgets are standalone React mini-apps rendered inside Kinetic forms via the `bundle.widgets` global. They live in `portal/src/components/kinetic-form/widgets/` and are registered through the shared widget infrastructure in `index.js`.

### Widget Architecture

- Each widget exports a factory function (e.g., `SkillPicker({ container, config, id })`) that validates inputs and calls `registerWidget()` to mount a React component into the provided DOM container.
- `registerWidget()` handles lifecycle management: creating a React root, tracking instances, and auto-cleanup via MutationObserver when the container is removed from the DOM.
- Widgets expose an API object (accessible via `bundle.widgets.WidgetName.get(id)`) for programmatic interaction from Kinetic form event code.
- All widgets are wrapped in `WidgetAPI` (a class component) to surface the API ref.
- Available widgets are mapped in `widgets.js` and attached to `window.bundle.widgets`.

### Available Widgets

| Widget | File | Description |
|--------|------|-------------|
| Markdown | `markdown.js` | Markdown editor/viewer |
| Search | `search.js` | Search field |
| Signature | `signature.js` | Signature capture |
| **SkillPicker** | `skillpicker.js` | Categorized skill selection for volunteers |
| Subform | `subform.js` | Embedded sub-form |
| Table | `table.js` | Data table |

### SkillPicker Widget

A categorized, collapsible checkbox picker that lets volunteers select skills. It fetches skill data from the `skills` datastore form and groups them by `Skill Category`.

**Data Source:** `skills` datastore form (kapp: `service-portal`, form: `skills`) with fields `Skill Category` and `Skill`.

**Skill Categories (in display order):**
1. Home Repair & Maintenance
2. Outdoor & Yard Work
3. Cleaning & Organization
4. Moving & Logistics
5. Furniture & Build Projects
6. Specialized Trades / Certifications
7. Family Care & Support
8. Communications & Storytelling
9. Leadership & Coordination
10. Other (stored as `zOther`)

**Usage in Kinetic Form event code:**
```js
bundle.widgets.SkillPicker({
  container: K('field[Skill Areas]').element().querySelector('.field-widget'),
  config: {
    kappSlug: 'service-portal',
    formSlug: 'skills',
    field: K('field[Skill Areas]'),     // Kinetic field reference for syncing value
    onChange: (skills) => { /* ... */ }, // Optional callback
  },
  id: 'skill-picker',
});
```

**Value format:** JSON-serialized string array (e.g., `'["Plumbing","Painting"]'`), stored in the bound Kinetic field.

**API methods (via `bundle.widgets.SkillPicker.get('skill-picker')`):**
- `getSelectedSkills()` — Returns array of selected skill names
- `setSelectedSkills(skills)` — Programmatically set selection
- `destroy()` — Unmount the widget
- `container()` — Returns the DOM container element

**UI behavior:**
- Categories display as collapsible accordion sections with Tabler icons and selection count badges
- Categories with pre-selected skills auto-expand on load
- Skills within each category render as a 2-column checkbox grid
- Selected count summary shown below the picker

**Dependencies:** `useData` hook (from `helpers/hooks/useData.js`), `Icon` atom (Tabler Icons), `clsx`, `@kineticdata/react` for `searchSubmissions`.

---

## Key API Patterns

The app interacts with Kinetic Platform using these patterns from `@kineticdata/react`:

- **`searchSubmissions()`** — Query form submissions using KQL (Kinetic Query Language)
- **`createSubmission()` / `updateSubmission()` / `deleteSubmission()`** — CRUD on submissions
- **`fetchSubmission()`** — Fetch a single submission by ID
- **`executeIntegration()`** — Call server-side integrations (e.g., "Family - Retrieve By ID", "Family Members - Retrieve")
- **`CoreForm`** component — Render Kinetic forms directly in the UI
- **`defineKqlQuery()`** — Build KQL query objects for submission searches

---

## Volunteer Management (Admin Page)

An Airtable-like data management page at `/admin/volunteer-management` for SWAT Leadership to search, filter, and manage all volunteers. Requires SWAT Leadership or Space Admin role (enforced by `AdminRouting`).

### File Structure

```
portal/src/pages/admin/volunteer-management/
  VolunteerManagement.jsx          # Main page: toolbar + @tanstack/react-table spreadsheet
  VolunteerDetailDrawer.jsx        # Slide-in drawer: header, tabs (Profile/Events/Projects), edit button
  useVolunteerManagementData.js    # Data hook: fetches volunteers, projects, events, assignments, signups
  useVolunteerAssociations.js      # CRUD hook: assignToProject, removeFromProject, signUpForEvent, cancelSignup
  EditVolunteerModal.jsx           # Modal wrapping KineticForm for editing the volunteer datastore record
  ProjectAssociations.jsx          # Projects tab: list/search/assign/remove project assignments
  EventAssociations.jsx            # Events tab: list/search/signup/cancel event signups
```

### Features

- **Desktop: Spreadsheet table** (`@tanstack/react-table`) with sortable columns, per-column filters (text search or multi-select dropdowns), global search, and column visibility toggle. Wrapped in `overflow-x-auto` for horizontal scrolling when many columns are visible.
- **Mobile: Card list** — responsive card layout showing name, contact info, skills, and tools for each volunteer. Tap to open the detail drawer.
- **Default visible columns:** First Name, Last Name, Email, Phone, Org, Languages, Skills, Tools, Service Area, City, State, Projects count, Events count
- **Hidden by default (toggle via Columns picker):** Address, Zip, Other Skills, Bio, Availability, Other Availability, Dietary Restrictions, Photo Consent, Username
- **Filter types:** Multi-select dropdowns for array fields (Skills, Tools, Languages, Service Area) and scalar enumerations (Organization, City, State, Availability); text search for everything else
- **Volunteer detail drawer** (slide-in from right) with three tabs:
  - **Profile** — read-only view of all volunteer fields, organized into sections (Location & Languages, Skills & Tools, Availability, Preferences, Bio)
  - **Events** — current signups with status badges; "Sign Up for Event" picker (shows Open/Planning events); cancel signup with confirmation
  - **Projects** — current assignments with status badges and links to project detail; "Assign to Project" picker; remove with confirmation
- **Edit volunteer** — pencil icon in the drawer header opens `EditVolunteerModal`, which renders the full Kinetic `volunteers` form via `CoreForm` (including all widgets like CategoryPicker for skills/tools)
- **Layout** — uses `gutter` class for consistent padding; table renders outside the standard admin gutter wrapper to avoid double-padding

### Data Flow

`useVolunteerManagementData` fetches six collections in parallel:
1. `volunteers` (datastore) — all volunteer records
2. `swat-project-volunteers` (datastore) — all project assignments
3. `swat-projects` (datastore) — all projects (for name/status lookup)
4. `events` (admin form) — all events (for name/date lookup)
5. Event signups (kapp-wide, `type = "Event Sign Up"`) — all signups
6. `affiliates` (datastore) — organization names

These are joined client-side to produce enriched volunteer rows with `projects[]`, `events[]`, `projectCount`, and `eventCount`. Raw arrays are also exposed for the association components.

`useVolunteerAssociations` provides four mutation functions:
- `assignToProject(volunteerId, projectId)` — creates `swat-project-volunteers` record (reactivates "Removed" record if one exists)
- `removeFromProject(assignmentId)` — sets assignment `Status` to `"Removed"`
- `signUpForEvent(volunteer, event)` — creates a submission on the event's signup form
- `cancelSignup(signupId)` — sets `Signup Status` to `"Cancelled"`

All mutations call `reload()` on success, which refetches all six collections.

### Routing

Defined in `portal/src/pages/admin/index.jsx`:
- `/admin/volunteer-management` → `<VolunteerManagement />` (rendered outside the gutter wrapper since it manages its own gutter)
- Admin landing page at `/admin` shows a "Volunteer Management" card

---

## SWAT Reports (Admin Page)

A reporting dashboard at `/admin/reports` for SWAT Leadership to view project metrics and manage project data inline.

### File

`portal/src/pages/admin/Reports.jsx`

### Features

- **Summary cards** — Total Projects, Total Man Hours, Completed count, Counties Served
- **Breakdown charts** — horizontal bar charts for projects by County, Family Type, and Status
- **Filterable project table** with labeled filter controls:
  - Search (text), County (dropdown), Family Type (dropdown), Status (dropdown), Completed/Scheduled After (date), Completed/Scheduled Before (date)
- **Inline editing** (SWAT Leadership only) — click any Status, Hours, or Family Type cell to edit it in-place with optimistic UI updates
- **Project links** — clicking a project name navigates to `/project-captains/:id/details` with `state.backPath` set to `/admin/reports` so the back button returns correctly
- **Print-friendly** — hint at bottom suggests Ctrl+P for exporting

### Data

Fetches all `swat-projects` submissions in one call (limit 1000). Filters are applied client-side. Inline edits use `updateSubmission` with optimistic state overrides.

---

## Admin Navigation

SWAT Leadership and Space Admins see an **Admin** section in the hamburger menu (visible on both desktop and mobile):

| Menu Item | Route | Description |
|-----------|-------|-------------|
| Events | `/events` | Event management + volunteer assignment |
| SWAT Reports | `/admin/reports` | Project reporting dashboard |
| Volunteer Management | `/admin/volunteer-management` | Spreadsheet-style volunteer directory |
| Settings | `/settings/datastore` | Datastore configuration (skills, tools, affiliates, etc.) |

The hamburger menu is always visible in the top nav bar (both desktop and mobile). Mobile also has a bottom navigation bar for quick access to Home, My Volunteering, My Nominations, and Projects.

---

## Development

```bash
# Start dev server (runs on http://localhost:3000)
cd portal && yarn start

# Build for production
cd portal && yarn build

# Lint
cd portal && yarn lint
```

The `prestart` script runs `setupEnv.cjs` which generates `.env.development.local` with the Kinetic Platform connection details.


## Email Templates

HTML email templates live in `email-templates/`. The build script (`build.js`) generates responsive, mobile-friendly HTML emails with consistent Waterboyz branding (logo, colors, layout, footer).

### Usage

```bash
cd email-templates
node build.js                    # Build all templates to dist/
node build.js welcome            # Build a specific template
node build.js --list             # List available templates
node build.js --preview welcome  # Build and open in browser
```

### Available Templates

| Template | File | Workflow | Description |
|----------|------|----------|-------------|
| `welcome` | `dist/welcome.html` | Space > User Created | New account welcome + password reset |
| `password-reset` | `dist/password-reset.html` | — | Password reset request |
| `project-assignment` | `dist/project-assignment.html` | — | Project Captain assignment notification |
| `volunteer-confirmation` | `dist/volunteer-confirmation.html` | — | Volunteer signup confirmation |

### Adding a New Template

1. Add a new entry to the `templates` object in `build.js`
2. Use the content helpers: `heading()`, `paragraph()`, `action(label, url)`, `note()`, `divider()`, `spacer()`
3. Use ERB placeholders (`<%= @results['Node Name']['Key'] %>`) for dynamic workflow data
4. Run `node build.js --preview <name>` to preview
5. After approval, update the corresponding workflow on the platform via MCP (`update_space_workflow` or `update_form_workflow`)

### Brand Config

Brand colors, logo URL, and org name are defined in the `brand` object at the top of `build.js`. The logo is served from `portal/public/logo.png` (published at `https://waterboyz.kinops.io/app/spa/logo.png`).

### Deploying to a Workflow

The built HTML from `dist/` goes into the `htmlbody` parameter of an `smtp_email_send_v1` workflow node. Update workflows via the Kinetic Platform MCP tools. Also add a plaintext `textbody` fallback for email clients that don't render HTML.

---

## AI Skills

This project includes shared AI skills for the Kinetic Platform via a git submodule at `ai-skills/`. These skills provide context to AI coding tools (Claude Code, Cursor, GitHub Copilot) about Kinetic Platform APIs, workflows, forms, and front-end patterns.

To initialize after cloning:

    git submodule update --init ai-skills

- **Project-specific documentation** should be added locally to this project.
- **Reusable Kinetic Platform patterns** should be added to the `ai-skills/` submodule and submitted as a pull request to [kineticdata/kinetic-platform-ai-skills](https://github.com/kineticdata/kinetic-platform-ai-skills) so all projects benefit.

@ai-skills/CLAUDE.md