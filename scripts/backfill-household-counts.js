/**
 * Backfill household counts after the 2026-10-24 counting fix.
 * -----------------------------------------------------------
 *
 * WHY THIS EXISTS
 *
 * Until 2026-10-24 the counts were wrong in two ways:
 *
 *   - The WB_SetAdultChildCount routine (Nomination Process / On Update)
 *     looked for `Type` where the roster stores `type`, so every nomination's
 *     Total Adults / Total Children was written as 0 / 0. It also crashed on a
 *     nomination with no roster at all (run #4060).
 *   - Create Sponsorship Row counted children by AGE, but a child is whoever
 *     the nominator typed "Child" -- age only pre-sets that choice.
 *
 * Both workflows are fixed, but they only run on submit, so existing rows stay
 * wrong. This script repairs them once:
 *
 *   1. every nomination's Total Adults / Total Children
 *   2. every sponsorship row with NO family record yet (Pending / Rejected),
 *      re-derived from its nomination's roster
 *
 * Sponsorship rows that DO have a family record are covered by
 * scripts/backfill-sponsorship-snapshots.js, which reads the family's roster.
 * Run that one too -- it already uses the new rule through householdCounts().
 *
 * Both write paths are idempotent: rows already correct are left untouched.
 * Neither changes Family Members JSON, so the On Update workflow does not fire.
 *
 * HOW TO RUN
 *
 * Same as backfill-sponsorship-snapshots.js: it needs a space admin's session
 * and imports householdCounts/parseRoster from the portal source through Vite,
 * so the backfill cannot disagree with what the portal shows.
 *
 *   1. cd portal && yarn start, then sign in as a space admin on localhost:3000.
 *      The dev server talks to the real platform: this is production data.
 *   2. Paste this whole file into the DevTools console.
 *   3. `await backfillHouseholdCounts()` -- dry run, prints the diff.
 *   4. `await backfillHouseholdCounts({ apply: true })` -- writes it.
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
  const forms = `${api}/kapps/service-portal/forms`;

  const get = async url => {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return res.json();
  };

  // Follows pageToken so a big season is not silently truncated at one page.
  const getAll = async formSlug => {
    const all = [];
    let pageToken = '';
    do {
      const page = await get(
        `${forms}/${formSlug}/submissions?include=values&limit=1000` +
          (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''),
      );
      all.push(...(page.submissions || []));
      pageToken = page.nextPageToken || '';
    } while (pageToken);
    return all;
  };

  const put = async (id, values) => {
    const res = await fetch(`${api}/submissions/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ values }),
    });
    if (!res.ok) throw new Error(`PUT ${id} -> ${res.status}`);
  };

  // Any write to a sponsorship fires its Submission Updated workflows, and two
  // of them email the sponsor whenever their trigger STATE holds -- not only
  // when it changes. Send Sponsor Packet / Sponsor Nudge fire on Adopted with
  // no Packet Sent At; Pickup Reminder fires on the REQUESTED sentinel. A
  // counts-only write to such a row would send real email, so those rows are
  // reported and left alone.
  const wouldEmail = v =>
    (String(v['Status'] ?? '') === 'Adopted' &&
      !String(v['Packet Sent At'] ?? '').trim()) ||
    String(v['Pickup Reminder Sent At'] ?? '').trim() === 'REQUESTED';

  const diff = (current, expected) => {
    const drift = {};
    for (const [field, want] of Object.entries(expected)) {
      const have = current[field] ?? '';
      if (String(have) !== String(want)) drift[field] = { from: have, to: want };
    }
    return drift;
  };

  /**
   * @param {{apply?: boolean}} [options] `apply: true` writes; default is a dry run.
   */
  async function backfillHouseholdCounts({ apply = false } = {}) {
    const { householdCounts, parseRoster } = await import(
      '/src/helpers/christmasAlive.js'
    );

    const nominations = await getAll('christmas-alive-family-nomination');
    const sponsorships = await getAll('christmas-alive-sponsorships');
    const countsFor = nomination =>
      householdCounts(parseRoster(nomination.values['Family Members JSON']));

    const rows = [];
    let written = 0;

    // 1. Nominations: Total Adults / Total Children (head of household included).
    for (const n of nominations) {
      const c = countsFor(n);
      const expected = {
        'Total Adults': String(c.totalAdults),
        'Total Children': String(c.totalChildren),
      };
      const drift = diff(n.values, expected);
      if (!Object.keys(drift).length) continue;
      rows.push({ form: 'nomination', record: n.label, id: n.id, drift });
      if (apply) {
        await put(n.id, expected);
        written += 1;
      }
    }

    // 2. Sponsorship rows with no family record yet: re-derive from the nomination.
    const byId = new Map(nominations.map(n => [n.id, n]));
    for (const s of sponsorships) {
      if (s.values['Family ID']) continue; // backfill-sponsorship-snapshots.js
      const n = byId.get(s.values['Nomination ID']);
      if (!n) {
        rows.push({ form: 'sponsorship', record: s.id, skipped: 'nomination not found' });
        continue;
      }
      const c = countsFor(n);
      const expected = {
        'Total Members': String(c.totalMembers),
        'Total Adults': String(c.totalAdults),
        'Total Children': String(c.totalChildren),
      };
      const drift = diff(s.values, expected);
      if (!Object.keys(drift).length) continue;
      if (wouldEmail(s.values)) {
        rows.push({ form: 'sponsorship', record: n.label, skipped: 'write would trigger a sponsor email', drift });
        continue;
      }
      rows.push({ form: 'sponsorship', record: n.label, id: s.id, drift });
      if (apply) {
        await put(s.id, expected);
        written += 1;
      }
    }

    const drifted = rows.filter(r => r.drift && !r.skipped).length;
    console.table(
      rows.map(r => ({
        ...r,
        drift: r.drift
          ? Object.entries(r.drift)
              .map(([f, { from, to }]) => `${f}: ${from || '∅'} → ${to}`)
              .join('; ')
          : undefined,
      })),
    );
    console.log(
      apply
        ? `Wrote ${written} records (${nominations.length} nominations, ${sponsorships.length} sponsorships checked).`
        : `Dry run: ${drifted} records would change (${nominations.length} nominations, ${sponsorships.length} sponsorships checked). Re-run with { apply: true } to write.`,
    );
    return { drifted, written, rows };
  }

  window.backfillHouseholdCounts = backfillHouseholdCounts;
  console.log(
    'Loaded. Run `await backfillHouseholdCounts()` for a dry run, then `await backfillHouseholdCounts({ apply: true })`.',
  );
})();
