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
 * The Christmas Alive Amazon Wish List: shelf-stable food and hygiene supplies
 * for the families' Christmas boxes, shipped straight to Waterboyz. Anyone can
 * give through it -- no account and no sponsored family needed. Comes from the
 * "Amazon Wish List — Food & Hygiene" flyer; check it each season.
 */
export const CA_WISH_LIST_URL =
  'https://www.amazon.com/registries/gl/guest-view/1ML44R2LG8WXI';

/**
 * A child is 18 or younger. This threshold comes from the Sponsor
 * Responsibilities sheet ("gifts for each child 18 years or younger") and is
 * the number gifts are actually bought against, so it is the source of truth —
 * not the nominator's typed Total Adults / Total Children.
 */
export const CHILD_MAX_AGE = 18;

/**
 * Roster member `type` values.
 *
 * "Head of Household" is deliberately absent. The head is captured as real
 * fields on the record itself (First Name / Last Name on both the nomination
 * and `families`), so offering it here would invite entering that person
 * twice. The roster is everyone ELSE in the home — which is also why the
 * legacy widget on `families` was titled "Additional Family Members".
 */
export const MEMBER_TYPES = ['Spouse', 'Child', 'Adult'];

/** Gender values collected on the paper form. */
export const GENDERS = ['Male', 'Female'];

/**
 * Roster fields a nominator must fill in for every household member. Sponsors
 * shop by name, gender and relationship, so a row missing any of them cannot
 * be shopped for. Age and sizes stay optional.
 */
export const REQUIRED_MEMBER_FIELDS = [
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['gender', 'Gender'],
  ['type', 'Relationship'],
];

/**
 * Which required fields each roster row is missing.
 *
 * @param {Array<object>} roster
 * @returns {Array<{index: number, missing: string[]}>} one entry per incomplete
 *   row, in roster order; empty when every row is complete
 */
