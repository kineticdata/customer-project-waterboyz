import { useState, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import { Icon } from '../../../atoms/Icon.jsx';
import { openConfirm } from '../../../helpers/confirm.js';

/**
 * Events tab inside the volunteer detail drawer.
 * Shows current event signups and allows adding new signups or cancelling.
 *
 * @param {object}   props
 * @param {object}   props.volunteer       - Enriched volunteer row from the table
 * @param {object[]} props.allEvents       - All event submissions (from parent data)
 * @param {object[]} props.allSignups      - All event signup submissions
 * @param {object}   props.eventsById      - Map of event id → event submission
 * @param {object}   props.actions         - { signUpForEvent, cancelSignup }
 */
export const EventAssociations = ({
  volunteer,
  allEvents,
  allSignups,
  eventsById,
  actions,
}) => {
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null);

  // Current signups for this volunteer (non-cancelled)
  const currentSignups = useMemo(
    () =>
      (allSignups ?? []).filter(
        s =>
          s.values?.['Volunteer ID'] === volunteer?.id &&
          s.values?.['Signup Status'] !== 'Cancelled',
      ),
    [allSignups, volunteer?.id],
  );

  const signedUpEventIds = useMemo(
    () => new Set(currentSignups.map(s => s.values?.['Event ID'])),
    [currentSignups],
  );

  // Events available to sign up for (not already signed up, Open or Planning)
  const availableEvents = useMemo(() => {
    const term = search.toLowerCase().trim();
    return (allEvents ?? [])
      .filter(e => !signedUpEventIds.has(e.id))
      .filter(e => {
        const status = e.values?.['Event Status'];
        return status === 'Open' || status === 'Planning';
      })
      .filter(
        e =>
          !term ||
          (e.values?.['Event Name'] || '').toLowerCase().includes(term),
      )
      .slice(0, 20);
  }, [allEvents, signedUpEventIds, search]);

  const handleSignUp = useCallback(
    async event => {
      setAdding(true);
      await actions.signUpForEvent(
        { id: volunteer.id, values: volunteer.values },
        event,
      );
      setAdding(false);
      setShowPicker(false);
      setSearch('');
    },
    [actions, volunteer],
  );

  const handleCancel = useCallback(
    (signup, eventName) => {
      openConfirm({
        title: 'Cancel event signup?',
        description: `Cancel this volunteer's signup for "${eventName}"?`,
        acceptLabel: 'Cancel Signup',
        cancelLabel: 'Keep',
        accept: async () => {
          setBusy(signup.id);
          await actions.cancelSignup(signup.id);
          setBusy(null);
        },
      });
    },
    [actions],
  );

  return (
    <div className="flex-c-st h-full">
      {/* Current signups */}
      <div className="p-4 flex-c-st gap-2 flex-1 overflow-auto">
        {currentSignups.length === 0 && !showPicker ? (
          <EmptyState />
        ) : (
          currentSignups.map(s => {
            const eventId = s.values?.['Event ID'];
            const evt = eventsById?.[eventId];
            const name = evt?.values?.['Event Name'] || 'Unknown Event';
            const date = evt?.values?.['Event Date'];
            const eventStatus = evt?.values?.['Event Status'];
            const signupStatus = s.values?.['Signup Status'];

            return (
              <div
                key={s.id}
                className="group rounded-xl border border-base-200/80 p-4 flex-bs gap-3 hover:border-base-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-base-content">{name}</p>
                  {date && (
                    <div className="flex-sc gap-1.5 mt-1 text-xs text-base-content/40">
                      <Icon name="calendar" size={12} />
                      {date}
                    </div>
                  )}
                </div>
                <div className="flex-sc gap-2 flex-none">
                  {eventStatus && (
                    <StatusPill status={eventStatus} map={eventStatusMap} />
                  )}
                  {signupStatus && (
                    <StatusPill status={signupStatus} map={signupStatusMap} />
                  )}
                  <button
                    type="button"
                    onClick={() => handleCancel(s, name)}
                    disabled={busy === s.id}
                    className="kbtn kbtn-sm kbtn-ghost kbtn-square text-base-content/30 hover:text-error transition-colors"
                    title="Cancel signup"
                  >
                    <Icon name="x" size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add event bar */}
      <div className="flex-none border-t border-base-200/80 p-4">
        {showPicker ? (
          <div className="flex-c-st gap-2">
            <div className="relative">
              <Icon
                name="search"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30"
              />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search events..."
                className="w-full h-9 pl-9 pr-3 text-sm rounded-lg bg-base-200/40 border border-base-300/60 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-auto rounded-lg border border-base-200/60">
              {availableEvents.length === 0 ? (
                <p className="px-3 py-4 text-xs text-base-content/30 text-center">
                  {search ? 'No matching events' : 'No open events available'}
                </p>
              ) : (
                availableEvents.map(e => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => handleSignUp(e)}
                    disabled={adding}
                    className="w-full flex-sc gap-2 px-3 py-2 text-sm hover:bg-base-200/50 transition-colors text-left border-b border-base-200/40 last:border-0"
                  >
                    <span className="flex-1 truncate">
                      <span className="font-medium">
                        {e.values?.['Event Name'] || 'Unnamed'}
                      </span>
                      {e.values?.['Event Date'] && (
                        <span className="text-xs text-base-content/40 ml-2">
                          {e.values['Event Date']}
                        </span>
                      )}
                    </span>
                    <StatusPill
                      status={e.values?.['Event Status']}
                      map={eventStatusMap}
                    />
                    <Icon name="plus" size={14} className="text-primary flex-none" />
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPicker(false);
                setSearch('');
              }}
              className="kbtn kbtn-sm kbtn-ghost self-end text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="kbtn kbtn-sm kbtn-ghost text-primary gap-1.5 w-full"
          >
            <Icon name="plus" size={15} />
            Sign Up for Event
          </button>
        )}
      </div>
    </div>
  );
};

// -- Shared --

const EmptyState = () => (
  <div className="flex-c-cc gap-3 py-12 px-6">
    <div className="w-14 h-14 rounded-full bg-base-200/50 flex-cc">
      <Icon name="calendar-heart" size={24} className="text-base-content/15" />
    </div>
    <div className="text-center">
      <p className="text-sm font-medium text-base-content/40">
        No event signups
      </p>
      <p className="text-xs text-base-content/30 mt-0.5">
        Use the button below to sign up this volunteer.
      </p>
    </div>
  </div>
);

const eventStatusMap = {
  Planning: { bg: 'bg-base-200/60', text: 'text-base-content/50' },
  Open: { bg: 'bg-success/20', text: 'text-success-content' },
  Closed: { bg: 'bg-warning/20', text: 'text-warning-content' },
  Completed: { bg: 'bg-info/20', text: 'text-info-content' },
};

const signupStatusMap = {
  'Signed Up': { bg: 'bg-info/20', text: 'text-info-content' },
  'Pending Assignment': { bg: 'bg-warning/20', text: 'text-warning-content' },
  Assigned: { bg: 'bg-success/20', text: 'text-success-content' },
  Waitlisted: { bg: 'bg-base-200/60', text: 'text-base-content/50' },
  Cancelled: { bg: 'bg-error/20', text: 'text-error-content' },
};

const StatusPill = ({ status, map }) => {
  const s = map?.[status] || { bg: 'bg-base-200/60', text: 'text-base-content/50' };
  return (
    <span
      className={clsx(
        'inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap',
        s.bg,
        s.text,
      )}
    >
      {status || '--'}
    </span>
  );
};
