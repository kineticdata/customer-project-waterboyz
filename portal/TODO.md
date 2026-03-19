# Waterboyz Portal — TODO

## Completed (2026-03-18)

- [x] Volunteer Management admin page — spreadsheet-style directory with filters, sorting, column toggle
- [x] Volunteer detail drawer — profile view, project/event association management, inline editing via KineticForm
- [x] SWAT Reports dashboard — project metrics by county/family type/status, inline editing, date filters with labels
- [x] Admin section in hamburger menu — Events, SWAT Reports, Volunteer Management, Settings
- [x] Hamburger menu visible on mobile (was desktop-only)
- [x] HomeAdmin cleanup — removed Administration quick nav (now in hamburger menu)
- [x] Reports filter labels — all 6 filter controls now have visible labels
- [x] Reports back navigation — project links pass `backPath` so back button returns to reports
- [x] Mobile responsive volunteer management — card list on mobile, table on desktop
- [x] Languages You Know field — added to volunteer table, drawer, and CLAUDE.md documentation

## Previously Completed

- [x] Public event signup flow (PublicEventsList, PublicEventSignup, PublicEventConfirmed)
- [x] Drag-and-drop volunteer-to-project assignment UI (EventsAssign)
- [x] Event signup modal for authenticated users
- [x] Volunteer profile prompt for stale profiles
- [x] Project notes with audit trail
- [x] Family information management
- [x] Project expenses / reimbursement tracking
- [x] Email templates (welcome, password-reset, project-assignment, volunteer-confirmation)
- [x] CategoryPicker widget (consolidated SkillPicker + ToolPicker)
- [x] Kapp-wide event signup indexing

## Remaining

### SWAT Approval
- [ ] Allow note-taking before approving nominations (for historical reference)

### Projects
- [ ] Add "Closed Out" status for SWAT Leadership (only they can set it)
- [ ] Add "Planning" status
- [ ] Remove "Pending Review" status
- [ ] Audit trail for notes — capture who changed what
- [ ] Family communication instructions — checkbox that family has been communicated with (4 weeks ahead), captains add details in notes

### Receipts
- [ ] Capture receipt with name and address
- [ ] Create task to bookkeeper group to cut checks

### Automation
- [ ] Weekly email digest with upcoming projects (filtered by relevant criteria)
- [ ] Queue up assignment notifications — let SWAT Leadership click a button to send, rather than auto-emailing

### Serve Day Sign Up
- [ ] Ask if volunteer prefers to serve with people from their church or OK with mixed groups

### Christmas Alive
- [ ] Simplified sign-up flow (no full volunteer profile required)

### General
- [ ] Account creation email workflow for public event signups
- [ ] Duplicate signup prevention
- [ ] Admin UX for cloning event signup template forms
- [ ] Add captain phone number in volunteer notification email and in portal
