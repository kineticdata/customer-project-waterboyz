/**
 * Shared constants and pure helpers for the Christmas Alive program.
 *
 * Keep this module free of React and of any platform SDK imports so it stays
 * trivially testable and safe to use from both portal pages and the
 * FamilyRoster widget (which runs inside a Kinetic form, outside the app).
 */

/** Sponsorship lifecycle. Matches `christmas-alive-sponsorships.Status`. */
export const CA_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ADOPTED: 'Adopted',
};

/**
 * A child is 18 or younger. This threshold comes from the Sponsor
 * Responsibilities sheet ("gifts for each child 18 years or younger") and is
 * the number gifts are actually bought against, so it is the source of truth —
 * not the nominator's typed Total Adults / Total Children.
 */
export const CHILD_MAX_AGE = 18;

/** Roster member `type` values. */
export const MEMBER_TYPES = ['Head of Household', 'Spouse', 'Child', 'Adult'];

/** Gender values collected on the paper form. */
export const GENDERS = ['Male', 'Female'];

/**
 * Parse a roster out of the `Family Members JSON` field.
 * Never throws — bad or missing data yields an empty roster so a malformed
 * record renders as "no members" rather than crashing the page.
 *
 * @param {string|Array|null|undefined} json
 * @returns {Array<object>}
 */
