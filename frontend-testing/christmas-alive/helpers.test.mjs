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

test('suggestMemberType fills the roster the way a person would', () => {
  assert.equal(suggestMemberType(0, 40), 'Head of Household');
  assert.equal(suggestMemberType(1, 38), 'Spouse');
  assert.equal(suggestMemberType(2, 9), 'Child');
  assert.equal(suggestMemberType(2, 30), 'Adult');
  assert.equal(suggestMemberType(3, undefined), 'Adult');
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
      '"Number of Members","Adults","Children"',
  );
});

test('buildExportCsv writes one CRLF row per family', () => {
  const csv = buildExportCsv([
    {
      familyNumber: '14', status: 'Adopted', firstName: 'Ana', lastName: 'Martinez',
      email: 'a@example.org', phone: '3015550100', addressLine1: '12 Elm St',
      city: 'Frederick', state: 'MD', zip: '21701',
      totalMembers: 5, totalAdults: 2, totalChildren: 3,
    },
  ]);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 2);
  assert.equal(lines[1], '"14","Adopted","Ana","Martinez","a@example.org","3015550100","12 Elm St","Frederick","MD","21701","5","2","3"');
});
