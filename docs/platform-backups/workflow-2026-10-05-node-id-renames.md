# Workflow node id renames — 2026-10-05

The workflow builder only renders trees whose non-start node ids are
`{definitionId}_{N}`. These trees were created via the API with readable ids
(`get_sponsor`, `send_email`, ...) and opened in the builder as a single node.

Only node `id`s, the connector/dependent references to them, `lastId`, and
canvas positions changed. Node names, parameters, connector conditions and
email bodies are unchanged. To roll back, reverse the mapping below.

The full pre-change tree for Create Sponsorship Row is in
`workflow-2026-10-05-create-sponsorship-row-pre-node-rename.json`. The email
bodies of the others are the `email-templates/dist/` files their notes name.

| Form | Workflow | Version | Old id → new id |
|---|---|---|---|
| christmas-alive-family-nomination | Christmas Alive - Create Sponsorship Row (68d3d25e) | 3 → 4 | get_season → system_integration_v1_1; check_existing → system_integration_v1_2; create_sponsorship → system_integration_v1_3; already_exists → system_noop_v1_4 |
| christmas-alive-sponsorships | Christmas Alive - Notify Reassigned Sponsor (f2873551) | 1 → 2 | get_sponsor → system_integration_v1_1; send_email → smtp_email_send_v1_2 (lastId 3 → 2) |
| christmas-alive-sponsorships | Christmas Alive - Pickup Reminder (50f44998) | 1 → 2 | get_sponsor → system_integration_v1_1; send_email → smtp_email_send_v1_2; stamp_sent → system_integration_v1_3 (lastId 4 → 3) |
| christmas-alive-sponsorships | Christmas Alive - Send Sponsor Packet (6806e7cc) | 1 → 2 | get_family → system_integration_v1_1; get_sponsor → system_integration_v1_2; send_email → smtp_email_send_v1_3; stamp_sent → system_integration_v1_4 (lastId 5 → 4) |
| families | Christmas Alive - Sync Family To Sponsorship (26c2c9e9) | 1 → 2 | find_sponsorship → system_integration_v1_1; sync_snapshot → system_integration_v1_2 (lastId 3 → 2) |

## WebAPIs

Updated with `web_apis create_import` (`force: true`) carrying the original
method and security policy (Execution: Authenticated Users), then re-exported
to verify.

| WebAPI | Old id → new id |
|---|---|
| christmas-alive-packet | get_sponsorship → system_integration_v1_1; get_family → system_integration_v1_2; return_packet → system_tree_return_v1_3; return_denied → system_tree_return_v1_4 |
| christmas-alive-claim | get_sponsorship → system_integration_v1_1; create_claim → system_integration_v1_2; mark_adopted → system_integration_v1_3; return_ok → system_tree_return_v1_4; return_taken → system_tree_return_v1_5; return_unavailable → system_tree_return_v1_6 |
| christmas-alive-approve (policy: Christmas Alive Admins) | get_sponsorship → system_integration_v1_1; get_nomination → system_integration_v1_2; create_family → system_integration_v1_3; next_number → system_integration_v1_4; mark_approved → system_integration_v1_5; do_reject → system_integration_v1_6; return_approved → system_tree_return_v1_7; return_rejected → system_tree_return_v1_8; return_not_pending → system_tree_return_v1_9 |

## Sponsor Nudge

| Form | Workflow | Version | Old id → new id |
|---|---|---|---|
| christmas-alive-sponsorships | Christmas Alive - Sponsor Nudge (b90d2fdf) | 3 → 4 | wait_a_week → system_wait_v1_1; recheck → system_integration_v1_2; get_sponsor → system_integration_v1_3; send_email → smtp_email_send_v1_4 (lastId 5 → 4) |

Renamed while 7-day deferrals were in flight for test families 2, 4 and 5
(claimed 2026-10-01 and 2026-10-05). Those were test data, so a broken resume
was acceptable. Whether a deferred run survives its node id being renamed was
not established — watch those runs when they resume (2026-10-08 and 2026-10-12).
