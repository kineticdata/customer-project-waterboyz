module.exports = {
  slug: 'quick-start',
  title: 'Quick Start',
  purpose:
    'SWAT Leadership oversees the entire Waterboyz project lifecycle — reviewing new nominations, approving budgets, assigning Project Captains, coordinating volunteers, and reporting results back to the community. This guide walks through the admin pages you\'ll use most.',
  howToGetThere: {
    text: 'Sign in at <strong>waterboyz.kinops.io</strong>. If your account is on the <strong>SWAT Leadership</strong> team, the hamburger menu will expose an <strong>Admin</strong> section with every management page listed below.',
    screenshot: null,
  },
  steps: [
    {
      heading: 'First: check your home page',
      body: 'When you log in, your home page shows <strong>My Nominations</strong>, the <strong>Nominate a Family</strong> programs, and a <strong>My Tasks</strong> sidebar with approvals assigned to you or the Leadership team. Clear any pending approvals here before moving on.',
      screenshot: null,
    },
    {
      heading: 'Second: review new nominations',
      body: 'Open the <strong>My Tasks</strong> sidebar or the <strong>Actions</strong> page to find <code>swat-project-approval</code> tasks. Review each nomination, set an approved budget, and assign an initial Project Captain so the project can move into the <code>swat-projects</code> datastore.',
      screenshot: null,
    },
    {
      heading: 'Third: manage volunteers and events',
      body: 'Use <strong>Admin → Volunteer Management</strong> to search the volunteer directory, and <strong>Events</strong> to create serve days and assign signed-up volunteers to projects. Both pages are where day-to-day coordination happens.',
      screenshot: null,
    },
    {
      heading: 'Fourth: report out',
      body: 'Open <strong>Admin → SWAT Reports</strong> for live totals (projects, man hours, counties served) with filters for grant applications. Use Ctrl+P to export a clean printable summary.',
      screenshot: null,
    },
  ],
  fields: [],
  tips: [
    'Leadership tasks go to the entire Leadership team by default — coordinate with the rest of the team so the same approval isn\'t worked twice.',
    'Most admin pages have a <strong>Refresh</strong> button in the toolbar. If you just changed something in another tab, click it instead of reloading the whole page.',
    'If a page looks empty or you see a "Not authorized" redirect, double-check that your account still has the <strong>SWAT Leadership</strong> team membership.',
  ],
  comingSoon: false,
};
