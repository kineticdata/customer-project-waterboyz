import t from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Editor } from '@toast-ui/react-editor';
import { updateSubmission } from '@kineticdata/react';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';

const NOTES_FIELD = 'Project Notes';

export const ProjectNotes = ({ project, reloadProject }) => {
  const editorRef = useRef(null);
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const submissionNotes = project?.values?.[NOTES_FIELD] || '';

  useEffect(() => {
    if (!project) return;
    if (dirty) return;

    setNotes(submissionNotes);
    editorRef.current?.getInstance().setMarkdown(submissionNotes || '');
  }, [project, submissionNotes, dirty]);

  const handleChange = useCallback(() => {
    const value = editorRef.current?.getInstance().getMarkdown() || '';
    setNotes(value);
    setDirty(value !== submissionNotes);
  }, [submissionNotes]);

  const handleSave = useCallback(async () => {
    if (!project?.id) return;
    setSaving(true);
    const result = await updateSubmission({
      id: project.id,
      values: { [NOTES_FIELD]: notes },
    });

    if (result?.error) {
      toastError({
        title: 'Unable to save project notes',
        description: result.error.message,
      });
    } else {
      toastSuccess({ title: 'Project notes saved' });
      setDirty(false);
      if (reloadProject) reloadProject();
    }
    setSaving(false);
  }, [project?.id, notes, reloadProject]);

  return (
    <div className="rounded-box">
      <div className="">
        <Editor
          ref={editorRef}
          height="auto"
          initialEditType="wysiwyg"
          initialValue={notes || ''}
          onChange={handleChange}
          hideModeSwitch={true}
        />
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          className="kbtn kbtn-primary"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>
    </div>
  );
};

ProjectNotes.propTypes = {
  project: t.object,
  reloadProject: t.func,
};
