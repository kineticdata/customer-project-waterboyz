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

const NOTIFICATION_TYPES = [
  {
    value: 'Upcoming Projects',
    label: 'Upcoming Projects',
    description: 'Notify all volunteers about projects needing help',
    icon: 'hammer',
  },
  {
    value: 'Skills-Based',
    label: 'Skills-Based',
    description: 'Notify volunteers whose skills match project needs',
    icon: 'target-arrow',
    disabled: true,
  },
];

const SKILL_PICKER_CONFIG = {
  search: { kappSlug: 'service-portal', formSlug: 'skills' },
  categoryField: 'Skill Category',
  valueField: 'Skill',
};

const formatDate = dateStr => {
  if (!dateStr) return 'TBD';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
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
      description: `You're about to email ${volunteers.length} volunteer${volunteers.length !== 1 ? 's' : ''} about ${projects.length} project${projects.length !== 1 ? 's' : ''}. This cannot be undone.`,
      acceptLabel: 'Send Now',
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
            title:
              err?.message ||
              'Failed to send notification. Please try again.',
          });
        } finally {
          setSending(false);
        }
      },
    });
  };

  const canSend = projects.length > 0 && volunteers.length > 0 && !sending;

  return (
    <div className="pt-6 pb-6">
      <PageHeading
        title="Send Notification"
        backTo="/admin/notify-volunteers"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Configuration */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Notification Type — card selector */}
          <div>
            <div className="flex-sc gap-1.5 mb-3">
              <Icon
                name="mail"
                size={16}
                className="text-base-content/50"
              />
              <h3 className="font-semibold text-xs uppercase tracking-wide text-base-content/60">
                Notification Type
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NOTIFICATION_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  disabled={t.disabled}
                  title={t.disabled ? 'Coming soon' : undefined}
                  onClick={() => {
                    if (t.disabled) return;
                    setType(t.value);
                    if (t.value !== 'Skills-Based') setSelectedSkills([]);
                  }}
                  className={clsx(
                    'rounded-box border-2 p-4 text-left transition-all',
                    t.disabled
                      ? 'border-base-300 bg-base-200/50 opacity-60 cursor-not-allowed'
                      : type === t.value
                        ? 'border-primary bg-primary/5'
                        : 'border-base-300 bg-base-100 hover:border-base-content/20',
                  )}
                >
                  <div className="flex-sc gap-3">
                    <div
                      className={clsx(
                        'flex-cc w-10 h-10 rounded-full flex-none',
                        t.disabled
                          ? 'bg-base-200 text-base-content/30'
                          : type === t.value
                            ? 'bg-primary/15 text-primary'
                            : 'bg-base-200 text-base-content/50',
                      )}
                    >
                      <Icon name={t.icon} size={20} />
                    </div>
                    <div>
                      <div className="flex-sc gap-2">
                        <span className="font-semibold text-sm">{t.label}</span>
                        {t.disabled && (
                          <span className="kbadge kbadge-xs kbadge-ghost">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-base-content/50 mt-0.5">
                        {t.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Skills Picker — kept mounted to preserve selection state */}
          <div className={type !== 'Skills-Based' ? 'hidden' : ''}>
            <div className="flex-sc gap-1.5 mb-3">
              <Icon
                name="target-arrow"
                size={16}
                className="text-base-content/50"
              />
              <h3 className="font-semibold text-xs uppercase tracking-wide text-base-content/60">
                Filter by Skills
              </h3>
            </div>
            <div className="rounded-box border bg-base-100 p-4">
              <CategoryPickerComponent
                {...SKILL_PICKER_CONFIG}
                onChange={handleSkillChange}
              />
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <div className="flex-sc gap-1.5 mb-3">
              <Icon
                name="message"
                size={16}
                className="text-base-content/50"
              />
              <h3 className="font-semibold text-xs uppercase tracking-wide text-base-content/60">
                Custom Message
              </h3>
              <span className="text-xs text-base-content/40">(optional)</span>
            </div>
            <textarea
              className="ktextarea ktextarea-bordered w-full"
              rows={4}
              placeholder="Add a personal message to include at the top of the email..."
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
            />
          </div>

          {/* Send Button — desktop */}
          <div className="hidden lg:flex items-center gap-4 pt-2">
            <button
              className={clsx(
                'kbtn kbtn-primary kbtn-lg gap-2',
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
                  <Icon name="send" size={20} />
                  Send Notification
                </>
              )}
            </button>
            {!loading && !canSend && (
              <p className="text-sm text-base-content/50">
                {projects.length === 0
                  ? 'No matching projects available.'
                  : 'No volunteers match the current criteria.'}
              </p>
            )}
          </div>
        </div>

        {/* Right column — Preview sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-box border bg-base-100 overflow-hidden lg:sticky lg:top-24">
            {/* Preview header */}
            <div className="px-5 py-4 border-b bg-base-200/30">
              <div className="flex-sc gap-2">
                <Icon
                  name="eye"
                  size={16}
                  className="text-base-content/50"
                />
                <h3 className="font-semibold text-sm">Preview</h3>
              </div>
            </div>

            <div className="p-5">
              {loading ? (
                <Loading />
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Stat badges */}
                  <div className="flex gap-3">
                    <div className="flex-1 rounded-lg bg-primary/5 border border-primary/10 p-3 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {projects.length}
                      </div>
                      <div className="text-xs text-base-content/50 mt-0.5">
                        Project{projects.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex-1 rounded-lg bg-info/5 border border-info/10 p-3 text-center">
                      <div className="text-2xl font-bold text-info">
                        {volunteers.length}
                      </div>
                      <div className="text-xs text-base-content/50 mt-0.5">
                        Recipient{volunteers.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Project list */}
                  {projects.length === 0 ? (
                    <div className="text-center py-6 text-base-content/40">
                      <Icon
                        name="hammer"
                        size={24}
                        className="mx-auto mb-2 opacity-40"
                      />
                      <p className="text-xs">
                        No matching projects found
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex-sc gap-1.5 mb-2">
                        <Icon
                          name="hammer"
                          size={14}
                          className="text-base-content/50"
                        />
                        <span className="font-semibold text-xs uppercase tracking-wide text-base-content/60">
                          Projects
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {projects.map(p => (
                          <div
                            key={p['Project Id']}
                            className="rounded-lg border p-3"
                          >
                            <div className="font-semibold text-sm">
                              {p['Project Name'] || 'Unnamed Project'}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-base-content/60">
                              <span className="flex-sc gap-1">
                                <Icon name="calendar" size={12} />
                                {formatDate(p['Scheduled Date'])}
                              </span>
                              {(p['City'] || p['State']) && (
                                <span className="flex-sc gap-1">
                                  <Icon name="map-pin" size={12} />
                                  {[p['City'], p['State']]
                                    .filter(Boolean)
                                    .join(', ')}
                                </span>
                              )}
                            </div>
                            {p['Skills Needed'] && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {p['Skills Needed']
                                  .split('\n')
                                  .filter(Boolean)
                                  .map((skill, i) => (
                                    <span
                                      key={i}
                                      className="kbadge kbadge-xs kbadge-outline"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Volunteer count note */}
                  {volunteers.length > 0 && (
                    <div className="text-xs text-base-content/50 flex-sc gap-1.5 pt-1 border-t">
                      <Icon name="info-circle" size={14} />
                      <span>
                        This will send an individual email to each of the{' '}
                        {volunteers.length} volunteer
                        {volunteers.length !== 1 ? 's' : ''}.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Send Button — mobile (below preview) */}
          <div className="lg:hidden mt-6">
            <button
              className={clsx(
                'kbtn kbtn-primary kbtn-lg gap-2 w-full',
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
                  <Icon name="send" size={20} />
                  Send Notification
                </>
              )}
            </button>
            {!loading && !canSend && (
              <p className="text-sm text-base-content/50 text-center mt-2">
                {projects.length === 0
                  ? 'No matching projects available.'
                  : 'No volunteers match the current criteria.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
