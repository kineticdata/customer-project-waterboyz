/**
 * Safe Kinetic form update — export, back up, mutate, verify, roll back.
 * ---------------------------------------------------------------------
 *
 * WHY THIS EXISTS
 *
 * Adding a field to a Kinetic form means PUTting the entire `pages` array,
 * because fields live inside pages. On a mature form that array also carries
 * hand-written JavaScript event code — the `families` form has ~10KB of it
 * driving the Family Members and Projects table widgets. There is no
 * field-level partial update. Reconstructing that JSON by hand risks silently
 * corrupting working production code, and the damage is invisible until
 * someone opens the form.
 *
 * This script never reconstructs anything. It reads the live definition,
 * mutates the parsed object in place, writes it back, then re-reads and proves
 * the parts you did not intend to touch are byte-identical. If they are not,
 * it restores the backup automatically.
 *
 * HOW TO RUN
 *
 * There is no server-side route for this — the Task/Core APIs need the
 * caller's session — so run it in the browser DevTools console while signed
 * in to the portal as a space admin, on the portal's own origin.
 *
 *   1. Open the portal (localhost:3000 or the deployed URL) and sign in.
 *   2. Paste this whole file into the console.
 *   3. Call safeFormUpdate({...}) as shown at the bottom.
 *
 * WHAT IT GUARANTEES
 *
 *   - A timestamped backup lands in your Downloads folder before any write.
 *   - A dry run reports the diff and writes nothing.
 *   - Page events, integrations, security policies and the label expression
 *     are compared before/after and must match exactly.
 *   - Every pre-existing field must still be present WITH ITS ORIGINAL KEY.
 *     Keys are how the platform identifies a field; a changed key orphans
 *     stored values.
 *   - Any failed check triggers an automatic restore from the in-memory
 *     backup, and the error tells you whether the restore succeeded.
 *
 * WHAT IT DOES NOT DO
 *
 *   - It does not touch indexDefinitions. The platform auto-creates an index
 *     for each new field with status "New"; build them separately with a
 *     "Build Index" background job.
 *   - It does not migrate existing submission values.
 */
