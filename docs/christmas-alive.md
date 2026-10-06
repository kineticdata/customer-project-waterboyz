# Christmas Alive — Runbook

Christmas Alive is the Waterboyz holiday program: partner churches and
organizations **nominate** families, Christmas Alive admins **approve** them,
community **sponsors** claim a family and provide its Christmas, and everyone
meets at **curb-side pickup**.

This document is the operating manual: how the pieces fit, what lives where,
and **what to change each year** (see [Yearly season checklist](#yearly-season-checklist)).
Field-level detail for each form lives in [platform-config.md](platform-config.md).

---

## Yearly season checklist

Do this each fall before sponsorship opens. Nothing here needs a code change
**except step 2**, which does.

### 1. Open the new season (no code — Settings → Datastore → `programs`)

Edit the **Christmas Alive** record:

| Field | Set to | What it drives |
|---|---|---|
| **Current Season** | the new year, e.g. `2027` | The year shown in the band, landing page and printed packet; which season new nominations go into (the *Create Sponsorship Row* workflow reads it); family numbering, which restarts at 1 per season; the season filter and exports in All families |
| **Active From** / **Active To** | when sponsorship opens and closes, e.g. `2027-09-01` / `2027-12-31` | Whether "Sponsor a family" is open. An empty window reads as **closed**, never always-open |

Families from earlier seasons stay in the system under their old season and
remain visible to admins through the season filter.

### 2. Update the event details (code + workflows)

The photo date, pickup date, venue and related details are **hard-coded** in
three places. Update all three together:

| Where | What to change |
|---|---|
| `portal/src/pages/christmas-alive/packet/Responsibilities.jsx` — the `SEASON` object | `portraitDate`, `portraitPhone`, `pickupDate`, `venue`, `contactEmail`, `giftValue`. This feeds the "What sponsors do" page **and** the guide printed at the end of every family packet |
| `portal/src/pages/christmas-alive/packet/FamilyPacket.jsx` | The "Family portrait — Requested" line (`Saturday, Dec 12`) |
| `email-templates/build.js` | The packet email (photo + pickup), the nudge email (pickup), and the pickup reminder (pickup heading). Search for the old dates |

Then reinstall the three affected emails on the platform:

1. `cd email-templates && node build.js christmas-alive-sponsor-packet christmas-alive-nudge christmas-alive-pickup-reminder`
   (or run `node build.js` for all templates).
2. Copy each `dist/*.html` into the **HTML Body** of the email step of its
   workflow on the `christmas-alive-sponsorships` form, and update the dates in
   the **Alternate (text) Body** too:
   - `Christmas Alive - Send Sponsor Packet` ← `christmas-alive-sponsor-packet.html`
   - `Christmas Alive - Sponsor Nudge` ← `christmas-alive-nudge.html`
   - `Christmas Alive - Pickup Reminder` ← `christmas-alive-pickup-reminder.html`
3. Deploy the portal.

> **Possible improvement:** move these details onto the `programs` record
> (Photo Date, Pickup Date, Pickup Location, Photo Booking Phone…) so step 2
> becomes a datastore edit like step 1. Not done yet — decided 2026-10-05 to
> keep it as a yearly code change.

### 3. People

- **Christmas Alive Admins** team — leadership who approve nominations and manage sponsors. Managed in the platform console (space admins).
- **Christmas Alive Nominators** — CA Admins manage this themselves in the portal: **Menu → Christmas Alive → Nominator Management** (`/christmas-alive/nominators`). Admins can always nominate and don't need to be on it.
- Remembered nominator phone/organization (the `CA Nominator …` user attributes) carry over between years; nothing to reset.

### 4. Before going live

Run through: nominate a test family → approve it → claim it as a sponsor (check the packet email and packet page) → reassign it → press the pickup reminder → export. Test data is easiest to clean up when it's on a test account.

---

## Who does what

| Role | How someone gets it | Can |
|---|---|---|
| Sponsor | Any signed-in user, while the season is open | Browse anonymized families, claim one (giving name + phone), see their packet |
| Nominator | **Christmas Alive Nominators** team | Submit nominations |
| CA Admin | **Christmas Alive Admins** team (space admins count too) | Approve/reject, see all families, reassign/return sponsors, send pickup reminders, export, manage nominators |

## Portal pages (`/christmas-alive`)

| Route | Who | Purpose |
|---|---|---|
| `/` | everyone | Landing |
| `/families` | sponsors | Anonymized browse list; the claim modal collects sponsor name + phone |
| `/my-sponsorships` | sponsors | Families I've claimed |
| `/packet/:id` | the sponsor or CA Admins | Live family details + the sponsor guide; prints as a complete packet |
| `/responsibilities` | everyone | "What sponsors do" |
| `/nominate` | nominators | The nomination form (also reachable at `/forms/christmas-alive-family-nomination`; both pre-fill the nominator) |
| `/approvals` | CA Admins | Review queue, export |
| `/all-families` | CA Admins | Every family, inline edits, sponsor controls, pickup reminder button, export |
| `/nominators` | CA Admins | Nominator Management |

All of these share `ChristmasAliveLayout` and the brand theme
(`assets/styles/christmas-alive.css`, scoped to `.ca-theme` — it never affects
SWAT or the global Waterboyz header/footer). Brand reference: the *Christmas
Alive Brand Guidelines 2026* PDF (fonts Great Vibes / Poppins / Tinos, palette
Homecoming Red, Evergreen, Hearth Gold, Frost Cream).

## Data

- `christmas-alive-family-nomination` — what the nominator submitted (nominator section, head of household, roster JSON, interpreter/photo/ALICE/support answers, background).
- `christmas-alive-sponsorships` — **one row per family per season**: status (Pending → Approved/Rejected → Adopted), family number, sponsor username/email/name/phone, timestamps, photo flag, and a snapshot (city, county, language, counts) for the browse list.
- `christmas-alive-claims` — one row per claim; its **unique index** is what makes two simultaneous claims impossible.
- `families` — the shared family registry, created at approval.
- `programs` — the season settings (see checklist).

## Platform pieces

**WebAPIs** (kapp `service-portal`)

| Slug | Policy | Does |
|---|---|---|
| `christmas-alive-approve` | Christmas Alive Admins | Approve (creates the family, allocates the family number) or reject |
| `christmas-alive-claim` | Authenticated Users | Claim a family; requires sponsor name + 10-digit phone (`CONTACT_REQUIRED` otherwise); `ALREADY_CLAIMED` if someone beat them to it |
| `christmas-alive-packet` | Authenticated Users | Packet data — only for the sponsor of record or an admin |

**Workflows**

| Form | Workflow | Trigger | Does |
|---|---|---|---|
| nomination | Create Sponsorship Row | Submitted | Creates the Pending season row (city, photo flag, counts) |
| nomination | Remember Nominator Details | Submitted | Fills blank `CA Nominator Phone Number` / `CA Nominator Organization` user attributes (whole-map write, never drops other attributes) |
| nomination | Nomination Process / On Update | Submitted / Updated | Legacy count maintenance |
| sponsorships | Send Sponsor Packet | Updated → Adopted, no packet yet | Emails the packet, stamps Packet Sent At |
| sponsorships | Sponsor Nudge | Same | Waits 7 days, re-checks, emails "have you reached your family?" |
| sponsorships | Notify Reassigned Sponsor | Sponsor changed | Emails the outgoing sponsor |
| sponsorships | Pickup Reminder | Pickup Reminder Sent At = `REQUESTED` | Emails the pickup reminder, stamps the time |
| families | Sync Family To Sponsorship | Family edited | Keeps the sponsorship snapshot current |

> Workflow node ids must be `{definitionId}_{N}` (e.g. `system_integration_v1_3`)
> or the workflow builder cannot draw the tree. Renamed throughout on
> 2026-10-05 — see `platform-backups/workflow-2026-10-05-node-id-renames.md`.

**Kapp integrations** (all `CA - …`; see platform-config.md for the full table)
— `CA - Available Families`, `CA - My Sponsorships`, and the four Nominator
Management integrations (`CA - List Users`, `CA - List Nominators`,
`CA - Add Nominator`, `CA - Remove Nominator`, Execution: Christmas Alive
Admins, team fixed inside each operation).

**User attributes** — `CA Nominator Phone Number`, `CA Nominator Organization`.

## Known limits / follow-ups

- **Event details are hard-coded** — see checklist step 2.
- **`Affiliates Retrieve`** (Nominating Organization dropdown) sets no limit, so the platform default of **25** applies. Fine at 8 affiliates; add a limit before the list grows past 25. The operation is shared with the volunteers form.
- **`CA - Remove Nominator`** puts the username straight into the request path. CA Admins are trusted; validating the username first would be a cheap hardening.
- **SWAT Captain Management** adds/removes members through the Core API, which needs space-level *Team Membership Modification* (space admins only). A SWAT leader who is not a space admin may get an error adding a captain — untested. Nominator Management's integration pattern would fix it.
- **Pickup Reminder** is button-triggered (no scheduler in this space); pressing it twice only emails sponsors not yet reached.
- **Sponsor Nudge** uses a 7-day deferral. Whether a waiting run survives edits to the tree is unconfirmed (its node ids were renamed on 2026-10-05 while test runs were waiting — check whether those nudges sent on Oct 8 / Oct 12). Until that's known, avoid editing it while real nudges are pending mid-season.
