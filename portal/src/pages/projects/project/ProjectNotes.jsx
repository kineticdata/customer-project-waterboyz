import t from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  createSubmission,
  defineKqlQuery,
  searchSubmissions,
} from '@kineticdata/react';
import { Editor } from '@toast-ui/react-editor';
import { diffWords } from 'diff';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { useData } from '../../../helpers/hooks/useData.js';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';
import { Icon } from '../../../atoms/Icon.jsx';

const NOTES_FORM = 'project-notes';
const FIELD_PROJECT_ID = 'Project ID';
const FIELD_CONTENT = 'Content';
const LEGACY_NOTES_FIELD = 'Project Notes';

const notesQuery = defineKqlQuery()
  .equals(`values[${FIELD_PROJECT_ID}]`, 'projectId')
  .end();

const fetchNotes = ({ kappSlug, projectId }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: NOTES_FORM,
    search: {
      q: notesQuery({ projectId }),
      include: ['details', 'values'],
      limit: 50,
      orderBy: 'createdAt',
      direction: 'DESC',
    },
  });

// ---------------------------------------------------------------------------
// Diff display component
// ---------------------------------------------------------------------------
const DiffView = ({ oldText, newText }) => {
  const changes = useMemo(
    () => diffWords(oldText || '', newText || ''),
    [oldText, newText],
  );

  return (
    <pre className="text-sm whitespace-pre-wrap font-mono p-3 kbg-base-200/50 rounded-lg overflow-x-auto">
      {changes.map((part, i) => (
        <span
          key={i}
          className={clsx(
            part.added && 'bg-success/20',
            part.removed && 'bg-error/20 line-through',
          )}
        >
          {part.value}
        </span>
      ))}
    </pre>
  );
};

DiffView.propTypes = {
  oldText: t.string,
  newText: t.string,
};

// ---------------------------------------------------------------------------
// Single history entry
// ---------------------------------------------------------------------------
const HistoryEntry = ({ version, previousContent, isFirst }) => {
  const [expanded, setExpanded] = useState(false);
  const content = version?.values?.[FIELD_CONTENT] || '';
  const createdAt = version?.createdAt;
  const createdBy = version?.createdBy;

  const timeAgo = useMemo(() => {
    if (!createdAt) return '';
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
    } catch {
      return createdAt;
    }
  }, [createdAt]);

  return (
    <div className="border-l-2 border-base-300 pl-4 py-2">
      <div className="flex-sc gap-2">
        <button
          type="button"
          className="flex-sc gap-2 text-sm font-medium hover:text-primary transition-colors"
          onClick={() => setExpanded(prev => !prev)}
        >
          <Icon
            name={expanded ? 'chevron-down' : 'chevron-right'}
            size={14}
          />
          <span className="font-semibold">{createdBy || 'Unknown'}</span>
        </button>
        <span className="text-xs text-base-content/50">{timeAgo}</span>
        {isFirst && (
          <span className="text-xs kbadge kbadge-sm kbadge-primary">
            Current
          </span>
        )}
      </div>
      {expanded && (
        <div className="mt-2">
          <DiffView oldText={previousContent} newText={content} />
        </div>
      )}
    </div>
  );
};

