import { useEffect, useState } from 'react';
import t from 'prop-types';
import {
  CA_STATUS,
  describeHousehold,
  serializeRoster,
} from '../../../helpers/christmasAlive.js';
import { FamilyRoster } from '../../../components/family-roster/FamilyRoster.jsx';
import { SponsorControls } from './SponsorControls.jsx';

/** Platform timestamps are second-precision UTC; match them exactly. */
const nowStamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

const FAMILY_FIELDS = [
  ['First Name', 'firstName'],
  ['Last Name', 'lastName'],
  ['Email', 'email'],
  ['Phone Number', 'phone'],
  ['Address Line 1', 'addressLine1'],
  ['City', 'city'],
  ['State', 'state'],
  ['Zip', 'zip'],
  ['County', 'county'],
];

/**
 * Expanded detail for one family, with inline editing.
 *
 * Contact details live on the shared `families` registry; status lives on the
 * season record. They are saved separately because they are different records
 * with different lifetimes — editing an address corrects it for every season,
 * while changing status only affects this one.
 */
export const FamilyDetailPanel = ({ row, onSaveFamily, onSaveSponsorship, saving }) => {
  const [draft, setDraft] = useState({});
  const [status, setStatus] = useState(row.status);
  const [rosterDraft, setRosterDraft] = useState('[]');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setDraft(Object.fromEntries(FAMILY_FIELDS.map(([, k]) => [k, row[k] ?? ''])));
    setStatus(row.status);
    setRosterDraft(serializeRoster(row.roster));
    setMessage(null);
  }, [row]);

  const rosterDirty = rosterDraft !== serializeRoster(row.roster);

  // The roster lives on the shared families record, so this is the same write
  // as a contact correction. The household counts on the season row are NOT
  // written here -- the sync workflow derives them, which keeps one authority
  // for the counting rules instead of two.
  const saveRoster = async () => {
    const result = await onSaveFamily(row.familyId, {
      'Family Members JSON': rosterDraft,
    });
    setMessage(
      result?.error
        ? { tone: 'error', text: 'Could not save the household. Nothing was changed.' }
        : {
            tone: 'success',
            text: 'Household saved. The sponsor list and packet catch up in a moment.',
          },
    );
  };

  const dirty = FAMILY_FIELDS.some(([, k]) => (draft[k] ?? '') !== (row[k] ?? ''));

  const saveContact = async () => {
    const values = Object.fromEntries(
      FAMILY_FIELDS.map(([field, key]) => [field, draft[key] ?? '']),
    );
    const result = await onSaveFamily(row.familyId, values);
    setMessage(
      result?.error
        ? { tone: 'error', text: 'Could not save. Nothing was changed.' }
        : { tone: 'success', text: 'Saved.' },
    );
  };

  const saveStatus = async () => {
    const result = await onSaveSponsorship(row.id, { Status: status });
    setMessage(
      result?.error
        ? { tone: 'error', text: 'Could not change status.' }
        : { tone: 'success', text: `Status is now ${status}.` },
    );
  };

  // Returning a family to the list clears every trace of the claim, so the row
  // is indistinguishable from one that was never sponsored. Packet Sent At goes
  // too, or a future sponsor would never be sent their packet.
  const releaseSponsor = async () => {
    const result = await onSaveSponsorship(row.id, {
      Status: CA_STATUS.APPROVED,
      'Sponsor Username': '',
      'Sponsor Email': '',
      'Claimed At': '',
      'Packet Sent At': '',
    });
    setMessage(
      result?.error
        ? { tone: 'error', text: 'Could not return the family to the list.' }
        : { tone: 'success', text: 'Back on the list for anyone to sponsor.' },
    );
  };

  // Clearing Packet Sent At re-arms the send-packet workflow, which is what
  // emails the incoming sponsor their details.
  const reassignSponsor = async (username, email) => {
    const result = await onSaveSponsorship(row.id, {
      Status: CA_STATUS.ADOPTED,
      'Sponsor Username': username,
      'Sponsor Email': email || username,
      'Claimed At': nowStamp(),
      'Packet Sent At': '',
    });
    setMessage(
      result?.error
        ? { tone: 'error', text: 'Could not reassign the family.' }
        : { tone: 'success', text: `Reassigned to ${username}, who has been emailed.` },
    );
  };

  return (
    <div className="border-t border-base-300 p-4 flex-c-st gap-5 bg-base-200/40">
      {message && (
        <div className={`kalert kalert-${message.tone} kalert-soft`}>
          <span>{message.text}</span>
        </div>
      )}

      <section className="flex-c-st gap-2">
        <div className="flex-bc gap-2 flex-wrap">
          <h3 className="text-sm font-semibold m-0">Contact and address</h3>
          <span className="text-xs text-base-content/60">
            Shared with SWAT — a correction here applies to every season
          </span>
        </div>

        {!row.hasFamilyRecord ? (
          <p className="text-sm text-base-content/70 m-0">
            No family record yet. One is created when the nomination is
            approved, so there is nothing to edit until then.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {FAMILY_FIELDS.map(([field, key]) => (
                <label key={key} className="flex-c-st gap-1">
                  <span className="text-xs text-base-content/70">{field}</span>
                  <input
                    className="kinput kinput-bordered kinput-sm w-full"
                    value={draft[key] ?? ''}
                    onChange={e => setDraft({ ...draft, [key]: e.target.value })}
                    disabled={saving}
                  />
                </label>
              ))}
            </div>
            <div className="flex-ec gap-2">
              <button
                type="button"
                className="kbtn kbtn-accent kbtn-sm"
                onClick={saveContact}
                disabled={!dirty || saving}
              >
                {saving ? 'Saving…' : 'Save contact details'}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="flex-c-st gap-2">
        <h3 className="text-sm font-semibold m-0">This season</h3>
        <div className="flex-ss gap-3 flex-wrap items-end">
          <label className="flex-c-st gap-1">
            <span className="text-xs text-base-content/70">Status</span>
            <select
              className="kselect kselect-bordered kselect-sm"
              value={status}
              onChange={e => setStatus(e.target.value)}
              disabled={saving}
            >
              {Object.values(CA_STATUS).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="kbtn kbtn-outline kbtn-sm"
            onClick={saveStatus}
            disabled={status === row.status || saving}
          >
            Change status
          </button>
        </div>

        <SponsorControls
          row={row}
          saving={saving}
          onRelease={releaseSponsor}
          onReassign={reassignSponsor}
        />
        {row.rejectionReason && (
          <p className="text-sm text-base-content/70 m-0">
            Rejected: {row.rejectionReason}
          </p>
        )}
      </section>

      <section className="flex-c-st gap-2">
        <div className="flex-bc gap-2 flex-wrap">
          <h3 className="text-sm font-semibold m-0">
            Household — {describeHousehold(row)}
          </h3>
          <span className="text-xs text-base-content/60">
            Changing this updates what the sponsor sees
          </span>
        </div>

        {/* The head of household is the record's own name, not a roster row.
            Showing them here keeps the household readable as a whole, while
            the editor below covers everybody else. */}
        <p className="text-sm m-0">
          <span className="font-medium">
            {[row.firstName, row.lastName].filter(Boolean).join(' ') ||
              'Head of household'}
          </span>
          <span className="text-base-content/60">
            {' '}
            — Head of household (edit their name above)
          </span>
        </p>

        {!row.hasFamilyRecord ? (
          <p className="text-sm text-base-content/70 m-0">
            The household comes from the nomination until it is approved, so it
            cannot be edited here yet.
          </p>
        ) : (
          <>
            <FamilyRoster
              value={rosterDraft}
              onChange={setRosterDraft}
              disabled={saving}
            />
            <div className="flex-ec gap-2">
              <button
                type="button"
                className="kbtn kbtn-accent kbtn-sm"
                onClick={saveRoster}
                disabled={!rosterDirty || saving}
              >
                {saving ? 'Saving…' : 'Save household'}
              </button>
            </div>
          </>
        )}
      </section>

      {(row.supportReceiving.length > 0 || row.needsInterpreter || row.photoRequested) && (
        <section className="flex-c-st gap-1">
          <h3 className="text-sm font-semibold m-0">Circumstances</h3>
          {row.supportReceiving.length > 0 && (
            <p className="text-sm m-0">
              <span className="text-base-content/60">Support received: </span>
              {row.supportReceiving.join(', ')}
            </p>
          )}
          {row.needsInterpreter && (
            <p className="text-sm m-0">An interpreter is needed.</p>
          )}
          {row.photoRequested && (
            <p className="text-sm m-0">
              <span className="text-base-content/60">Family portrait: </span>
              {row.photoRequested}
            </p>
          )}
        </section>
      )}

      {row.background && (
        <section className="flex-c-st gap-1">
          <h3 className="text-sm font-semibold m-0">
            Background from the nominator
          </h3>
          <p className="text-sm m-0 max-w-prose whitespace-pre-line">
            {row.background}
          </p>
        </section>
      )}

      {row.nominationId && (
        <a
          href={`#/forms/christmas-alive-family-nomination/${row.nominationId}`}
          className="text-sm w-fit"
        >
          Open the full nomination
        </a>
      )}

      {/* Deliberately no link to the sponsor packet here. The packet WebAPI
          authorizes on "is the caller the sponsor of record", so an admin who
          is not the sponsor would land on a dead end. Everything the packet
          shows is already on this panel. */}
    </div>
  );
};

FamilyDetailPanel.propTypes = {
  row: t.object.isRequired,
  onSaveFamily: t.func.isRequired,
  onSaveSponsorship: t.func.isRequired,
  saving: t.bool,
};
