# Volunteer Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable SWAT Leadership to send mass email notifications to volunteers about upcoming projects needing help, with two notification types (all volunteers or skills-based filtering).

**Architecture:** Platform form (`swat-volunteer-notifications`) triggers a workflow that queries projects + volunteers, resolves captains, builds email HTML, and loops to send individual emails. Portal admin page at `/admin/notify-volunteers` provides history view and send-new-notification flow with preview panel. Email template added to `email-templates/build.js`.

**Tech Stack:** React 18, React Router 6, `@kineticdata/react` SDK, Tailwind CSS + DaisyUI, Kinetic Platform workflows, `email-templates/build.js` template system

**Spec:** `docs/superpowers/specs/2026-03-20-volunteer-notifications-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `portal/src/pages/admin/volunteer-notifications/VolunteerNotifications.jsx` | Main page: notification history table + route to send new |
| `portal/src/pages/admin/volunteer-notifications/SendNotification.jsx` | Send form: type picker, skills picker, preview panel, confirm + submit |
| `portal/src/pages/admin/volunteer-notifications/useNotificationPreview.js` | Data hook: fetches matching projects and volunteers for the preview panel |

### Modified Files
| File | Change |
|------|--------|
| `portal/src/pages/admin/index.jsx` | Add route for `/notify-volunteers/*` |
| `portal/src/components/header/Header.jsx` | Add "Volunteer Notifications" menu item to Admin section |
| `portal/src/components/kinetic-form/widgets/categorypicker.js` | Export `CategoryPickerComponent` for standalone use |
| `email-templates/build.js` | Add `volunteer-notification` template |

### Platform (via MCP)
| Resource | Action |
|----------|--------|
| Form `swat-volunteer-notifications` | Create on `service-portal` kapp |
| Workflow "Send Volunteer Notification" | Create on the form |

---

## Task 1: Create the Platform Form via MCP

Create the `swat-volunteer-notifications` form on the Kinetic Platform.

**Files:** Platform configuration (MCP tools)

- [ ] **Step 1: Create the form**

Use MCP tool `create_form` on kapp `service-portal`:
- Name: `SWAT Volunteer Base Notifications`
- Slug: `swat-volunteer-notifications`
- Type: `Admin`
- Status: `Active`
- Fields:
  - `Notification Type` (dropdown: `Upcoming Projects`, `Skills-Based`) — required
  - `Skills Filter` (text) — JSON string array
  - `Custom Message` (textarea) — optional
  - `Notification Sent At` (text) — set by workflow
  - `Recipient Count` (text) — set by workflow
  - `Recipients` (text) — JSON, set by workflow
  - `Projects Included` (text) — JSON, set by workflow
  - `Status` (dropdown: `Draft`, `Sending`, `Sent`, `Failed`)
- Security: Display = "SWAT Leadership", Submission Access = "SWAT Leadership"

**Reference:** @ai-skills/skills/platform/form-engine/SKILL.md for field JSON schema (every field element needs a unique hex `key`, and null properties must be explicit).

- [ ] **Step 2: Verify the form was created**

Use MCP tool `retrieve_form` with kappSlug `service-portal`, formSlug `swat-volunteer-notifications`, include `fields,attributesMap`.

- [ ] **Step 3: Commit checkpoint**

No local file changes in this task — this is platform-only configuration. Note the form creation in a commit message for tracking.

---

## Task 2: Add the Email Template

Add the `volunteer-notification` template to the email template build system.

**Files:**
- Modify: `email-templates/build.js` (add template to `templates` object, before the CLI section around line 787)

- [ ] **Step 1: Add the template definition**

Add this entry to the `templates` object in `email-templates/build.js`:

```javascript
'volunteer-notification': {
  subject: 'Volunteers Needed — Waterboyz',
  preheader: 'Upcoming SWAT projects need your help. Check out where you can serve!',
  build: () => {
    const body = [
      heading('Volunteers Needed!'),
      '<% if @results["Get Submission"]["Custom Message"] && !@results["Get Submission"]["Custom Message"].empty? %>',
      paragraph('<%= @results["Get Submission"]["Custom Message"] %>'),
      '<% end %>',
      divider(),
      `
    <tr>
      <td style="padding:16px 40px 0;" class="padding-mobile">
        <%= @results["Build Email Body"]["Project HTML"] %>
      </td>
    </tr>`,
      spacer(12),
      action('View Projects', `${brand.siteUrl}/#/upcoming-projects`),
      divider(),
      paragraph(
        'Thank you for serving your community — every pair of hands makes a difference!',
      ),
      paragraph(
        'The Waterboyz Team',
      ),
      spacer(),
    ].join('');

    return layout({
      subject: 'Volunteers Needed — Waterboyz',
      preheader: 'Upcoming SWAT projects need your help. Check out where you can serve!',
      body,
    });
  },
},
```

- [ ] **Step 2: Build and preview the template**

Run:
```bash
cd email-templates && node build.js --preview volunteer-notification
```

Expected: Browser opens with the template. The ERB placeholders will show as literal text (expected — they're processed server-side by the workflow engine). Verify the layout, heading, divider, CTA button, and closing paragraph render correctly.

- [ ] **Step 3: Commit**

```bash
git add email-templates/build.js email-templates/dist/volunteer-notification.html
git commit -m "feat: add volunteer-notification email template"
```

---

## Task 3: Export CategoryPickerComponent for Standalone Use

The `CategoryPickerComponent` is currently only used inside the widget wrapper. Export it so the portal notification page can render it directly as a React component.

**Files:**
- Modify: `portal/src/components/kinetic-form/widgets/categorypicker.js:80` (add named export)

- [ ] **Step 1: Add the named export**

The component is defined as:
```javascript
const CategoryPickerComponent = forwardRef(
```

Change it to:
```javascript
export const CategoryPickerComponent = forwardRef(
```

This is a single-word change. The existing `CategoryPicker` widget export and all current usages remain unchanged.

- [ ] **Step 2: Verify existing functionality is not broken**

Run:
```bash
cd portal && yarn build
```

Expected: Build succeeds with no errors. The new export is additive — nothing references it yet.

- [ ] **Step 3: Commit**

```bash
git add portal/src/components/kinetic-form/widgets/categorypicker.js
git commit -m "feat: export CategoryPickerComponent for standalone use"
```

---

## Task 4: Create the Preview Data Hook

This hook fetches the data needed for the "Send New Notification" preview panel: matching projects and matching volunteers.

**Files:**
- Create: `portal/src/pages/admin/volunteer-notifications/useNotificationPreview.js`

- [ ] **Step 1: Create the hook file**

```javascript
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { searchSubmissions } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';

/**
 * Parse a JSON string array field value, returning an empty array on failure.
 */
