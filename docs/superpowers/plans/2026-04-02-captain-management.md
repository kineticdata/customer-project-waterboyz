# Captain Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin page at `/admin/captain-management` for SWAT Leadership to view, add, and remove members of the "SWAT Project Captains" team.

**Architecture:** Single page component using `fetchTeam` and `fetchUsers` from `@kineticdata/react` for data, `createMembership`/`deleteMembership` for mutations. DaisyUI modal for the "Add Captain" flow, existing `openConfirm` for remove confirmation. No new Redux state — just `useData` + local component state.

**Tech Stack:** React 18, `@kineticdata/react` (fetchTeam, fetchUsers, createMembership, deleteMembership), DaisyUI (k-prefixed), Tailwind CSS v4, `useData` hook, `openConfirm`, `toastSuccess`/`toastError`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `portal/src/pages/admin/CaptainManagement.jsx` | Create | Main page: captain table/cards, add modal, remove flow |
| `portal/src/pages/admin/index.jsx` | Modify | Add lazy-loaded route for `/captain-management` |
| `portal/src/pages/admin/Admin.jsx` | Modify | Add card to admin landing page |
| `portal/src/components/header/Header.jsx` | Modify | Add nav item to Admin menu section |

---

### Task 1: Create the CaptainManagement page component

**Files:**
- Create: `portal/src/pages/admin/CaptainManagement.jsx`

- [ ] **Step 1: Create the page with data fetching and captain list**

Create `portal/src/pages/admin/CaptainManagement.jsx` with the full component:

