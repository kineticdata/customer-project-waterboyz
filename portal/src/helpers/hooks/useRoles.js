import { useSelector } from 'react-redux';
import { getAttributeValue } from '../records.js';

/**
 * Returns the current user's roles derived from team memberships and profile
 * attributes. Use this hook everywhere role-based logic is needed instead of
 * duplicating membership checks inline.
 *
 * @returns {{ isVolunteer: boolean, isProjectCaptain: boolean, isLeadership: boolean, isAdmin: boolean, isBookkeeper: boolean, hasProjectAccess: boolean }}
 */
export function useRoles() {
  const profile = useSelector(state => state.app.profile);

  const memberships = profile?.memberships ?? [];
  const teamNames = memberships.map(({ team }) => team.name);

  const isVolunteer = !!getAttributeValue(profile, 'Volunteer Id');
  const isProjectCaptain = teamNames.includes('SWAT Project Captains');
  const isLeadership = teamNames.includes('SWAT Leadership');
  const isBookkeeper = teamNames.includes('Bookkeepers');
  const isAdmin = !!profile?.spaceAdmin;

  return {
    isVolunteer,
    isProjectCaptain,
    isLeadership,
    isBookkeeper,
    isAdmin,
    hasProjectAccess: isProjectCaptain || isLeadership,
  };
}
