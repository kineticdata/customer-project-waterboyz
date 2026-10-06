import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import clsx from 'clsx';
import { Icon } from '../../../atoms/Icon.jsx';
import { Loading } from '../../../components/states/Loading.jsx';
import { useData } from '../../../helpers/hooks/useData.js';
import { executeIntegration } from '../../../helpers/api.js';
import { openConfirm } from '../../../helpers/confirm.js';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';

const LIST_NOMINATORS = 'CA - List Nominators';
const LIST_USERS = 'CA - List Users';
const ADD_NOMINATOR = 'CA - Add Nominator';
const REMOVE_NOMINATOR = 'CA - Remove Nominator';

const failed = result =>
  !!result?.error || Number(result?.['_Status Code'] ?? 200) >= 300;

const failureMessage = result =>
  result?.error?.message || result?._Error || 'The platform refused the change.';

/**
 * Nominator Management -- Christmas Alive Admins decide who may nominate
 * families. Mirrors SWAT Captain Management (pages/admin/CaptainManagement.jsx).
 *
 * The difference is how it reaches the platform. Captain Management calls the
 * Core API directly, which needs space-level Users Access and Team Membership
 * Modification. Christmas Alive Admins have neither, and granting them would
 * let them change ANY team. So every call here goes through a kapp
 * integration limited to Christmas Alive Admins, whose operation has the
 * Christmas Alive Nominators team fixed inside it -- an admin can only ever
 * add or remove members of that one team.
 */
