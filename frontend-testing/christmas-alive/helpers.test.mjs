/**
 * Unit tests for the pure Christmas Alive helpers.
 * Uses Node's built-in test runner so no new dependency is needed:
 *   node --test frontend-testing/christmas-alive/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRoster,
  deriveCounts,
  suggestMemberType,
  describeHousehold,
  familyLabel,
  isWithinSeason,
  CHILD_MAX_AGE,
  MEMBER_TYPES,
  householdCounts,
} from '../../portal/src/helpers/christmasAlive.js';

test('CHILD_MAX_AGE matches the responsibilities sheet', () => {
  assert.equal(CHILD_MAX_AGE, 18);
});

test('deriveCounts treats 18 as a child and 19 as an adult', () => {
  const roster = [{ age: 18 }, { age: 19 }, { age: 4 }];
  assert.deepEqual(deriveCounts(roster), {
    totalMembers: 3,
    totalAdults: 1,
    totalChildren: 2,
  });
});

test('deriveCounts counts an unknown age as an adult, never a child', () => {
  // Under-counting children would under-buy gifts, so unknown ages round up.
  const roster = [{ age: null }, { age: 'x' }, {}, { age: 7 }];
  assert.deepEqual(deriveCounts(roster), {
    totalMembers: 4,
    totalAdults: 3,
    totalChildren: 1,
  });
});

test('deriveCounts counts a newborn (age 0) as a child', () => {
  // Regression: absence must be distinguished from zero. Number(null) === 0,
  // so a naive `<= 18` check counts missing ages as children.
  assert.deepEqual(deriveCounts([{ age: 0 }, { age: 35 }]), {
    totalMembers: 2,
    totalAdults: 1,
    totalChildren: 1,
  });
});

test('deriveCounts handles an empty or non-array roster', () => {
  const empty = { totalMembers: 0, totalAdults: 0, totalChildren: 0 };
  assert.deepEqual(deriveCounts([]), empty);
  assert.deepEqual(deriveCounts(null), empty);
  assert.deepEqual(deriveCounts('nope'), empty);
});

test('parseRoster tolerates garbage rather than throwing', () => {
  assert.deepEqual(parseRoster(null), []);
  assert.deepEqual(parseRoster(''), []);
  assert.deepEqual(parseRoster('not json'), []);
  assert.deepEqual(parseRoster('{"a":1}'), []); // object, not array
  assert.deepEqual(parseRoster('[{"age":5}]'), [{ age: 5 }]);
  assert.deepEqual(parseRoster([{ age: 5 }]), [{ age: 5 }]); // already parsed
});

test('suggestMemberType guesses from age alone', () => {
  // Position is deliberately not used: the head of household is a record
  // field, not a roster row, so there is no privileged first row.
  assert.equal(suggestMemberType(9), 'Child');
  assert.equal(suggestMemberType(18), 'Child');
  assert.equal(suggestMemberType(19), 'Adult');
  assert.equal(suggestMemberType(0), 'Child');
  assert.equal(suggestMemberType(undefined), 'Adult');
  assert.equal(suggestMemberType(''), 'Adult');
  assert.equal(suggestMemberType(null), 'Adult');
});

test('Head of Household is not an offered roster type', () => {
  // Offering it would invite entering the head twice -- once in the record's
  // own name fields and again as a roster row.
  assert.ok(!MEMBER_TYPES.includes('Head of Household'));
  assert.deepEqual(MEMBER_TYPES, ['Spouse', 'Child', 'Adult']);
});

test('householdCounts adds the head back in as one adult', () => {
  // roster = everyone EXCEPT the head
  assert.deepEqual(householdCounts([{ age: 9 }, { age: 7 }]), {
    totalMembers: 3, totalAdults: 1, totalChildren: 2,
  });
  assert.deepEqual(householdCounts([{ age: 38 }, { age: 9 }]), {
    totalMembers: 3, totalAdults: 2, totalChildren: 1,
  });
});

test('householdCounts on an empty roster is a household of one adult', () => {
  const lone = { totalMembers: 1, totalAdults: 1, totalChildren: 0 };
  assert.deepEqual(householdCounts([]), lone);
  assert.deepEqual(householdCounts(null), lone);
});

test('deriveCounts still reports the roster alone, without the head', () => {
  assert.deepEqual(deriveCounts([{ age: 9 }, { age: 7 }]), {
    totalMembers: 2, totalAdults: 0, totalChildren: 2,
  });
});

test('describeHousehold reads as a sentence, not a field grid', () => {
  assert.equal(
    describeHousehold({ totalMembers: 5, totalAdults: 2, totalChildren: 3 }),
    '5 people · 2 adults, 3 children',
  );
  assert.equal(
    describeHousehold({ totalMembers: 1, totalAdults: 1, totalChildren: 0 }),
    '1 person · 1 adult',
  );
  assert.equal(
    describeHousehold({ totalMembers: 2, totalAdults: 0, totalChildren: 2 }),
    '2 people · 2 children',
  );
});

test('familyLabel never renders a blank identity', () => {
  assert.equal(familyLabel('14'), 'Family 14');
  assert.equal(familyLabel(14), 'Family 14');
  assert.equal(familyLabel(''), 'Family (number pending)');
  assert.equal(familyLabel(undefined), 'Family (number pending)');
});

test('isWithinSeason is inclusive of both bounds', () => {
  assert.equal(isWithinSeason('2026-09-01', '2026-12-31', new Date('2026-09-01T08:00:00')), true);
  assert.equal(isWithinSeason('2026-09-01', '2026-12-31', new Date('2026-12-31T20:00:00')), true);
  assert.equal(isWithinSeason('2026-09-01', '2026-12-31', new Date('2026-08-31T23:00:00')), false);
  assert.equal(isWithinSeason('2026-09-01', '2026-12-31', new Date('2027-01-01T00:30:00')), false);
});

test('an unconfigured season reads as closed, not always-open', () => {
  assert.equal(isWithinSeason(null, null), false);
  assert.equal(isWithinSeason('2026-09-01', null), false);
  assert.equal(isWithinSeason('garbage', 'garbage'), false);
});

// --------------------------------------------------------------------------
// Duplicate detection and the admin export
// --------------------------------------------------------------------------

const { findDuplicates, csvCell, buildExportCsv } = await import(
  '../../portal/src/helpers/christmasAlive.js'
);

const fam = (id, over = {}) => ({
  id,
  familyId: `f-${id}`,
  lastName: 'Martinez',
  addressLine1: '12 Elm St',
  phone: '301-555-0100',
  ...over,
});

test('findDuplicates matches on last name, address, or phone', () => {
  const target = fam('a');
  const rows = [
    target,
    fam('b', { addressLine1: 'somewhere else', phone: '' }), // last name
    fam('c', { lastName: 'Different', phone: '' }), // address
    fam('d', { lastName: 'Different', addressLine1: 'elsewhere' }), // phone
    fam('e', { lastName: 'Nope', addressLine1: 'nowhere', phone: '999' }),
  ];
  assert.deepEqual(
    findDuplicates(target, rows).map(r => r.id).sort(),
    ['b', 'c', 'd'],
  );
});

test('findDuplicates ignores phone formatting differences', () => {
  const target = fam('a', { lastName: '', addressLine1: '', phone: '(301) 555-0100' });
  const rows = [target, fam('b', { lastName: 'X', addressLine1: 'Y', phone: '3015550100' })];
  assert.deepEqual(findDuplicates(target, rows).map(r => r.id), ['b']);
});

test('findDuplicates never returns the row being reviewed', () => {
  const target = fam('a');
  assert.deepEqual(findDuplicates(target, [target]), []);
});

test('findDuplicates excludes test fixtures from the shared registry', () => {
  // An abandoned fixture must never surface against a real nomination.
  const target = fam('a');
  const rows = [target, fam('fixture', { isTestFixture: true })];
  assert.deepEqual(findDuplicates(target, rows), []);
});

test('findDuplicates skips rows with no family record yet', () => {
  const target = fam('a');
  const rows = [target, fam('b', { familyId: '' })];
  assert.deepEqual(findDuplicates(target, rows), []);
});

test('findDuplicates returns nothing when there is nothing to match on', () => {
  const target = { id: 'a', lastName: '', addressLine1: '', phone: '' };
  assert.deepEqual(findDuplicates(target, [fam('b')]), []);
});

test('csvCell neutralizes spreadsheet formula injection', () => {
  // Names and addresses are typed by nominators, so the export is untrusted.
  assert.equal(csvCell('=cmd|/c calc'), `"'=cmd|/c calc"`);
  assert.equal(csvCell('+1'), `"'+1"`);
  assert.equal(csvCell('-1'), `"'-1"`);
  assert.equal(csvCell('@SUM(A1)'), `"'@SUM(A1)"`);
  assert.equal(csvCell('Martinez'), '"Martinez"');
});

test('csvCell escapes embedded quotes and handles empties', () => {
  assert.equal(csvCell('He said "hi"'), '"He said ""hi"""');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(undefined), '""');
  assert.equal(csvCell(0), '"0"');
});

test('buildExportCsv emits the spec column order', () => {
  const header = buildExportCsv([]).split('\r\n')[0];
  assert.equal(
    header,
    '"Family ID","Status","House Head First Name","House Head Last Name",' +
      '"House Head Email","House Head Phone","Street","City","State","Zip",' +
      '"Number of Members","Adults","Children",' +
      '"County","Native Language","Household Members","Interpreter Needed",' +
      '"Family Photo Requested","Below ALICE Threshold","Support Received",' +
      '"Background on the Family","Nominator Name","Nominator Email",' +
      '"Nominator Phone","Nominating Organization","Nominator Account",' +
      '"Sponsor Name","Sponsor Email","Sponsor Phone","Sponsored On"',
  );
});

test('buildExportCsv writes one CRLF row per family', () => {
  const csv = buildExportCsv([
    {
      familyNumber: '14', status: 'Adopted', firstName: 'Ana', lastName: 'Martinez',
      email: 'a@example.org', phone: '3015550100', addressLine1: '12 Elm St',
      city: 'Frederick', state: 'MD', zip: '21701',
      totalMembers: 5, totalAdults: 2, totalChildren: 3,
      sponsorName: 'Sam Lee', sponsorEmail: 's@example.org',
      sponsorPhone: '(301) 555-0199', claimedAt: '2026-10-05T15:17:52Z',
      photoRequested: true, needsInterpreter: false,
      county: 'Frederick', nativeLanguage: 'Spanish',
      roster: [{ firstName: 'Leo', lastName: 'Martinez', type: 'Child', gender: 'Male', age: '7' }],
      belowAlice: "Don't Know", supportReceiving: ['Food Stamps', 'Medicare'],
      background: 'Single mom, two jobs', requestedBy: 'nominator@example.org',
      nominatorName: 'Jo Rivera', nominatorEmail: 'jo@example.org',
      nominatorPhone: '301-555-0111', nominatingOrganization: 'Mountain View',
    },
  ]);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 2);
  assert.equal(
    lines[1],
    '"14","Adopted","Ana","Martinez","a@example.org","3015550100","12 Elm St","Frederick","MD","21701","5","2","3",' +
      '"Frederick","Spanish","Leo Martinez (Child, Male, age 7)","No","Yes",' +
      '"Don\'t Know","Food Stamps; Medicare","Single mom, two jobs",' +
      '"Jo Rivera","jo@example.org","301-555-0111","Mountain View","nominator@example.org",' +
      '"Sam Lee","s@example.org","(301) 555-0199","2026-10-05"',
  );
});

test('buildExportCsv leaves sponsor columns blank for an unsponsored family', () => {
  const [, row] = buildExportCsv([{ familyNumber: '3', status: 'Approved' }]).split('\r\n');
  assert.ok(row.endsWith('"","","",""'), row);
  assert.ok(row.includes('"No","No"'), row);
});

// --------------------------------------------------------------------------
// Checkbox value normalisation
// --------------------------------------------------------------------------

const { parseChoices, isYes } = await import(
  '../../portal/src/helpers/christmasAlive.js'
);

test('parseChoices handles every shape the same value arrives in', () => {
  // real array, straight off a submission
  assert.deepEqual(parseChoices(['Food Stamps', 'Section 8']), ['Food Stamps', 'Section 8']);
  // JSON string, after a workflow copied it onto a text field
  assert.deepEqual(parseChoices('["Food Stamps","Section 8"]'), ['Food Stamps', 'Section 8']);
  // bare string
  assert.deepEqual(parseChoices('Food Stamps'), ['Food Stamps']);
});

test('parseChoices recovers the double-escaped rows written before that bug was fixed', () => {
  assert.deepEqual(
    parseChoices('[\\"Food Stamps\\", \\"Section 8 Resident\\"]'),
    ['Food Stamps', 'Section 8 Resident'],
  );
});

test('parseChoices is empty for empty input rather than throwing', () => {
  assert.deepEqual(parseChoices(null), []);
  assert.deepEqual(parseChoices(undefined), []);
  assert.deepEqual(parseChoices(''), []);
  assert.deepEqual(parseChoices('   '), []);
  assert.deepEqual(parseChoices('[]'), []);
  assert.deepEqual(parseChoices(42), []);
});

test('isYes reads an interpreter checkbox in any shape', () => {
  assert.equal(isYes(['Yes']), true);
  assert.equal(isYes('["Yes"]'), true);
  assert.equal(isYes('Yes'), true);
  assert.equal(isYes(['No']), false);
  assert.equal(isYes([]), false);
  assert.equal(isYes(null), false);
});

test('parseRoster drops a duplicate Head of Household row', () => {
  // The head is a record field. A roster row typed Head of Household is that
  // same person twice -- it rendered as a duplicate and inflated every count.
  const legacy = JSON.stringify([
    { firstName: 'Wanda', age: 40, type: 'Head of Household' },
    { firstName: 'Kid', age: 5, type: 'Child' },
  ]);
  assert.deepEqual(parseRoster(legacy).map(m => m.firstName), ['Kid']);
  // and the household total is then right: head + one child
  assert.deepEqual(householdCounts(parseRoster(legacy)), {
    totalMembers: 2, totalAdults: 1, totalChildren: 1,
  });
});

test('parseRoster head-row filter is case-insensitive and tolerant', () => {
  const r = JSON.stringify([
    { firstName: 'A', type: 'head of household' },
    { firstName: 'B', type: 'HEAD OF HOUSEHOLD' },
    { firstName: 'C', type: 'Child' },
    { firstName: 'D' },
  ]);
  assert.deepEqual(parseRoster(r).map(m => m.firstName), ['C', 'D']);
});

// --------------------------------------------------------------------------
// Sponsor phone validation
// --------------------------------------------------------------------------

const { isValidPhone } = await import('../../portal/src/helpers/christmasAlive.js');

test('isValidPhone accepts any formatting of a 10-digit US number', () => {
  for (const p of ['3015550100', '(301) 555-0100', '301.555.0100', '+1 301 555 0100', '1-301-555-0100']) {
    assert.equal(isValidPhone(p), true, p);
  }
});

test('isValidPhone rejects numbers that cannot be dialled', () => {
  for (const p of ['', null, undefined, '555-0100', '23015550100', '301555010099', 'call me']) {
    assert.equal(isValidPhone(p), false, String(p));
  }
});

// --------------------------------------------------------------------------
// Required roster fields
// --------------------------------------------------------------------------

const { rosterProblems } = await import('../../portal/src/helpers/christmasAlive.js');

test('rosterProblems is empty when every member is complete', () => {
  const roster = [
    { firstName: 'Ana', lastName: 'Martinez', gender: 'Female', type: 'Child', age: '' },
  ];
  assert.deepEqual(rosterProblems(roster), []);
});

test('rosterProblems names each missing required field, per row', () => {
  const roster = [
    { firstName: 'Ana', lastName: 'Martinez', gender: 'Female', type: 'Child' },
    { firstName: '  ', lastName: 'Martinez', gender: '', type: '' },
  ];
  assert.deepEqual(rosterProblems(roster), [
    { index: 1, missing: ['firstName', 'gender', 'type'] },
  ]);
});

test('rosterProblems treats age and sizes as optional and tolerates bad input', () => {
  assert.deepEqual(
    rosterProblems([{ firstName: 'Al', lastName: 'B', gender: 'Male', type: 'Adult' }]),
    [],
  );
  assert.deepEqual(rosterProblems(null), []);
  assert.deepEqual(rosterProblems(undefined), []);
});

const { formatRosterForExport } = await import('../../portal/src/helpers/christmasAlive.js');

test('formatRosterForExport writes one readable entry per member', () => {
  assert.equal(
    formatRosterForExport([
      { firstName: 'Ana', lastName: 'Martinez', type: 'Child', gender: 'Female', age: '7', shirtSize: 'Youth M', shoeSize: '2' },
      { firstName: 'Luis', lastName: 'Martinez', type: 'Spouse', gender: 'Male', age: '' },
    ]),
    'Ana Martinez (Child, Female, age 7, shirt Youth M, shoe 2); Luis Martinez (Spouse, Male)',
  );
  assert.equal(formatRosterForExport([]), '');
  assert.equal(formatRosterForExport(null), '');
});

// --------------------------------------------------------------------------
// Nomination pre-fill
// --------------------------------------------------------------------------

const { nominationDefaults } = await import('../../portal/src/helpers/nominationDefaults.js');

test('nominationDefaults pre-fills the nominator from the profile and remembered attributes', () => {
  const profile = {
    username: 'jo@example.org',
    displayName: 'Jo Ann  Rivera',
    email: 'jo@example.org',
    attributesMap: {
      'CA Nominator Phone Number': ['301-555-0111'],
      'CA Nominator Organization': ['Mountain View'],
    },
  };
  assert.deepEqual(nominationDefaults('christmas-alive-family-nomination', profile), {
    'Requested By': 'jo@example.org',
    'Nominator First Name': 'Jo',
    'Nominator Last Name': 'Ann Rivera',
    'Nominator Email': 'jo@example.org',
    'Nominator Phone Number': '301-555-0111',
    'Nominating Organization': 'Mountain View',
  });
});

test('nominationDefaults leaves phone and organization blank before a first nomination', () => {
  const values = nominationDefaults('christmas-alive-family-nomination', {
    username: 'a', displayName: 'Al', email: 'a@x.org', attributesMap: {},
  });
  assert.equal(values['Nominator Phone Number'], '');
  assert.equal(values['Nominating Organization'], '');
  assert.equal(values['Nominator Last Name'], '');
});

test('nominationDefaults returns nothing for other forms or no profile', () => {
  assert.equal(nominationDefaults('swat-project-nomination', { username: 'a' }), undefined);
  assert.equal(nominationDefaults('christmas-alive-family-nomination', null), undefined);
});
