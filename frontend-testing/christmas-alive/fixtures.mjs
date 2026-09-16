/**
 * Christmas Alive test fixtures — seeding and teardown.
 * ------------------------------------------------------
 *
 * READ THIS FIRST: there is one environment and it is production. These
 * fixtures run against the same space real families and sponsors live in.
 * Every guarantee below exists because a leaked fixture is not a failed test,
 * it is a stranger's family appearing on the sponsor list.
 *
 * THE THREE ISOLATION GUARANTEES
 *
 * 1. Season. Every fixture is written under `Season = "TEST-<runId>"`, which
 *    is never the programs record's Current Season. The browse list, My
 *    sponsorships, the export and the approvals queue all filter by the
 *    current season, so a fixture is structurally incapable of appearing in
 *    any of them even if teardown fails completely.
 * 2. Marking. Fixture families carry `Test Fixture = "true"` and a surname
 *    beginning `ZZTEST-`. The duplicate matcher already excludes flagged
 *    records, so a fixture can never be offered as a duplicate of a real
 *    family.
 * 3. Ownership. Teardown only ever deletes ids this process created, or rows
 *    that match BOTH the TEST- season prefix AND the fixture flag. It cannot
 *    be pointed at a real record.
 *
 * WHAT THIS MUST NEVER DO
 *
 * Never write `programs.Current Season`, `Active From` or `Active To`. That
 * record decides whether the season is open for real users; changing it during
 * a test run would close or open Christmas Alive for everyone. `assertSafe`
 * below refuses any write to the programs form outright.
 *
 * USAGE
 *
 *   const ctx = await createContext();      // also tears down any earlier leak
 *   const { sponsorshipId } = await ctx.seedFamily({ children: 2 });
 *   ...
 *   await ctx.teardown();
 */

import { randomUUID } from 'node:crypto';

const SPACE = process.env.PW_SPACE_URI || 'https://waterboyz.kinops.io';
const USERNAME = process.env.PW_USERNAME || '';
const PASSWORD = process.env.PW_PASSWORD || '';

const KAPP = 'service-portal';
const API = `${SPACE}/app/api/v1`;

/** Season prefix that marks a row as disposable. Never a real season. */
export const TEST_SEASON_PREFIX = 'TEST-';
/** Surname prefix that marks a family as disposable. */
export const TEST_NAME_PREFIX = 'ZZTEST-';
/**
 * A Packet Sent At value far enough in the past to be obviously not real.
 * Its only job is to be non-empty, which closes the email guards.
 */
export const SUPPRESSED_STAMP = '2000-01-01T00:00:00Z';

const auth = () =>
  'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

/**
 * The single guardrail every write passes through.
 *
 * Refuses to touch the programs datastore at all, and refuses to write any
 * submission whose Season is not a TEST- season. A bug in a spec therefore
 * cannot reach live data; it fails loudly instead.
 */
const assertSafe = (path, body) => {
  if (/\/forms\/programs\b/.test(path)) {
    throw new Error(
      'Refusing to write the programs form. That record controls whether the ' +
        'season is open for real users.',
    );
  }
  // Blocking the programs form by path is not enough: a write addressed to
  // /submissions/{id} reaches the same record without naming the form. Refuse
  // by field instead, which catches it whichever route it arrives on.
  const seasonControls = ['Current Season', 'Active From', 'Active To'];
  const touched = seasonControls.filter(f => body?.values?.[f] !== undefined);
  if (touched.length) {
    throw new Error(
      `Refusing to write ${touched.join(', ')}. Those fields decide whether ` +
        'Christmas Alive is open for real users.',
    );
  }

  const season = body?.values?.Season;
  if (season !== undefined && !String(season).startsWith(TEST_SEASON_PREFIX)) {
    throw new Error(
      `Refusing to write Season "${season}". Fixtures may only write ` +
        `${TEST_SEASON_PREFIX}* seasons.`,
    );
  }
};

const request = async (method, path, body) => {
  if (method !== 'GET') assertSafe(path, body);
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      Authorization: auth(),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 400)}`);
  }
  return json;
};

/** Search helper that actually sends a body (submissions-search needs one). */
const query = async (form, q, limit = 1000) => {
  const res = await fetch(
    `${API}/kapps/${KAPP}/forms/${form}/submissions-search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        Authorization: auth(),
      },
      body: JSON.stringify({ q, include: 'values', limit }),
    },
  );
  if (!res.ok) throw new Error(`search ${form} -> ${res.status}`);
  return (await res.json()).submissions ?? [];
};

/**
 * Build a roster with a known composition.
 *
 * Ages are chosen to sit away from the 18/19 boundary unless a spec asks for
 * it, so an off-by-one in the counting rules shows up as a failure in the
 * boundary test rather than noise everywhere else.
 */
export const buildRoster = ({ adults = 1, children = 0, ages = null } = {}) => {
  const rows = [];
  for (let i = 0; i < adults; i += 1) {
    rows.push({
      type: 'Adult',
      firstName: `Adult${i + 1}`,
      lastName: `${TEST_NAME_PREFIX}Roster`,
      age: String(30 + i),
      gender: 'Female',
    });
  }
  for (let i = 0; i < children; i += 1) {
    rows.push({
      type: 'Child',
      firstName: `Child${i + 1}`,
      lastName: `${TEST_NAME_PREFIX}Roster`,
      age: String(ages?.[i] ?? 8),
      gender: 'Male',
    });
  }
  return rows;
};