(function () {
  const csrf = () =>
    decodeURIComponent(
      document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.split('=')[1] || '',
    );

  const headers = () => ({
    'Content-Type': 'application/json',
    'X-XSRF-TOKEN': csrf(),
    accept: 'application/json',
  });

  const base = (kappSlug, formSlug) =>
    `/app/api/v1/kapps/${kappSlug}/forms/${formSlug}`;

  /** Full definition. The ?export flag is required — without it you get a
   *  summary with field NAMES only and no pages, and PUTting that back would
   *  destroy the form. */
  async function exportForm(kappSlug, formSlug) {
    const res = await fetch(`${base(kappSlug, formSlug)}?export=true`, { headers: headers() });
    if (!res.ok) throw new Error(`export failed: ${res.status} ${await res.text()}`);
    return (await res.json()).form;
  }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const allFields = form =>
    form.pages.flatMap(p => (p.elements || []).flatMap(s => (s.elements ? s.elements : [s])))
      .filter(e => e.type === 'field');

  /** The invariants that matter. Everything here must survive untouched. */
  function invariants(form) {
    return {
      events: JSON.stringify(form.pages.map(p => p.events || [])),
      integrations: JSON.stringify(form.integrations || []),
      policies: JSON.stringify(form.securityPolicies || []),
      label: form.submissionLabelExpression,
      sections: JSON.stringify(
        form.pages.map(p => (p.elements || []).filter(e => e.type === 'section').map(e => e.name)),
      ),
    };
  }

  /**
   * @param {object}   o
   * @param {string}   o.kappSlug
   * @param {string}   o.formSlug
   * @param {Function} o.mutate   (form) => void — mutate the parsed form in place
   * @param {boolean} [o.dryRun]  default true; set false to actually write
   * @param {Function} [o.extraChecks] (before, after) => ({name: boolean})
   */
  async function safeFormUpdate({ kappSlug, formSlug, mutate, dryRun = true, extraChecks }) {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

    const before = await exportForm(kappSlug, formSlug);
    const backupText = JSON.stringify({ form: before }, null, 2);
    download(`${formSlug}-backup-${stamp}.json`, backupText);

    const beforeFields = allFields(before).map(f => ({ name: f.name, key: f.key }));
    const beforeInv = invariants(before);

    // Mutate a deep copy so `before` stays a pristine comparison baseline.
    const proposed = JSON.parse(JSON.stringify(before));
    mutate(proposed);

    const proposedFields = allFields(proposed).map(f => ({ name: f.name, key: f.key }));
    const added = proposedFields.filter(p => !beforeFields.some(b => b.name === p.name));
    const removed = beforeFields.filter(b => !proposedFields.some(p => p.name === b.name));
    const rekeyed = beforeFields.filter(b =>
      proposedFields.some(p => p.name === b.name && p.key !== b.key),
    );

    const preChecks = {
      noFieldsRemoved: removed.length === 0,
      noFieldsRekeyed: rekeyed.length === 0,
      noDuplicateKeys:
        new Set(proposedFields.map(f => f.key)).size === proposedFields.length,
      noDuplicateNames:
        new Set(proposedFields.map(f => f.name)).size === proposedFields.length,
      invariantsUnchanged:
        JSON.stringify(invariants(proposed)) === JSON.stringify(beforeInv),
    };

    const summary = {
      formSlug,
      backup: `${formSlug}-backup-${stamp}.json (Downloads)`,
      fieldsBefore: beforeFields.length,
      fieldsAfter: proposedFields.length,
      added: added.map(f => f.name),
      removed: removed.map(f => f.name),
      rekeyed: rekeyed.map(f => f.name),
      preChecks,
    };

    if (!Object.values(preChecks).every(Boolean)) {
      return { ...summary, RESULT: 'ABORTED — pre-checks failed, nothing written' };
    }
    if (dryRun) {
      return { ...summary, RESULT: 'DRY RUN — nothing written. Re-run with dryRun:false.' };
    }

    const put = await fetch(base(kappSlug, formSlug), {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ pages: proposed.pages }),
    });
    if (!put.ok) {
      return { ...summary, RESULT: `PUT FAILED ${put.status}`, detail: (await put.text()).slice(0, 500) };
    }

    // Verify against the LIVE definition, not against what we sent.
    const after = await exportForm(kappSlug, formSlug);
    const afterFields = allFields(after).map(f => ({ name: f.name, key: f.key }));
    const postChecks = {
      invariantsUnchanged:
        JSON.stringify(invariants(after)) === JSON.stringify(beforeInv),
      originalFieldsPreservedWithKeys: beforeFields.every(b =>
        afterFields.some(a => a.name === b.name && a.key === b.key),
      ),
      expectedFieldCount: afterFields.length === proposedFields.length,
      ...(extraChecks ? extraChecks(before, after) : {}),
    };

    if (!Object.values(postChecks).every(Boolean)) {
      const restore = await fetch(base(kappSlug, formSlug), {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ pages: before.pages }),
      });
      return {
        ...summary,
        postChecks,
        RESULT: `VERIFICATION FAILED — automatic restore ${restore.ok ? 'SUCCEEDED' : 'ALSO FAILED, restore from the backup file by hand'}`,
      };
    }

    return { ...summary, postChecks, RESULT: 'OK — written and verified' };
  }

  window.safeFormUpdate = safeFormUpdate;
  window.exportKineticForm = exportForm;
  console.log('safeFormUpdate ready. Dry run first:\n' +
    "await safeFormUpdate({kappSlug:'service-portal', formSlug:'families', mutate: f => {...}})");
})();

/* -------------------------------------------------------------------------
   WORKED EXAMPLE — this is exactly what added the roster fields on 2026-09-09.

   Note it clones an existing text field rather than writing one from scratch.
   Kinetic rejects a field element that is missing any of its null-valued
   properties (requiredMessage, omitWhenHidden, pattern, renderAttributes,
   defaultResourceName) with a 400/500, so inheriting the shape is safer than
   listing them.

await safeFormUpdate({
  kappSlug: 'service-portal',
  formSlug: 'families',
  dryRun: true,                       // flip to false once the diff looks right
  mutate: form => {
    const section  = form.pages[0].elements.find(e => e.name === 'Head of Household');
    const template = section.elements.find(e => e.type === 'field' && e.renderType === 'text');
    const mk = (name, label, key, rows) => ({
      ...JSON.parse(JSON.stringify(template)),
      name, label, key, rows, required: false, defaultValue: null, requiredMessage: null,
    });
    const btn = section.elements.findIndex(e => e.type === 'button');
    section.elements.splice(btn === -1 ? section.elements.length : btn, 0,
      mk('Family Members JSON', 'Family Members (JSON array)', 'fa11c0de0000000000000000000000a1', 6),
      mk('Test Fixture', 'Test Fixture', 'fa11c0de0000000000000000000000a2', 1),
    );
  },
  extraChecks: (before, after) => ({
    tableWidgetCodeIntact:
      (after.pages[0].events.find(e => e.name === 'Load Family Members Table')?.code || '').length ===
      (before.pages[0].events.find(e => e.name === 'Load Family Members Table')?.code || '').length,
  }),
});
------------------------------------------------------------------------- */
