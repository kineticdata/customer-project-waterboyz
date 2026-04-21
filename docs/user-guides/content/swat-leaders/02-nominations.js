module.exports = {
  slug: 'nominations',
  title: 'Nominations & Approvals',
  purpose:
    'Every SWAT project starts life as a nomination submitted through a service request form. SWAT Leadership reviews each nomination, confirms the family details, sets an approved budget, and either approves or denies the work.',
  howToGetThere: {
    text: 'Open a nomination from your <strong>My Tasks</strong> sidebar, from <strong>My Nominations</strong>, or by going directly to <strong>/actions</strong> to see every approval task assigned to you or the Leadership team.',
    screenshot: null,
  },
  steps: [
    {
      heading: 'How nominations arrive',
      body: 'Churches, community partners, and individuals submit the public <code>swat-project-nomination</code> form (or the seasonal <code>christmas-alive-family-nomination</code>). Each submission creates a Nominations-type record that enters the approval queue automatically.',
      screenshot: null,
    },
    {
      heading: 'Opening an approval task',
      body: 'In the <strong>My Tasks</strong> list on the home page — or at <strong>/actions</strong> — click the <code>swat-project-approval</code> item. The form opens with the original nomination details on top and a Leadership review section below.',
      screenshot: null,
    },
    {
      heading: 'Reviewing the family details',
      body: 'Confirm the family name, address, county, family type, and the scope of work described by the nominator. Reach out to the nominator directly if anything is missing or unclear before making a decision.',
      screenshot: null,
    },
    {
      heading: 'Setting the budget and captain',
      body: 'Enter an <strong>Approved Budget</strong> and pick an <strong>Initial Project Captain</strong> from the dropdown (sourced from the <em>SWAT Project Captains</em> team). Approving the request creates a record in the <code>swat-projects</code> datastore and notifies the captain.',
      screenshot: null,
    },
    {
      heading: 'Tracking your own nominations',
      body: 'If you submitted a nomination yourself, it appears in <strong>My Nominations</strong> on the home page. Click through to see its current approval state — <em>Draft</em>, <em>Submitted</em>, <em>Approved</em>, or <em>Denied</em>.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'Approved Budget', description: 'Dollar amount authorized for the project. Used later for expense tracking and reimbursements.' },
    { name: 'Initial Project Captain', description: 'The captain who will receive the project and begin coordinating volunteers. Can be changed later from Project Details.' },
    { name: 'Family Type', description: 'One or more of Foster Family, Special Needs Family, Single Parent Family, Senior Citizen, or Other. Drives SWAT Reports breakdowns.' },
    { name: 'County', description: 'The county where the work will happen. Used in reporting and for matching volunteers by Preferred Service Area.' },
  ],
  tips: [
    'Leadership approvals are routed to the whole team — if someone else picks one up first, you\'ll see it drop off your task list. Communicate so the same nomination isn\'t reviewed twice.',
    'Even if you deny a nomination, the record stays in the system so you can explain the decision later or refer the family to another program.',
  ],
  comingSoon: false,
};
