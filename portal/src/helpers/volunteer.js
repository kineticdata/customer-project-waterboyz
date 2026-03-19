import { updateProfile } from '@kineticdata/react';
import { appActions } from './state.js';

/**
 * Updates the "Volunteer Profile Updated At" profile attribute to now and
 * syncs the updated profile into Redux.
 */
export const markVolunteerProfileUpdated = async () => {
  const { error, profile } = await updateProfile({
    profile: {
      profileAttributesMap: {
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
