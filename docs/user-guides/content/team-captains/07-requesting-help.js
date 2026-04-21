module.exports = {
  slug: 'requesting-help',
  title: 'Requesting Help & Event Association',
  purpose:
    'Two levers help you pull in more volunteers: setting the <strong>Additional Volunteers Needed</strong> count so your project surfaces on the public Upcoming Projects list, and linking an <strong>Associated Event</strong> so signups from a serve day can be routed to your project.',
  howToGetThere: {
    text: 'Both controls live on the <strong>Details</strong> tab of your project.',
    screenshot: null,
  },
  steps: [
    {
      heading: 'Broadcasting a need on Upcoming Projects',
      body: 'Set <strong>Additional Volunteers Needed</strong> on Details to a number greater than zero, and set status to <strong>Ready to Work</strong>. The project will then appear on the public <em>Upcoming Projects</em> listing (<code>/upcoming-projects</code>) with its skills/equipment needs, and any logged-in volunteer can request to join via the <code>request-to-join-swat-project</code> form.',
      screenshot: null,
    },
    {
      heading: 'Associating with a serve day event',
      body: 'On Details, pick an event in the <strong>Associated Event</strong> dropdown (only <em>Open</em> and <em>Planning</em> events appear). This sets the project\'s Scheduled Date from the event and lets SWAT Leadership route event signups into your project on the <em>Assign</em> page.',
      screenshot: null,
    },
    {
      heading: 'How assignments flow in',
      body: 'When SWAT Leadership assigns a signed-up volunteer to your project from the Event <strong>Assign</strong> page, a new <code>swat-project-volunteers</code> record is created automatically — the volunteer will appear on your Volunteers tab within moments.',
      screenshot: null,
    },
    {
      heading: 'Joining a project directly',
      body: 'If a volunteer in your network can\'t find your project on Upcoming Projects (maybe it\'s set to Planning), they can still join via a direct link you share: <code>/kapps/service-portal/forms/request-to-join-swat-project?Project%20ID=&lt;yourProjectID&gt;</code>. The request creates a task for Leadership (not you) so they can vet the match.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'Additional Volunteers Needed', description: 'Integer on <code>swat-projects</code>. When > 0 and status is <em>Ready to Work</em>, the project is listed publicly for recruitment.' },
    { name: 'Associated Event', description: 'Submission ID of a record in the <code>events</code> form. Filters to <em>Open</em> and <em>Planning</em> status in the dropdown.' },
    { name: 'Skills Needed / Equipment Needed', description: 'The two fields surfaced on Upcoming Projects listings — make these specific so the right volunteers self-select.' },
  ],
  tips: [
    'Lower Additional Volunteers Needed as people sign up — a project showing "need 10 more" when you have enough confuses recruitment.',
    'If the Associated Event dropdown is empty, the event may have been closed out. Ask SWAT Leadership to reopen it (or link a different event).',
    'Direct-link join requests still route through SWAT Leadership. You don\'t have to approve anyone yourself — Leadership fills that role.',
  ],
  comingSoon: false,
};
