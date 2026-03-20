import { useMemo, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { searchSubmissions } from '@kineticdata/react';
import { useData } from '../../../helpers/hooks/useData.js';
import { PageHeading } from '../../../components/PageHeading.jsx';
import { Icon } from '../../../atoms/Icon.jsx';
import { Loading } from '../../../components/states/Loading.jsx';
import { SendNotification } from './SendNotification.jsx';
import clsx from 'clsx';

const STATUS_COLORS = {
  Draft: 'kbadge-ghost',
  Sending: 'kbadge-warning',
  Sent: 'kbadge-success',
  Failed: 'kbadge-error',
};

const STATUS_ICONS = {
  Draft: 'file-text',
  Sending: 'loader',
  Sent: 'circle-check',
  Failed: 'alert-circle',
};

const formatDate = dateStr => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const NotificationHistory = () => {
  const kappSlug = useSelector(state => state.app.kappSlug);
  const [expandedId, setExpandedId] = useState(null);

  const params = useMemo(
    () => ({
      kapp: kappSlug,
      form: 'swat-volunteer-notifications',
      search: {
        include: ['details', 'values'],
        limit: 100,
        direction: 'DESC',
      },
    }),
    [kappSlug],
  );
  const { loading, response } = useData(searchSubmissions, params);
  const notifications = response?.submissions ?? [];

  // Summary stats
  const stats = useMemo(() => {
    let totalSent = 0;
    let totalRecipients = 0;
    notifications.forEach(n => {
      if (n.values['Status'] === 'Sent') totalSent++;
      totalRecipients += parseInt(n.values['Recipient Count'] || '0', 10);
    });
    return { totalSent, totalRecipients };
  }, [notifications]);

  return (
    <div className="pt-6 pb-6">
      <PageHeading title="Volunteer Notifications" backTo="/admin">
        <div className="ml-auto">
          <Link
            to="/admin/notify-volunteers/new"
            className="kbtn kbtn-primary kbtn-sm gap-1"
          >
            <Icon name="send" size={16} />
            Send New Notification
          </Link>
        </div>
      </PageHeading>

      {loading ? (
        <Loading />
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-base-content/60">
          <div className="flex-cc w-16 h-16 rounded-full bg-base-200 mx-auto mb-4">
            <Icon name="mail" size={28} className="opacity-40" />
          </div>
          <p className="text-lg font-medium mb-1">No notifications yet</p>
          <p className="text-sm text-base-content/50 mb-6">
            Send your first notification to let volunteers know about upcoming
            projects.
          </p>
          <Link
            to="/admin/notify-volunteers/new"
            className="kbtn kbtn-primary kbtn-sm gap-1"
          >
            <Icon name="send" size={16} />
            Send New Notification
          </Link>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-box border bg-base-100 p-4 flex-sc gap-3">
              <div className="icon-box flex-none bg-primary/10 text-primary">
                <Icon name="mail" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold leading-tight">
                  {notifications.length}
                </div>
                <div className="text-xs text-base-content/60">
                  Total Notifications
                </div>
              </div>
            </div>
            <div className="rounded-box border bg-base-100 p-4 flex-sc gap-3">
              <div className="icon-box flex-none bg-success/10 text-success">
                <Icon name="circle-check" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold leading-tight">
                  {stats.totalSent}
                </div>
                <div className="text-xs text-base-content/60">
                  Successfully Sent
                </div>
              </div>
            </div>
            <div className="rounded-box border bg-base-100 p-4 flex-sc gap-3">
              <div className="icon-box flex-none bg-info/10 text-info">
                <Icon name="users" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold leading-tight">
                  {stats.totalRecipients}
                </div>
                <div className="text-xs text-base-content/60">
                  Total Emails Sent
                </div>
              </div>
            </div>
          </div>

          {/* History heading */}
          <div className="flex-sc gap-2 mb-3">
            <Icon
              name="history"
              size={18}
              className="text-base-content/60"
            />
            <h2 className="font-semibold text-sm">Notification History</h2>
          </div>

          {/* Notification list */}
          <div className="flex flex-col gap-3">
            {notifications.map(n => {
              const v = n.values;
              const isExpanded = expandedId === n.id;
              const status = v['Status'] || 'Unknown';
              return (
                <div
                  key={n.id}
                  className="border rounded-box bg-base-100 overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full text-left px-5 py-4 hover:bg-base-200/30 transition-colors"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : n.id)
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={clsx(
                          'flex-cc w-9 h-9 rounded-full flex-none',
                          status === 'Sent' && 'bg-success/10 text-success',
                          status === 'Sending' &&
                            'bg-warning/10 text-warning',
                          status === 'Failed' && 'bg-error/10 text-error',
                          status === 'Draft' &&
                            'bg-base-200 text-base-content/50',
                          !['Sent', 'Sending', 'Failed', 'Draft'].includes(
                            status,
                          ) && 'bg-base-200 text-base-content/50',
                        )}
                      >
                        <Icon
                          name={STATUS_ICONS[status] || 'mail'}
                          size={18}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            {v['Notification Type'] || 'Notification'}
                          </span>
                          <span
                            className={clsx(
                              'kbadge kbadge-xs',
                              STATUS_COLORS[status] || 'kbadge-ghost',
                            )}
                          >
                            {status}
                          </span>
                        </div>
                        <div className="text-xs text-base-content/50 mt-0.5">
                          {formatDate(
                            v['Notification Sent At'] || n.submittedAt,
                          )}
                          {' · '}
                          {v['Recipient Count'] || '0'} recipients
                          {v['Custom Message'] && ' · Custom message included'}
                        </div>
                      </div>
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        className="text-base-content/30 flex-none"
                      />
                    </div>
                  </button>

                  {isExpanded && <NotificationDetail values={v} />}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const NotificationDetail = ({ values }) => {
  const projects = (() => {
    try {
      return JSON.parse(values['Projects Included'] || '[]');
    } catch {
      return [];
    }
  })();

  const recipients = (() => {
    try {
      return JSON.parse(values['Recipients'] || '[]');
    } catch {
      return [];
    }
  })();

  return (
    <div className="px-5 pb-5 border-t bg-base-200/20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        {/* Projects */}
        <div>
          <div className="flex-sc gap-1.5 mb-2">
            <Icon
              name="hammer"
              size={14}
              className="text-base-content/50"
            />
            <h4 className="font-semibold text-xs uppercase tracking-wide text-base-content/60">
              Projects ({projects.length})
            </h4>
          </div>
          {projects.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {projects.map((p, i) => (
                <div
                  key={i}
                  className="text-sm px-3 py-2 rounded-lg bg-base-100 border"
                >
                  <span className="font-medium">
                    {p['Project Name'] || p['Project Id'] || 'Unknown'}
                  </span>
                  {(p['City'] || p['State']) && (
                    <span className="text-base-content/50 ml-2">
                      {[p['City'], p['State']].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-base-content/50">—</p>
          )}
        </div>

        {/* Recipients */}
        <div>
          <div className="flex-sc gap-1.5 mb-2">
            <Icon
              name="users"
              size={14}
              className="text-base-content/50"
            />
            <h4 className="font-semibold text-xs uppercase tracking-wide text-base-content/60">
              Recipients ({recipients.length})
            </h4>
          </div>
          {recipients.length > 0 ? (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {recipients.map((r, i) => (
                <div
                  key={i}
                  className="text-sm px-3 py-1.5 rounded-lg bg-base-100 border flex-sc gap-2"
                >
                  <span className="font-medium">
                    {[r['First Name'], r['Last Name']]
                      .filter(Boolean)
                      .join(' ')}
                  </span>
                  <span className="text-base-content/50 text-xs truncate">
                    {r['Email Address']}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-base-content/50">—</p>
          )}
        </div>
      </div>

      {/* Custom Message */}
      {values['Custom Message'] && (
        <div className="mt-4">
          <div className="flex-sc gap-1.5 mb-2">
            <Icon
              name="message"
              size={14}
              className="text-base-content/50"
            />
            <h4 className="font-semibold text-xs uppercase tracking-wide text-base-content/60">
              Custom Message
            </h4>
          </div>
          <p className="text-sm text-base-content/70 whitespace-pre-wrap px-3 py-2 rounded-lg bg-base-100 border">
            {values['Custom Message']}
          </p>
        </div>
      )}

      {/* Skills Filter */}
      {values['Skills Filter'] && (
        <div className="mt-4">
          <div className="flex-sc gap-1.5 mb-2">
            <Icon
              name="filter"
              size={14}
              className="text-base-content/50"
            />
            <h4 className="font-semibold text-xs uppercase tracking-wide text-base-content/60">
              Skills Filter
            </h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(() => {
              try {
                return JSON.parse(values['Skills Filter']).map(
                  (skill, i) => (
                    <span key={i} className="kbadge kbadge-sm kbadge-outline">
                      {skill}
                    </span>
                  ),
                );
              } catch {
                return (
                  <span className="text-sm text-base-content/70">
                    {values['Skills Filter']}
                  </span>
                );
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export const VolunteerNotifications = () => (
  <Routes>
    <Route path="/" element={<NotificationHistory />} />
    <Route path="/new" element={<SendNotification />} />
  </Routes>
);
