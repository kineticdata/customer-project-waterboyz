import { useEffect, useState } from 'react';
import t from 'prop-types';
import { Link } from 'react-router-dom';
import { Icon } from '../../../atoms/Icon.jsx';
import {
  describeHousehold,
  familyLabel,
  isValidPhone,
} from '../../../helpers/christmasAlive.js';

/**
 * Messages for every way a claim can fail.
 *
 * ALREADY_CLAIMED is not an error — with an open pool and 250 families it is
 * an ordinary outcome, so it reads as information and points somewhere useful.
 */
const FAILURES = {
  ALREADY_CLAIMED: {
    tone: 'kalert-info',
    icon: 'info-circle',
    title: number => `${familyLabel(number)} was just sponsored by someone else`,
    body: 'Someone claimed this family a moment before you did. Other families still need a sponsor.',
  },
  NOT_AVAILABLE: {
    tone: 'kalert-info',
    icon: 'info-circle',
    title: number => `${familyLabel(number)} is no longer available`,
    body: 'This family is not open for sponsorship right now.',
  },
  SEASON_CLOSED: {
    tone: 'kalert-warning',
    icon: 'calendar',
    title: () => 'Sponsorship has closed for this season',
    body: 'Thank you for wanting to help. Sponsorship opens again each September.',
  },
  // The WebAPI enforces the same rule as the form, so this only shows if the
  // two ever drift apart (or an old cached copy of the portal is in use).
  CONTACT_REQUIRED: {
    tone: 'kalert-warning',
    icon: 'phone',
    title: () => 'We need your name and phone number',
    body: 'No family was claimed. Close this, choose the family again, and fill in your name and a 10-digit phone number.',
  },
  TIMEOUT: {
    tone: 'kalert-warning',
    icon: 'clock',
    title: () => 'We could not confirm your sponsorship',
    body: 'The request took too long to come back, so we cannot tell whether it went through. Check My sponsorships before trying again.',
  },
  UNKNOWN: {
    tone: 'kalert-error',
    icon: 'alert-triangle',
    title: () => 'Something went wrong',
    body: 'No family was claimed. Please try again.',
  },
};

/**
 * Confirm → claim → outcome, in one modal.
 *
 * The confirm step names the family and states the commitment, so nobody
 * claims a family without knowing what they are taking on. It also confirms
 * how to reach the sponsor: most sponsors have no volunteer profile, and the
 * check-in team at pickup needs a name and a phone number for every family.
 *
 * Email is shown but not editable. It is the account email, which is where the
 * packet, nudge and reminder emails go; a second editable "sponsor email"
 * could silently disagree with it.
 */
