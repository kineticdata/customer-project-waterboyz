import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  searchSubmissions,
  updateSubmission,
  createSubmission,
  bundle,
  getCsrfToken,
} from '@kineticdata/react';
import { useData } from '../../helpers/hooks/useData.js';
import { Loading } from '../../components/states/Loading.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { Icon } from '../../atoms/Icon.jsx';
import { toastError, toastSuccess } from '../../helpers/toasts.js';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INTEGRATOR_API = '/app/integrator/api';

/** Fetch connections from the integrator API */
const fetchConnections = async () => {
  const res = await fetch(`${INTEGRATOR_API}/connections`, {
    headers: { 'X-XSRF-TOKEN': getCsrfToken() },
  });
  if (!res.ok) throw new Error('Failed to fetch connections');
  return res.json();
};

/** Fetch operations for a given connection */
const fetchOperations = async connectionId => {
  const res = await fetch(
    `${INTEGRATOR_API}/connections/${connectionId}/operations`,
    { headers: { 'X-XSRF-TOKEN': getCsrfToken() } },
  );
  if (!res.ok) throw new Error('Failed to fetch operations');
  return res.json();
};

/** Format schedule config into a human-readable string */
const formatSchedule = job => {
  const v = job.values;
  if (v['Schedule Type'] === 'Interval') {
    const mins = parseInt(v['Interval Minutes'], 10);
    if (!mins || isNaN(mins)) return 'Interval (not set)';
    if (mins >= 1440) return `Every ${Math.round(mins / 1440)} day(s)`;
    if (mins >= 60) return `Every ${Math.round(mins / 60)} hour(s)`;
    return `Every ${mins} min`;
  }
  if (v['Schedule Type'] === 'Time of Day') {
    const time = v['Schedule Time'] || '?';
    const tz = v['Timezone'] || 'America/Detroit';
    const days = (() => {
      try {
        return JSON.parse(v['Schedule Days'] || '[]');
      } catch {
        return [];
      }
    })();
    const dayStr =
      days.length > 0
        ? ` (${days.map(d => d.slice(0, 3)).join(', ')})`
        : '';
    return `Daily at ${time} ${tz.split('/')[1] || tz}${dayStr}`;
  }
  return '—';
};

const statusColors = {
  Active: 'kbadge-success',
  Inactive: 'kbadge-ghost',
  Paused: 'kbadge-warning',
  Restarting: 'kbadge-info',
  Error: 'kbadge-error',
};

const runStatusColors = {
  Success: 'kbadge-success',
  Error: 'kbadge-error',
  Running: 'kbadge-info',
  Skipped: 'kbadge-ghost',
};

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// ---------------------------------------------------------------------------
// Create / Edit Job Form (custom, not CoreForm)
// ---------------------------------------------------------------------------

