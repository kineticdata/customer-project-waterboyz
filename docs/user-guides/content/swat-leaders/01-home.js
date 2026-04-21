module.exports = {
  slug: 'home',
  title: 'Home & Admin Navigation',
  purpose:
    'The SWAT Leadership home page is the daily starting point — it shows your open approvals, your own nominations, and quick links into every admin tool. The Admin landing page (reached through the menu) is the directory for everything else.',
  howToGetThere: {
    text: 'Click the Waterboyz logo or <strong>Home</strong> to return to the dashboard. Open the hamburger menu (top-right) and choose <strong>Admin</strong> to see every management tool in one place.',
    screenshot: null,
  },
  steps: [
    {
      heading: 'The hero banner',
      body: 'The top of the home page shows your display name with the <em>SWAT Leadership</em> eyebrow label, confirming you\'re logged in with leadership permissions. If the eyebrow is missing or says something else, your role may not be set up correctly.',
      screenshot: null,
    },
    {
      heading: 'My Nominations panel',
      body: 'The left column lists your three most recent nominations across both <code>swat-project-nomination</code> and <code>christmas-alive-family-nomination</code>. Click any row to open the nomination, or <strong>View all</strong> to go to the full Nominations page.',
      screenshot: null,
    },
    {
      heading: 'Nominate a Family section',
      body: 'Below your nominations is a card for each active program (SWAT Projects, Christmas Alive, and any others configured in the <code>programs</code> datastore). Click a card to start a new nomination on behalf of a family or partner.',
      screenshot: null,
    },
    {
      heading: 'My Tasks sidebar',
      body: 'The right column shows open <strong>Approval</strong> and <strong>Task</strong> submissions assigned to you or to a team you belong to (including the SWAT Leadership team). New <code>swat-project-approval</code> items land here for review.',
      screenshot: null,
    },
    {
      heading: 'The Admin menu',
      body: 'Open the hamburger menu → <strong>Admin</strong>. This page lists every leadership tool as a card: <strong>SWAT Reports</strong>, <strong>Volunteer Management</strong>, <strong>Volunteer Notifications</strong>, <strong>Captain Management</strong>, plus any admin forms (such as <strong>Events</strong>) configured for the kapp. Space Admins also see a <strong>Datastore</strong> card.',
      screenshot: null,
    },
  ],
  fields: [],
  tips: [
    'The hamburger menu is always visible in the top nav bar on both desktop and mobile — you never lose access to the admin pages.',
    'Mobile users also get a bottom nav bar for quick access to Home, My Volunteering, My Nominations, and Projects.',
    'The <strong>Admin</strong> card page is simpler than the menu because it also surfaces any dynamic admin forms (like <strong>Events</strong>) that aren\'t pinned in the navigation.',
  ],
  comingSoon: false,
};
