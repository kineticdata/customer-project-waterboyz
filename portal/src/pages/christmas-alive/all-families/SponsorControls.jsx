import { useMemo, useState } from 'react';
import t from 'prop-types';
import { fetchUsers } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { familyLabel, isValidPhone } from '../../../helpers/christmasAlive.js';

/**
 * Sponsor management for one family — leadership only.
 *
 * Sponsors deliberately cannot hand a family back on their own. The program
 * wants a conversation first, so a sponsor is told to contact Christmas Alive
 * and leadership makes the change here. This is the only place either action
 * exists in the portal.
 *
 * The new sponsor is chosen from the user directory rather than typed. A typo
 * in a username would not fail loudly: the record would save, and only the
 * packet email would quietly fail to find a recipient.
 *
 * Reassigning clears Packet Sent At, which re-arms the send-packet workflow so
 * the incoming sponsor is emailed automatically. Returning a family to the list
 * does not, because an Approved row is not eligible to send.
 *
 * Name and phone are what the Restoration Church check-in team works from.
 * Sponsors supply them when they claim; leadership fills them in here for a
 * reassigned sponsor or one who claimed before they were collected.
 */
export const SponsorControls = ({ row, saving, onRelease, onReassign, onSaveContact }) => {
  const [mode, setMode] = useState(null); // null | 'release' | 'reassign' | 'contact'
  const [search, setSearch] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Only pull the directory once someone actually opens the picker.
  const params = useMemo(
    () => (mode === 'reassign' ? { include: 'details', limit: 1000 } : null),
    [mode],
  );
  const { response, loading } = useData(fetchUsers, params);

  const matches = useMemo(() => {
    const users = response?.users ?? [];
    const term = search.trim().toLowerCase();
    return users
      .filter(u => u.username !== row.sponsorUsername)
      .filter(
        u =>
          !term ||
          [u.displayName, u.email, u.username].some(v =>
            v?.toLowerCase().includes(term),
          ),
      )
      .slice(0, 8);
  }, [response, search, row.sponsorUsername]);

  const close = () => {
    setMode(null);
    setSearch('');
    setNewPhone('');
  };

  const openContact = () => {
    setContactName(row.sponsorName || '');
    setContactPhone(row.sponsorPhone || '');
    setMode('contact');
  };

  // Phone is optional when leadership assigns or edits -- they may not have
  // it -- but anything typed must be dialable.
  const newPhoneError = newPhone.trim() && !isValidPhone(newPhone);
  const contactPhoneError = contactPhone.trim() && !isValidPhone(contactPhone);
  const sponsorLabel = row.sponsorName || row.sponsorUsername;

  const act = async fn => {
    await fn();
    close();
  };

  if (!row.sponsorUsername) {
    return (
      <p className="text-sm text-base-content/70 m-0">
        No sponsor yet — this family is still on the list.
      </p>
    );
  }

  return (
    <div className="flex-c-st gap-2 border-t border-base-300 pt-3">
      <div className="flex-c-st gap-0.5">
        <p className="text-sm m-0">
          <span className="text-base-content/60">Sponsored by </span>
          <span className="font-medium">{sponsorLabel}</span>
        </p>
        <p className="text-sm m-0">
          {row.sponsorPhone || (
            <span className="text-warning">No phone on file</span>
          )}
          {row.sponsorEmail && (
            <span className="text-base-content/60"> · {row.sponsorEmail}</span>
          )}
        </p>
      </div>

      {mode === null && (
        <>
          <div className="flex-ss gap-2 flex-wrap">
            <button
              type="button"
              className="kbtn kbtn-outline kbtn-sm"
              onClick={() => setMode('reassign')}
              disabled={saving}
            >
              Reassign to someone else
            </button>
            <button
              type="button"
              className="kbtn kbtn-ghost kbtn-sm"
              onClick={openContact}
              disabled={saving}
            >
              Edit contact
            </button>
            <button
              type="button"
              className="kbtn kbtn-ghost kbtn-sm"
              onClick={() => setMode('release')}
              disabled={saving}
            >
              Return to the list
            </button>
          </div>
          <p className="text-xs text-base-content/60 m-0">
            Sponsors are asked to contact Christmas Alive rather than drop a
            family themselves, so these are the only ways it happens.
          </p>
        </>
      )}

      {mode === 'release' && (
        <div className="flex-c-st gap-2">
          <p className="text-sm m-0">
            {familyLabel(row.familyNumber)} goes back on the list for anyone to
            sponsor, and {sponsorLabel} is removed. They are not emailed
            about this — tell them yourself.
          </p>
          <div className="flex-ec gap-2">
            <button
              type="button"
              className="kbtn kbtn-ghost kbtn-sm"
              onClick={close}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="kbtn kbtn-warning kbtn-sm"
              onClick={() => act(onRelease)}
              disabled={saving}
            >
              {saving ? 'Working…' : 'Return to the list'}
            </button>
          </div>
        </div>
      )}

      {mode === 'contact' && (
        <div className="flex-c-st gap-2">
          <label className="flex-c-st gap-1">
            <span className="text-xs text-base-content/70">Sponsor name</span>
            <input
              className="kinput kinput-bordered kinput-sm w-full max-w-sm"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              maxLength={200}
            />
          </label>
          <label className="flex-c-st gap-1">
            <span className="text-xs text-base-content/70">Sponsor phone</span>
            <input
              className={`kinput kinput-bordered kinput-sm w-full max-w-sm ${contactPhoneError ? 'kinput-error' : ''}`}
              type="tel"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              maxLength={40}
            />
            {contactPhoneError && (
              <span className="text-xs text-error">
                Enter a 10-digit phone number, or leave it blank.
              </span>
            )}
          </label>
          <p className="text-xs text-base-content/60 m-0">
            Only the contact details change. Nobody is emailed.
          </p>
          <div className="flex-ec gap-2">
            <button
              type="button"
              className="kbtn kbtn-ghost kbtn-sm"
              onClick={close}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="kbtn kbtn-primary kbtn-sm"
              onClick={() =>
                act(() =>
                  onSaveContact({
                    name: contactName.trim(),
                    phone: contactPhone.trim(),
                  }),
                )
              }
              disabled={saving || !!contactPhoneError}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {mode === 'reassign' && (
        <div className="flex-c-st gap-2">
          <label className="flex-c-st gap-1">
            <span className="text-xs text-base-content/70">
              Who takes over {familyLabel(row.familyNumber)}?
            </span>
            <input
              className="kinput kinput-bordered kinput-sm w-full max-w-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email"
              autoFocus
            />
          </label>
          <label className="flex-c-st gap-1">
            <span className="text-xs text-base-content/70">
              Their phone number (optional)
            </span>
            <input
              className={`kinput kinput-bordered kinput-sm w-full max-w-sm ${newPhoneError ? 'kinput-error' : ''}`}
              type="tel"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              maxLength={40}
            />
            {newPhoneError && (
              <span className="text-xs text-error">
                Enter a 10-digit phone number, or leave it blank.
              </span>
            )}
          </label>

          {loading && (
            <p className="text-sm text-base-content/70 m-0">Loading people…</p>
          )}

          {!loading && matches.length === 0 && (
            <p className="text-sm text-base-content/70 m-0">
              {search.trim()
                ? 'Nobody matches that.'
                : 'Start typing to find someone.'}
            </p>
          )}

          <ul className="flex-c-st gap-1 list-none p-0 m-0">
            {matches.map(u => (
              <li key={u.username}>
                <button
                  type="button"
                  className="kbtn kbtn-ghost h-auto py-2 justify-start w-full max-w-md text-left normal-case"
                  onClick={() =>
                    act(() =>
                      onReassign({
                        username: u.username,
                        email: u.email,
                        name: u.displayName,
                        phone: newPhone.trim(),
                      }),
                    )
                  }
                  disabled={saving || !!newPhoneError}
                >
                  <span className="flex-c-st items-start">
                    <span className="font-medium leading-tight">
                      {u.displayName || u.username}
                    </span>
                    {u.email && (
                      <span className="text-xs font-normal text-base-content/60 leading-tight">
                        {u.email}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="text-xs text-base-content/60 m-0">
            Both people are emailed: the new sponsor gets their packet, and{' '}
            {sponsorLabel} is told the family was passed on.
          </p>

          <div className="flex-ec">
            <button
              type="button"
              className="kbtn kbtn-ghost kbtn-sm"
              onClick={close}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

SponsorControls.propTypes = {
  row: t.object.isRequired,
  saving: t.bool,
  onRelease: t.func.isRequired,
  onReassign: t.func.isRequired,
  onSaveContact: t.func.isRequired,
};
