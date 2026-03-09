import { useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { updateProfile } from '@kineticdata/react';
import { Modal } from '../atoms/Modal.jsx';
import { Icon } from '../atoms/Icon.jsx';
import {
  getAttributeValue,
  getProfileAttributeValue,
} from '../helpers/records.js';
import { appActions } from '../helpers/state.js';

const STALE_DAYS = 90;

/**
 * Checks if a volunteer profile is stale (not updated in STALE_DAYS days).
 * Returns true if the user is a volunteer and their profile is stale or has
 * never been marked as updated.
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

  const daysSince = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= STALE_DAYS;
}

/**
 * Updates the "Volunteer Profile Updated At" profile attribute to now and
 * syncs the updated profile into Redux.
 */
export const markVolunteerProfileUpdated = async () => {
  const { error, profile } = await updateProfile({
    profile: {
      profileAttributes: {
        'Volunteer Profile Updated At': [new Date().toISOString()],
      },
    },
    include: 'profileAttributesMap,attributesMap,memberships',
  });
  if (!error && profile) {
    appActions.updateProfile(profile);
  }
  return { error, profile };
};

/**
 * Renders a modal prompt when a volunteer's profile hasn't been updated in
 * more than 90 days. Shown once per session.
 */
export const VolunteerProfilePrompt = () => {
  const profile = useSelector(state => state.app.profile);
  const navigate = useNavigate();
  const location = useLocation();

  const stale = useMemo(() => isProfileStale(profile), [profile]);
  const [dismissed, setDismissed] = useState(false);
  const open = stale && !dismissed;

  const handleUpdate = useCallback(() => {
    setDismissed(true);
    // Preserve the current location so the profile page can redirect back
    const returnTo = location.pathname + location.search;
    navigate('/profile?tab=volunteer', {
      state: { returnTo: returnTo !== '/profile' ? returnTo : undefined },
    });
  }, [navigate, location]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

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
          It's been a while since you last updated your volunteer profile.
          Keeping your skills, tools, and availability up to date helps us match
          you with the right projects.
        </p>
      </div>
      <div slot="footer">
        <button
          type="button"
          className="kbtn kbtn-primary"
          onClick={handleUpdate}
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