export const SponsorConfirmModal = ({
  family,
  contact,
  onClose,
  onClaim,
  onSponsorAnother,
}) => {
  const [phase, setPhase] = useState('confirm'); // confirm | working | done | failed
  const [failure, setFailure] = useState(null);
  const [claimed, setClaimed] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);

  // Start every opening from the latest known details, so a second claim is
  // pre-filled with what the sponsor typed the first time.
  const familyId = family?.sponsorshipId;
  useEffect(() => {
    setName(contact?.name ?? '');
    setPhone(contact?.phone ?? '');
    setTouched(false);
  }, [familyId, contact?.name, contact?.phone]);

  if (!family) return null;

  const household = describeHousehold(family);
  const nameError = !name.trim() ? 'Please enter your name.' : null;
  const phoneError = !isValidPhone(phone)
    ? 'Please enter a 10-digit phone number.'
    : null;

  const submit = async () => {
    setTouched(true);
    if (nameError || phoneError) return;
    setPhase('working');
    const result = await onClaim(family.sponsorshipId, {
      sponsorName: name.trim(),
      sponsorPhone: phone.trim(),
    });
    if (result?.ok) {
      setClaimed(result);
      setPhase('done');
    } else {
      setFailure(FAILURES[result?.reason] ?? FAILURES.UNKNOWN);
      setPhase('failed');
    }
  };

  return (
    <div className="kmodal kmodal-open" role="dialog" aria-modal="true">
      <div className="kmodal-box flex-c-st gap-4 sm:max-w-xl">
        {phase === 'confirm' && (
          <>
            <h2 className="text-h2 font-bold m-0">
              Sponsor {familyLabel(family.familyNumber)}?
            </h2>
            <p className="m-0">
              You&rsquo;ll be providing Christmas for {household.toLowerCase()}.
              We&rsquo;ll email you their details and a shopping guide.
            </p>
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 border border-base-300 rounded-box p-4 m-0">
              <legend className="text-sm font-semibold px-1">
                Your contact details
              </legend>
              <p className="sm:col-span-2 text-sm text-base-content/70 m-0">
                Christmas Alive uses these to reach you, and the check-in team
                uses them at pickup. Name and phone are required.
              </p>
              <label className="flex-c-st gap-1">
                <span className="text-sm font-medium">
                  Your name <span className="text-error" aria-hidden="true">*</span>
                </span>
                <input
                  required
                  aria-required="true"
                  aria-invalid={!!(touched && nameError)}
                  className={`kinput kinput-bordered w-full ${touched && nameError ? 'kinput-error' : ''}`}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={200}
                />
                {touched && nameError && (
                  <span className="text-xs text-error">{nameError}</span>
                )}
              </label>
              <label className="flex-c-st gap-1">
                <span className="text-sm font-medium">
                  Best phone number{' '}
                  <span className="text-error" aria-hidden="true">*</span>
                </span>
                <input
                  required
                  aria-required="true"
                  aria-invalid={!!(touched && phoneError)}
                  className={`kinput kinput-bordered w-full ${touched && phoneError ? 'kinput-error' : ''}`}
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="(301) 555-0100"
                  maxLength={40}
                />
                {touched && phoneError && (
                  <span className="text-xs text-error">{phoneError}</span>
                )}
              </label>
              <div className="sm:col-span-2 flex-c-st gap-0.5">
                <span className="text-sm font-medium">Email</span>
                <span className="text-sm break-all">{contact?.email || '—'}</span>
                <span className="text-xs text-base-content/60">
                  This is your account email. To change it, update your profile.
                </span>
              </div>
            </fieldset>
            <div className="flex-ec gap-2">
              <button type="button" className="kbtn kbtn-ghost" onClick={onClose}>
                Not yet
              </button>
              <button type="button" className="kbtn kbtn-accent" onClick={submit}>
                <Icon name="gift" size={18} />
                Sponsor this family
              </button>
            </div>
          </>
        )}

        {phase === 'working' && (
          <div className="flex-cc gap-3 py-6">
            <span className="kloading kloading-spinner" />
            <p className="m-0">Claiming {familyLabel(family.familyNumber)}&hellip;</p>
          </div>
        )}

        {phase === 'done' && (
          <>
            <h2 className="text-h2 font-bold m-0 flex-sc gap-2">
              <Icon name="circle-check" size={26} className="text-success" />
              You&rsquo;re sponsoring {familyLabel(claimed?.familyNumber ?? family.familyNumber)}
            </h2>
            <p className="m-0">
              We&rsquo;ve emailed you their details and what to do next. Keep
              their family number — you&rsquo;ll need it at pickup.
            </p>
            <div className="flex-c-st gap-2">
              <Link
                to={`/christmas-alive/packet/${family.sponsorshipId}`}
                className="kbtn kbtn-outline"
              >
                <Icon name="file-text" size={18} />
                View the family details
              </Link>
              <Link to="/christmas-alive/responsibilities" className="kbtn kbtn-outline">
                <Icon name="list-check" size={18} />
                Read what sponsors do
              </Link>
            </div>
            <div className="flex-ec gap-2">
              <button type="button" className="kbtn kbtn-ghost" onClick={onClose}>
                Close
              </button>
              <button type="button" className="kbtn kbtn-accent" onClick={onSponsorAnother}>
                Sponsor another family
              </button>
            </div>
          </>
        )}

        {phase === 'failed' && failure && (
          <>
            <div className={`kalert ${failure.tone} kalert-soft`}>
              <Icon name={failure.icon} size={20} />
              <div className="flex-c-st">
                <span className="font-semibold">
                  {failure.title(family.familyNumber)}
                </span>
                <span className="text-sm">{failure.body}</span>
              </div>
            </div>
            <div className="flex-ec gap-2">
              <button type="button" className="kbtn kbtn-ghost" onClick={onClose}>
                Close
              </button>
              <button type="button" className="kbtn kbtn-accent" onClick={onSponsorAnother}>
                See other families
              </button>
            </div>
          </>
        )}
      </div>
      <div className="kmodal-backdrop" onClick={phase === 'working' ? undefined : onClose} />
    </div>
  );
};

SponsorConfirmModal.propTypes = {
  family: t.object,
  contact: t.shape({ name: t.string, email: t.string, phone: t.string }),
  onClose: t.func.isRequired,
  onClaim: t.func.isRequired,
  onSponsorAnother: t.func.isRequired,
};