export const NominatorManagement = () => {
  const kappSlug = useSelector(state => state.app.kappSlug);
  const mobile = useSelector(state => state.view.mobile);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSearch('');
  }, []);

  const nominatorParams = useMemo(
    () => (kappSlug ? { kappSlug, integrationName: LIST_NOMINATORS } : null),
    [kappSlug],
  );
  const {
    initialized,
    response: nominatorResponse,
    actions: nominatorActions,
  } = useData(executeIntegration, nominatorParams);
  const nominators = useMemo(
    () =>
      [...(nominatorResponse?.Nominators ?? [])].sort((a, b) =>
        (a['Display Name'] || a.Username).localeCompare(b['Display Name'] || b.Username),
      ),
    [nominatorResponse],
  );
  const reload = nominatorActions?.reloadData;

  // Only load the directory once someone opens the picker.
  const usersParams = useMemo(
    () => (modalOpen && kappSlug ? { kappSlug, integrationName: LIST_USERS } : null),
    [modalOpen, kappSlug],
  );
  const { response: usersResponse, loading: usersLoading } = useData(
    executeIntegration,
    usersParams,
  );

  const nominatorUsernames = useMemo(
    () => new Set(nominators.map(n => n.Username)),
    [nominators],
  );
  const availableUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (usersResponse?.Users ?? [])
      .filter(u => u.Username && !nominatorUsernames.has(u.Username))
      .filter(
        u =>
          !term ||
          [u['Display Name'], u.Email, u.Username].some(v =>
            v?.toLowerCase().includes(term),
          ),
      )
      .slice(0, 50);
  }, [usersResponse, nominatorUsernames, search]);

  const handleAdd = useCallback(
    async (username, name) => {
      setAdding(true);
      const result = await executeIntegration({
        kappSlug,
        integrationName: ADD_NOMINATOR,
        parameters: { Username: username },
      });
      setAdding(false);
      if (failed(result)) {
        toastError({ title: 'Could not add nominator', description: failureMessage(result) });
      } else {
        toastSuccess({ title: `${name || username} can now nominate families` });
        closeModal();
        reload?.();
      }
    },
    [kappSlug, closeModal, reload],
  );

  const handleRemove = useCallback(
    (username, name) => {
      openConfirm({
        title: 'Remove nominator',
        description: `${name || username} will no longer be able to nominate families. Nominations they have already made are not affected.`,
        acceptLabel: 'Remove',
        accept: async () => {
          const result = await executeIntegration({
            kappSlug,
            integrationName: REMOVE_NOMINATOR,
            parameters: { Username: username },
          });
          if (failed(result)) {
            toastError({ title: 'Could not remove nominator', description: failureMessage(result) });
          } else {
            toastSuccess({ title: `${name || username} removed from nominators` });
            reload?.();
          }
        },
      });
    },
    [kappSlug, reload],
  );

  const RemoveButton = ({ n }) => (
    <button
      type="button"
      className="kbtn kbtn-ghost kbtn-sm kbtn-square text-error"
      onClick={() => handleRemove(n.Username, n['Display Name'])}
      aria-label={`Remove ${n['Display Name'] || n.Username}`}
    >
      <Icon name="trash" size={16} />
    </button>
  );

  return (
    <div className="flex-c-st gap-6 max-w-screen-lg">
      <div className="flex-bs gap-4 flex-wrap">
        <div className="flex-c-st gap-1">
          <h1 className="text-h1 m-0">Nominators</h1>
          <p className="text-base-content/75 m-0 max-w-prose">
            People on this list can nominate families for Christmas Alive.
            Christmas Alive admins can always nominate, so they don&rsquo;t
            need to be added.
          </p>
        </div>
        <button
          type="button"
          className="kbtn kbtn-accent"
          onClick={() => setModalOpen(true)}
        >
          <Icon name="user-plus" size={18} />
          Add nominator
        </button>
      </div>

      {!initialized ? (
        <Loading />
      ) : nominatorResponse?.error || nominatorResponse?._Error ? (
        <div className="kalert kalert-error kalert-soft">
          <Icon name="alert-triangle" size={20} />
          <span>The nominator list could not be loaded. Refresh to try again.</span>
        </div>
      ) : nominators.length === 0 ? (
        <p className="text-base-content/70 p-6 rounded-2xl border border-dashed border-base-300 bg-base-100/60 max-w-prose m-0">
          No one can nominate yet. Add the first nominator to open nominations
          to partner churches and organizations.
        </p>
      ) : mobile ? (
        <ul className="flex-c-st gap-3 list-none p-0 m-0">
          {nominators.map(n => (
            <li key={n.Username} className="ca-card flex-sc gap-3 p-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{n['Display Name'] || n.Username}</div>
                <div className="text-sm text-base-content/60 truncate">{n.Email}</div>
              </div>
              <RemoveButton n={n} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="ca-card overflow-x-auto">
          <table className="ktable w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Username</th>
                <th className="w-16">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {nominators.map(n => (
                <tr key={n.Username}>
                  <td className="font-medium">{n['Display Name'] || n.Username}</td>
                  <td>{n.Email}</td>
                  <td className="text-base-content/60">{n.Username}</td>
                  <td>
                    <RemoveButton n={n} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-base-content/60 m-0">
        {nominators.length > 0 &&
          `${nominators.length} ${nominators.length === 1 ? 'nominator' : 'nominators'}.`}
      </p>

      <dialog className={clsx('kmodal', modalOpen && 'kmodal-open')}>
        <div className="kmodal-box max-w-md">
          <div className="flex-sc w-full">
            <h2 className="text-h3 m-0">Add a nominator</h2>
            <button
              type="button"
              className="kbtn kbtn-ghost kbtn-sm kbtn-circle ml-auto"
              onClick={closeModal}
              aria-label="Close"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          <input
            type="text"
            className="kinput kinput-bordered w-full"
            placeholder="Search by name or email"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search people"
            autoFocus
          />
          <div className="max-h-72 overflow-y-auto flex-c-st gap-1 w-full">
            {usersLoading ? (
              <Loading />
            ) : availableUsers.length === 0 ? (
              <p className="text-sm text-base-content/60 py-2 m-0">
                {search ? 'No one matches that.' : 'Everyone is already a nominator.'}
              </p>
            ) : (
              availableUsers.map(u => (
                <button
                  key={u.Username}
                  type="button"
                  className="flex-sc gap-3 p-2 rounded-lg hover:bg-base-200 text-left w-full disabled:opacity-50"
                  onClick={() => handleAdd(u.Username, u['Display Name'])}
                  disabled={adding}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-sm truncate">
                      {u['Display Name'] || u.Username}
                    </span>
                    <span className="block text-xs text-base-content/60 truncate">{u.Email}</span>
                  </span>
                  <Icon name="plus" size={16} className="text-accent flex-none" />
                </button>
              ))
            )}
          </div>
        </div>
        <form method="dialog" className="kmodal-backdrop">
          <button type="button" onClick={closeModal}>
            close
          </button>
        </form>
      </dialog>
    </div>
  );
};
