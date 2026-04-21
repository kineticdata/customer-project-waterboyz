module.exports = {
  slug: 'captain-management',
  title: 'Captain Management',
  purpose:
    'Manage who sits on the <strong>SWAT Project Captains</strong> team. Captains are the users who can own projects, run volunteer assignments, submit expenses, and see the Captain home page. Adding or removing someone here takes effect immediately.',
  howToGetThere: {
    text: 'Open the hamburger menu → <strong>Admin</strong> → <strong>Captain Management</strong> (or go directly to <strong>/admin/captain-management</strong>).',
    screenshot: null,
  },
  steps: [
    {
      heading: 'Reviewing current captains',
      body: 'The page loads a table (or card list on mobile) of every current captain with their display name, email, and username. These are the active members of the <em>SWAT Project Captains</em> team.',
      screenshot: null,
    },
    {
      heading: 'Adding a captain',
      body: 'Click <strong>Add Captain</strong> to open the user search modal. Type any part of a name, email, or username — the list filters in real time. Click a user to add them immediately; the modal closes and the new captain appears in the main list.',
      screenshot: null,
    },
    {
      heading: 'Removing a captain',
      body: 'Click the red trash icon next to any captain. A confirmation dialog asks you to confirm. Removing a captain deletes their membership in the <em>SWAT Project Captains</em> team but does not delete their user account or their past work.',
      screenshot: null,
    },
    {
      heading: 'New users',
      body: 'If a new captain doesn\'t yet have an account, they need to register first — either through the public <code>account-registration</code> form or by a Space Admin creating their user. Once they exist, they\'ll show up in the Add Captain search.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'Name', description: 'The captain\'s display name from their user profile.' },
    { name: 'Email', description: 'Primary email on the user account. Used for notifications and password resets.' },
    { name: 'Username', description: 'Kinetic Platform username — shown for reference when identifying duplicate or similar users.' },
  ],
  tips: [
    'Adding someone to the Captains team gives them access to project management features right away; they may need to refresh their browser for the nav to update.',
    'Past projects that were captained by a removed user keep their assignment. Update the <strong>Project Captain</strong> field on each active project if you need another captain to take over.',
    'This page manages the Captains team only. SWAT Leadership membership is managed through the platform console — ask a Space Admin if you need to add or remove a leader.',
  ],
  comingSoon: false,
};
