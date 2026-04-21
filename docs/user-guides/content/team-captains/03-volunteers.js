module.exports = {
  slug: 'volunteers',
  title: 'Managing Volunteers',
  purpose:
    'The Volunteers tab lists everyone currently signed up for your project and lets you add more, capture day-of attendance, and reach the team by text or email. Records live in the <code>swat-project-volunteers</code> datastore.',
  howToGetThere: {
    text: 'Open a project, then click <strong>Volunteers</strong> in the sidebar.',
    screenshot: null,
  },
  steps: [
    {
      heading: 'Adding a volunteer',
      body: 'Type a first or last name into the typeahead — it searches the <code>volunteers</code> datastore and shows matches as you type. Select someone and the portal creates a <code>swat-project-volunteers</code> record with <em>Status: Active</em>. If the volunteer is already on the project, they won\'t show up in the picker.',
      screenshot: null,
    },
    {
      heading: 'Setting how many additional volunteers you need',
      body: 'The <strong>Additional Volunteers Needed</strong> field on the project tells other volunteers and SWAT Leadership how many more helpers you\'re recruiting. Adjust this as people sign up — when it hits zero, the project stops appearing on the Upcoming Projects list as a need.',
      screenshot: null,
    },
    {
      heading: 'Messaging the team',
      body: 'Use the phone and email icons at the top of the volunteer list to open a group SMS or email in your device\'s default app. The SMS link respects iOS/macOS conventions so it works correctly on every platform.',
      screenshot: null,
    },
    {
      heading: 'Marking attendance',
      body: 'On serve day, click the <strong>Present</strong> toggle next to each volunteer as they arrive. This flags the record so man-hour reporting reflects who actually showed up, not just who signed up.',
      screenshot: null,
    },
    {
      heading: 'Removing a volunteer',
      body: 'Click the trash icon to remove a volunteer — this soft-deletes the relationship by setting <strong>Status: Removed</strong> on the <code>swat-project-volunteers</code> record. The history stays so SWAT Leadership can see who was originally signed up.',
      screenshot: null,
    },
    {
      heading: 'Opening volunteer details',
      body: 'Click a volunteer\'s name to open the <strong>Volunteer Detail</strong> modal. You\'ll see their skills, tools, dietary restrictions, photo consent, and contact info — useful for planning lunch or knowing who can operate specific equipment.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'Status', description: '<em>Active</em> or <em>Removed</em>. Changing status to Removed is a soft-delete; the record stays for history.' },
    { name: 'Present', description: 'True/false — whether the volunteer showed up on serve day. Use this to keep man-hour counts honest.' },
    { name: 'Volunteer ID', description: 'Business identifier of the linked volunteer (preferred over the raw submission ID).' },
    { name: 'Dietary Restrictions', description: 'Shown on the detail modal so you can plan meals appropriately.' },
    { name: 'Photo Consent', description: 'Check before including the volunteer in any photos uploaded under <strong>Photos</strong>.' },
    { name: 'Additional Volunteers Needed', description: 'Lives on the <code>swat-projects</code> record but surfaced here — drives recruitment visibility.' },
  ],
  tips: [
    'Don\'t delete a <code>swat-project-volunteers</code> record outright — always use the trash icon in the UI so the status flips to <em>Removed</em> rather than the record being destroyed.',
    'The typeahead searches first and last name separately and merges results. If you can\'t find someone, they may not exist in the <code>volunteers</code> datastore yet — direct them to the public sign-up at <strong>/public/events</strong> or ask SWAT Leadership to create the record.',
    'Photo Consent is a <em>Yes/No</em>. Assume <em>No</em> until verified — when in doubt, ask before posting.',
  ],
  comingSoon: false,
};
