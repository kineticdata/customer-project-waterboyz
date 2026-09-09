import { useState } from 'react';
import t from 'prop-types';
import { Icon } from '../../../atoms/Icon.jsx';
import { CA_STATUS, familyLabel } from '../../../helpers/christmasAlive.js';

const Field = ({ label, value }) => (
  <div className="flex-c-st">
    <dt className="text-xs text-base-content/60">{label}</dt>
    <dd className="m-0 text-sm">{value || '—'}</dd>
  </div>
);

/**
 * The expanded review panel for one nomination.
 *
 * Duplicate candidates are surfaced up front rather than left to four admins
 * remembering 250 families. When there are none, it says so — silence would
 * read as a broken feature.
 */
export const ReviewPanel = ({
  row,
  duplicates,
  onApprove,
  onReject,
  onRelease,
  onReassign,
  onDone,
}) => {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [notes, setNotes] = useState('');
  const [reassignTo, setReassignTo] = useState('');

  const run = async fn => {
    setBusy(true);
    try {
      await fn();
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const name = [row.firstName, row.lastName].filter(Boolean).join(' ') || 'this family';

  return (
    <div className="border-t border-base-300 p-3 flex-c-st gap-4">
      {row.fromNomination && (
        <p className="text-xs text-base-content/60 m-0">
          Showing what the nominator submitted. A family record is created when
          you approve.
        </p>
      )}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 m-0">
        <Field label="Phone" value={row.phone} />
        <Field label="Email" value={row.email} />
        <Field label="Address" value={[row.addressLine1, row.city, row.state, row.zip].filter(Boolean).join(', ')} />
        <Field label="County" value={row.county} />
        <Field label="Language" value={row.nativeLanguage} />
        <Field label="Adults" value={row.totalAdults} />
        <Field label="Children" value={row.totalChildren} />
        {row.sponsorUsername && <Field label="Sponsor" value={row.sponsorUsername} />}
      </dl>

      {row.status === CA_STATUS.PENDING && (
        <>
          <div className="flex-c-st gap-2">
            <h3 className="text-sm font-semibold m-0">Duplicate check</h3>
            {duplicates.length === 0 ? (
              <p className="text-sm text-base-content/70 m-0">
                No likely duplicates found in the family registry.
              </p>
            ) : (
              <ul className="flex-c-st gap-2 list-none p-0 m-0">
                {duplicates.map(d => (
                  <li
                    key={d.id}
                    className="flex-bc gap-2 p-2 rounded border border-warning/40 bg-warning/10 text-sm flex-wrap"
                  >
                    <span>
                      {[d.firstName, d.lastName].filter(Boolean).join(' ')} —{' '}
                      {[d.addressLine1, d.city].filter(Boolean).join(', ')}
                      {d.familyNumber ? ` (${familyLabel(d.familyNumber)})` : ''}
                    </span>
                    <button
                      type="button"
                      className="kbtn kbtn-warning kbtn-xs"
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          onReject(row.id, `Duplicate of ${familyLabel(d.familyNumber)}`, d.id),
                        )
                      }
                    >
                      Reject as duplicate
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {rejecting ? (
            <div className="flex-c-st gap-2">
              <label className="flex-c-st gap-1">
                <span className="text-xs text-base-content/70">
                  Why is this nomination being rejected?
                </span>
                <input
                  className="kinput kinput-bordered w-full"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="This is recorded on the family's record"
                />
              </label>
              <div className="flex-ec gap-2">
                <button type="button" className="kbtn kbtn-ghost kbtn-sm" onClick={() => setRejecting(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="kbtn kbtn-error kbtn-sm"
                  disabled={!reason.trim() || busy}
                  onClick={() => run(() => onReject(row.id, reason.trim()))}
                >
                  Reject {name}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-ec gap-2">
              <button type="button" className="kbtn kbtn-ghost kbtn-sm" onClick={() => setRejecting(true)} disabled={busy}>
                Reject
              </button>
              <button
                type="button"
                className="kbtn kbtn-accent kbtn-sm"
                disabled={busy}
                onClick={() => run(() => onApprove(row.id))}
              >
                <Icon name="check" size={16} />
                Approve {name} as a new family
              </button>
            </div>
          )}
        </>
      )}

      {row.status === CA_STATUS.ADOPTED && (
        <div className="flex-c-st gap-2">
          {releasing ? (
            <>
              <label className="flex-c-st gap-1">
                <span className="text-xs text-base-content/70">
                  What happened? (kept on the record)
                </span>
                <input
                  className="kinput kinput-bordered w-full"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Sponsor could not reach the family after three attempts"
                />
              </label>
              <label className="flex-c-st gap-1">
                <span className="text-xs text-base-content/70">
                  Reassign to a username, or leave blank to return the family to the list
                </span>
                <input
                  className="kinput kinput-bordered w-full"
                  value={reassignTo}
                  onChange={e => setReassignTo(e.target.value)}
                />
              </label>
              <p className="text-sm text-base-content/70 m-0">
                {reassignTo
                  ? `${familyLabel(row.familyNumber)} moves to ${reassignTo}, who will be emailed the details. ${row.sponsorUsername} will be told the family was reassigned.`
                  : `${familyLabel(row.familyNumber)} returns to the sponsor list and ${row.sponsorUsername} will be told it was reassigned.`}
              </p>
              <div className="flex-ec gap-2">
                <button type="button" className="kbtn kbtn-ghost kbtn-sm" onClick={() => setReleasing(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="kbtn kbtn-warning kbtn-sm"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      reassignTo
                        ? onReassign(row.id, reassignTo.trim(), notes.trim())
                        : onRelease(row.id, notes.trim()),
                    )
                  }
                >
                  {reassignTo ? 'Reassign family' : 'Return to the list'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-ec">
              <button type="button" className="kbtn kbtn-outline kbtn-sm" onClick={() => setReleasing(true)}>
                Release or reassign
              </button>
            </div>
          )}
        </div>
      )}

      {row.status === CA_STATUS.REJECTED && row.rejectionReason && (
        <p className="text-sm text-base-content/70 m-0">
          Rejected: {row.rejectionReason}
        </p>
      )}
    </div>
  );
};

ReviewPanel.propTypes = {
  row: t.object.isRequired,
  duplicates: t.array.isRequired,
  onApprove: t.func.isRequired,
  onReject: t.func.isRequired,
  onRelease: t.func.isRequired,
  onReassign: t.func.isRequired,
  onDone: t.func.isRequired,
};
