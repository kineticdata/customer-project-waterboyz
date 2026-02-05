import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor } from '@toast-ui/react-editor';
import { fetchSubmission, updateSubmission } from '@kineticdata/react';
import { useData } from '../../helpers/hooks/useData.js';
import { PageHeading } from '../../components/PageHeading.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { Error } from '../../components/states/Error.jsx';
import { toastError, toastSuccess } from '../../helpers/toasts.js';

const NOTES_FIELD = 'Project Notes';

export const ProjectCaptain = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);

  const params = useMemo(() => ({ id: submissionId }), [submissionId]);
  const {
    initialized,
    loading,
    response,
    actions: { reloadData },
  } = useData(fetchSubmission, params);

  const { error, submission } = response || {};
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const submissionNotes = submission?.values?.[NOTES_FIELD] || '';

  useEffect(() => {
    if (!submission) return;
    if (dirty) return;

    setNotes(submissionNotes);
    editorRef.current?.getInstance().setMarkdown(submissionNotes || '');
  }, [submission, submissionNotes, dirty]);

  const handleChange = useCallback(() => {
    const value = editorRef.current?.getInstance().getMarkdown() || '';
    setNotes(value);
    setDirty(value !== submissionNotes);
  }, [submissionNotes]);

  const handleSave = useCallback(async () => {
    if (!submissionId) return;
    setSaving(true);
    const result = await updateSubmission({
      id: submissionId,
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
      reloadData();
    }
    setSaving(false);
  }, [submissionId, notes, reloadData]);

  return (
    <div className="gutter">
      <div className="max-w-screen-lg pt-1 pb-10">
        <PageHeading
          title={`Team Captain Notes${submission?.label ? `: ${submission.label}` : ''}`}
          backTo={`/projects/${submissionId}`}
        />

        {!initialized || (loading && !submission) ? (
          <Loading />
        ) : error ? (
          <Error error={error} />
        ) : (
          <div className="flex-c-st gap-6">
            <div className="text-base-content/70">
              Add or update notes for the project. These notes are visible to
              project coordinators and stored in the "Project Notes" field.
            </div>

            <div className="w-full rounded-box border bg-base-100 p-2">
              <Editor
                ref={editorRef}
                height="auto"
                initialEditType="wysiwyg"
                initialValue={notes || ''}
                onChange={handleChange}
                hideModeSwitch={true}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                className="kbtn kbtn-primary kbtn-lg"
                onClick={handleSave}
                disabled={!dirty || saving}
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
              <button
                type="button"
                className="kbtn kbtn-ghost kbtn-lg"
                onClick={() => navigate(-1)}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
