module.exports = {
  slug: 'events',
  title: 'Events & Serve Days',
  purpose:
    'Events (also called serve days) are how Waterboyz gathers volunteers for a coordinated push on several projects at once. SWAT Leadership creates the event record, opens public sign-ups, and then assigns signed-up volunteers to specific projects on assignment day.',
  howToGetThere: {
    text: 'From the hamburger menu choose <strong>Events</strong> to see the volunteer-facing event list. Click <strong>Manage Events</strong> (visible only to Leadership) to jump to the admin form at <strong>/admin/events</strong> where you create and edit event records.',
    screenshot: null,
  },
  steps: [
    {
      heading: 'Creating an event',
      body: 'From <strong>/admin/events</strong>, click <strong>New</strong> to add a record to the <code>events</code> admin form. Required fields are <strong>Event Name</strong>, <strong>Event Date</strong>, and <strong>Event Status</strong> (start with <em>Planning</em>). Add an <strong>Event Description</strong> and a <strong>Sign-up Deadline</strong> so volunteers know how long they have to register.',
      screenshot: null,
    },
    {
      heading: 'Wiring the sign-up form',
      body: 'Every event uses a dedicated <strong>Event Sign Up</strong> form. Set the <strong>Sign Up Form Slug</strong> field to either the default <code>serve-day-sign-up</code> form or a cloned copy of <code>event-signup-template</code> customized for this event. The public sign-up page is <code>/public/events/&lt;formSlug&gt;</code> — anyone can sign up without an account.',
      screenshot: null,
    },
    {
      heading: 'Opening and closing the event',
      body: 'Flip <strong>Event Status</strong> to <em>Open</em> when you want the event to appear on the public events list and accept signups. Change it to <em>Closed</em> after the sign-up deadline, and to <em>Completed</em> once the serve day is over. <em>Closed</em> and <em>Completed</em> events stop taking new signups.',
      screenshot: null,
    },
    {
      heading: 'Associating projects with the event',
      body: 'Open each <code>swat-projects</code> record that will run during the event and set its <strong>Associated Event</strong> to this event. Selecting the event also auto-populates the project\'s Scheduled Date from the event\'s date. Only associated projects appear on the assignment page.',
      screenshot: null,
    },
    {
      heading: 'Assigning volunteers',
      body: 'On assignment day open <strong>Events</strong> and click <strong>Assign</strong> next to the event (or go to <code>/events/:eventId/assign</code>). The assignment page shows signed-up volunteers on the left, grouped by affiliated organization, and every associated project on the right. Drag a volunteer onto a project to stage an assignment; click <strong>Save</strong> in the bottom bar when you\'re ready.',
      screenshot: null,
    },
    {
      heading: 'Filtering on the assign page',
      body: 'Use the filter bar to search by name, pick a specific affiliated organization, or filter by skill. Volunteers without a Volunteer ID are displayed with an <strong>Unregistered</strong> badge — they signed up anonymously and haven\'t created a volunteer profile yet. You can still assign them, but encourage them to complete their profile.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'Event Name', description: 'Shown on the public events list and assignment page.' },
    { name: 'Event Date', description: 'The day of the serve event. Auto-fills the Scheduled Date on any project you associate.' },
    { name: 'Event Status', description: 'Planning, Open, Closed, or Completed. Only Open events accept new signups.' },
    { name: 'Sign-up Deadline', description: 'Cutoff date displayed to volunteers. Flip the status to Closed at or after this date.' },
    { name: 'Sign Up Form Slug', description: 'Slug of the Event Sign Up form to use. Defaults to <code>serve-day-sign-up</code> when blank.' },
    { name: 'Event Description', description: 'Short description shown on the public events list and in the sign-up confirmation.' },
  ],
  tips: [
    'Signup records live in their own <em>Event Sign Up</em> form, not under the event. Search kapp-wide by <code>type = "Event Sign Up"</code> and <code>values[Event ID]</code> to find them.',
    'An unassigned signup with no Volunteer ID is a public sign-up — once that person creates an account and volunteer profile, the two records get linked automatically.',
    'Cloning the <code>event-signup-template</code> form lets you ask event-specific questions (e.g. dietary preference, T-shirt size) without touching the default sign-up form.',
  ],
  comingSoon: false,
};
