# Project Status Visibility for Captains

## Problem

Project Captains reported that the project status is not visible enough in the captain view. The status badge in the header is small and easy to miss, and the status dropdown is buried among many fields on the Details tab. Additionally, captains have no indication of which statuses make their project visible to volunteers on the Upcoming Projects page.

## Context

Volunteers can only see projects in **"Ready to Work"** status (with `Additional Volunteers Needed = "Yes"`) on the Upcoming Projects page. Captains need to understand this clearly so they know when to change status to start recruiting.

### Project Status Values (in lifecycle order)

1. **Planning** — Initial setup, not visible to volunteers
2. **Ready to Work** — Visible to volunteers on Upcoming Projects
3. **Active** — Work underway, no longer listed for new volunteers
4. **Ongoing** — Long-running project, not listed for new volunteers
5. **Completed** — Finished
6. **Canceled** — Canceled

## Design

### 1. Status Banner (Project.jsx)

A colored banner rendered below the project header bar and above the tab content. It appears for all statuses **except** "Ready to Work" (where no banner is shown because the project is already visible to volunteers).

Clicking the banner navigates to the Details tab if the captain is not already on it.

#### Banner Configuration by Status

| Status | Style | Title | Message | Clickable |
|--------|-------|-------|---------|-----------|
| Planning | Warning (amber) | Not visible to volunteers | Set status to "Ready to Work" when you're ready to recruit volunteers. | Yes → Details tab |
| Ready to Work | *No banner* | — | — | — |
| Active | Info (blue) | Work in progress | This project is no longer listed for new volunteers. | Yes → Details tab |
| Ongoing | Info (blue) | Ongoing project | This project is ongoing and not listed for new volunteers. | Yes → Details tab |
| Completed | Success (purple) | Project completed | This project is finished and no longer visible to volunteers. | No |
| Canceled | Error (red) | Project canceled | This project has been canceled and is not visible to volunteers. | No |

#### Banner Styling

- Full-width bar below the header, inside the `gutter` wrapper
- Left border accent (4px) matching the status color
- Icon + bold title on the first line
- Descriptive message on the second line
- Right arrow indicator on clickable banners
- Mobile: same layout, text wraps naturally

#### Implementation Location

The banner renders in `Project.jsx` between the header `<div>` and the `gutter mt-4` content area. It reads `projectStatus` which is already computed at line 177.

### 2. Status Card (ProjectDetails.jsx)

Pull the Project Status dropdown out of the multi-field grid and into its own card at the top of the Details tab. This card is the first thing captains see when they navigate to Details.

#### Card Contents

- **Status dropdown** — full-width, prominent
- **Visibility note** — contextual message matching the banner logic:
  - Planning: "Volunteers can only see projects in 'Ready to Work' status. Update the status when you're ready to recruit."
  - Ready to Work: "This project is visible to volunteers on the Upcoming Projects page."
  - Active/Ongoing: "This project is no longer listed for new volunteers."
  - Completed/Canceled: "This project is closed."

#### Implementation

- New card `div` at the top of the `ProjectDetails` return, before the existing "Project Details" card
- The status `<select>` moves from the 2-column grid into this new card
- The existing `statusOptions` memo and `status` state remain unchanged
- The visibility note is a `<p>` below the dropdown, styled with muted text and an icon

### Files to Modify

1. **`portal/src/pages/projects/project/Project.jsx`** — Add the status banner component between header and content
2. **`portal/src/pages/projects/project/ProjectDetails.jsx`** — Extract status into its own card at the top, add visibility note
