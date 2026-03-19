# Waterboyz Portal

A volunteer coordination and project management portal for Waterboyz, a nonprofit organization that helps underserved families with home repair and improvement projects. Built on the [Kinetic Platform](https://waterboyz.kinops.io).

## Table of Contents

- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Admin Tools](#admin-tools)
- [Documentation](#documentation)

## Quick Start

### Prerequisites

- Node.js v18+
- Yarn v1

### Install & Run

```bash
cd portal
yarn install
yarn start     # dev server at http://localhost:3000
```

On first run, you'll be prompted for a Kinetic Platform URL (stored in `.env.development.local`).

### Build

```bash
yarn build     # production build → build/
```

## Tech Stack

| Library | Purpose |
|---------|---------|
| [React 18](https://react.dev/) | UI framework |
| [Vite](https://vite.dev/) | Build tooling & dev server |
| [React Router 6](https://reactrouter.com/) | Client-side routing |
| [Redux Toolkit](https://redux-toolkit.js.org/) | Global state (app, theme, view) |
| [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS |
| [DaisyUI](https://daisyui.com/) | Component classes (prefixed with `k`) |
| [Ark UI](https://ark-ui.com/) | Headless components (Dialog, Popover, etc.) |
| [Tabler Icons](https://tabler.io/icons) | Icon library (lazy-loaded) |
| [@tanstack/react-table](https://tanstack.com/table) | Data table (Volunteer Management) |
| [@kineticdata/react](https://components.kineticdata.com/apis) | Kinetic API helpers, CoreForm, auth |
| [date-fns](https://date-fns.org/) | Date utilities |
| [clsx](https://github.com/lukeed/clsx) | Conditional class names |

## Project Structure

```
portal/src/
├── assets/styles/        # Tailwind layers, DaisyUI config, custom utilities
├── atoms/                # Design system primitives (Button, Icon, Modal, Avatar, etc.)
├── components/
│   ├── header/           # Header, hamburger menu, mobile bottom nav
│   ├── footer/           # Site footer, footer portal
│   ├── home/             # Home page sections (Hero, shortcuts)
│   ├── kinetic-form/     # KineticForm wrapper, widgets (CategoryPicker, Search, etc.)
│   ├── search/           # Global search modal
│   └── states/           # Loading, Error, Empty state components
├── helpers/
│   ├── hooks/            # useData, useRoles, usePoller, useVolunteerRecord, etc.
│   ├── format.js         # Phone formatting, toArray, SMS link builders
│   ├── state.js          # Redux slices (app, theme, view)
│   ├── search.js         # Global search logic
│   └── toasts.js         # Toast notification helpers
├── pages/
│   ├── admin/
│   │   ├── index.jsx              # Admin routing (role-gated)
│   │   ├── Admin.jsx              # Admin landing page with cards
│   │   ├── Reports.jsx            # SWAT Reports dashboard
│   │   ├── AdminFormRecords.jsx   # Generic CRUD for admin forms (events, programs)
│   │   └── volunteer-management/  # Volunteer Management feature (see below)
│   ├── events/                    # Event list, assignment UI (drag-and-drop)
│   ├── home/                      # Role-based home pages
│   ├── my-volunteering/           # Volunteer's event history & upcoming
│   ├── profile/                   # User profile + volunteer form
│   ├── projects/project/          # Project detail tabs (details, volunteers, expenses, etc.)
│   ├── public/                    # Public pages (event signup, events list, confirmation)
│   └── settings/                  # App settings, datastore browser
├── App.jsx               # Root app: auth, routing, KineticLib provider
├── index.css             # Tailwind imports, theme config, @source directives
└── redux.js              # Redux store setup with regRedux helper
```

### Volunteer Management (`pages/admin/volunteer-management/`)

A spreadsheet-style admin page for SWAT Leadership to manage all volunteers.

```
volunteer-management/
├── VolunteerManagement.jsx          # Main page: toolbar, table (desktop) / card list (mobile)
├── VolunteerDetailDrawer.jsx        # Slide-in drawer: profile, events, projects tabs
├── useVolunteerManagementData.js    # Data hook: fetches & joins 6 collections
├── useVolunteerAssociations.js      # CRUD: assign/remove projects, signup/cancel events
├── EditVolunteerModal.jsx           # Modal with KineticForm for editing volunteer records
├── ProjectAssociations.jsx          # Projects tab: list, search, assign, remove
└── EventAssociations.jsx            # Events tab: list, search, signup, cancel
```

## Key Features

### For Volunteers
- **Public event signup** — browse and sign up for serve day events without an account
- **Volunteer profile** — register skills, tools, languages, availability, and service area preferences
- **My Volunteering** — view past and upcoming event signups and project assignments

### For Project Captains
- **Project management** — manage tasks, volunteers, expenses, photos, and notes for assigned projects
- **Volunteer recruitment** — search and add volunteers to projects, track attendance

### For SWAT Leadership
- **Nomination review** — approve/reject SWAT project nominations, set budgets, assign captains
- **Event management** — create serve day events, assign volunteers to projects via drag-and-drop
- **Volunteer Management** — searchable/filterable directory of all volunteers with inline editing, project/event association management
- **SWAT Reports** — project metrics dashboard with breakdowns by county, family type, and status; inline-editable fields

### For Everyone
- **Responsive design** — mobile card layouts with bottom nav; desktop tables with hamburger menu
- **Global search** — search across all portal content
- **Role-based home pages** — different dashboards for volunteers, captains, nominators, and leadership

## Admin Tools

Accessible via the hamburger menu (Admin section, visible to SWAT Leadership and Space Admins):

| Tool | Route | Description |
|------|-------|-------------|
| Events | `/events` | Manage serve day events; assign volunteers to projects |
| SWAT Reports | `/admin/reports` | Project metrics, filtered reporting, inline editing |
| Volunteer Management | `/admin/volunteer-management` | Full volunteer directory with filters, editing, associations |
| Settings | `/settings/datastore` | Edit reference data (skills, tools, affiliates, etc.) |

## Documentation

- [CLAUDE.md](../CLAUDE.md) — Comprehensive project documentation (platform config, forms, fields, workflows, data relationships, API patterns, admin features)
- [Kinetic Form Widgets](src/components/kinetic-form/widgets/README.md) — Widget system documentation
- [Kinetic Data Docs](https://docs.kineticdata.com/) — Platform documentation

### License

Code released under [the MIT license](https://github.com/coreui/coreui-free-react-admin-template/blob/main/LICENSE).
