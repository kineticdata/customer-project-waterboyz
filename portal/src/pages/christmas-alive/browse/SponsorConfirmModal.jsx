import { useState } from 'react';
import t from 'prop-types';
import { Link } from 'react-router-dom';
import { Icon } from '../../../atoms/Icon.jsx';
import { describeHousehold, familyLabel } from '../../../helpers/christmasAlive.js';

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
 * claims a family without knowing what they are taking on.
 */
export const SponsorConfirmModal = ({ family, onClose, onClaim, onSponsorAnother }) => {
  const [phase, setPhase] = useState('confirm'); // confirm | working | done | failed
  const [failure, setFailure] = useState(null);
  const [claimed, setClaimed] = useState(null);

  if (!family) return null;

  const household = describeHousehold(family);

  const submit = async () => {
    setPhase('working');
    const result = await onClaim(family.sponsorshipId);
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
      <div className="kmodal-box flex-c-st gap-4">
        {phase === 'confirm' && (
          <>
            <h2 className="text-h2 font-bold m-0">
              Sponsor {familyLabel(family.familyNumber)}?
            </h2>
            <p className="m-0">
              You&rsquo;ll be providing Christmas for {household.toLowerCase()}.
              We&rsquo;ll email you their details and a shopping guide.
            </p>
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
  onClose: t.func.isRequired,
  onClaim: t.func.isRequired,
  onSponsorAnother: t.func.isRequired,
};
