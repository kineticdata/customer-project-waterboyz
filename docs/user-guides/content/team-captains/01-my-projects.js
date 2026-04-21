module.exports = {
  slug: 'my-projects',
  title: 'Home & My Projects',
  purpose:
    'Your home page is the fastest way to find projects and tasks that need your attention. It pulls from the <code>swat-projects</code> datastore, your nominations, and the Task API.',
  howToGetThere: {
    text: 'Navigate to the portal root (<strong>/</strong>) after signing in, or click the Waterboyz logo in the top nav.',
    screenshot: null,
  },
  steps: [
    {
      heading: 'Home hero and greeting',
      body: 'The top banner greets you by name with the <em>Project Captain</em> eyebrow. The home layout has two columns on desktop: <strong>My Projects</strong> and <strong>My Nominations</strong> on the left, <strong>My Tasks</strong> on the right.',
      screenshot: null,
    },
    {
      heading: 'My Projects list',
      body: 'Shows up to five of your most recent active projects (status <em>Draft</em> or <em>Submitted</em> in core state), each with a status badge, project name, and city/state. Click a row to open the project, or click <em>View all</em> to land on the full <strong>/project-captains</strong> list with filters.',
      screenshot: null,
    },
    {
      heading: 'My Tasks sidebar',
      body: 'Lists your open approval/fulfillment tasks from the Task API. By default this is filtered to <em>my tasks</em> and <em>open only</em> — click <em>View all</em> to go to <strong>/actions</strong> where you can toggle between tasks assigned to you individually and tasks assigned to any of your teams.',
      screenshot: null,
    },
    {
      heading: 'Nominate a Family',
      body: 'Below My Nominations is a shortcut to submit a new <code>swat-project-nomination</code> or <code>christmas-alive-family-nomination</code>. Every Team Captain can nominate families — nominations go to SWAT Leadership for approval.',
      screenshot: null,
    },
    {
      heading: 'Projects listing page',
      body: 'The full <strong>Projects</strong> page at <code>/project-captains</code> shows every project assigned to you with filter controls for status, county, and search. Each row links to the project\'s <strong>Instructions</strong> tab.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'Project Captain', description: 'The username of the captain on a <code>swat-projects</code> record. The home page filters on this field matching your username.' },
    { name: 'Project Status', description: 'Workflow state — <em>Planning</em>, <em>Ready to Work</em>, <em>Active</em>, <em>Ongoing</em>, <em>Completed</em>, <em>Canceled</em>. Drives the status badge and banner on every project view.' },
  ],
  tips: [
    'The task count on the sidebar updates when you mark tasks complete, but you may need to refresh if you completed something in another tab.',
    'If you expected a project to appear and it doesn\'t, confirm the Project Captain field matches your exact username — SWAT Leadership assigns this on approval.',
  ],
  comingSoon: false,
};