HistoryEntry.propTypes = {
  version: t.object.isRequired,
  previousContent: t.string,
  isFirst: t.bool,
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const ProjectNotes = ({ project }) => {
  const { kappSlug } = useSelector(state => state.app);
  const editorRef = useRef(null);
  const baselineRef = useRef('');
  const [currentContent, setCurrentContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const projectId = project?.id;
  const legacyNotes = project?.values?.[LEGACY_NOTES_FIELD] || '';

  // Fetch all note versions for this project
  const params = useMemo(
    () => (projectId ? { kappSlug, projectId } : null),
    [kappSlug, projectId],
  );
  const {
    initialized,
    loading,
    response,
    actions: { reloadData },
  } = useData(fetchNotes, params);

  const versions = useMemo(
    () => response?.submissions || [],
    [response],
  );

  const latestContent = versions[0]?.values?.[FIELD_CONTENT] || '';
  const lastEditedBy = versions[0]?.createdBy;
  const lastEditedAt = versions[0]?.createdAt;

  // Format the "last edited" timestamp
  const lastEditedLabel = useMemo(() => {
    if (!lastEditedAt) return null;
    try {
      return formatDistanceToNow(new Date(lastEditedAt), { addSuffix: true });
    } catch {
      return lastEditedAt;
    }
  }, [lastEditedAt]);

  // Load latest version into editor when versions change (and user hasn't made edits)
  useEffect(() => {
    if (!initialized || loading) return;
    if (dirty) return;

    const content = latestContent;
    baselineRef.current = content;
    setCurrentContent(content);
    editorRef.current?.getInstance().setMarkdown(content || '');
  }, [initialized, loading, latestContent, dirty]);

  // Migrate from legacy field if no versions exist
  useEffect(() => {
    if (!initialized || loading || migrating) return;
    if (versions.length > 0) return;
    if (!legacyNotes.trim()) return;

    const migrate = async () => {
      setMigrating(true);
      const result = await createSubmission({
        kappSlug,
        formSlug: NOTES_FORM,
        values: {
          [FIELD_PROJECT_ID]: projectId,
          [FIELD_CONTENT]: legacyNotes,
        },
      });
      if (result?.error) {
        toastError({
          title: 'Unable to migrate existing notes',
          description: result.error.message,
        });
      } else {
        reloadData();
      }
      setMigrating(false);
    };
    migrate();
  }, [initialized, loading, migrating, versions.length, legacyNotes, kappSlug, projectId, reloadData]);

  // Track editor changes
  const handleChange = useCallback(() => {
    const value = editorRef.current?.getInstance().getMarkdown() || '';
    setCurrentContent(value);
    setDirty(value !== baselineRef.current);
  }, []);

  // Save: create a new version (never update)
  const handleSave = useCallback(async () => {
    if (!projectId) return;
    setSaving(true);

    // Stale check: re-fetch the latest version
    const freshResult = await searchSubmissions({
      kapp: kappSlug,
      form: NOTES_FORM,
      search: {
        q: notesQuery({ projectId }),
        include: ['details', 'values'],
        limit: 1,
        orderBy: 'createdAt',
        direction: 'DESC',
      },
    });
    const freshLatest =
      freshResult?.submissions?.[0]?.values?.[FIELD_CONTENT] || '';

    if (freshLatest !== baselineRef.current) {
      toastError({
        title: 'Notes have been updated',
        description:
          'Someone else saved notes since you started editing. The editor has been refreshed.',
      });
      reloadData();
      setDirty(false);
      setSaving(false);
      return;
    }

    const result = await createSubmission({
      kappSlug,
      formSlug: NOTES_FORM,
      values: {
        [FIELD_PROJECT_ID]: projectId,
        [FIELD_CONTENT]: currentContent,
      },
    });

    if (result?.error) {
      toastError({
        title: 'Unable to save notes',
        description: result.error.message,
      });
    } else {
      toastSuccess({ title: 'Notes saved' });
      baselineRef.current = currentContent;
      setDirty(false);
      reloadData();
    }
    setSaving(false);
  }, [projectId, kappSlug, currentContent, reloadData]);

  if (migrating) {
    return (
      <div className="krounded-box border kbg-base-100 p-6">
        <div className="text-sm text-base-content/60">
          Migrating existing notes...
        </div>
      </div>
    );
  }

  return (
    <div className="krounded-box border kbg-base-100 p-6">
      {/* Last edited metadata */}
      {lastEditedBy && (
        <div className="mb-3 text-xs text-base-content/50 flex-sc gap-1">
          <Icon name="clock" size={14} />
          Last edited by{' '}
          <span className="font-medium text-base-content/70">
            {lastEditedBy}
          </span>{' '}
          {lastEditedLabel}
        </div>
      )}

      {/* Editor */}
      <div className="krounded-box border kbg-base-100">
        <Editor
          ref={editorRef}
          height="auto"
          initialEditType="wysiwyg"
          initialValue={currentContent || ''}
          onChange={handleChange}
          hideModeSwitch={true}
        />
      </div>

      {/* Save button */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="kbtn kbtn-primary"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? 'Saving...' : 'Save Notes'}
          </button>
          {dirty && (
            <span className="text-xs text-base-content/50">
              Unsaved changes
            </span>
          )}
        </div>

        {/* History toggle */}
        {versions.length > 0 && (
          <button
            type="button"
            className="kbtn kbtn-ghost kbtn-sm gap-2"
            onClick={() => setShowHistory(prev => !prev)}
          >
            <Icon name="history" size={16} />
            History ({versions.length})
            <Icon
              name={showHistory ? 'chevron-up' : 'chevron-down'}
              size={14}
            />
          </button>
        )}
      </div>

      {/* History section */}
      {showHistory && versions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-base-200">
          <div className="text-sm font-semibold mb-3">Edit History</div>
          <div className="flex flex-col gap-1">
            {versions.map((version, index) => {
              // Previous version is the next item in the array (older)
              const previousContent =
                index < versions.length - 1
                  ? versions[index + 1]?.values?.[FIELD_CONTENT] || ''
                  : '';
              return (
                <HistoryEntry
                  key={version.id}
                  version={version}
                  previousContent={previousContent}
                  isFirst={index === 0}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

ProjectNotes.propTypes = {
  project: t.object,
};
