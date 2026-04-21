module.exports = {
  slug: 'volunteer-notifications',
  title: 'Volunteer Notifications',
  purpose:
    'Send mass email notifications to volunteers about upcoming projects, and keep a full history of what was sent, to whom, and when. Notifications are a read-only audit trail once sent — every email is logged as a <code>swat-volunteer-notifications</code> record.',
  howToGetThere: {
    text: 'Open the hamburger menu → <strong>Admin</strong> → <strong>Volunteer Notifications</strong> (or go directly to <strong>/admin/notify-volunteers</strong>).',
    screenshot: null,
  },
  steps: [
    {
      heading: 'Reviewing past notifications',
      body: 'The landing page lists every notification with a status badge (<em>Draft</em>, <em>Sending</em>, <em>Sent</em>, <em>Failed</em>), the notification type, recipient count, and when it was sent. Summary cards at the top show <strong>Total Notifications</strong>, <strong>Successfully Sent</strong>, and <strong>Total Emails Sent</strong>.',
      screenshot: null,
    },
    {
      heading: 'Inspecting a notification',
      body: 'Click any row to expand it. The detail view shows the list of <strong>Projects Included</strong>, the full <strong>Recipients</strong> list with names and emails, any <strong>Custom Message</strong> you added, and — for Skills-Based notifications — which skills were used to filter.',
      screenshot: null,
    },
    {
      heading: 'Sending a new notification',
      body: 'Click <strong>Send New Notification</strong>. Pick a <strong>Notification Type</strong>: <em>Upcoming Projects</em> emails every volunteer about projects needing help, while <em>Skills-Based</em> (coming soon) filters to volunteers whose skills match. The right-hand preview updates live to show exactly which projects and how many volunteers will be included.',
      screenshot: null,
    },
    {
      heading: 'Adding a custom message',
      body: 'The optional <strong>Custom Message</strong> text box is appended to the templated email. Use it for a personal note, a call to action, or details that aren\'t captured in the project list. The message is saved with the notification record for audit.',
      screenshot: null,
    },
    {
      heading: 'Confirming the send',
      body: 'Click <strong>Send Now</strong>. A confirmation dialog shows how many volunteers will be emailed about how many projects. Once confirmed, the notification is created with status <em>Draft</em>, picked up by the backend workflow, and moves to <em>Sent</em> (or <em>Failed</em>) when delivery completes.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'Notification Type', description: 'Upcoming Projects (default) or Skills-Based (coming soon). Determines how recipients are selected.' },
    { name: 'Custom Message', description: 'Free-text note appended to the email. Optional.' },
    { name: 'Skills Filter', description: 'JSON array of skills. Only populated for Skills-Based notifications — used to pick volunteers with matching Skill Areas.' },
    { name: 'Recipient Count', description: 'How many volunteers were emailed. Calculated and stored when the notification is created.' },
    { name: 'Status', description: 'Draft, Sending, Sent, or Failed. Driven by the backend email workflow.' },
    { name: 'Projects Included', description: 'JSON snapshot of the projects referenced in the email, so the record remains readable even if the projects change later.' },
  ],
  tips: [
    'There is no "draft for later" — sending is a one-way action. Review the preview carefully before confirming.',
    'Notifications are limited to the 100 most recent records on the history page for performance. Use the platform console if you need to go deeper.',
    'If a notification shows status <em>Failed</em>, expand it to see the recipient list and then contact a platform admin to investigate the workflow run.',
  ],
  comingSoon: false,
};
