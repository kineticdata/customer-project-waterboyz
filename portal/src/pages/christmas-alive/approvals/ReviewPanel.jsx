import { useState } from 'react';
import t from 'prop-types';
import { Icon } from '../../../atoms/Icon.jsx';
import { CA_STATUS, familyLabel, describeHousehold } from '../../../helpers/christmasAlive.js';

const Field = ({ label, value }) => (
  <div className="flex-c-st">
    <dt className="text-xs text-base-content/60">{label}</dt>
    <dd className="m-0 text-sm">{value || '—'}</dd>
  </div>
);

const yesNo = value => (value ? 'Yes' : 'No');

/**
 * The expanded review panel for one nomination.
 *
 * Shows every answer on the nomination form, including the "No" answers, so
 * a reviewer never has to open the raw submission to decide. Sections are
 * always present; an empty answer reads "None given" rather than vanishing.
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
  onDone,
}) => {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

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
      <section className="flex-c-st gap-2">
        <h3 className="text-sm font-semibold m-0">Nominated by</h3>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 m-0">
          <Field label="Name" value={row.nominatorName} />
          <Field label="Organization" value={row.nominatingOrganization} />
          <Field label="Phone" value={row.nominatorPhone} />
          <Field label="Email" value={row.nominatorEmail} />
          <Field label="Portal account" value={row.requestedBy} />
        </dl>
      </section>

      <section className="flex-c-st gap-2">
        <h3 className="text-sm font-semibold m-0">
          Head of household — {name}
        </h3>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 m-0">
          <Field label="Phone" value={row.phone} />
          <Field label="Email" value={row.email} />
          <Field label="Address" value={[row.addressLine1, row.city, row.state, row.zip].filter(Boolean).join(', ')} />
          <Field label="County" value={row.county} />
          <Field label="Language" value={row.nativeLanguage} />
          <Field label="Members" value={row.totalMembers} />
          <Field label="Adults" value={row.totalAdults} />
          <Field label="Children" value={row.totalChildren} />
          {row.sponsorUsername && (
            <Field
              label="Sponsor"
              value={[row.sponsorName || row.sponsorUsername, row.sponsorPhone]
                .filter(Boolean)
                .join(' · ')}
            />
          )}
        </dl>
      </section>

      <section className="flex-c-st gap-2">
        <h3 className="text-sm font-semibold m-0">
          Household — {describeHousehold(row)}
        </h3>
        {row.roster.length === 0 ? (
          <p className="text-sm text-base-content/70 m-0">
            Only the head of household was listed. No other members were
            recorded on the nomination.
          </p>
        ) : (
          <ul className="flex-c-st gap-1 list-none p-0 m-0">
            <li className="text-sm">
              <span className="font-medium">
                {[row.firstName, row.lastName].filter(Boolean).join(' ')}
              </span>
              <span className="text-base-content/60"> — Head of household</span>
            </li>
            {row.roster.map((m, i) => (
              <li key={m.id || i} className="text-sm">
                <span className="font-medium">
                  {[m.firstName, m.lastName].filter(Boolean).join(' ') ||
                    `Member ${i + 1}`}
                </span>
                <span className="text-base-content/60">
                  {' — '}
                  {[
                    m.type,
                    m.gender,
                    m.age !== '' && m.age != null ? `age ${m.age}` : null,
                    m.shirtSize ? `shirt ${m.shirtSize}` : null,
                    m.shoeSize ? `shoe ${m.shoeSize}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex-c-st gap-2">
        <h3 className="text-sm font-semibold m-0">Circumstances</h3>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 m-0">
          <Field label="Interpreter needed" value={yesNo(row.needsInterpreter)} />
          <Field label="Family photo requested" value={yesNo(row.photoRequested)} />
          <Field label="Below ALICE threshold" value={row.belowAlice || 'Not answered'} />
          <Field
            label="Support received"
            value={
              row.belowAlice === 'Yes'
                ? 'Not asked (below ALICE threshold)'
                : row.supportReceiving.join(', ') || 'None'
            }
          />
        </dl>
      </section>

      <section className="flex-c-st gap-1">
        <h3 className="text-sm font-semibold m-0">Background from the nominator</h3>
        <p className="text-sm m-0 max-w-prose whitespace-pre-line">
          {row.background || (
            <span className="text-base-content/60">None given.</span>
          )}
        </p>
      </section>

      {row.nominationId && (
        <a
          href={`#/forms/christmas-alive-family-nomination/${row.nominationId}`}
          className="text-sm w-fit"
        >
          Open the full nomination
        </a>
      )}

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
        <p className="text-sm text-base-content/70 m-0">
          Sponsored by {row.sponsorUsername}. Sponsors cannot hand a family back
          on their own — they are asked to contact Christmas Alive. To return
          this family to the list or move it to someone else, open it in All
          families.
        </p>
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
  onDone: t.func.isRequired,
};
