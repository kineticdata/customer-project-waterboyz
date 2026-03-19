# Waterboyz Portal

A volunteer coordination and project management platform for [Waterboyz](https://waterboyz.kinops.io), a nonprofit organization affiliated with local churches and Christian organizations. They help underserved families — foster families, single-parent households, and others in need — with home repair and improvement projects.

## Repository Structure

```
├── portal/              # React (Vite) front-end application
├── email-templates/     # HTML email templates for workflows
├── frontend-testing/    # Playwright end-to-end tests
├── ai-skills/           # Shared Kinetic Platform AI skills (git submodule)
├── CLAUDE.md            # Comprehensive project documentation
└── README.md            # This file
```

## Documentation

| Document | Description |
|----------|-------------|
| [Portal README](portal/README.md) | Getting started, tech stack, project structure, features |
| [CLAUDE.md](CLAUDE.md) | Full project docs: platform config, forms, fields, workflows, data relationships, admin features |
| [Form Widgets](portal/src/components/kinetic-form/widgets/README.md) | Custom widget system for Kinetic forms |
| [Email Templates](email-templates/) | Responsive HTML email builder |

## Quick Start

```bash
git clone https://github.com/kineticdata/customer-project-waterboyz
cd customer-project-waterboyz
git submodule update --init ai-skills   # optional: AI skills for coding tools

cd portal
yarn install
yarn start    # dev server at http://localhost:3000
```

Requires Node.js v18+ and Yarn v1. See [portal/README.md](portal/README.md) for details.

## Key Features

- **Family nominations** — Churches and community orgs nominate families for SWAT home repair projects or Christmas Alive support
- **Project management** — Track projects from approval through completion with tasks, volunteers, expenses, photos, and notes
- **Volunteer coordination** — Volunteers register skills, tools, languages, and availability; leadership matches them to projects
- **Serve day events** — Public event signup (no account required), volunteer-to-project assignment with drag-and-drop
- **Admin tools** — SWAT Reports dashboard, Volunteer Management spreadsheet, inline editing, role-based access

## Tech Stack

React 18, Vite, Tailwind CSS v4, DaisyUI, Redux Toolkit, React Router 6, @tanstack/react-table, Ark UI, @kineticdata/react, Playwright

## Template Directory

This directory contains the template data for an installation of the portal.

### Export

See the [Export Guide](template/tooling/README.md).

### Install

Installation of the portal is done by running the `install.rb` script. This script requires configuration properties provided as a JSON formatted string and should be run via a workflow process.

### License

Code released under [the MIT license](https://github.com/coreui/coreui-free-react-admin-template/blob/main/LICENSE).
