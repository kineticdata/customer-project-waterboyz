import { Icon } from '../../../atoms/Icon.jsx';

export const SaveBar = ({
  pendingChanges,
  saving,
  onSave,
  onDiscard,
}) => {
  const { toCreate, toDelete, toMove } = pendingChanges;
  const parts = [];
  if (toCreate.length > 0)
    parts.push(`${toCreate.length} new`);
  if (toDelete.length > 0)
    parts.push(`${toDelete.length} removed`);
  if (toMove.length > 0)
    parts.push(`${toMove.length} moved`);

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 animate-in slide-in-from-bottom duration-200">
      <div className="bg-base-100 border-t border-base-300 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="font-medium text-base-content/70">
              Unsaved changes:
            </span>
            <span className="text-base-content/50">
              {parts.join(' · ')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="kbtn kbtn-sm kbtn-ghost"
              disabled={saving}
              onClick={onDiscard}
            >
              Discard
            </button>
            <button
              type="button"
              className="kbtn kbtn-sm kbtn-primary gap-1.5"
              disabled={saving}
              onClick={onSave}
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-xs" />
                  Saving…
                </>
              ) : (
                <>
                  <Icon name="device-floppy" size={15} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
