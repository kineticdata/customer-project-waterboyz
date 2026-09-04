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
