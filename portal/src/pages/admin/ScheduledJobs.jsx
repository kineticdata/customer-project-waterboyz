import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  searchSubmissions,
  updateSubmission,
  fetchSubmission,
  bundle,
  getCsrfToken,
} from '@kineticdata/react';
import { useData } from '../../helpers/hooks/useData.js';
import { Loading } from '../../components/states/Loading.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { Icon } from '../../atoms/Icon.jsx';
import { toastError, toastSuccess } from '../../helpers/toasts.js';
import { KineticForm } from '../../components/kinetic-form/KineticForm.jsx';
import clsx from 'clsx';

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

  // For each job that has a Last Run ID, fetch the latest run
  // Use a separate fetch for the latest runs by getting all runs sorted desc
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

  // Map: jobId → most recent run
  const latestRunByJob = useMemo(() => {
    const map = {};
    for (const run of allRuns) {
      const jobId = run.values['Job ID'];
      if (!map[jobId]) map[jobId] = run;
    }
    return map;
  }, [allRuns]);

  // Handle status change (pause, deactivate)
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

  // Handle restart via WebAPI
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
              <th>Routine</th>
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
                  <td className="text-sm font-mono">{v['Routine Name']}</td>
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
                      {['Active', 'Paused', 'Error'].includes(v['Status']) && (
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
          <div className="kmodal-box max-w-2xl">
            <div className="flex-sb mb-4">
              <h3 className="text-lg font-bold">New Scheduled Job</h3>
              <button
                className="kbtn kbtn-ghost kbtn-sm kbtn-circle"
                onClick={() => setShowCreate(false)}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <KineticForm
              kappSlug={kappSlug}
              formSlug="scheduled-jobs"
              created={handleCreated}
            />
          </div>
          <div className="kmodal-backdrop" onClick={() => setShowCreate(false)} />
        </dialog>
      )}
    </>
  );
};
