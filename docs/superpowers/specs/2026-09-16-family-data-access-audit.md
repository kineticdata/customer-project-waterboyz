# Family data access audit — 2026-09-16

Audit of where family PII (name, street address, phone, email) can be reached,
tested at the API and security-policy layer rather than read off the UI.

**The rule being tested:** family data is for leadership only; a nominator may
see their own nomination (which contains family data); a sponsor may see only
the family they sponsor.

**Result:** the Christmas Alive paths hold. One confirmed leak exists on the
SWAT side, pre-dating Christmas Alive, described under *Finding 1*.

---

## What holds

### Form policies close the direct submission API

| Form | Display | Submission Access |
|---|---|---|
| `families` | SWAT Leadership or Christmas Alive Admins | same |
| `christmas-alive-sponsorships` | SWAT Leadership or Christmas Alive Admins | same |
| `christmas-alive-claims` | Christmas Alive Admins | same |
| `family-members` | SWAT Leadership | same |
| `christmas-alive-family-nomination` | *(none — inherits kapp)* | kapp default: **Submitter** |

A sponsor or nominator calling `/submissions` or `submissions-search` on
`families` directly is refused. The nomination form inherits the kapp default of
`Submitter`, which is exactly the required behaviour: a nominator reads their own
nomination and nobody else's.

### The browse list is anonymised server-side

`CA - Available Families` projects only `familyNumber`, `city`, `county`,
`nativeLanguage`, `totalMembers`, `totalAdults`, `totalChildren`,
`sponsorshipId`. No name, street, phone or email is in the projection, so the
restriction survives a caller bypassing the UI — the fields never leave the
server.

### A sponsor cannot ask about someone else's sponsorships

`CA - My Sponsorships` is exposed with `Sponsor Username` bound to
`${identity('username')}`. The kapp binds this server-side and ignores any value
in the request body, so a supplied username cannot be substituted.

### The packet refuses before it reads

`christmas-alive-packet` is structured so the family record is fetched **only on
the authorised branch**:

```
start → get_sponsorship → [caller is the sponsor]  → get_family → return_packet
                        → [not the sponsor]        → return_denied
```

The comparison is between `@requested_by` (established by the platform from the
session, not from the request body) and the row's `Sponsor Username`. Because
`get_family` sits after the branch, a refused caller's response cannot contain
family data even by accident — there is nothing loaded to leak.

### Anonymous access

Unauthenticated POSTs to the integration endpoints return `401 Authentication
required`. Nothing here is public.

---

## Finding 1 — kapp-level integrations bypass the `families` form policy

**Severity: high. Pre-existing, SWAT-side, not introduced by Christmas Alive.**

Integrations run as the integration user, so they do not observe the form's
security policy. What governs them instead is the Core API rule:

> Kapp Integration Execute — "The user must have privileges that allow viewing
> the Kapp to perform this action."

The kapp's Display policy is **Authenticated Users**. Therefore *any* signed-in
account — a volunteer, a sponsor, an event signup who later made an account —
can POST to these and receive family PII:

| Integration | Returns | Referenced by |
|---|---|---|
| `Families - Retrieve` | First/Last Name, Address 1 & 2, Zip, Phone for **every** family | `swat-project-approval` form |
| `Family - Retrieve By ID` | one family by id | `portal/src/pages/projects/project/Project.jsx:119` |
| `Family Members - Retrieve` | household members by family id | `families` form |

Verified by calling `Families - Retrieve` with an empty body: 200, 7.6 KB, all
49 families with names, street addresses and phone numbers. The leadership-only
policy on the `families` form does not apply on this path.

All three are in live use, so none can simply be deleted.

### Remediation

Move each from kapp level to **form** level. Form integrations are governed by
"privileges that allow viewing the **Form**", so hosting them on a form whose
Display policy is leadership-only closes the hole.

1. `Family Members - Retrieve` → onto `families`. That form's Display is already
   `SWAT Leadership or Christmas Alive Admins`, so this one is a clean move.
2. `Families - Retrieve` → onto `swat-project-approval`. **That form currently
   has no Display policy** and therefore inherits `Authenticated Users`; a
   Display policy of `SWAT Leadership` must be added in the same change or the
   move achieves nothing.
3. `Family - Retrieve By ID` → onto `swat-projects`, and update
   `Project.jsx:119` to the form-scoped URL. Needs care: that form's Display is
   `SWAT Leadership` while Submission Access is `SWAT Leadership and Project
   Captain`, so a Project Captain who is not leadership may lose the family
   panel on their own project. Confirm the intended audience before moving this
   one — captains plausibly need the address to do the work.

Each caller must be switched to
`/integrations/kapps/{kapp}/forms/{formSlug}/{name}` before the kapp-level
registration is removed, or the flow breaks.

---

## Finding 2 — Christmas Alive Admins may not be able to read nominations

**Severity: low. Functional, not a leak.**

`christmas-alive-family-nomination` has no Submission Access policy, so it
inherits the kapp default of `Submitter`. The Approvals and All families pages
read nominations with `searchSubmissions` directly. A space admin is unaffected,
which is why this has not shown up in testing — but a Christmas Alive Admin who
is **not** a space admin would see "Name not yet recorded" where the nominator's
detail should be.

Worth confirming with a real non-space-admin leadership account before the
season opens. The fix is a Submission Access policy of `Submitter or Christmas
Alive Admins` on that form.

---

## What was not tested

Whether an authenticated **non-leadership** user is refused was established from
the platform's documented rule and the kapp's Display policy, not by logging in
as one — no second account's credentials were available. A test against a real
non-leadership account is the one step that would turn Finding 1 from
"documented behaviour" into "observed behaviour". The
`tests/christmas-alive/authorization.spec.ts` suite already contains that test;
it skips unless `PW_OTHER_USERNAME` / `PW_OTHER_PASSWORD` are set.
