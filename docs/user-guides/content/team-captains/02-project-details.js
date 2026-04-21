module.exports = {
  slug: 'project-details',
  title: 'Project Details',
  purpose:
    'The Details tab is where you manage the core project record — status, scheduling, family information, skills and equipment needed, and the link to a serve day event. Changes here are saved directly to the <code>swat-projects</code> submission.',
  howToGetThere: {
    text: 'Open a project from your home page or Projects list, then click the <strong>Details</strong> section in the sidebar (or the dropdown on mobile).',
    screenshot: null,
  },
  steps: [
    {
      heading: 'Setting project status',
      body: 'Status drives visibility. A <em>Planning</em> project is hidden from volunteers — the yellow banner at the top of the project reminds you to switch to <strong>Ready to Work</strong> when you\'re ready to recruit. <em>Active</em> and <em>Ongoing</em> projects are no longer listed for new volunteers; <em>Completed</em> and <em>Canceled</em> are locked down.',
      screenshot: null,
    },
    {
      heading: 'Scheduling the work',
      body: 'Set the <strong>Scheduled Date</strong> (and optionally a <strong>Completion Date</strong> after the project wraps). If the project is tied to a serve day event, picking an <strong>Associated Event</strong> auto-fills the scheduled date from the event record.',
      screenshot: null,
    },
    {
      heading: 'Skills and equipment needed',
      body: 'Fill in <strong>Skills Needed</strong> and <strong>Equipment Needed</strong> as free-text. These appear on the public <em>Upcoming Projects</em> list so volunteers can self-select into projects that match what they can offer.',
      screenshot: null,
    },
    {
      heading: 'Family information',
      body: 'The <strong>Family Information</strong> panel pulls from the <code>families</code> datastore via an integration. You can\'t edit family details here — if something needs to change, flag SWAT Leadership. Check <strong>Family Communication Complete</strong> once you\'ve confirmed scope and timing with the family.',
      screenshot: null,
    },
    {
      heading: 'Captain and hours',
      body: 'SWAT Leadership can reassign the <strong>Project Captain</strong> from this page (the dropdown is read-only for captains who aren\'t leadership). <strong>Total Project Man Hours</strong> is auto-summed from Tasks; you can override it on the Details page if volunteers logged hours differently from the task plan.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'Project Status', description: '<em>Planning</em>, <em>Ready to Work</em>, <em>Active</em>, <em>Ongoing</em>, <em>Completed</em>, <em>Canceled</em>. Controls public visibility and the project banner.' },
    { name: 'Scheduled Date', description: 'When the work will happen. Auto-fills from Associated Event if selected.' },
    { name: 'Completion Date', description: 'When the project was finished. Leave empty until the project closes out.' },
    { name: 'Skills Needed', description: 'Free-text description of the skills you\'re recruiting for.' },
    { name: 'Equipment Needed', description: 'Free-text list of tools/materials volunteers should bring or have available.' },
    { name: 'Associated Event', description: 'Optional — links this project to a record in the <code>events</code> form so the project shows up for that serve day.' },
    { name: 'Family Type', description: '<em>Foster Family</em>, <em>Special Needs Family</em>, <em>Single Parent Family</em>, <em>Senior Citizen</em>, <em>Other</em>. Multi-select. Used for reporting.' },
    { name: 'Family Communication Complete', description: 'Checkbox — confirms you\'ve reached the family and scope is agreed.' },
  ],
  tips: [
    'The status banner at the top of every project page links straight back to the Details tab so you can fix the root cause without hunting.',
    'If the Associated Event dropdown looks empty, confirm the event is in <em>Open</em> or <em>Planning</em> status — closed events are filtered out.',
    'Only SWAT Leadership can change the Project Captain. Don\'t try to reassign a project to yourself from the volunteer side — ask Leadership.',
  ],
  comingSoon: false,
};
