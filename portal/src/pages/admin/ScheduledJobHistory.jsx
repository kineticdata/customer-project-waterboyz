import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchSubmission, searchSubmissions } from '@kineticdata/react';
import { useData } from '../../helpers/hooks/useData.js';
import { Loading } from '../../components/states/Loading.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { Icon } from '../../atoms/Icon.jsx';
import clsx from 'clsx';

const runStatusColors = {
  Success: 'kbadge-success',
  Error: 'kbadge-error',
  Running: 'kbadge-info',
  Skipped: 'kbadge-ghost',
};

const formatDuration = ms => {
  if (!ms) return '—';
  const num = parseInt(ms, 10);
  if (isNaN(num)) return '—';
  if (num < 1000) return `${num}ms`;
  if (num < 60000) return `${(num / 1000).toFixed(1)}s`;
  const mins = Math.floor(num / 60000);
  const secs = Math.round((num % 60000) / 1000);
  return `${mins}m ${secs}s`;
};

export const ScheduledJobHistory = () => {
  const { jobId } = useParams();
  const kappSlug = useSelector(state => state.app.kappSlug);

  // Fetch the job record for the heading
  const jobParams = useMemo(
    () => (jobId ? { id: jobId, include: 'values' } : null),
    [jobId],
  );
  const { response: jobResponse } = useData(fetchSubmission, jobParams);
  const job = jobResponse?.submission;

  // Fetch runs for this job, ordered by createdAt desc (avoids string-sort
  // issues with Run Number). Client-side sort by Run Number as fallback.
  const runsParams = useMemo(
    () =>
      jobId
        ? {
            kapp: kappSlug,
            form: 'scheduled-job-runs',
            search: {
              include: ['values'],
              limit: 100,
              q: `values[Job ID] = "${jobId}"`,
              orderBy: 'createdAt',
              direction: 'DESC',
            },
          }
        : null,
    [jobId, kappSlug],
  );
  const { loading, response: runsResponse } = useData(
    searchSubmissions,
    runsParams,
  );
  const runs = runsResponse?.submissions ?? [];

  if (loading || !job) return <Loading />;

  return (
    <>
      <div className="mb-4">
        <Link
          to="/admin/scheduled-jobs"
          className="klink text-sm flex-sc gap-1 mb-2"
        >
          <Icon name="arrow-left" size={14} /> Back to Scheduled Jobs
        </Link>
        <PageHeading
          title={`${job.values['Job Name']} — Run History`}
          icon="history"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="ktable ktable-zebra w-full">
          <thead>
            <tr>
              <th>Run #</th>
              <th>Status</th>
              <th>Started</th>
              <th>Duration</th>
              <th>Next Run</th>
              <th>Output</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center ktext-base-content/60 py-8"
                >
                  No runs recorded yet.
                </td>
              </tr>
            )}
            {runs.map(run => {
              const v = run.values;
              return (
                <tr key={run.id}>
                  <td>{v['Run Number']}</td>
                  <td>
                    <span
                      className={clsx(
                        'kbadge kbadge-sm',
                        runStatusColors[v['Status']] || 'kbadge-ghost',
                      )}
                    >
                      {v['Status']}
                    </span>
                  </td>
                  <td className="text-sm">
                    {v['Started At']
                      ? new Date(v['Started At']).toLocaleString()
                      : '—'}
                  </td>
                  <td className="text-sm">{formatDuration(v['Duration Ms'])}</td>
                  <td className="text-sm ktext-base-content/60">
                    {v['Next Run At']
                      ? new Date(v['Next Run At']).toLocaleString()
                      : '—'}
                  </td>
                  <td className="text-sm max-w-xs">
                    {v['Routine Output'] ? (
                      <details>
                        <summary className="cursor-pointer ktext-base-content/60">
                          {v['Routine Output'].slice(0, 50)}
                          {v['Routine Output'].length > 50 ? '...' : ''}
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-base-200 rounded overflow-x-auto whitespace-pre-wrap">
                          {v['Routine Output']}
                        </pre>
                      </details>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-sm max-w-xs">
                    {v['Error Details'] ? (
                      <details>
                        <summary className="cursor-pointer text-error">
                          {v['Error Details'].slice(0, 50)}
                          {v['Error Details'].length > 50 ? '...' : ''}
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-error/10 rounded overflow-x-auto whitespace-pre-wrap">
                          {v['Error Details']}
                        </pre>
                      </details>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};
