import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { createSubmission } from '@kineticdata/react';
import { CategoryPickerComponent } from '../../../components/kinetic-form/widgets/categorypicker.js';
import { useNotificationPreview } from './useNotificationPreview.js';
import { PageHeading } from '../../../components/PageHeading.jsx';
import { Icon } from '../../../atoms/Icon.jsx';
import { Loading } from '../../../components/states/Loading.jsx';
import { openConfirm } from '../../../helpers/confirm.js';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';
import clsx from 'clsx';

const NOTIFICATION_TYPES = ['Upcoming Projects', 'Skills-Based'];

const SKILL_PICKER_CONFIG = {
  search: { kappSlug: 'service-portal', formSlug: 'skills' },
  categoryField: 'Skill Category',
  valueField: 'Skill',
};

export const SendNotification = () => {
  const navigate = useNavigate();
  const kappSlug = useSelector(state => state.app.kappSlug);
  const [type, setType] = useState('Upcoming Projects');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { loading, projects, volunteers } = useNotificationPreview(
    type,
    selectedSkills,
  );

  const handleSkillChange = useCallback(skills => {
    setSelectedSkills(skills);
  }, []);

  const handleSend = () => {
    openConfirm({
      title: 'Send Notification',
      description: `You're about to email ${volunteers.length} volunteer${volunteers.length !== 1 ? 's' : ''} about ${projects.length} project${projects.length !== 1 ? 's' : ''}. Proceed?`,
      acceptLabel: 'Send',
      accept: async () => {
        setSending(true);
        try {
          const values = {
            'Notification Type': type,
            Status: 'Draft',
          };
          if (type === 'Skills-Based' && selectedSkills.length > 0) {
            values['Skills Filter'] = JSON.stringify(selectedSkills);
          }
          if (customMessage.trim()) {
            values['Custom Message'] = customMessage.trim();
          }
          const { submission, error } = await createSubmission({
            kappSlug,
            formSlug: 'swat-volunteer-notifications',
            values,
          });
          if (error) throw new Error(error.message || 'Failed to send');
          toastSuccess({ title: 'Notification sent successfully!' });
          navigate('/admin/notify-volunteers');
        } catch (err) {
          toastError({
            title: err?.message || 'Failed to send notification. Please try again.',
          });
        } finally {
          setSending(false);
        }
      },
    });
  };

  const canSend = projects.length > 0 && volunteers.length > 0 && !sending;

  return (
    <div>
      <PageHeading
        title="Send Notification"
        backTo="/admin/notify-volunteers"
      />

      <div className="flex flex-col gap-6 mt-6">
        {/* Notification Type */}
        <div>
          <label className="label font-semibold">Notification Type</label>
          <select
            className="kselect kselect-bordered w-full max-w-sm"
            value={type}
            onChange={e => {
              setType(e.target.value);
              if (e.target.value !== 'Skills-Based') setSelectedSkills([]);
            }}
          >
            {NOTIFICATION_TYPES.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Skills Picker — kept mounted to preserve selection state */}
        <div className={type !== 'Skills-Based' ? 'hidden' : ''}>
          <label className="label font-semibold">
            Select Skills to Match
          </label>
          <div className="max-w-lg">
            <CategoryPickerComponent
              {...SKILL_PICKER_CONFIG}
              onChange={handleSkillChange}
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div className="rounded-box border bg-base-100 p-5">
          <h3 className="font-semibold text-lg mb-4">Preview</h3>
          {loading ? (
            <Loading />
          ) : (
            <>
              <div className="flex gap-4 mb-4">
                <div className="kbadge kbadge-lg kbadge-outline gap-1">
                  <Icon name="hammer" size={16} />
                  {projects.length} project{projects.length !== 1 ? 's' : ''}
                </div>
                <div className="kbadge kbadge-lg kbadge-outline gap-1">
                  <Icon name="users" size={16} />
                  {volunteers.length} recipient
                  {volunteers.length !== 1 ? 's' : ''}
                </div>
              </div>

              {projects.length === 0 ? (
                <p className="text-base-content/60 text-sm">
                  No matching projects found. Projects must have Status "Ready
                  to Work", Additional Volunteers Needed "Yes", and no
                  Associated Event.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {projects.map(p => (
                    <div
                      key={p['Project Id']}
                      className="border rounded-lg p-3 text-sm"
                    >
                      <div className="font-semibold">
                        {p['Project Name'] || 'Unnamed Project'}
                      </div>
                      <div className="text-base-content/60 mt-1">
                        <span>
                          Date:{' '}
                          {p['Scheduled Date'] || 'TBD'}
                        </span>
                        {p['Skills Needed'] && (
                          <span className="ml-3">
                            Skills: {p['Skills Needed']}
                          </span>
                        )}
                      </div>
                      {p['Project Captain'] && (
                        <div className="text-base-content/60">
                          Captain: {p['Project Captain']}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Custom Message */}
        <div>
          <label className="label font-semibold">
            Custom Message{' '}
            <span className="font-normal text-base-content/50">
              (optional)
            </span>
          </label>
          <textarea
            className="ktextarea ktextarea-bordered w-full max-w-lg"
            rows={4}
            placeholder="Add a personal message to include at the top of the email..."
            value={customMessage}
            onChange={e => setCustomMessage(e.target.value)}
          />
        </div>

        {/* Send Button */}
        <div>
          <button
            className={clsx(
              'kbtn kbtn-primary gap-2',
              sending && 'kbtn-disabled',
            )}
            disabled={!canSend}
            onClick={handleSend}
          >
            {sending ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Sending...
              </>
            ) : (
              <>
                <Icon name="send" size={18} />
                Send Notification
              </>
            )}
          </button>
          {!loading && volunteers.length === 0 && (
            <p className="text-warning text-sm mt-2">
              No volunteers match the current criteria.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
