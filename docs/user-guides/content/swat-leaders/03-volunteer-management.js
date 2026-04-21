module.exports = {
  slug: 'volunteer-management',
  title: 'Volunteer Management',
  purpose:
    'The Volunteer Management admin page is a spreadsheet-style view of every record in the <code>volunteers</code> datastore. Use it to search, filter, edit, and connect volunteers to projects and events.',
  howToGetThere: {
    text: 'Open the hamburger menu → <strong>Admin</strong> → <strong>Volunteer Management</strong> (or go directly to <strong>/admin/volunteer-management</strong>).',
    screenshot: null,
  },
  steps: [
    {
      heading: 'Searching and filtering',
      body: 'The global search box at the top matches across first name, last name, email, phone, skills, tools, languages, organization, and location. For narrower filters, open the <strong>Filters</strong> toggle and use the inline filter row at the top of each column — text columns take a search term, array/enum columns (Skills, Tools, Languages, Service Area, Org, City, State, Availability) get a multi-select dropdown.',
      screenshot: null,
    },
    {
      heading: 'Choosing which columns to show',
      body: 'Click the <strong>Columns</strong> button to toggle columns on and off. Address, Zip, Other Skills, Bio, Availability, Other Availability, Dietary Restrictions, Photo Consent, and Username are hidden by default; turn them on when you need them. The table scrolls horizontally when many columns are visible.',
      screenshot: null,
    },
    {
      heading: 'Opening a volunteer',
      body: 'Click any row (or any card on mobile) to open the <strong>volunteer detail drawer</strong> on the right. The drawer has three tabs: <strong>Profile</strong> (read-only overview grouped into Location & Languages, Skills & Tools, Availability, Preferences, and Bio), <strong>Events</strong>, and <strong>Projects</strong>.',
      screenshot: null,
    },
    {
      heading: 'Assigning to projects or events',
      body: 'On the <strong>Projects</strong> tab, use the <em>Assign to Project</em> picker to add the volunteer to an active project — this creates a record in <code>swat-project-volunteers</code>. On the <strong>Events</strong> tab, use <em>Sign Up for Event</em> to enroll them in any Open or Planning event. Remove assignments or cancel signups with the trash icon; the original record stays in place as history.',
      screenshot: null,
    },
    {
      heading: 'Editing or adding a volunteer',
      body: 'Click the pencil icon in the drawer header to open the full <code>volunteers</code> form — including the CategoryPicker widgets for Skill Areas and Tools — and edit any field. From the page toolbar, the <strong>Add Volunteer</strong> button launches the same form in create mode so you can register a volunteer from an email or phone call.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'First Name / Last Name', description: 'Primary identity. Shown in every view and used for name search.' },
    { name: 'Email Address / Phone Number', description: 'Contact fields. Email is clickable (opens a mailto link); phone is formatted for display.' },
    { name: 'Affiliated Organization', description: 'The church, employer, or community org the volunteer serves with. Sourced from the <code>affiliates</code> datastore.' },
    { name: 'Skill Areas', description: 'Multi-select categorized skills from the <code>skills</code> datastore. Drives Skills filter and notification targeting.' },
    { name: 'Tools', description: 'Multi-select categorized tools from the <code>tools</code> datastore. Useful when staffing projects that need specific equipment.' },
    { name: 'Languages You Know', description: 'Languages the volunteer can communicate in. Important when matching to families with limited English.' },
    { name: 'Preferred Service Area', description: 'Counties the volunteer is willing to travel to. Filters projects and notifications geographically.' },
    { name: 'How often can you volunteer', description: 'Availability cadence (weekly, monthly, occasional, etc.).' },
    { name: 'Photo Consent', description: 'Yes or No — indicates whether the volunteer consents to being photographed at serve days.' },
    { name: 'Projects / Events counts', description: 'Live counts of linked records from <code>swat-project-volunteers</code> and the Event Sign Up submissions.' },
  ],
  tips: [
    'Removing a project assignment is a soft delete — the <code>swat-project-volunteers</code> record\'s Status is set to <em>Removed</em>, so you can see the history and re-activate it later.',
    'On mobile the table collapses to a card list. Tap a card to open the same detail drawer used on desktop.',
    'The Add Volunteer form is the same Kinetic form volunteers fill out themselves, so all required fields and validation still apply.',
  ],
  comingSoon: false,
};