export const rosterProblems = roster =>
  (roster || [])
    .map((member, index) => ({
      index,
      missing: REQUIRED_MEMBER_FIELDS.filter(
        ([key]) => !String(member?.[key] ?? '').trim(),
      ).map(([key]) => key),
    }))
    .filter(p => p.missing.length > 0);

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
  let parsed;
  try {
    parsed = typeof json === 'string' ? JSON.parse(json) : json;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  // Drop any row typed "Head of Household". The head lives in the record's own
  // name fields, so such a row is that same person a second time -- it renders
  // as a duplicate and inflates every household count by one. Rows like this
  // exist in data written before the head became a record field. The stored
  // JSON is left alone; this only affects what is read back.
  return parsed.filter(
    m => String(m?.type ?? '').toLowerCase() !== 'head of household',
  );
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
 * Household totals: the roster PLUS the head of household.
 *
 * The roster holds everyone except the head, who lives in the record's own
 * name fields. Every total shown to a user or stored on a sponsorship row is a
 * household total, so the head has to be added back exactly once. Centralised
 * here so the +1 cannot drift between the widget, the packet, the admin views
 * and the workflow.
 *
 * The head is counted as an adult — they are by definition the responsible
 * adult in the home, and their age is not captured (the paper form does not
 * ask for it either).
 *
 * @param {Array<object>} roster  members EXCLUDING the head
 */
export const householdCounts = roster => {
  const { totalMembers, totalAdults, totalChildren } = deriveCounts(roster);
  return {
    totalMembers: totalMembers + 1,
    totalAdults: totalAdults + 1,
    totalChildren,
  };
};

/**
 * Derive counts from a roster ALONE, with no head of household added.
 * Prefer `householdCounts` for anything user-facing.
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
 * Suggest a member type from age, so someone entering a large household
 * rarely has to touch the dropdown.
 *
 * Position is deliberately NOT used: the head of household is a record field
 * rather than a roster row, so there is no privileged first row to guess at.
 */
export const suggestMemberType = age => {
  if (age === null || age === undefined || age === '') return 'Adult';
  const n = Number(age);
  if (Number.isFinite(n) && n >= 0 && n <= CHILD_MAX_AGE) return 'Child';
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
/**
 * One readable line per household member for the export, e.g.
 * "Ana Martinez (Child, Female, age 7, shirt Youth M, shoe 2)", joined with
 * "; " so the whole household fits in one spreadsheet cell.
 */
export const formatRosterForExport = roster =>
  (roster || [])
    .map(m => {
      const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
      const details = [
        m.type,
        m.gender,
        String(m.age ?? '').trim() && `age ${m.age}`,
        m.shirtSize && `shirt ${m.shirtSize}`,
        m.shoeSize && `shoe ${m.shoeSize}`,
      ].filter(Boolean);
      return details.length ? `${name || 'Unnamed'} (${details.join(', ')})` : name;
    })
    .filter(Boolean)
    .join('; ');

const yesNo = value => (value ? 'Yes' : 'No');

export const EXPORT_COLUMNS = [
  // The first 13 are verbatim from the requirements document.
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
  // Everything else the nominator answered, so nothing on the nomination
  // form is only visible inside the portal.
  ['County', r => r.county],
  ['Native Language', r => r.nativeLanguage],
  ['Household Members', r => formatRosterForExport(r.roster)],
  ['Interpreter Needed', r => yesNo(r.needsInterpreter)],
  ['Family Photo Requested', r => yesNo(r.photoRequested)],
  ['Below ALICE Threshold', r => r.belowAlice],
  ['Support Received', r => (r.supportReceiving || []).join('; ')],
  ['Background on the Family', r => r.background],
  ['Nominator Name', r => r.nominatorName],
  ['Nominator Email', r => r.nominatorEmail],
  ['Nominator Phone', r => r.nominatorPhone],
  ['Nominating Organization', r => r.nominatingOrganization],
  // The portal account that submitted it. Nominations made before the
  // Nominator section existed (2026-10-05) only have this.
  ['Nominator Account', r => r.requestedBy],
  // Sponsor columns serve the Restoration Church check-in team, who sort the
  // sheet by sponsor in Excel. Sponsor Phone is captured at claim time --
  // most sponsors have no volunteer profile to read it from.
  ['Sponsor Name', r => r.sponsorName],
  ['Sponsor Email', r => r.sponsorEmail],
  ['Sponsor Phone', r => r.sponsorPhone],
  ['Sponsored On', r => (r.claimedAt || '').slice(0, 10)],
];

/** Build the admin export CSV. */
export const buildExportCsv = rows =>
  [
    EXPORT_COLUMNS.map(([label]) => csvCell(label)).join(','),
    ...(rows || []).map(r =>
      EXPORT_COLUMNS.map(([, get]) => csvCell(get(r))).join(','),
    ),
  ].join('\r\n');

/**
 * Normalize a Kinetic checkbox / multi-select value to an array of strings.
 *
 * The same logical value arrives in three shapes depending on where it is read
 * from: a real array from a form submission's values, a JSON string once it
 * has been copied onto a text field by a workflow, or a bare string if someone
 * typed into it. Callers should not have to care which.
 *
 * @param {Array|string|null|undefined} value
 * @returns {string[]}
 */
export const parseChoices = value => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      // Fall through — an older row may hold a double-escaped string.
      return trimmed
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map(s => s.replace(/\\?"/g, '').trim())
        .filter(Boolean);
    }
  }
  return [trimmed];
};

/**
 * A phone number someone could actually dial: 10 digits, or 11 with a leading
 * US country code. Formatting characters are ignored, so "(301) 555-0100",
 * "301.555.0100" and "+1 301 555 0100" all pass.
 */
export const isValidPhone = value => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
};

/** "Yes" if a checkbox-style value contains an affirmative, else "No". */
export const isYes = value =>
  parseChoices(value).some(v => v.toLowerCase() === 'yes');
