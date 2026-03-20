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

  return (
    <div>
      <PageHeading title="Volunteer Notifications">
        <Link
          to="/admin/notify-volunteers/new"
          className="kbtn kbtn-primary kbtn-sm gap-1"
        >
          <Icon name="send" size={16} />
          Send New Notification
        </Link>
      </PageHeading>

      {loading ? (
        <Loading />
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-base-content/60">
          <Icon name="mail" size={40} className="mx-auto mb-3 opacity-40" />
          <p>No notifications have been sent yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-4">
          {notifications.map(n => {
            const v = n.values;
            const isExpanded = expandedId === n.id;
            return (
              <div key={n.id} className="border rounded-box overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-base-200/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : n.id)}
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-sm min-w-[160px]">
                      {formatDate(v['Notification Sent At'] || n.createdAt)}
                    </div>
                    <div className="text-sm font-medium">
                      {v['Notification Type'] || '—'}
                    </div>
                    <div className="text-sm text-base-content/60">
                      {v['Recipient Count'] || '0'} recipients
                    </div>
                    <span
                      className={clsx(
                        'kbadge kbadge-sm',
                        STATUS_COLORS[v['Status']] || 'kbadge-ghost',
                      )}
                    >
                      {v['Status'] || 'Unknown'}
                    </span>
                    <Icon
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      className="ml-auto text-base-content/40"
                    />
                  </div>
                </button>

                {isExpanded && <NotificationDetail values={v} />}
              </div>
            );
          })}
        </div>
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
    <div className="px-4 pb-4 border-t bg-base-200/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">
            Projects Included ({projects.length})
          </h4>
          {projects.length > 0 ? (
            <ul className="text-sm space-y-1">
              {projects.map((p, i) => (
                <li key={i} className="text-base-content/70">
                  {p['Project Name'] || p['Project Id'] || 'Unknown'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-base-content/50">—</p>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">
            Recipients ({recipients.length})
          </h4>
          {recipients.length > 0 ? (
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {recipients.map((r, i) => (
                <li key={i} className="text-base-content/70">
                  {[r['First Name'], r['Last Name']].filter(Boolean).join(' ')} ({r['Email Address']})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-base-content/50">—</p>
          )}
        </div>
      </div>

      {values['Custom Message'] && (
        <div className="mt-3">
          <h4 className="font-semibold text-sm mb-1">Custom Message</h4>
          <p className="text-sm text-base-content/70 whitespace-pre-wrap">
            {values['Custom Message']}
          </p>
        </div>
      )}

      {values['Skills Filter'] && (
        <div className="mt-3">
          <h4 className="font-semibold text-sm mb-1">Skills Filter</h4>
          <p className="text-sm text-base-content/70">
            {(() => {
              try {
                return JSON.parse(values['Skills Filter']).join(', ');
              } catch {
                return values['Skills Filter'];
              }
            })()}
          </p>
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
