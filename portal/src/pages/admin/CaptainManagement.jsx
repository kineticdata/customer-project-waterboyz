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

const TEAM_SLUG = 'c9e76136f81758a8a6866a3929082c2d';
const TEAM_NAME = 'SWAT Project Captains';

export const CaptainManagement = () => {
  const mobile = useSelector(state => state.view.mobile);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const closeModal = useCallback(() => { setModalOpen(false); setSearch(''); }, []);

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
      closeModal();
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
              onClick={closeModal}
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
          <button onClick={closeModal}>close</button>
        </form>
      </dialog>
    </div>
  );
};
