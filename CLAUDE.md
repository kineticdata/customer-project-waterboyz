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

## Tech Stack

- **Frontend:** React 18, Vite, React Router 6, Redux Toolkit
- **Styling:** Tailwind CSS, DaisyUI
- **Platform:** Kinetic Data Platform (REST API + workflow engine)
- **SDK:** `@kineticdata/react` for API interactions (submissions, forms, integrations)
- **Testing:** Playwright (in `frontend-testing/`)
- **Package Manager:** Yarn

## Project Structure

```
portal/
  src/
    components/       # Reusable UI components (header, home sections, modals)
    helpers/           # API helpers, state management utilities
    pages/             # Route-based pages (home, projects, login, settings)
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
| Christmas Alive | `christmas-alive` | `christmas-tree` | `christmas-alive-sponsor-a-family`, `christmas-alive-family-nomination` |
| SWAT | `swat` | `tool` | `swat-project-nomination`, `volunteer-for-an-upcoming-swat-project` |
| Popular Services | `popular-services` | *(none)* | `volunteers` *(hidden category)* |

---

## Forms — Detailed Field Reference

### Service Forms (user-facing requests)

#### Christmas Alive Family Nomination (`christmas-alive-family-nomination`)
- **Type:** Service | **Status:** Active
- **Category:** `christmas-alive` | **Icon:** `pointer-cancel`
- **Description:** Nominate a family for Christmas Alive
- **Fields:** First Name, Last Name, Email, Phone Number, Address, County, Native Language, Needs Interpreter, Family Members JSON, Support Received, Background on the Family, Total Adults, Total Children, Family Status, Requested By
- **Workflows:** "Nomination Process" (on Submitted), "On Update" (on Updated)

#### Sponsor a Family (`christmas-alive-sponsor-a-family`)
- **Type:** Service | **Status:** Active
- **Category:** `christmas-alive` | **Icon:** `gift`
- **Description:** Sponsor a Family for Christmas Alive
- **Fields:** Affiliated Org

#### Nominate a SWAT Project (`swat-project-nomination`)
- **Type:** Service | **Status:** Active
- **Category:** `swat`
- **Description:** Nominate a family in need for a SWAT project
- **Fields:** Nominator Type, Nominator Full Name, Nominator Phone Number, Nominator Email, Associated Organization, First Name, Last Name, Phone Number, Email, Project Urgency, Project Photos, Address Line 1, Address Line 2, City, State, Zip, County, Project Notes, Status
- **Workflows:** "SWAT Project Initiation" (on Submitted) — creates a Family record, then routes to SWAT Project Approval

#### Volunteer for an upcoming SWAT project (`volunteer-for-an-upcoming-swat-project`)
- **Type:** Service | **Status:** Active
- **Category:** `swat`
- **Description:** Request to join an upcoming project
- **Fields:** *(none visible — rendered via CoreForm)*

### Datastore Forms (backend data)

#### SWAT Projects (`swat-projects`)
- **Type:** Datastore | **Status:** Active
- **Description:** Core project records
- **Fields (20):** Additional Volunteers Needed, Project Name, Project Captain, Scheduled Date, Project Status, Skills Needed, Equipment Needed, Project Documents, Project Photos, Address Line 1, Address Line 2, City, State, Zip, County, Tasks JSON, Family ID, Project Notes, Original Request ID, Approval ID
- **Key Relationships:**
  - `Family ID` → links to `families` datastore
  - `Original Request ID` → links to originating `swat-project-nomination` submission
  - `Approval ID` → links to `swat-project-approval` submission
  - `Project Captain` → username of assigned captain (member of SWAT Project Captains team)

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
- **Type:** Datastore | **Status:** New
- **Description:** Volunteer directory
- **Fields (18):** First Name, Last Name, Email Address, Phone Number, Address Line 1, Address Line 2, City, State, Zip, Skill Areas, Other Skills, Tools, Bio, How often can you volunteer, Other Availability, Preferred Service Area, Dietary Restrictions, Username
- **Key Relationships:**
  - `Username` → links to a user account (user attribute "Volunteer Id" links back)

#### SWAT Project Volunteers (`swat-project-volunteers`)
- **Type:** Datastore | **Status:** New
- **Description:** Junction table linking volunteers to projects
- **Fields (3):** Volunteer ID, Present, Project ID
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

#### Portal Shortcuts (`portal-shortcuts`)
- **Type:** Datastore | **Status:** Active
- **Description:** Home page shortcuts configuration
- **Fields (8):** Status, Title, Description, URL, New Tab, Image, Icon Name, Sort Order

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

#### Kitchen Sink Form (`kitchen-sink-form`)
- **Type:** Utility | **Status:** Active | **Icon:** `infinity`
- **Description:** Test form with all field types (attachment, checkbox, date, datetime, dropdown, radio, text, time, etc.)

#### Widgets (`widgets`)
- **Type:** Utility | **Status:** Active
- **Fields (3):** Requested For, Signature File, Markdown Content

---

## Data Relationships Diagram

```
swat-project-nomination (Service)
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
                                               │
                                               ├──referenced by──→ swat-project-volunteers
                                               │                    Project ID → project ID
                                               │                    Volunteer ID → volunteers ID
                                               │
                                               ├──referenced by──→ reimbursements.Project ID
                                               │
                                               └──volunteers linked via──→ volunteers (Datastore)
                                                                            Username → user account
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


## AI Skills

This project includes shared AI skills for the Kinetic Platform via a git submodule at `ai-skills/`. These skills provide context to AI coding tools (Claude Code, Cursor, GitHub Copilot) about Kinetic Platform APIs, workflows, forms, and front-end patterns.

To initialize after cloning:

    git submodule update --init ai-skills

- **Project-specific documentation** should be added locally to this project.
- **Reusable Kinetic Platform patterns** should be added to the `ai-skills/` submodule and submitted as a pull request to [kineticdata/kinetic-platform-ai-skills](https://github.com/kineticdata/kinetic-platform-ai-skills) so all projects benefit.