export const parseRoster = json => {
  if (!json) return [];
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Serialize a roster back to the field. */
export const serializeRoster = roster =>
  JSON.stringify(Array.isArray(roster) ? roster : []);

/**
 * Is this a child's age?
 *
 * An absent age is deliberately NOT a child: `Number(null)` is 0, which would
 * otherwise sail past the `<= 18` check and count every member with a missing
 * age as a child. A real newborn is age 0 and must still count as a child, so
 * absence has to be tested before coercion rather than after.
 */
const isChildAge = raw => {
  if (raw === null || raw === undefined || raw === '') return false;
  const age = Number(raw);
  return Number.isFinite(age) && age >= 0 && age <= CHILD_MAX_AGE;
};

/**
 * Derive household counts from a roster.
 * Anything without a usable age counts as an adult — an unknown age is far
 * more likely to be a grown-up whose age nobody recorded than a child, and
 * under-counting children would under-buy gifts.
 *
 * @param {Array<object>} roster
 * @returns {{totalMembers: number, totalAdults: number, totalChildren: number}}
 */
export const deriveCounts = roster => {
  const members = Array.isArray(roster) ? roster : [];
  const totalChildren = members.filter(m => isChildAge(m?.age)).length;
  return {
    totalMembers: members.length,
    totalAdults: members.length - totalChildren,
    totalChildren,
  };
};

/**
 * Suggest a member type from position and age, so admins entering 250
 * families rarely have to touch the dropdown.
 */
export const suggestMemberType = (index, age) => {
  if (index === 0) return 'Head of Household';
  if (index === 1) return 'Spouse';
  const n = Number(age);
  if (Number.isFinite(n) && n <= CHILD_MAX_AGE) return 'Child';
  return 'Adult';
};

/**
 * "5 people · 2 adults, 3 children" — the one-line household summary used on
 * sponsor cards. Reads faster than a grid of labelled fields.
 */
export const describeHousehold = ({ totalMembers, totalAdults, totalChildren }) => {
  const people = `${totalMembers} ${totalMembers === 1 ? 'person' : 'people'}`;
  const parts = [];
  if (totalAdults > 0) parts.push(`${totalAdults} ${totalAdults === 1 ? 'adult' : 'adults'}`);
  if (totalChildren > 0) parts.push(`${totalChildren} ${totalChildren === 1 ? 'child' : 'children'}`);
  return parts.length ? `${people} · ${parts.join(', ')}` : people;
};

/** "Family 14" — how a family is named everywhere a sponsor can see it. */
export const familyLabel = number =>
  number ? `Family ${number}` : 'Family (number pending)';

/** DaisyUI badge modifier per status, so status colour is consistent app-wide. */
export const statusBadgeClass = status =>
  ({
    [CA_STATUS.PENDING]: 'kbadge-warning',
    [CA_STATUS.APPROVED]: 'kbadge-info',
    [CA_STATUS.REJECTED]: 'kbadge-error',
    [CA_STATUS.ADOPTED]: 'kbadge-success',
  })[status] || 'kbadge-ghost';

/**
 * Is `today` inside the configured season window?
 * Missing bounds mean "not configured", which reads as out of season rather
 * than accidentally-always-open.
 */
export const isWithinSeason = (from, to, today = new Date()) => {
  if (!from || !to) return false;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  return today >= start && today <= end;
};

/**
 * Household size bands used by the sponsor browse filter. Kept here with the
 * other pure helpers so the filter component only exports a component (React
 * fast refresh requires that).
 */
export const SIZE_BANDS = [
  { value: 'small', label: '1–3 people', test: f => f.totalMembers <= 3 },
  { value: 'medium', label: '4–6 people', test: f => f.totalMembers >= 4 && f.totalMembers <= 6 },
  { value: 'large', label: '7 or more', test: f => f.totalMembers >= 7 },
];

/** Predicate for a size band value; an unknown or empty band matches everything. */
export const sizeBandTest = value =>
  SIZE_BANDS.find(b => b.value === value)?.test ?? (() => true);

/**
 * Likely duplicates of a nomination, drawn from the family registry.
 *
 * Matches on last name, street address, or phone. Records flagged as test
 * fixtures are excluded: fixtures live in the shared `families` store, so an
 * abandoned one would otherwise surface as a duplicate candidate against a
 * real nomination months later.
 *
 * @param {object} row   the nomination being reviewed
 * @param {Array} rows   every sponsorship row for the season
 * @returns {Array}
 */
export const findDuplicates = (row, rows) => {
  const norm = s => (s || '').trim().toLowerCase();
  const digits = s => (s || '').replace(/\D/g, '');

  const lastName = norm(row?.lastName);
  const address = norm(row?.addressLine1);
  const phone = digits(row?.phone);

  if (!lastName && !address && !phone) return [];

  return (rows || [])
    .filter(r => r.id !== row?.id && r.familyId && !r.isTestFixture)
    .filter(
      r =>
        (!!lastName && norm(r.lastName) === lastName) ||
        (!!address && norm(r.addressLine1) === address) ||
        (!!phone && digits(r.phone) === phone),
    );
};

/**
 * Escape one CSV cell.
 *
 * A leading =, +, - or @ is prefixed with an apostrophe so a spreadsheet does
 * not evaluate exported family data as a formula. This export contains names
 * and addresses typed by nominators, so it is untrusted input.
 */
export const csvCell = value => {
  const s = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/**
 * Column order for the admin export, verbatim from the requirements document.
 * "Family ID" is the human family number sponsors quote at pickup, not the
 * submission id.
 */
export const EXPORT_COLUMNS = [
  ['Family ID', r => r.familyNumber],
  ['Status', r => r.status],
  ['House Head First Name', r => r.firstName],
  ['House Head Last Name', r => r.lastName],
  ['House Head Email', r => r.email],
  ['House Head Phone', r => r.phone],
  ['Street', r => r.addressLine1],
  ['City', r => r.city],
  ['State', r => r.state],
  ['Zip', r => r.zip],
  ['Number of Members', r => r.totalMembers],
  ['Adults', r => r.totalAdults],
  ['Children', r => r.totalChildren],
];

/** Build the admin export CSV. */
export const buildExportCsv = rows =>
  [
    EXPORT_COLUMNS.map(([label]) => csvCell(label)).join(','),
    ...(rows || []).map(r =>
      EXPORT_COLUMNS.map(([, get]) => csvCell(get(r))).join(','),
    ),
  ].join('\r\n');
