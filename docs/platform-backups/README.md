# Platform backups

Exports of Kinetic form definitions taken immediately before a structural
change, so a bad write can be reverted.

## How to take one

Use `scripts/safe-form-update.js`. It exports with `?export=true`, downloads a
timestamped backup, and refuses to write unless its pre-checks pass.

**`?export=true` is not optional.** Without it the API returns a summary where
`fields` is a list of names and `pages` is absent entirely. PUTting that back
would delete every field, every event handler and every section on the form.

## Restoring

In the browser console, signed in as a space admin on the portal's origin:

```js
const backup = JSON.parse(await (await fetch('/path/to/backup.json')).text());
// or paste the file contents into a variable
await fetch('/app/api/v1/kapps/service-portal/forms/families', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-XSRF-TOKEN': decodeURIComponent(
      document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.split('=')[1] || ''),
  },
  body: JSON.stringify({ pages: backup.form.pages }),
});
```

`safeFormUpdate` does this automatically if its post-write verification fails.

## Files

| File | Taken | Why |
|---|---|---|
| `families-2026-09-09-pre-roster.json` | 2026-09-09 | Before adding `Family Members JSON` and `Test Fixture`. 24,165 bytes, 12 fields, 2 event handlers (7,534 + 2,298 chars of JS). **Currently sits in ~/Downloads — macOS blocks Terminal from reading that folder, so it needs moving in by hand.** |
