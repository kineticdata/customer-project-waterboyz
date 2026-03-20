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

## Kinetic Platform Configuration

> **Full platform configuration** (forms, fields, security policies, workflows, integrations, teams) is documented in **[docs/platform-config.md](docs/platform-config.md)**. Read that file when working with platform APIs, workflows, or security.

**Quick reference:**

- **Space:** `waterboyz` at `https://waterboyz.kinops.io`
- **Kapp:** `service-portal` (all forms live here)
- **Connection ID:** `1415539c-bb98-48bb-ad33-11be25189ad0` (shared by all integrations)

---

## Forms — Quick Reference

> **Full form details** (all fields, security policies, field notes) are in [docs/platform-config.md](docs/platform-config.md).

| Form Slug | Type | Description |
|-----------|------|-------------|
| `swat-project-nomination` | Nominations | Nominate a family for a SWAT project |
| `christmas-alive-family-nomination` | Nominations | Nominate a family for Christmas Alive |
| `swat-projects` | Datastore | Core project records (26 fields) |
| `families` | Datastore | Families being served |
| `family-members` | Datastore | Individual family member records |
| `volunteers` | Datastore | Volunteer directory (21 fields) |
| `swat-project-volunteers` | Datastore | Junction: volunteers ↔ projects |
| `project-notes` | Datastore | Version-controlled project notes |
| `reimbursements` | Datastore | Expense/reimbursement tracking |
| `events` | Datastore | Serve day events |
| `programs` | Datastore | Configurable home page programs |
| `skills` | Datastore | Reference: skill categories |
| `tools` | Datastore | Reference: tool categories |
| `affiliates` | Datastore | Affiliated organizations |
| `states` | Datastore | US states reference |
| `state-counties` | Datastore | Counties by state reference |
| `scheduled-job-runs` | Datastore | Scheduled job execution log |
| `serve-day-sign-up` | Event Sign Up | Default event sign-up (anonymous) |
| `event-signup-template` | Event Sign Up | Template for cloning per-event forms (inactive) |
| `swat-project-approval` | Approval | Leadership review of nominations |
| `approval` | Approval | Generic approval (inactive) |
| `account-password-reset` | Utility | Password reset requests |
| `account-registration` | Utility | New account creation |
| `request-to-join-swat-project` | Utility | Volunteer requests to join a project |

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