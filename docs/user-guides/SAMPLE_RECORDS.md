# Sample Records for Screenshot Capture

Create (or designate) these records in the production `waterboyz` space. Fill their IDs into `.env` before running `yarn capture`.

| Env var | Form / Type | What to create |
|--------|-------------|----------------|
| `SAMPLE_FAMILY_ID` | `families` datastore | "Sample Family" with 2 family members |
| `SAMPLE_VOLUNTEER_ID` | `volunteers` datastore | Volunteer named "Sample Volunteer", realistic skills/tools |
| `SAMPLE_PROJECT_ID` | `swat-projects` datastore | Project "Sample Project", captain = sample volunteer, family = sample family |
| `SAMPLE_EVENT_ID` | `events` admin form | Event "Sample Serve Day", status Open, linked sample volunteer signup |
| `SAMPLE_NOMINATION_ID` | `swat-project-nomination` | Approved nomination tied to sample project |

**Do not delete these records.** The capture script depends on stable IDs.
