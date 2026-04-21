module.exports = {
  slug: 'settings',
  title: 'Settings & Datastore',
  purpose:
    'The Settings page is where you manage your own profile and notification preferences. Space Admins also see the <strong>Datastore</strong> link, which opens a browsable directory of every datastore form (families, events, skills, tools, affiliates, programs, and more) for direct editing.',
  howToGetThere: {
    text: 'Open the hamburger menu and choose <strong>Settings</strong>. Space Admins can also jump straight to <strong>/settings/datastore</strong> from the Admin page.',
    screenshot: null,
  },
  steps: [
    {
      heading: 'The Settings landing page',
      body: 'Settings shows cards for <strong>Profile</strong>, <strong>Notifications</strong>, and (for Space Admins) <strong>Datastore</strong>. Any settings-type forms configured on the platform are also listed automatically.',
      screenshot: null,
    },
    {
      heading: 'Profile',
      body: 'Edit your display name, email, phone, and any other user-profile attributes. These values show up on project assignments, approvals, and anywhere else your name is referenced in the portal.',
      screenshot: null,
    },
    {
      heading: 'Notifications',
      body: 'Choose which emails you receive from the portal — approvals, assignments, reminders, etc. Preferences are saved per-user and take effect immediately.',
      screenshot: null,
    },
    {
      heading: 'Datastore (Space Admins only)',
      body: 'The <strong>Datastore</strong> page lists every datastore form: <code>swat-projects</code>, <code>families</code>, <code>family-members</code>, <code>volunteers</code>, <code>swat-project-volunteers</code>, <code>project-notes</code>, <code>reimbursements</code>, <code>events</code>, <code>programs</code>, <code>skills</code>, <code>tools</code>, <code>affiliates</code>, <code>states</code>, <code>state-counties</code>, and <code>scheduled-job-runs</code>. Click a form to browse records, open a record to edit it.',
      screenshot: null,
    },
    {
      heading: 'When to use Datastore editing',
      body: 'Use datastore editing only when the dedicated admin page can\'t do what you need — for example, correcting historical data, adding a new county to the <code>state-counties</code> reference, or updating a program icon in <code>programs</code>. Everything else should go through the purpose-built admin pages.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'Profile fields', description: 'Display name, email, preferred name, and any user attributes the organization has added.' },
    { name: 'Notification preferences', description: 'Per-user email opt-ins for the notification types the platform sends.' },
    { name: 'Datastore forms', description: 'Read-only links to each datastore form. Click through to browse or edit records.' },
  ],
  tips: [
    'Most leaders don\'t need to touch the datastore — the admin pages (Volunteer Management, Reports, Captain Management, Events) cover day-to-day work.',
    'Editing a reference datastore (like <code>skills</code> or <code>tools</code>) changes the options everyone sees everywhere. Coordinate with the team before adding or renaming entries.',
    'If you\'re a SWAT Leader but not a Space Admin, the Datastore card simply won\'t appear — that\'s expected.',
  ],
  comingSoon: false,
};
