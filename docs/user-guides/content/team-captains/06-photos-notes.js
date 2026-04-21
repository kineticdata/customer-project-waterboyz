module.exports = {
  slug: 'photos-notes',
  title: 'Photos & Notes',
  purpose:
    'Two separate tabs cover documentation. <strong>Photos</strong> uploads image attachments onto the project record. <strong>Notes</strong> captures prose and planning detail with full version history stored in the <code>project-notes</code> datastore.',
  howToGetThere: {
    text: 'Open a project, then click <strong>Photos</strong> or <strong>Notes</strong> in the sidebar.',
    screenshot: null,
  },
  steps: [
    {
      heading: 'Uploading photos',
      body: 'On the <strong>Photos</strong> tab, drag-and-drop image files or click <em>Upload</em> to pick from your device. Files are saved onto the <code>swat-projects</code> submission in the <strong>Project Photos</strong> field as multipart attachments.',
      screenshot: null,
    },
    {
      heading: 'Viewing and removing photos',
      body: 'Uploaded images render as a gallery grid. Click any image to open the full-size view in a new tab. Use the trash icon on a thumbnail to remove an attachment from the project record.',
      screenshot: null,
    },
    {
      heading: 'Writing a note',
      body: 'On the <strong>Notes</strong> tab, the editor at the top is a rich-text field (Toast UI Editor) that supports markdown. Type your note and click <em>Save</em> — each save creates a new <code>project-notes</code> submission tied to the project.',
      screenshot: null,
    },
    {
      heading: 'Reading the history',
      body: 'Below the editor is a chronological list of every version, newest first. Each entry shows the author, timestamp, and a <em>word-level diff</em> against the previous version — added words highlight green, removed words strike through in red. Expand any entry to see the full content.',
      screenshot: null,
    },
    {
      heading: 'Legacy notes',
      body: 'Older projects may have a single <strong>Project Notes</strong> field (legacy) instead of the version-controlled list. If you see a plain text area on load, any new saves will migrate to the new <code>project-notes</code> datastore going forward.',
      screenshot: null,
    },
  ],
  fields: [
    { name: 'Project Photos', description: 'Multipart attachment field on <code>swat-projects</code>. Accepts images; anything else works but won\'t render inline.' },
    { name: 'Content (project-notes)', description: 'Rich-text/markdown field on each note version. Rendered as-is in the history view.' },
    { name: 'Project ID (project-notes)', description: 'Links the note to its parent project. Don\'t edit directly.' },
    { name: 'Project Notes (legacy)', description: 'Deprecated single-field free-text on the project itself. Read-only for new writes.' },
  ],
  tips: [
    'Ask volunteers for <em>Photo Consent: Yes</em> before uploading any photos that include them (see the Volunteers tab detail modal).',
    'Notes are append-only — you can\'t edit a previous version. If you need to correct something, write a new note referencing the fix.',
    'The word-diff is useful for quick review, but it can look noisy on formatting changes. Expand to see the full content when in doubt.',
  ],
  comingSoon: false,
};