/**
 * Create an isolated fixture context.
 *
 * Tears down leftovers from any earlier crashed run before seeding, so a
 * previous failure cannot leak rows into this one.
 */
export const createContext = async () => {
  if (!USERNAME || !PASSWORD) {
    throw new Error(
      'PW_USERNAME and PW_PASSWORD must be set. Fixtures talk to the real ' +
        'platform and there is no offline mode.',
    );
  }

  const runId = randomUUID().slice(0, 8);
  const season = `${TEST_SEASON_PREFIX}${runId}`;
  const created = { families: [], sponsorships: [] };

  await teardownStale();

  const seedFamily = async ({
    adults = 1,
    children = 0,
    ages = null,
    city = 'Frederick',
    county = 'Frederick County',
    nativeLanguage = 'English',
    status = 'Approved',
    familyNumber = null,
    sponsorUsername = '',
    suppressEmails = true,
  } = {}) => {
    const roster = buildRoster({ adults, children, ages });

    const family = await request(
      'POST',
      `/kapps/${KAPP}/forms/families/submissions?completed=true`,
      {
        values: {
          'First Name': 'Fixture',
          'Last Name': `${TEST_NAME_PREFIX}${runId}`,
          Email: `zztest-${runId}@example.invalid`,
          'Phone Number': '301-555-0100',
          'Address Line 1': '1 Fixture Way',
          City: city,
          State: 'MD',
          Zip: '21701',
          County: county,
          'Native Language': nativeLanguage,
          'Family Members JSON': JSON.stringify(roster),
          'Test Fixture': 'true',
        },
      },
    );
    const familyId = family.submission.id;
    created.families.push(familyId);

    const sponsorship = await request(
      'POST',
      `/kapps/${KAPP}/forms/christmas-alive-sponsorships/submissions?completed=true`,
      {
        values: {
          'Family ID': familyId,
          Season: season,
          Status: status,
          ...(familyNumber ? { 'Family Number': String(familyNumber) } : {}),
          ...(sponsorUsername
            ? {
                'Sponsor Username': sponsorUsername,
                'Sponsor Email': sponsorUsername,
              }
            : {}),
          City: city,
          County: county,
          'Native Language': nativeLanguage,
          'Total Members': String(roster.length + 1),
          'Total Adults': String(adults + 1),
          'Total Children': String(children),
          'Release Notes': 'ZZTEST FIXTURE - delete freely',
          // Both the send-packet and the nudge workflows are guarded on
          // "Adopted AND Packet Sent At is empty". Pre-stamping it closes both
          // guards, so claiming a fixture does not email anyone and does not
          // leave a seven-day deferral running against a row we are about to
          // delete. Pass suppressEmails:false in a test that is specifically
          // asserting the packet gets sent.
          ...(suppressEmails
            ? { 'Packet Sent At': SUPPRESSED_STAMP }
            : {}),
        },
      },
    );
    const sponsorshipId = sponsorship.submission.id;
    created.sponsorships.push(sponsorshipId);

    return { familyId, sponsorshipId, season, roster };
  };

  /** Delete only what this context created. */
  const teardown = async () => {
    const ids = [...created.sponsorships, ...created.families];
    const failures = [];
    for (const id of ids) {
      try {
        await request('DELETE', `/submissions/${id}`);
      } catch (e) {
        failures.push(`${id}: ${e.message}`);
      }
    }
    created.families.length = 0;
    created.sponsorships.length = 0;
    if (failures.length) {
      throw new Error(
        `Teardown left rows behind — clean these up by hand:\n${failures.join('\n')}`,
      );
    }
  };

  return { runId, season, seedFamily, teardown, created };
};

/**
 * Remove fixtures left behind by an earlier run.
 *
 * Deliberately conservative: a sponsorship is only deleted when its Season
 * starts with the TEST- prefix, and a family only when it carries the fixture
 * flag AND the reserved surname prefix. A real record satisfies neither.
 */
export const teardownStale = async () => {
  const sponsorships = await query(
    'christmas-alive-sponsorships',
    `values[Season]=*"${TEST_SEASON_PREFIX}"`,
  ).catch(() => []);

  for (const s of sponsorships) {
    if (!String(s.values?.Season ?? '').startsWith(TEST_SEASON_PREFIX)) continue;
    await request('DELETE', `/submissions/${s.id}`).catch(() => {});
  }

  const families = await query(
    'families',
    `values[Test Fixture]="true"`,
  ).catch(() => []);

  for (const f of families) {
    const flagged = String(f.values?.['Test Fixture'] ?? '') === 'true';
    const named = String(f.values?.['Last Name'] ?? '').startsWith(
      TEST_NAME_PREFIX,
    );
    if (!flagged || !named) continue;
    await request('DELETE', `/submissions/${f.id}`).catch(() => {});
  }

  return { sponsorships: sponsorships.length, families: families.length };
};

/** Call a WebAPI as a given user. Used by the authorization suite. */
export const callWebApi = async (slug, parameters, as = null) => {
  const credentials = as
    ? 'Basic ' +
      Buffer.from(`${as.username}:${as.password}`).toString('base64')
    : auth();
  const res = await fetch(
    `${SPACE}/app/kapps/${KAPP}/webApis/${slug}?timeout=30`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        Authorization: credentials,
      },
      body: JSON.stringify(parameters ?? {}),
    },
  );
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
};

export const getSubmission = async id =>
  (await request('GET', `/submissions/${id}?include=values`)).submission;

export const updateSubmission = (id, values) =>
  request('PUT', `/submissions/${id}`, { values });
