import { useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from '../atoms/Modal.jsx';
import { Icon } from '../atoms/Icon.jsx';
import {
  getAttributeValue,
  getProfileAttributeValue,
} from '../helpers/records.js';
import { useVolunteerRecord } from '../helpers/hooks/useVolunteerRecord.js';

const STALE_DAYS = 90;

/**
 * Checks if a volunteer profile is stale (not updated in STALE_DAYS days).
 */
function isProfileStale(profile) {
  const volunteerId = getAttributeValue(profile, 'Volunteer Id');
  if (!volunteerId) return false;

  const updatedAt = getProfileAttributeValue(
    profile,
    'Volunteer Profile Updated At',
  );
  if (!updatedAt) return true;

  const lastUpdated = new Date(updatedAt);
  if (isNaN(lastUpdated.getTime())) return true;

  const daysSince =
    (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= STALE_DAYS;
}

/**
 * Determines whether a captain/leadership user needs a volunteer profile.
 *
 * Check order:
 * 1. If profile data isn't loaded yet → loading
 * 2. If user has `Volunteer Id` attribute → not required (no async needed)
 * 3. If user is not Captain/Leadership → not required (no async needed)
 * 4. Search datastore for a volunteer record by username (via useVolunteerRecord):
 *    - Still loading → loading
 *    - Record found → not required (workflow just hasn't linked it yet)
 *    - No record → required
 */
function useNeedsVolunteerProfile() {
  const profile = useSelector(state => state.app.profile);
  const { volunteerId, loading: volunteerLoading } = useVolunteerRecord();

  // Profile not fully loaded yet
  const profileReady = !!profile?.attributesMap && !!profile?.memberships;

  // Is Captain or Leadership?
  const isProjectRole = useMemo(() => {
    if (!profileReady) return false;
    const teamNames = profile.memberships.map(({ team }) => team.name);
    return (
      teamNames.includes('SWAT Project Captains') ||
      teamNames.includes('SWAT Leadership')
    );
  }, [profileReady, profile?.memberships]);

  if (!profileReady) return { loading: true, required: false };
  if (volunteerId) return { loading: false, required: false };
  if (!isProjectRole) return { loading: false, required: false };
  if (volunteerLoading) return { loading: true, required: false };
  return { loading: false, required: true };
}

/**
 * Two-mode volunteer profile prompt:
 *
 * 1. **Required** — Project Captains / Leadership who have no Volunteer Id
 *    attribute AND no existing volunteer record in the datastore see a
 *    non-dismissible modal blocking the portal.
 *
 * 2. **Nudge** — Existing volunteers whose profile hasn't been updated in
 *    90 days see a dismissible modal (once per session).
 */
export const VolunteerProfilePrompt = () => {
  const profile = useSelector(state => state.app.profile);
  const volunteerProfilePending = useSelector(
    state => state.app.volunteerProfilePending,
  );
  const navigate = useNavigate();
  const location = useLocation();

  const { loading: checkLoading, required } = useNeedsVolunteerProfile();
  const stale = useMemo(() => isProfileStale(profile), [profile]);
  const [dismissed, setDismissed] = useState(false);

  const onProfilePage = location.pathname === '/profile';

  // Required: show only after the full check completes and confirms no record.
  // Suppress while loading, pending (just submitted), or on the profile page.
  const showRequired =
    !checkLoading && required && !volunteerProfilePending && !onProfilePage;
  // Nudge: open until dismissed (once per session)
  const showNudge = !required && stale && !dismissed && !onProfilePage;
  const open = showRequired || showNudge;

  const handleGoToProfile = useCallback(() => {
    if (!required) setDismissed(true);
    const returnTo = location.pathname + location.search;
    navigate('/profile?tab=volunteer', {
      state: { returnTo: returnTo !== '/profile' ? returnTo : undefined },
    });
  }, [navigate, location, required]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (showRequired) {
    return (
      <Modal
        open={true}
        onOpenChange={() => {}}
        title="Create Your Volunteer Profile"
        closeOnInteractOutside={false}
        closeOnEscape={false}
        closeTrigger={false}
      >
        <div slot="description">
          <p className="text-base-content/70">
            As a Project Captain, you need a volunteer profile before you can be
            assigned to projects. This only takes a minute — fill in your skills,
            tools, and availability so we can match you with the right work.
          </p>
        </div>
        <div slot="footer">
          <button
            type="button"
            className="kbtn kbtn-primary"
            onClick={handleGoToProfile}
          >
            <Icon name="user-plus" size={18} />
            Set Up Volunteer Profile
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={({ open: isOpen }) => {
        if (!isOpen) setDismissed(true);
      }}
      title="Update Your Volunteer Profile"
      closeOnInteractOutside={false}
    >
      <div slot="description">
        <p className="text-base-content/70">
          It&apos;s been a while since you last updated your volunteer profile.
          Keeping your skills, tools, and availability up to date helps us match
          you with the right projects.
        </p>
      </div>
      <div slot="footer">
        <button
          type="button"
          className="kbtn kbtn-primary"
          onClick={handleGoToProfile}
        >
          <Icon name="user-edit" size={18} />
          Update Profile
        </button>
        <button
          type="button"
          className="kbtn kbtn-ghost"
          onClick={handleDismiss}
        >
          Remind Me Later
        </button>
      </div>
    </Modal>
  );
};