```jsx
import { useMemo, useState, useCallback } from 'react';
import { fetchTeam, fetchUsers, createMembership, deleteMembership } from '@kineticdata/react';
import { useSelector } from 'react-redux';
import { PageHeading } from '../../components/PageHeading.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { Icon } from '../../atoms/Icon.jsx';
import { useData } from '../../helpers/hooks/useData.js';
import { openConfirm } from '../../helpers/confirm.js';
import { toastSuccess, toastError } from '../../helpers/toasts.js';
import clsx from 'clsx';

const TEAM_SLUG = 'swat-project-captains';
const TEAM_NAME = 'SWAT Project Captains';

export const CaptainManagement = () => {
  const mobile = useSelector(state => state.view.mobile);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  // Fetch team with memberships
  const teamParams = useMemo(() => ({
    teamSlug: TEAM_SLUG,
    include: 'memberships',
  }), []);
  const { response: teamResponse, loading: teamLoading, actions: teamActions } = useData(fetchTeam, teamParams);
  const memberships = teamResponse?.team?.memberships ?? [];

  // Fetch all users (for the add modal)
  const usersParams = useMemo(() => modalOpen ? { include: 'details', limit: 1000 } : null, [modalOpen]);
  const { response: usersResponse, loading: usersLoading } = useData(fetchUsers, usersParams);
  const allUsers = usersResponse?.users ?? [];

  // Users not already on the team
  const captainUsernames = useMemo(
    () => new Set(memberships.map(m => m.user.username)),
    [memberships],
  );
  const availableUsers = useMemo(() => {
    const term = search.toLowerCase();
    return allUsers
      .filter(u => !captainUsernames.has(u.username))
      .filter(u =>
        !term ||
        u.displayName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.username.toLowerCase().includes(term),
      );
  }, [allUsers, captainUsernames, search]);

  // Add captain
  const handleAdd = useCallback(async (username) => {
    setAdding(true);
    const result = await createMembership({
      team: { name: TEAM_NAME },
      user: { username },
    });
    setAdding(false);
    if (result?.error) {
      toastError({ title: 'Failed to add captain', description: result.error.message });
    } else {
      toastSuccess({ title: 'Captain added' });
      setModalOpen(false);
      setSearch('');
      teamActions.reloadData();
    }
  }, [teamActions]);

  // Remove captain
  const handleRemove = useCallback((username, displayName) => {
    openConfirm({
      title: 'Remove Captain',
      description: `Remove ${displayName || username} from Project Captains?`,
      acceptLabel: 'Remove',
      accept: async () => {
        const result = await deleteMembership({ teamSlug: TEAM_SLUG, username });
        if (result?.error) {
          toastError({ title: 'Failed to remove captain', description: result.error.message });
        } else {
          toastSuccess({ title: 'Captain removed' });
          teamActions.reloadData();
        }
      },
    });
  }, [teamActions]);

  return (
    <div className="max-w-screen-lg pt-6 pb-6">
      <PageHeading title="Captain Management" backTo="/admin">
        <div className="ml-auto">
          <button
            className="kbtn kbtn-primary kbtn-sm"
            onClick={() => setModalOpen(true)}
          >
            <Icon name="plus" size={16} />
            Add Captain
          </button>
        </div>
      </PageHeading>

      {teamLoading && !memberships.length ? (
        <Loading />
      ) : memberships.length === 0 ? (
        <p className="text-base-content/60">No project captains yet.</p>
      ) : mobile ? (
        /* Mobile card list */
        <div className="flex flex-col gap-3">
          {memberships.map(m => (
            <div
              key={m.user.username}
              className="flex items-center gap-3 p-4 rounded-box bg-base-100 border"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{m.user.displayName || m.user.username}</div>
                <div className="text-sm text-base-content/60 truncate">{m.user.email}</div>
              </div>
              <button
                className="kbtn kbtn-ghost kbtn-sm kbtn-square text-error"
                onClick={() => handleRemove(m.user.username, m.user.displayName)}
                aria-label={`Remove ${m.user.displayName || m.user.username}`}
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop table */
        <div className="overflow-x-auto rounded-box border bg-base-100">
          <table className="ktable ktable-zebra w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Username</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {memberships.map(m => (
                <tr key={m.user.username}>
                  <td>{m.user.displayName || m.user.username}</td>
                  <td>{m.user.email}</td>
                  <td className="text-base-content/60">{m.user.username}</td>
                  <td>
                    <button
                      className="kbtn kbtn-ghost kbtn-sm kbtn-square text-error"
                      onClick={() => handleRemove(m.user.username, m.user.displayName)}
                      aria-label={`Remove ${m.user.displayName || m.user.username}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Captain Modal */}
      <dialog className={clsx('kmodal', modalOpen && 'kmodal-open')}>
        <div className="kmodal-box max-w-md">
          <div className="flex-sc mb-4">
            <h3 className="text-lg font-semibold">Add Captain</h3>
            <button
              className="kbtn kbtn-ghost kbtn-sm kbtn-circle ml-auto"
              onClick={() => { setModalOpen(false); setSearch(''); }}
              aria-label="Close"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          <input
            type="text"
            className="kinput kinput-bordered w-full mb-3"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
            {usersLoading ? (
              <Loading />
            ) : availableUsers.length === 0 ? (
              <p className="text-sm text-base-content/60 py-2 text-center">
                {search ? 'No matching users found.' : 'No users available.'}
              </p>
            ) : (
              availableUsers.map(u => (
                <button
                  key={u.username}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 text-left w-full disabled:opacity-50"
                  onClick={() => handleAdd(u.username)}
                  disabled={adding}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{u.displayName || u.username}</div>
                    <div className="text-xs text-base-content/60 truncate">{u.email}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        <form method="dialog" className="kmodal-backdrop">
          <button onClick={() => { setModalOpen(false); setSearch(''); }}>close</button>
        </form>
      </dialog>
    </div>
  );
};
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `head -5 portal/src/pages/admin/CaptainManagement.jsx`
Expected: The first 5 lines showing the imports.

- [ ] **Step 3: Commit**

```bash
git add portal/src/pages/admin/CaptainManagement.jsx
git commit -m "feat: add CaptainManagement page component"
```

---

### Task 2: Wire up route, admin card, and nav item

**Files:**
- Modify: `portal/src/pages/admin/index.jsx`
- Modify: `portal/src/pages/admin/Admin.jsx`
- Modify: `portal/src/components/header/Header.jsx`

- [ ] **Step 1: Add lazy import and route in `index.jsx`**

In `portal/src/pages/admin/index.jsx`, add the lazy import after the existing lazy imports (after line 13):

```js
const CaptainManagement = lazy(() => import('./CaptainManagement.jsx').then(m => ({ default: m.CaptainManagement })));
```

Add the route inside the gutter `<Routes>`, after the `/reports` route (after line 47):

```jsx
<Route path="/captain-management" element={<Suspense fallback={<Loading />}><CaptainManagement /></Suspense>} />
```

- [ ] **Step 2: Add card in `Admin.jsx`**

In `portal/src/pages/admin/Admin.jsx`, add a new card to the `staticCards` array, after the "Volunteer Notifications" entry (after line 70, before the `isAdmin &&` entry):

```js
{
  icon: 'users-group',
  label: 'Captain Management',
  description: 'Add or remove members of the Project Captains team.',
  to: '/admin/captain-management',
},
```

- [ ] **Step 3: Add nav item in `Header.jsx`**

In `portal/src/components/header/Header.jsx`, add to the Admin items array (after the "Volunteer Notifications" entry at line 224, before the "Settings" entry):

```js
{ label: 'Captain Management', to: '/admin/captain-management', icon: 'users-group' },
```

- [ ] **Step 4: Verify dev server compiles**

Run: `cd portal && yarn build 2>&1 | tail -5`
Expected: Build completes without errors.

- [ ] **Step 5: Commit**

```bash
git add portal/src/pages/admin/index.jsx portal/src/pages/admin/Admin.jsx portal/src/components/header/Header.jsx
git commit -m "feat: wire up captain management route, admin card, and nav item"
```

---

### Task 3: Manual smoke test

- [ ] **Step 1: Start dev server and test**

Run: `cd portal && yarn start` (if not already running)

Test the following in the browser at `http://localhost:3000`:

1. Navigate to `/admin` — verify "Captain Management" card appears with the users-group icon
2. Click the card — verify it navigates to `/admin/captain-management`
3. Verify the page shows a list of current captains (from the SWAT Project Captains team)
4. Click "Add Captain" — verify the modal opens with a search field
5. Type a name to filter users — verify filtering works
6. Click a user to add them — verify toast appears and list updates
7. Click the trash icon on a captain — verify confirmation modal appears
8. Confirm removal — verify toast appears and list updates
9. Open the hamburger menu — verify "Captain Management" appears in the Admin section
10. Test on mobile viewport — verify card layout renders instead of table
