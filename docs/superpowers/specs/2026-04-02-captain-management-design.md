# Captain Management Admin Page

## Purpose

SWAT Leadership needs a way to manage who is a Project Captain. Currently, "SWAT Project Captains" team membership is managed via the platform console. This page provides a simple admin UI at `/admin/captain-management` to view, add, and remove captains.

## Data Model

- **Team:** "SWAT Project Captains" (slug: `swat-project-captains`)
- **Members:** Platform users added via team memberships
- No new forms or datastore records required

## API Surface

All from `@kineticdata/react`:

| Operation | Function | Parameters |
|-----------|----------|------------|
| Fetch team + members | `fetchTeam` | `{ teamSlug: 'swat-project-captains', include: 'memberships' }` |
| List all users | `fetchUsers` | `{ include: 'memberships', limit: 1000 }` |
| Add captain | `createMembership` | `{ team: { name: 'SWAT Project Captains' }, user: { username } }` |
| Remove captain | `deleteMembership` | `{ teamSlug: 'swat-project-captains', username }` |

## Page Design

### Route

`/admin/captain-management` -- standard gutter route (inside the existing gutter wrapper in `AdminRouting`).

### Layout

Single page component `CaptainManagement.jsx` in `portal/src/pages/admin/CaptainManagement.jsx`.

**Sections:**

1. **Page heading** -- "Captain Management" with back link to `/admin`
2. **Captain list** -- table (desktop) / card list (mobile) showing current captains
3. **Add Captain** button in the toolbar area

### Captain List (Table)

| Column | Source |
|--------|--------|
| Name | `user.displayName` from membership |
| Email | `user.email` from membership |
| Username | `user.username` from membership |
| Actions | Remove button (trash icon) |

On mobile, render as cards showing name, email, and remove button.

### Add Captain Flow

"Add Captain" button opens a DaisyUI modal with:
- A search input that filters the list of platform users (by displayName, email, or username)
- Filtered results displayed as a scrollable list
- Users who are already captains are excluded from results
- Clicking a user row adds them and closes the modal
- Toast notification on success/failure

### Remove Captain Flow

- Trash icon on each row triggers the existing `openConfirm` confirmation modal
- Confirmation text: "Remove {displayName} from Project Captains?"
- On confirm: calls `deleteMembership`, shows toast, refetches team
- Toast notification on success/failure

## Integration Points

### Admin Landing Page (`Admin.jsx`)

Add a card:
```js
{
  icon: 'users-group',
  label: 'Captain Management',
  description: 'Add or remove members of the Project Captains team.',
  to: '/admin/captain-management',
}
```

### Admin Routing (`index.jsx`)

Add lazy-loaded route inside the gutter wrapper:
```jsx
<Route path="/captain-management" element={<Suspense fallback={<Loading />}><CaptainManagement /></Suspense>} />
```

### Header Navigation (`Header.jsx`)

Add to the Admin section menu items:
```js
{ label: 'Captain Management', to: '/admin/captain-management', icon: 'users-group' }
```

## State Management

- `useData(fetchTeam, params)` for team + memberships (with reload capability)
- `useData(fetchUsers, params)` for all users (fetched when modal opens, or eagerly)
- No Redux -- local component state for modal open/close, search filter, loading states
- After add/remove: call `reload()` on the team data to refresh the list

## Access Control

Same as other admin pages: requires `isAdmin || isLeadership` (enforced by `AdminRouting`).

## Files Changed

| File | Change |
|------|--------|
| `portal/src/pages/admin/CaptainManagement.jsx` | **New** -- main page component |
| `portal/src/pages/admin/index.jsx` | Add route |
| `portal/src/pages/admin/Admin.jsx` | Add card |
| `portal/src/components/header/Header.jsx` | Add nav item |

## Out of Scope

- Editing user details (handled elsewhere)
- Creating new user accounts
- Managing other teams
