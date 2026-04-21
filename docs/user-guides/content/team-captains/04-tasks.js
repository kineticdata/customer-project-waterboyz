module.exports = {
  slug: 'tasks',
  title: 'Tasks',
  purpose:
    'The Tasks tab is a simple checklist attached to your project — a way to plan the work, estimate man hours, and track what\'s done. Tasks are stored as JSON on the project submission (<code>Tasks JSON</code> field), so there\'s no separate form to learn.',
  howToGetThere: {
    text: 'Open a project, then click <strong>Tasks</strong> in the sidebar.',
    screenshot: null,
  },
  steps: [
    {
      heading: 'Adding a task',
      body: 'Type a task description into the <em>Add a task…</em> input and press Enter (or click Add). New tasks appear at the bottom of the checklist with <em>Done: unchecked</em> and no hours estimate.',
      screenshot: null,
    },
    {
      heading: 'Estimating man hours',
      body: 'Enter a number in the <strong>hours</strong> field next to each task. The total at the bottom sums every task\'s estimate and is stored as <strong>Project Tasks Man Hours Total</strong> when you save — it feeds into the SWAT Reports dashboard.',
      screenshot: null,
    },
    {
      heading: 'Checking tasks off',
      body: 'Click the checkbox next to a task to toggle <em>done</em>. Done tasks stay in the list (don\'t disappear) so you can see progress at a glance. Unchecking and re-checking is fine — the order is preserved.',
      screenshot: null,
    },
    {
      heading: 'Removing a task',
      body: 'Click the trash icon to remove a task from the list. Unlike volunteers, tasks are not soft-deleted — once removed, they\'re gone. You\'ll see a save prompt before the change commits.',
      screenshot: null,
    },
    {
      heading: 'Saving changes',
      body: 'Any edits (add, remove, toggle, hours) are queued until you click <strong>Save</strong>. The button only activates when there are unsaved changes. A toast confirms the save and refreshes the project.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'text', description: 'Description of the task. Free-text, no length limit.' },
    { name: 'done', description: 'Checkbox — true if the task is complete.' },
    { name: 'estimatedHours', description: 'Number of man hours this task is expected to take. Blank or non-numeric values count as zero.' },
    { name: 'Project Tasks Man Hours Total', description: 'Field on the <code>swat-projects</code> record — auto-summed from task estimates on save.' },
  ],
  tips: [
    'Hours are for <em>estimation and reporting</em>, not time tracking. SWAT Leadership uses the sum to track impact across the organization.',
    'If you leave the page with unsaved changes, your work isn\'t lost on the current tab but won\'t persist across reloads. Hit <strong>Save</strong> before switching projects.',
    'There\'s no built-in per-volunteer assignment today — use task text like "(Joe & Sarah) Install shelves" if you need to note who\'s doing what.',
  ],
  comingSoon: false,
};
