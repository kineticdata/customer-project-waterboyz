module.exports = {
  slug: 'reports',
  title: 'SWAT Reports',
  purpose:
    'The SWAT Reports page is a live dashboard over every record in <code>swat-projects</code>. Use it to answer grant-writing questions, track man hours, and make quick data corrections without opening each project.',
  howToGetThere: {
    text: 'Open the hamburger menu → <strong>Admin</strong> → <strong>SWAT Reports</strong> (or go directly to <strong>/admin/reports</strong>).',
    screenshot: null,
  },
  steps: [
    {
      heading: 'Summary cards',
      body: 'Four cards at the top show <strong>Total Projects</strong>, <strong>Total Man Hours</strong>, <strong>Completed</strong>, and <strong>Counties Served</strong>. The numbers update as you apply filters, so you can see stats for a single county or time window.',
      screenshot: null,
    },
    {
      heading: 'Breakdown charts',
      body: 'Three horizontal bar charts split the current project set by <strong>County</strong>, <strong>Family Type</strong>, and <strong>Status</strong>. Counts and percentages update live with your filters.',
      screenshot: null,
    },
    {
      heading: 'Filtering projects',
      body: 'The <strong>Filter Projects</strong> panel has six controls: <strong>Search</strong> (name, county, captain), <strong>County</strong>, <strong>Family Type</strong>, <strong>Status</strong>, <strong>Completed / Scheduled After</strong>, and <strong>Completed / Scheduled Before</strong>. Click <em>Clear all</em> to reset. Date filters use whichever of <code>Completion Date</code> or <code>Scheduled Date</code> is populated.',
      screenshot: null,
    },
    {
      heading: 'Inline editing',
      body: 'Click any <strong>Status</strong>, <strong>Hours</strong>, or <strong>Family Type</strong> cell to edit it directly in the table. Status is a dropdown (Planning, Ready to Work, Active, Ongoing, Completed, Canceled), Hours is a number input, and Family Type is a multi-select checkbox list. Changes save immediately with an optimistic UI update.',
      screenshot: null,
    },
    {
      heading: 'Opening a project',
      body: 'Click the project name to open the full project detail page. The back button returns you to <strong>SWAT Reports</strong> with your filters intact, so you don\'t lose your place.',
      screenshot: null,
    },
    {
      heading: 'Printing or exporting',
      body: 'Use <strong>Ctrl+P</strong> (or Cmd+P) to generate a clean printable copy of the filtered dashboard — useful for grant applications and quarterly board reports.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'Project Status', description: 'Planning, Ready to Work, Active, Ongoing, Completed, or Canceled. Drives the Status breakdown and the completed-count card.' },
    { name: 'Total Project Man Hours', description: 'Total volunteer hours logged on the project. Sums into the Man Hours card and is editable inline.' },
    { name: 'Family Type', description: 'Stored as a JSON array on each project. One or more of Foster Family, Special Needs Family, Single Parent Family, Senior Citizen, Other.' },
    { name: 'County', description: 'County where the project is located. Drives the County breakdown and County filter.' },
    { name: 'Scheduled Date / Completion Date', description: 'Date filters use whichever of these two fields is populated, preferring Completion Date for finished projects.' },
  ],
  tips: [
    'Inline edits only apply to the fields exposed on this page — for anything else open the project and edit it there.',
    'Reports fetches up to 1,000 projects in a single call, so it stays fast. If you ever hit that cap, tighten the date range before filtering further.',
    'Printing respects your current filters — set up the view you want, then print.',
  ],
  comingSoon: false,
};
