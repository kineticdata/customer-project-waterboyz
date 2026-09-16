/**
 * Backfill the denormalized snapshot on christmas-alive-sponsorships.
 * -------------------------------------------------------------------
 *
 * WHY THIS EXISTS
 *
 * Each sponsorship row carries a copy of City, County, Native Language and the
 * three household counts, so the browse list and the admin export can read one
 * form instead of joining two. The "Christmas Alive - Sync Family To
 * Sponsorship" workflow keeps that copy fresh from now on, but it only fires on
 * a family UPDATE. Rows that went stale before the workflow existed stay stale
 * forever. This script repairs those once.
 *
 * Run it after deploying the sync workflow, and any time you suspect drift.
 * It is idempotent: rows already correct are left untouched.
 *
 * HOW TO RUN
 *
 * Like scripts/safe-form-update.js, this needs the caller's session, so it runs
 * in the browser console rather than in Node.
 *
 *   1. Start the portal dev server (cd portal && yarn start) and sign in as a
 *      space admin. The dev server talks to the real platform, so this does
 *      operate on production data.
 *   2. Paste this whole file into the DevTools console on localhost:3000.
 *   3. Run `await backfillSnapshots()` to see the diff. Nothing is written.
 *   4. Run `await backfillSnapshots({ apply: true })` to write it.
 *
 * WHY IT MUST RUN ON THE DEV SERVER
 *
 * It imports householdCounts/parseRoster from the portal source through Vite,
 * rather than reimplementing them. Those helpers are unit tested
 * (frontend-testing/christmas-alive/helpers.test.mjs) and are the same ones the
 * portal renders from, so the backfill cannot silently disagree with the UI.
 * A production build does not serve that module path.
 *
 * PARITY WARNING
 *
 * Three implementations of the household count now exist: this script and the
 * portal share one via the import below, and the sync workflow has a Ruby
 * translation in its "Sync Snapshot" node. If you change the counting rules,
 * change the Ruby too.
 *
 * THE BLANK-ROSTER RULE
 *
 * When a family record has no Family Members JSON, the counts are LEFT ALONE
 * and only the location fields sync. Some family records predate the roster
 * field and hold no roster while their sponsorship holds correct counts taken
 * from the nomination; deriving from an empty roster would overwrite those with
 * 1/1/0. An explicit empty array is different and does count -- that is a real
 * one-person household. The sync workflow applies the same rule.
 */
(function () {
  const headers = () => ({
    'Content-Type': 'application/json',
    'X-XSRF-TOKEN': decodeURIComponent(
      document.cookie
        .split('; ')
        .find(c => c.startsWith('XSRF-TOKEN='))
        ?.split('=')[1] || '',
    ),
    accept: 'application/json',
  });

  const api = '/app/api/v1';

  const get = async url => {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return res.json();
  };

  /**
   * @param {{apply?: boolean}} [options] `apply: true` writes; default is a dry run.
   * @returns {Promise<{checked:number, drifted:number, written:number, rows:Array}>}
   */
  async function backfillSnapshots({ apply = false } = {}) {
    const { householdCounts, parseRoster } = await import(
      '/src/helpers/christmasAlive.js'
    );

    const { submissions = [] } = await get(
      `${api}/kapps/service-portal/forms/christmas-alive-sponsorships/submissions?include=values&limit=1000`,
    );

    const rows = [];
    let written = 0;

    for (const sponsorship of submissions) {
      const familyId = sponsorship.values['Family ID'];
      const label = sponsorship.values['Family Number'] || '(unnumbered)';

      // Pending and Rejected rows never got a family record. Nothing to sync.
      if (!familyId) {
        rows.push({ family: label, skipped: 'no family record yet' });
        continue;
      }

      let family;
      try {
        family = (await get(`${api}/submissions/${familyId}?include=values`))
          .submission?.values;
      } catch (e) {
        rows.push({ family: label, skipped: `family unreadable: ${e.message}` });
        continue;
      }
      if (!family) {
        rows.push({ family: label, skipped: 'family record missing' });
        continue;
      }

      const roster = String(family['Family Members JSON'] ?? '').trim();
      const expected = {
        City: family['City'] ?? '',
        County: family['County'] ?? '',
        'Native Language': family['Native Language'] ?? '',
      };
      if (roster) {
        const counts = householdCounts(parseRoster(roster));
        expected['Total Members'] = String(counts.totalMembers);
        expected['Total Adults'] = String(counts.totalAdults);
        expected['Total Children'] = String(counts.totalChildren);
      }

      const drift = {};
      for (const [field, want] of Object.entries(expected)) {
        const have = sponsorship.values[field] ?? '';
        if (String(have) !== String(want)) drift[field] = { from: have, to: want };
      }

      if (!Object.keys(drift).length) {
        rows.push({ family: label, ok: true });
        continue;
      }

      rows.push({
        family: label,
        countsHeld: !roster,
        drift,
        ...(apply ? { written: true } : {}),
      });

      if (apply) {
        const res = await fetch(`${api}/submissions/${sponsorship.id}`, {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify({ values: expected }),
        });
        if (!res.ok) throw new Error(`PUT ${sponsorship.id} -> ${res.status}`);
        written += 1;
      }
    }

    const drifted = rows.filter(r => r.drift).length;
    console.table(rows);
    console.log(
      apply
        ? `Wrote ${written} of ${rows.length} rows.`
        : `Dry run: ${drifted} of ${rows.length} rows would change. Re-run with { apply: true } to write.`,
    );
    return { checked: rows.length, drifted, written, rows };
  }

  window.backfillSnapshots = backfillSnapshots;
  console.log(
    'Loaded. Run `await backfillSnapshots()` for a dry run, then `await backfillSnapshots({ apply: true })`.',
  );
})();
