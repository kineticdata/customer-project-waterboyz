# Family data access audit — 2026-09-16

Audit of where family PII (name, street address, phone, email) can be reached,
tested at the API and security-policy layer rather than read off the UI.

**The rule being tested:** family data is for leadership only; a nominator may
see their own nomination (which contains family data); a sponsor may see only
the family they sponsor.

**Result:** the rule holds on every path checked. One low-severity functional
gap is noted under *Finding 1*. No PII leak was found.

> **Correction, same day.** An earlier revision of this document claimed that
> kapp-level integrations were reachable by any authenticated user and that
> `Families - Retrieve` therefore leaked every family. **That was wrong.** It
> came from listing the integrations without `include=securityPolicies`, seeing
> no policy field, and treating absence in the response as absence of a policy.
> The field is simply not returned unless requested. Every PII-bearing
> integration is in fact gated; see the table below. Retained here because the
> mistake is an easy one to repeat: **on this API, "not present in the response"
> does not mean "not configured."**

---

## Form policies close the direct submission API

| Form | Display | Submission Access |
|---|---|---|
| `families` | SWAT Leadership or Christmas Alive Admins | same |
| `christmas-alive-sponsorships` | SWAT Leadership or Christmas Alive Admins | same |
| `christmas-alive-claims` | Christmas Alive Admins | same |
| `family-members` | SWAT Leadership | same |
| `christmas-alive-family-nomination` | *(none — inherits kapp)* | kapp default: **Submitter** |

A sponsor or nominator calling `/submissions` or `submissions-search` on
`families` directly is refused. The nomination form inherits the kapp default of
`Submitter`, which is the required behaviour: a nominator reads their own
nomination and nobody else's.

## Integration Execution policies

Integrations run as the integration user and do **not** observe form policies,
so each one needs its own Execution policy. Read them with
`GET /kapps/{kapp}/integrations?include=securityPolicies` — without that
parameter the policies are omitted from the response entirely.

| Integration | Execution policy | Carries family PII |
|---|---|---|
| `Families - Retrieve` | SWAT Leadership | yes |
| `Family - Retrieve By ID` | Project Captains and SWAT Leadership | yes |
| `Family Members - Retrieve` | SWAT Leadership | yes |
| `Projects by Family ID` | SWAT Leadership | yes |
| `Project Retrieve`, `Projects - Retrieve`, `Project Captains Retrieve` | SWAT Leadership Project Captains and All Volunteers | no |
| `Project Volunteers - Retrieve` | Project Captains and SWAT Leadership | no |
| `Upcoming SWAT Projects` | Authenticated Users | no |
| `CA - Available Families` | *(none — any authenticated user)* | **no, by construction** |
| `CA - My Sponsorships` | *(none — any authenticated user)* | **no, by construction** |
| `Events - List` | *(none — any authenticated user)* | no |

Every integration that returns a name, street or phone is restricted to
leadership, or to Project Captains where a captain needs the address to do the
work. The three with no Execution policy are deliberate and safe:

- **`CA - Available Families`** projects only `familyNumber`, `city`, `county`,
  `nativeLanguage`, `totalMembers`, `totalAdults`, `totalChildren`,
  `sponsorshipId`. No name, street, phone or email is in the projection, so the
  restriction survives a caller bypassing the UI — those fields never leave the
  server. This is the browse list, which every signed-in user is meant to see.
- **`CA - My Sponsorships`** binds `Sponsor Username` to
  `${identity('username')}`. The kapp supplies it server-side and ignores any
  value in the request body, so a caller cannot substitute someone else's.
- **`Events - List`** carries no family data.

## The packet refuses before it reads

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

## Anonymous access

Unauthenticated POSTs to the integration endpoints return `401 Authentication
required`. Nothing here is public.

---

## Finding 1 — Christmas Alive Admins may not be able to read nominations

**Severity: low. Functional, not a leak.**

`christmas-alive-family-nomination` has no Submission Access policy, so it
inherits the kapp default of `Submitter`. The Approvals and All families pages
read nominations with `searchSubmissions` directly. A space admin is unaffected,
which is why this has not surfaced in testing — but a Christmas Alive Admin who
is **not** a space admin would see "Name not yet recorded" where the nominator's
detail should be.

Worth confirming with a real non-space-admin leadership account before the
season opens. The fix is a Submission Access policy of `Submitter or Christmas
Alive Admins` on that form.

---

## What was not tested

No test ran as an authenticated **non-leadership** user — no second account's
credentials were available. The policies above are read from configuration; a
live call as an ordinary volunteer would turn that from "configured correctly"
into "observed to refuse". The `tests/christmas-alive/authorization.spec.ts`
suite already contains those tests; they skip unless `PW_OTHER_USERNAME` /
`PW_OTHER_PASSWORD` are set.