const parseJsonArray = value => {
  if (!value) return [];
  try {
    const arr = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

/**
 * Hook that fetches matching projects and volunteers for the notification
 * preview panel. Applies client-side filtering for criteria KQL cannot express
 * (empty Associated Event, JSON array skill matching).
 *
 * @param {string} notificationType - 'Upcoming Projects' or 'Skills-Based'
 * @param {string[]} selectedSkills - Array of skill names (only used for Skills-Based)
 */
export const useNotificationPreview = (notificationType, selectedSkills) => {
  const kappSlug = useSelector(state => state.app.kappSlug);

  // --- Fetch all candidate projects ---
  const projectParams = useMemo(
    () => ({
      kapp: kappSlug,
      form: 'swat-projects',
      search: {
        include: ['values'],
        limit: 1000,
        q: 'values[Project Status]="Ready to Work" AND values[Additional Volunteers Needed]="Yes"',
      },
    }),
    [kappSlug],
  );
  const {
    loading: projectsLoading,
    response: projectsResponse,
    actions: { reloadData: reloadProjects },
  } = useData(searchSubmissions, projectParams);

  // --- Fetch all volunteers ---
  const volunteerParams = useMemo(
    () => ({
      kapp: kappSlug,
      form: 'volunteers',
      search: {
        include: ['values'],
        limit: 1000,
      },
    }),
    [kappSlug],
  );
  const {
    loading: volunteersLoading,
    response: volunteersResponse,
    actions: { reloadData: reloadVolunteers },
  } = useData(searchSubmissions, volunteerParams);

  // --- Client-side filtering ---
  const projects = useMemo(() => {
    if (!projectsResponse?.submissions) return [];
    let filtered = projectsResponse.submissions.filter(
      s => !s.values['Associated Event'],
    );
    if (notificationType === 'Skills-Based' && selectedSkills.length > 0) {
      const skillSet = new Set(selectedSkills);
      filtered = filtered.filter(s => {
        const projectSkills = parseJsonArray(s.values['Skills Needed']);
        return projectSkills.some(skill => skillSet.has(skill));
      });
    }
    return filtered;
  }, [projectsResponse, notificationType, selectedSkills]);

  const volunteers = useMemo(() => {
    if (!volunteersResponse?.submissions) return [];
    let filtered = volunteersResponse.submissions.filter(
      s => s.values['Email Address'],
    );
    if (notificationType === 'Skills-Based' && selectedSkills.length > 0) {
      const skillSet = new Set(selectedSkills);
      filtered = filtered.filter(s => {
        const volunteerSkills = parseJsonArray(s.values['Skill Areas']);
        return volunteerSkills.some(skill => skillSet.has(skill));
      });
    }
    return filtered;
  }, [volunteersResponse, notificationType, selectedSkills]);

  const loading = projectsLoading || volunteersLoading;

  const reload = useCallback(() => {
    reloadProjects();
    reloadVolunteers();
  }, [reloadProjects, reloadVolunteers]);

  return { loading, projects, volunteers, reload };
};
```

- [ ] **Step 2: Verify build**

Run:
```bash
cd portal && yarn build
```

Expected: Build succeeds. The hook isn't used yet but should compile cleanly.

- [ ] **Step 3: Commit**

```bash
git add portal/src/pages/admin/volunteer-notifications/useNotificationPreview.js
git commit -m "feat: add useNotificationPreview data hook"
```

---

## Task 5: Create the Send Notification Page

The form page where leadership selects type, optionally picks skills, previews data, and sends.

**Files:**
- Create: `portal/src/pages/admin/volunteer-notifications/SendNotification.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { createSubmission } from '@kineticdata/react';
import { CategoryPickerComponent } from '../../../components/kinetic-form/widgets/categorypicker.js';
import { useNotificationPreview } from './useNotificationPreview.js';
import { PageHeading } from '../../../components/PageHeading.jsx';
import { Icon } from '../../../atoms/Icon.jsx';
import { Loading } from '../../../components/states/Loading.jsx';
import { openConfirm } from '../../../helpers/confirm.js';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';
import clsx from 'clsx';

const NOTIFICATION_TYPES = ['Upcoming Projects', 'Skills-Based'];

const SKILL_PICKER_CONFIG = {
  search: { kappSlug: 'service-portal', formSlug: 'skills' },
  categoryField: 'Skill Category',
  valueField: 'Skill',
};

export const SendNotification = () => {
  const navigate = useNavigate();
  const kappSlug = useSelector(state => state.app.kappSlug);
  const [type, setType] = useState('Upcoming Projects');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { loading, projects, volunteers } = useNotificationPreview(
    type,
    selectedSkills,
  );

  const handleSkillChange = useCallback(skills => {
    setSelectedSkills(skills);
  }, []);

  const handleSend = () => {
    openConfirm({
      title: 'Send Notification',
      description: `You're about to email ${volunteers.length} volunteer${volunteers.length !== 1 ? 's' : ''} about ${projects.length} project${projects.length !== 1 ? 's' : ''}. Proceed?`,
      acceptLabel: 'Send',
      accept: async () => {
        setSending(true);
        try {
          const values = {
            'Notification Type': type,
            Status: 'Draft',
          };
          if (type === 'Skills-Based' && selectedSkills.length > 0) {
            values['Skills Filter'] = JSON.stringify(selectedSkills);
          }
          if (customMessage.trim()) {
            values['Custom Message'] = customMessage.trim();
          }
          const { submission, error } = await createSubmission({
            kappSlug,
            formSlug: 'swat-volunteer-notifications',
            values,
          });
          if (error) throw new Error(error.message || 'Failed to send');
          toastSuccess({ title: 'Notification sent successfully!' });
          navigate('/admin/notify-volunteers');
        } catch (err) {
          toastError({
            title: err?.message || 'Failed to send notification. Please try again.',
          });
        } finally {
          setSending(false);
        }
      },
    });
  };

  const canSend = projects.length > 0 && volunteers.length > 0 && !sending;

  return (
    <div>
      <PageHeading
        title="Send Notification"
        backTo="/admin/notify-volunteers"
      />

      <div className="flex flex-col gap-6 mt-6">
        {/* Notification Type */}
        <div>
          <label className="label font-semibold">Notification Type</label>
          <select
            className="kselect kselect-bordered w-full max-w-sm"
            value={type}
            onChange={e => {
              setType(e.target.value);
              if (e.target.value !== 'Skills-Based') setSelectedSkills([]);
            }}
          >
            {NOTIFICATION_TYPES.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Skills Picker (Skills-Based only — kept mounted to preserve selection state) */}
        <div className={type !== 'Skills-Based' ? 'hidden' : ''}>
          <label className="label font-semibold">
            Select Skills to Match
          </label>
          <div className="max-w-lg">
            <CategoryPickerComponent
              {...SKILL_PICKER_CONFIG}
              onChange={handleSkillChange}
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div className="rounded-box border bg-base-100 p-5">
          <h3 className="font-semibold text-lg mb-4">Preview</h3>
          {loading ? (
            <Loading />
          ) : (
            <>
              <div className="flex gap-4 mb-4">
                <div className="kbadge kbadge-lg kbadge-outline gap-1">
                  <Icon name="hammer" size={16} />
                  {projects.length} project{projects.length !== 1 ? 's' : ''}
                </div>
                <div className="kbadge kbadge-lg kbadge-outline gap-1">
                  <Icon name="users" size={16} />
                  {volunteers.length} recipient
                  {volunteers.length !== 1 ? 's' : ''}
                </div>
              </div>

              {projects.length === 0 ? (
                <p className="text-base-content/60 text-sm">
                  No matching projects found. Projects must have Status "Ready
                  to Work", Additional Volunteers Needed "Yes", and no
                  Associated Event.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {projects.map(p => (
                    <div
                      key={p.id}
                      className="border rounded-lg p-3 text-sm"
                    >
                      <div className="font-semibold">
                        {p.values['Project Name'] || 'Unnamed Project'}
                      </div>
                      <div className="text-base-content/60 mt-1">
                        <span>
                          Date:{' '}
                          {p.values['Scheduled Date'] || 'TBD'}
                        </span>
                        {p.values['Skills Needed'] && (
                          <span className="ml-3">
                            Skills: {p.values['Skills Needed']}
                          </span>
                        )}
                      </div>
                      {p.values['Project Captain'] && (
                        <div className="text-base-content/60">
                          Captain: {p.values['Project Captain']}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Custom Message */}
        <div>
          <label className="label font-semibold">
            Custom Message{' '}
            <span className="font-normal text-base-content/50">
              (optional)
            </span>
          </label>
          <textarea
            className="ktextarea ktextarea-bordered w-full max-w-lg"
            rows={4}
            placeholder="Add a personal message to include at the top of the email..."
            value={customMessage}
            onChange={e => setCustomMessage(e.target.value)}
          />
        </div>

        {/* Send Button */}
        <div>
          <button
            className={clsx(
              'kbtn kbtn-primary gap-2',
              sending && 'kbtn-disabled',
            )}
            disabled={!canSend}
            onClick={handleSend}
          >
            {sending ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Sending...
              </>
            ) : (
              <>
                <Icon name="send" size={18} />
                Send Notification
              </>
            )}
          </button>
          {!loading && volunteers.length === 0 && (
            <p className="text-warning text-sm mt-2">
              No volunteers match the current criteria.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify build**

Run:
```bash
cd portal && yarn build
```

Expected: Build succeeds (component isn't routed yet, but should compile).

- [ ] **Step 3: Commit**

```bash
git add portal/src/pages/admin/volunteer-notifications/SendNotification.jsx
git commit -m "feat: add SendNotification page for volunteer notifications"
```

---

## Task 6: Create the Notification History Page

The landing page showing past notifications with a button to send new ones.

**Files:**
- Create: `portal/src/pages/admin/volunteer-notifications/VolunteerNotifications.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useMemo, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { searchSubmissions } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { PageHeading } from '../../../components/PageHeading.jsx';
import { Icon } from '../../../atoms/Icon.jsx';
import { Loading } from '../../../components/states/Loading.jsx';
import { SendNotification } from './SendNotification.jsx';
import clsx from 'clsx';

const STATUS_COLORS = {
  Draft: 'kbadge-ghost',
  Sending: 'kbadge-warning',
  Sent: 'kbadge-success',
  Failed: 'kbadge-error',
};

const formatDate = dateStr => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const NotificationHistory = () => {
  const kappSlug = useSelector(state => state.app.kappSlug);
  const [expandedId, setExpandedId] = useState(null);

  const params = useMemo(
    () => ({
      kapp: kappSlug,
      form: 'swat-volunteer-notifications',
      search: {
        include: ['values'],
        limit: 100,
        direction: 'DESC',
      },
    }),
    [kappSlug],
  );
  const { loading, response } = useData(searchSubmissions, params);
  const notifications = response?.submissions ?? [];

  return (
    <div>
      <PageHeading title="Volunteer Notifications">
        <Link
          to="/admin/notify-volunteers/new"
          className="kbtn kbtn-primary kbtn-sm gap-1"
        >
          <Icon name="send" size={16} />
          Send New Notification
        </Link>
      </PageHeading>

      {loading ? (
        <Loading />
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-base-content/60">
          <Icon name="mail" size={40} className="mx-auto mb-3 opacity-40" />
          <p>No notifications have been sent yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="ktable ktable-zebra w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Recipients</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(n => {
                const v = n.values;
                const isExpanded = expandedId === n.id;
                return (
                  <tr key={n.id}>
                    <td colSpan={4} className="!p-0">
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : n.id)
                        }
                      >
                        <div className="grid grid-cols-4 gap-4 px-4 py-3 items-center">
                          <div className="text-sm">
                            {formatDate(
                              v['Notification Sent At'] || n.createdAt,
                            )}
                          </div>
                          <div className="text-sm">
                            {v['Notification Type'] || '—'}
                          </div>
                          <div className="text-sm">
                            {v['Recipient Count'] || '0'}
                          </div>
                          <div>
                            <span
                              className={clsx(
                                'kbadge kbadge-sm',
                                STATUS_COLORS[v['Status']] ||
                                  'kbadge-ghost',
                              )}
                            >
                              {v['Status'] || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <NotificationDetail values={v} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const NotificationDetail = ({ values }) => {
  const projects = (() => {
    try {
      return JSON.parse(values['Projects Included'] || '[]');
    } catch {
      return [];
    }
  })();

  const recipients = (() => {
    try {
      return JSON.parse(values['Recipients'] || '[]');
    } catch {
      return [];
    }
  })();

  return (
    <div className="px-4 pb-4 border-t bg-base-200/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        {/* Projects */}
        <div>
          <h4 className="font-semibold text-sm mb-2">
            Projects Included ({projects.length})
          </h4>
          {projects.length > 0 ? (
            <ul className="text-sm space-y-1">
              {projects.map((p, i) => (
                <li key={i} className="text-base-content/70">
                  {p.projectName || p.projectId}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-base-content/50">—</p>
          )}
        </div>

        {/* Recipients */}
        <div>
          <h4 className="font-semibold text-sm mb-2">
            Recipients ({recipients.length})
          </h4>
          {recipients.length > 0 ? (
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {recipients.map((r, i) => (
                <li key={i} className="text-base-content/70">
                  {r.name} ({r.email})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-base-content/50">—</p>
          )}
        </div>
      </div>

      {/* Custom Message */}
      {values['Custom Message'] && (
        <div className="mt-3">
          <h4 className="font-semibold text-sm mb-1">Custom Message</h4>
          <p className="text-sm text-base-content/70 whitespace-pre-wrap">
            {values['Custom Message']}
          </p>
        </div>
      )}

      {/* Skills Filter */}
      {values['Skills Filter'] && (
        <div className="mt-3">
          <h4 className="font-semibold text-sm mb-1">Skills Filter</h4>
          <p className="text-sm text-base-content/70">
            {(() => {
              try {
                return JSON.parse(values['Skills Filter']).join(', ');
              } catch {
                return values['Skills Filter'];
              }
            })()}
          </p>
        </div>
      )}
    </div>
  );
};

export const VolunteerNotifications = () => (
  <Routes>
    <Route path="/" element={<NotificationHistory />} />
    <Route path="/new" element={<SendNotification />} />
  </Routes>
);
```

- [ ] **Step 2: Verify build**

Run:
```bash
cd portal && yarn build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add portal/src/pages/admin/volunteer-notifications/VolunteerNotifications.jsx
git commit -m "feat: add VolunteerNotifications history page with detail expansion"
```

---

## Task 7: Wire Up Routes and Menu

Add the new page to admin routing and the hamburger menu.

**Files:**
- Modify: `portal/src/pages/admin/index.jsx` (add route)
- Modify: `portal/src/components/header/Header.jsx:217-224` (add menu item)

- [ ] **Step 1: Add the route to admin routing**

In `portal/src/pages/admin/index.jsx`, add a lazy import after the existing lazy imports (line 12):
```javascript
const VolunteerNotifications = lazy(() => import('./volunteer-notifications/VolunteerNotifications.jsx').then(m => ({ default: m.VolunteerNotifications })));
```

Add a new route inside the inner `<Routes>` (the gutter wrapper), after the `/reports` route:
```jsx
<Route path="/notify-volunteers/*" element={<Suspense fallback={<Loading />}><VolunteerNotifications /></Suspense>} />
```

This follows the same lazy-loading + Suspense pattern used by the Reports and VolunteerManagement routes.

- [ ] **Step 2: Add the menu item**

In `portal/src/components/header/Header.jsx`, in the `getMenuItems` function, add to the Admin section's `items` array (after the "Volunteer Management" entry):
```javascript
{ label: 'Volunteer Notifications', to: '/admin/notify-volunteers', icon: 'mail' },
```

- [ ] **Step 3: Verify build and test navigation**

Run:
```bash
cd portal && yarn build
```

Expected: Build succeeds. When running locally (`yarn start`), navigating to `/admin/notify-volunteers` shows the notification history page, and `/admin/notify-volunteers/new` shows the send form. The hamburger menu shows "Volunteer Notifications" under Admin.

- [ ] **Step 4: Commit**

```bash
git add portal/src/pages/admin/index.jsx portal/src/components/header/Header.jsx
git commit -m "feat: add volunteer notifications route and admin menu item"
```

---

## Task 8: Create the Workflow

Create the "Send Volunteer Notification" workflow on the `swat-volunteer-notifications` form. This is the most complex task — the workflow queries data, resolves captains, builds email HTML, and sends emails.

**Files:** Platform configuration (MCP tools)

**Reference:** @ai-skills/skills/platform/workflow-xml/SKILL.md for workflow tree schema and handler definition IDs. @ai-skills/skills/platform/workflow-engine/SKILL.md for workflow concepts.

- [ ] **Step 1: Design the workflow tree**

The workflow tree has these nodes:

1. **Start** → connects to "Update Status Sending"
2. **Update Status Sending** (`kinetic_request_ce_submission_update_v1`) — sets Status = "Sending"
3. **Branch on Type** — connector conditions branch based on `<%=@values['Notification Type']%>`
4. **Fetch Projects** (`kinetic_request_ce_submission_search_v1`) — queries `swat-projects` with KQL: `values[Project Status]="Ready to Work" AND values[Additional Volunteers Needed]="Yes"`
5. **Fetch Volunteers** (`kinetic_request_ce_submission_search_v1`) — queries all `volunteers`
6. **Filter and Build** (`kinetic_request_ce_submission_update_v1` or echo/script node) — client-side filtering (remove projects with Associated Event, apply skills filter for Skills-Based type), resolve unique captains, build email HTML, build tracking JSON
7. **Update Tracking** (`kinetic_request_ce_submission_update_v1`) — writes Recipients, Projects Included, Recipient Count to the submission
8. **Loop Send Emails** — loop node that iterates through recipients, calling `smtp_email_send_v1` for each
9. **Update Status Sent** (`kinetic_request_ce_submission_update_v1`) — sets Status = "Sent", Notification Sent At = now
10. **Error Handler** — catches failures and sets Status = "Failed"

- [ ] **Step 2: Create the workflow via MCP**

Use MCP tool `create_form_workflow` to create the workflow on the `swat-volunteer-notifications` form. The workflow XML needs to be built following the patterns in the Workflow XML skill.

Key workflow details:
- **Trigger event:** `Submission Submitted`
- **Email subject:** `Volunteers Needed — Waterboyz`
- **Email htmlbody:** The built HTML from the `volunteer-notification` template with project HTML injected
- **Email textbody:** Plaintext fallback

The exact workflow XML will need to be constructed based on the available handlers on the platform. Check available handlers first:
- `kinetic_request_ce_submission_search_v1` — for querying submissions
- `kinetic_request_ce_submission_update_v1` — for updating the notification submission
- `smtp_email_send_v1` — for sending emails
- `kinetic_request_ce_user_retrieve_v1` — for fetching captain user records

- [ ] **Step 3: Verify the workflow**

Use MCP tool `retrieve_form_workflows` to confirm the workflow was created on the form. Verify it's set to Active status and triggered on Submission Submitted.

- [ ] **Step 4: Test the workflow end-to-end**

Create a test submission on `swat-volunteer-notifications` with:
- Notification Type: "Upcoming Projects"
- Status: "Draft"

Monitor the workflow run to verify it:
1. Updates status to "Sending"
2. Queries projects and volunteers
3. Builds email body
4. Sends emails (or fails gracefully if no matching data)
5. Updates status to "Sent" with tracking data

- [ ] **Step 5: Commit checkpoint**

No local file changes — this is platform configuration. Note the workflow creation for tracking:
```bash
git commit --allow-empty -m "platform: create Send Volunteer Notification workflow on swat-volunteer-notifications form"
```

---

## Task 9: Manual Testing Checklist

End-to-end verification of the complete feature.

- [ ] **Step 1: Test the notification history page**

1. Navigate to `/admin/notify-volunteers` as SWAT Leadership
2. Verify empty state message shows when no notifications exist
3. Verify the "Send New Notification" button is visible

- [ ] **Step 2: Test the "Upcoming Projects" flow**

1. Navigate to `/admin/notify-volunteers/new`
2. Select "Upcoming Projects" type
3. Verify preview panel shows matching projects and volunteer count
4. Add an optional custom message
5. Click "Send Notification"
6. Confirm in the modal
7. Verify redirect to history page
8. Verify the new notification appears in the history table
9. Click to expand — verify tracking data (recipients, projects)
10. Check email inboxes of test volunteers

- [ ] **Step 3: Test the "Skills-Based" flow**

1. Navigate to `/admin/notify-volunteers/new`
2. Select "Skills-Based" type
3. Verify skills picker appears
4. Select a few skills
5. Verify preview panel updates with filtered projects and volunteers
6. Click "Send Notification" and confirm
7. Verify the email only went to volunteers with matching skills

- [ ] **Step 4: Test edge cases**

1. No matching projects → verify "No matching projects found" message and send button is disabled
2. No volunteers with email → verify warning message
3. Skills-Based with no skills selected → verify preview shows all projects/volunteers (same as Upcoming Projects)

- [ ] **Step 5: Verify non-leadership access is blocked**

1. Log in as a regular volunteer (not SWAT Leadership)
2. Navigate to `/admin/notify-volunteers`
3. Verify redirect to home page
4. Verify menu item is not visible