const CreateJobForm = ({ onSave, onCancel, kappSlug }) => {
  const [connections, setConnections] = useState([]);
  const [operations, setOperations] = useState([]);
  const [loadingConns, setLoadingConns] = useState(true);
  const [loadingOps, setLoadingOps] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    'Job Name': '',
    Description: '',
    Status: 'Active',
    'Schedule Type': 'Interval',
    'Interval Minutes': '60',
    'Schedule Time': '',
    'Schedule Days': '[]',
    Timezone: 'America/Detroit',
    'Connection ID': '',
    'Operation ID': '',
    'Operation Name': '',
    'Operation Parameters': '',
    'Max Runs': '',
    'Expires At': '',
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Load connections on mount
  useEffect(() => {
    fetchConnections()
      .then(data => setConnections(Array.isArray(data) ? data : []))
      .catch(() => toastError('Could not load connections.'))
      .finally(() => setLoadingConns(false));
  }, []);

  // Load operations when connection changes
  useEffect(() => {
    if (!form['Connection ID']) {
      setOperations([]);
      return;
    }
    setLoadingOps(true);
    fetchOperations(form['Connection ID'])
      .then(data => setOperations(Array.isArray(data) ? data : []))
      .catch(() => toastError('Could not load operations.'))
      .finally(() => setLoadingOps(false));
  }, [form['Connection ID']]);

  const selectedOp = operations.find(o => o.id === form['Operation ID']);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form['Job Name'] || !form['Connection ID'] || !form['Operation ID']) {
      toastError('Job Name, Connection, and Operation are required.');
      return;
    }
    if (
      form['Schedule Type'] === 'Interval' &&
      (parseInt(form['Interval Minutes'], 10) || 0) < 1
    ) {
      toastError('Interval must be at least 1 minute.');
      return;
    }
    setSaving(true);
    try {
      const values = { ...form };
      // Store the operation name for display purposes
      if (selectedOp) values['Operation Name'] = selectedOp.name;
      const { error } = await createSubmission({
        kappSlug,
        formSlug: 'scheduled-jobs',
        values,
        coreState: 'Submitted',
      });
      if (error) throw new Error(error.message || 'Failed to create job');
      onSave();
    } catch (err) {
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Job Name */}
      <div className="kform-control">
        <label className="klabel">Job Name *</label>
        <input
          className="kinput kinput-bordered w-full"
          value={form['Job Name']}
          onChange={e => set('Job Name', e.target.value)}
          required
        />
      </div>

      {/* Description */}
      <div className="kform-control">
        <label className="klabel">Description</label>
        <textarea
          className="ktextarea ktextarea-bordered w-full"
          rows={2}
          value={form.Description}
          onChange={e => set('Description', e.target.value)}
        />
      </div>

      {/* Connection + Operation (cascading dropdowns) */}
      <fieldset className="border border-base-300 rounded-box p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">
          Operation to Execute
        </legend>

        <div className="kform-control">
          <label className="klabel">Connection *</label>
          {loadingConns ? (
            <span className="text-sm ktext-base-content/60">Loading...</span>
          ) : (
            <select
              className="kselect kselect-bordered w-full"
              value={form['Connection ID']}
              onChange={e => {
                set('Connection ID', e.target.value);
                set('Operation ID', '');
                set('Operation Name', '');
              }}
              required
            >
              <option value="">Select a connection...</option>
              {connections.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="kform-control">
          <label className="klabel">Operation *</label>
          {loadingOps ? (
            <span className="text-sm ktext-base-content/60">Loading...</span>
          ) : (
            <select
              className="kselect kselect-bordered w-full"
              value={form['Operation ID']}
              onChange={e => {
                const op = operations.find(o => o.id === e.target.value);
                set('Operation ID', e.target.value);
                set('Operation Name', op?.name || '');
              }}
              required
              disabled={!form['Connection ID']}
            >
              <option value="">Select an operation...</option>
              {operations.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
          {form['Connection ID'] && (
            <div className="mt-1">
              <a
                href="/app/console/#/settings/integrator"
                target="_blank"
                rel="noopener noreferrer"
                className="klink text-xs flex-sc gap-1"
              >
                <Icon name="external-link" size={12} />
                Manage operations in the Integrator
              </a>
            </div>
          )}
        </div>

        {/* Show operation parameters template if the operation has inputs */}
        {selectedOp?.config?.body?.raw && (
          <div className="kform-control">
            <label className="klabel">
              Operation Parameters (JSON)
              <span className="klabel-text-alt">
                Override template values
              </span>
            </label>
            <textarea
              className="ktextarea ktextarea-bordered w-full font-mono text-xs"
              rows={4}
              value={form['Operation Parameters']}
              onChange={e => set('Operation Parameters', e.target.value)}
              placeholder='{"param": "value"}'
            />
          </div>
        )}
      </fieldset>

      {/* Schedule */}
      <fieldset className="border border-base-300 rounded-box p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Schedule</legend>

        <div className="kform-control">
          <label className="klabel">Schedule Type *</label>
          <div className="flex gap-4">
            {['Interval', 'Time of Day'].map(opt => (
              <label key={opt} className="flex-sc gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scheduleType"
                  className="kradio kradio-primary"
                  checked={form['Schedule Type'] === opt}
                  onChange={() => set('Schedule Type', opt)}
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {form['Schedule Type'] === 'Interval' && (
          <div className="kform-control">
            <label className="klabel">Interval (minutes) *</label>
            <input
              type="number"
              min="1"
              className="kinput kinput-bordered w-full"
              value={form['Interval Minutes']}
              onChange={e => set('Interval Minutes', e.target.value)}
              required
            />
          </div>
        )}

        {form['Schedule Type'] === 'Time of Day' && (
          <>
            <div className="kform-control">
              <label className="klabel">Time (HH:MM, 24h) *</label>
              <input
                type="time"
                className="kinput kinput-bordered w-full"
                value={form['Schedule Time']}
                onChange={e => set('Schedule Time', e.target.value)}
                required
              />
            </div>
            <div className="kform-control">
              <label className="klabel">Days of Week</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => {
                  const days = (() => {
                    try {
                      return JSON.parse(form['Schedule Days'] || '[]');
                    } catch {
                      return [];
                    }
                  })();
                  const checked = days.includes(day);
                  return (
                    <label
                      key={day}
                      className="flex-sc gap-1 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        className="kcheckbox kcheckbox-sm kcheckbox-primary"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? days.filter(d => d !== day)
                            : [...days, day];
                          set('Schedule Days', JSON.stringify(next));
                        }}
                      />
                      {day.slice(0, 3)}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs ktext-base-content/50 mt-1">
                Leave all unchecked for every day.
              </p>
            </div>
          </>
        )}

        <div className="kform-control">
          <label className="klabel">Timezone</label>
          <input
            className="kinput kinput-bordered w-full"
            value={form.Timezone}
            onChange={e => set('Timezone', e.target.value)}
          />
        </div>
      </fieldset>

      {/* Advanced (collapsed) */}
      <details className="border border-base-300 rounded-box">
        <summary className="text-sm font-semibold px-4 py-3 cursor-pointer">
          Advanced Options
        </summary>
        <div className="px-4 pb-4 space-y-3">
          <div className="kform-control">
            <label className="klabel">Status</label>
            <select
              className="kselect kselect-bordered w-full"
              value={form.Status}
              onChange={e => set('Status', e.target.value)}
            >
              <option value="Active">Active (starts immediately)</option>
              <option value="Inactive">Inactive (manual start)</option>
            </select>
          </div>
          <div className="kform-control">
            <label className="klabel">Max Runs</label>
            <input
              type="number"
              min="1"
              className="kinput kinput-bordered w-full"
              value={form['Max Runs']}
              onChange={e => set('Max Runs', e.target.value)}
              placeholder="Unlimited"
            />
          </div>
          <div className="kform-control">
            <label className="klabel">Expires At</label>
            <input
              type="datetime-local"
              className="kinput kinput-bordered w-full"
              value={form['Expires At']}
              onChange={e => set('Expires At', e.target.value)}
            />
          </div>
        </div>
      </details>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          className="kbtn kbtn-ghost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="kbtn kbtn-primary"
          disabled={saving}
        >
          {saving ? 'Creating...' : 'Create Job'}
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export const ScheduledJobs = () => {
  const navigate = useNavigate();
  const kappSlug = useSelector(state => state.app.kappSlug);
  const [actionLoading, setActionLoading] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Fetch all scheduled jobs
  const jobsParams = useMemo(
    () => ({
      kapp: kappSlug,
      form: 'scheduled-jobs',
      search: { include: ['values'], limit: 1000 },
    }),
    [kappSlug],
  );
  const {
    loading: jobsLoading,
    response: jobsResponse,
    actions: { reloadData },
  } = useData(searchSubmissions, jobsParams);
  const jobs = jobsResponse?.submissions ?? [];

  // Fetch recent runs to derive latest run per job
  const runsParams = useMemo(
    () => ({
      kapp: kappSlug,
      form: 'scheduled-job-runs',
      search: {
        include: ['values'],
        limit: 500,
        orderBy: 'createdAt',
        direction: 'DESC',
      },
    }),
    [kappSlug],
  );
  const { response: runsResponse } = useData(searchSubmissions, runsParams);
  const allRuns = runsResponse?.submissions ?? [];

  // Map: jobId -> most recent run
  const latestRunByJob = useMemo(() => {
    const map = {};
    for (const run of allRuns) {
      const jobId = run.values['Job ID'];
      if (!map[jobId]) map[jobId] = run;
    }
    return map;
  }, [allRuns]);

  const handleStatusChange = useCallback(
    async (job, newStatus) => {
      setActionLoading(job.id);
      try {
        await updateSubmission({
          id: job.id,
          values: { Status: newStatus },
          include: 'values',
        });
        toastSuccess(`Job ${newStatus.toLowerCase()}.`);
        reloadData();
      } catch (e) {
        toastError(`Failed to update job: ${e.message}`);
      } finally {
        setActionLoading(null);
      }
    },
    [reloadData],
  );

  const handleRestart = useCallback(
    async job => {
      if (
        !confirm(
          `Restart "${job.values['Job Name']}"? This will start a new scheduling chain.`,
        )
      )
        return;
      setActionLoading(job.id);
      try {
        const response = await fetch(
          `${bundle.apiLocation()}/kapps/${kappSlug}/webApis/restart-scheduled-job?jobId=${job.id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-XSRF-TOKEN': getCsrfToken(),
            },
          },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${response.status}`);
        }
        toastSuccess('Job restarted.');
        reloadData();
      } catch (e) {
        toastError(`Failed to restart: ${e.message}`);
      } finally {
        setActionLoading(null);
      }
    },
    [reloadData, kappSlug],
  );

  const handleCreated = useCallback(() => {
    setShowCreate(false);
    reloadData();
    toastSuccess('Job created.');
  }, [reloadData]);

  if (jobsLoading) return <Loading />;

  return (
    <>
      <div className="flex-sb mb-4">
        <PageHeading title="Scheduled Jobs" icon="clock" />
        <button
          className="kbtn kbtn-primary kbtn-sm"
          onClick={() => setShowCreate(true)}
        >
          <Icon name="plus" size={16} /> New Job
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="ktable ktable-zebra w-full">
          <thead>
            <tr>
              <th>Job Name</th>
              <th>Status</th>
              <th>Schedule</th>
              <th>Operation</th>
              <th>Last Run</th>
              <th>Next Run</th>
              <th>Runs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center ktext-base-content/60 py-8"
                >
                  No scheduled jobs configured.
                </td>
              </tr>
            )}
            {jobs.map(job => {
              const v = job.values;
              const latestRun = latestRunByJob[job.id];
              const rv = latestRun?.values;
              const isLoading = actionLoading === job.id;

              return (
                <tr key={job.id}>
                  <td className="font-medium">{v['Job Name']}</td>
                  <td>
                    <span
                      className={clsx(
                        'kbadge kbadge-sm',
                        statusColors[v['Status']] || 'kbadge-ghost',
                      )}
                    >
                      {v['Status']}
                    </span>
                  </td>
                  <td className="text-sm">{formatSchedule(job)}</td>
                  <td className="text-sm">
                    {v['Operation Name'] || v['Operation ID'] || '—'}
                  </td>
                  <td className="text-sm">
                    {rv ? (
                      <span className="flex-sc gap-1">
                        <span
                          className={clsx(
                            'kbadge kbadge-xs',
                            runStatusColors[rv['Status']] || '',
                          )}
                        >
                          {rv['Status']}
                        </span>
                        <span className="ktext-base-content/60">
                          {rv['Started At']
                            ? new Date(rv['Started At']).toLocaleString()
                            : '—'}
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-sm ktext-base-content/60">
                    {rv?.['Next Run At']
                      ? new Date(rv['Next Run At']).toLocaleString()
                      : '—'}
                  </td>
                  <td className="text-sm">{rv?.['Run Number'] ?? 0}</td>
                  <td>
                    <div className="flex gap-1">
                      {(v['Status'] === 'Inactive' ||
                        v['Status'] === 'Paused') && (
                        <button
                          className="kbtn kbtn-ghost kbtn-xs"
                          onClick={() => handleRestart(job)}
                          disabled={isLoading}
                          title="Activate"
                        >
                          <Icon name="player-play" size={14} />
                        </button>
                      )}
                      {v['Status'] === 'Active' && (
                        <button
                          className="kbtn kbtn-ghost kbtn-xs"
                          onClick={() => handleStatusChange(job, 'Paused')}
                          disabled={isLoading}
                          title="Pause"
                        >
                          <Icon name="player-pause" size={14} />
                        </button>
                      )}
                      {v['Status'] === 'Error' && (
                        <button
                          className="kbtn kbtn-ghost kbtn-xs text-error"
                          onClick={() => handleRestart(job)}
                          disabled={isLoading}
                          title="Restart"
                        >
                          <Icon name="refresh" size={14} />
                        </button>
                      )}
                      {['Active', 'Paused', 'Error'].includes(
                        v['Status'],
                      ) && (
                        <button
                          className="kbtn kbtn-ghost kbtn-xs"
                          onClick={() => handleStatusChange(job, 'Inactive')}
                          disabled={isLoading}
                          title="Deactivate"
                        >
                          <Icon name="player-stop" size={14} />
                        </button>
                      )}
                      <button
                        className="kbtn kbtn-ghost kbtn-xs"
                        onClick={() =>
                          navigate(
                            `/admin/scheduled-jobs/${job.id}/history`,
                          )
                        }
                        title="View History"
                      >
                        <Icon name="history" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Job Modal */}
      {showCreate && (
        <dialog className="kmodal kmodal-open">
          <div className="kmodal-box max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex-sb mb-4">
              <h3 className="text-lg font-bold">New Scheduled Job</h3>
              <button
                className="kbtn kbtn-ghost kbtn-sm kbtn-circle"
                onClick={() => setShowCreate(false)}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <CreateJobForm
              kappSlug={kappSlug}
              onSave={handleCreated}
              onCancel={() => setShowCreate(false)}
            />
          </div>
          <div
            className="kmodal-backdrop"
            onClick={() => setShowCreate(false)}
          />
        </dialog>
      )}
    </>
  );
};
