import { getAttributeValue } from './records.js';

/**
 * Starting values for a new nomination, so a known nominator doesn't retype
 * their own details.
 *
 * Shared by every route that renders a nomination form -- the Christmas Alive
 * Nominate page AND the generic /forms/:formSlug page, which the home page
 * cards and "Submit another nomination" link to. Pre-filling in only one of
 * them meant whichever way in people happened to use decided whether they saw
 * their name.
 *
 * Only returns fields that exist on that form. Passing a value for an unknown
 * field name makes CoreForm fail to render the whole page.
 *
 * @param {string} formSlug
 * @param {object} profile  the signed-in user (state.app.profile, which is
 *   loaded with attributesMap)
 * @returns {object|undefined} field values, or undefined when there are none
 */
export const nominationDefaults = (formSlug, profile) => {
  if (!profile) return undefined;

  if (formSlug === 'christmas-alive-family-nomination') {
    const [first, ...rest] = (profile.displayName || '').trim().split(/\s+/);
    return {
      'Requested By': profile.username || '',
      'Nominator First Name': first || '',
      'Nominator Last Name': rest.join(' '),
      'Nominator Email': profile.email || '',
      // Remembered from their previous nomination by the 'Christmas Alive -
      // Remember Nominator Details' workflow; blank until then.
      'Nominator Phone Number': getAttributeValue(profile, 'CA Nominator Phone Number', ''),
      'Nominating Organization': getAttributeValue(profile, 'CA Nominator Organization', ''),
    };
  }

  return undefined;
};
