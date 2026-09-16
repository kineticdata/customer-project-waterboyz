import { useMemo, useState } from 'react';
import t from 'prop-types';
import { Icon } from '../../../atoms/Icon.jsx';
import { CA_STATUS } from '../../../helpers/christmasAlive.js';

/** The sentinel the workflow watches for. Must match the tree's Start guard. */
const REQUESTED = 'REQUESTED';

/**
 * Sends every sponsor the curb-side pickup details.
 *
 * WHY A BUTTON AND NOT A SCHEDULE: this space has no Robots infrastructure, so
 * there is nothing to hang a "send on December 10" job on. The alternative was
 * deferring a workflow run per sponsor from their claim date until December,
 * which would leave hundreds of months-long runs in flight that break if the
 * tree is edited. A button also lets leadership choose the moment and see the
 * count before committing.
 *
 * HOW IT WORKS: this writes the literal string REQUESTED into each eligible
 * sponsorship's Pickup Reminder Sent At. That write fires the "Christmas Alive
 * - Pickup Reminder" workflow, which sends the mail and then overwrites the
 * sentinel with a real timestamp.
 *
 * That makes the send naturally idempotent. A sponsor who has already been
 * reminded no longer holds the sentinel, so pressing the button again only
 * reaches the ones who were missed — which is exactly what you want after a
 * partial failure, and means a double click is harmless.
 */
export const PickupReminderButton = ({ rows, season, onSend, disabled }) => {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const { pending, alreadySent } = useMemo(() => {
    const sponsored = rows.filter(
      r =>
        r.season === season &&
        r.status === CA_STATUS.ADOPTED &&
        r.sponsorUsername,
    );
    return {
      pending: sponsored.filter(r => !r.pickupReminderSentAt),
      alreadySent: sponsored.filter(r => r.pickupReminderSentAt),
    };
  }, [rows, season]);

  const send = async () => {
    setBusy(true);
    setResult(null);
    const failures = [];
    for (const row of pending) {
      const res = await onSend(row.id, {
        'Pickup Reminder Sent At': REQUESTED,
      });
      if (res?.error) failures.push(row.familyNumber || row.id);
    }
    setBusy(false);
    setConfirming(false);
    setResult(
      failures.length
        ? {
            tone: 'error',
            text: `Queued ${pending.length - failures.length}, but ${failures.length} failed (families ${failures.join(', ')}). Press again to retry just those.`,
          }
        : {
            tone: 'success',
            text: `Queued ${pending.length} ${pending.length === 1 ? 'reminder' : 'reminders'}. They send over the next few minutes.`,
          },
    );
  };

  // Nothing to send and nothing sent yet means no sponsors at all — showing a
  // dead button would just raise questions.
  if (!pending.length && !alreadySent.length) return null;

  return (
    <div className="flex-c-st gap-2">
      {result && (
        <div className={`kalert kalert-${result.tone} kalert-soft`}>
          <span>{result.text}</span>
        </div>
      )}

      {confirming ? (
        <div className="flex-c-st gap-2 p-3 rounded-lg border border-base-300 bg-base-100">
          <p className="text-sm m-0">
            Email pickup details to{' '}
            <strong>
              {pending.length} {pending.length === 1 ? 'sponsor' : 'sponsors'}
            </strong>{' '}
            for the {season} season.
            {alreadySent.length > 0 && (
              <>
                {' '}
                {alreadySent.length} already received it and{' '}
                {alreadySent.length === 1 ? 'is' : 'are'} skipped.
              </>
            )}
          </p>
          <div className="flex-ec gap-2">
            <button
              type="button"
              className="kbtn kbtn-ghost kbtn-sm"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="kbtn kbtn-accent kbtn-sm"
              onClick={send}
              disabled={busy || !pending.length}
            >
              {busy ? 'Queueing…' : `Send ${pending.length}`}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="kbtn kbtn-outline kbtn-sm"
          onClick={() => {
            setResult(null);
            setConfirming(true);
          }}
          disabled={disabled || !pending.length}
          title={
            pending.length
              ? undefined
              : 'Every sponsor this season has already been sent the pickup details.'
          }
        >
          <Icon name="mail" size={16} />
          {pending.length
            ? `Send pickup reminders (${pending.length})`
            : 'Pickup reminders all sent'}
        </button>
      )}
    </div>
  );
};

PickupReminderButton.propTypes = {
  rows: t.array.isRequired,
  season: t.string,
  onSend: t.func.isRequired,
  disabled: t.bool,
};
