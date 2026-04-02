import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { createSubmission, defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { Icon } from '../../atoms/Icon.jsx';
import { Error } from '../../components/states/Error.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { formatLocalDate } from '../../helpers/index.js';
import { useData } from '../../helpers/hooks/useData.js';
import { getAttributeValue } from '../../helpers/records.js';
import { toastError, toastSuccess } from '../../helpers/toasts.js';

const LONG_DATE_OPTIONS = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

const parseList = value => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // Not JSON, try comma-separated
  }
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
};

export const UpcomingProjectDetail = ({ projects, captainsByUsername, loading, error }) => {
  const { projectId } = useParams();
  const project = projects?.find(p => p['Project Id'] === projectId);

  const { kappSlug } = useSelector(state => state.app);
  const profile = useSelector(state => state.app.profile);
  const volunteerId = getAttributeValue(profile, 'Volunteer Id');

  // Check for existing association with this project
  // Note: project['Project Id'] from the integration IS the swat-projects submission ID
  const associationParams = useMemo(
    () => {
      if (!volunteerId || !project) return null;
      const q = defineKqlQuery()
        .equals('values[Volunteer ID]', 'volunteerId')
        .equals('values[Project ID]', 'projectId')
        .end();
      return {
        kapp: kappSlug,
        form: 'swat-project-volunteers',
        search: {
          q: q({ volunteerId, projectId: project['Project Id'] }),
          include: ['details', 'values'],
          limit: 5,
        },
      };
    },
    [kappSlug, volunteerId, project],
  );

  const { initialized: assocInit, loading: assocLoading, response: assocResponse } =
    useData(searchSubmissions, associationParams);

  // Find active or pending association (ignore Removed)
  const existingAssociation = useMemo(() => {
    const submissions = assocResponse?.submissions ?? [];
    return submissions.find(
      s =>
        s.values?.['Status'] === 'Active' ||
        s.values?.['Status'] === 'Pending Approval',
    );
  }, [assocResponse]);

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRequestToJoin = useCallback(async () => {
    if (!volunteerId || !project) return;
    setSubmitting(true);

    const result = await createSubmission({
      kappSlug,
      formSlug: 'request-to-join-swat-project',
      values: {
        'Project ID': project['Project Id'],
        'Volunteer ID': volunteerId,
        'Project Name': project['Project Name'] || '',
        Notes: notes.slice(0, 500),
      },
    });

    if (result?.error) {
      toastError({
        title: 'Unable to send request',
        description: result.error.message,
      });
    } else {
      toastSuccess({ title: 'Request sent!' });
      setSubmitted(true);
    }
    setSubmitting(false);
  }, [kappSlug, volunteerId, project, notes]);

  if (error) {
    return (
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-lg mx-auto pt-6 pb-6">
          <PageHeading title="Project Details" backTo="/upcoming-projects" />
          <Error error={error} />
        </div>
      </div>
    );
  }

  if (loading && !project) {
    return (
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-lg mx-auto pt-6 pb-6">
          <PageHeading title="Project Details" backTo="/upcoming-projects" />
          <Loading />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-lg mx-auto pt-6 pb-6">
          <PageHeading title="Project Details" backTo="/upcoming-projects" />
          <div className="rounded-box border border-base-200 bg-base-100 p-10 text-center">
            <Icon
              name="alert-circle"
              size={40}
              className="mx-auto text-base-content/20 mb-3"
            />
            <p className="text-base-content/50 font-medium">
              Project not found
            </p>
          </div>
        </div>
      </div>
    );
  }

  const projectName = project['Project Name'] || 'Untitled Project';
  const scheduledDate = project['Scheduled Date'];
  const city = project['City'];
  const state = project['State'];
  const skillsNeeded = parseList(project['Skills Needed']);
  const equipmentNeeded = parseList(project['Equipment Needed']);
  const location = [city, state].filter(Boolean).join(', ');
  const captain = captainsByUsername?.[project['Project Captain']];
  const captainName = captain?.['User Display Name'] || project['Project Captain'];
  const captainEmail = captain?.['User Email'];

  return (
    <div className="gutter pb-24 md:pb-8">
      <div className="max-w-screen-lg mx-auto pt-1 pb-6">
        <PageHeading title={projectName} backTo="/upcoming-projects" />

        <div className="flex-c-st gap-6">
          {/* Project Info Card */}
          <div className="bg-base-100 rounded-box border border-base-200 p-6">
            <div className="flex-sc gap-4 flex-wrap">
              {scheduledDate && (
                <div className="flex-sc gap-2">
                  <div className="flex-cc w-10 h-10 rounded-lg bg-primary/10 text-primary">
                    <Icon name="calendar" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-base-content/50 font-medium">
                      Scheduled Date
                    </p>
                    <p className="font-semibold">{formatLocalDate(scheduledDate, LONG_DATE_OPTIONS)}</p>
                  </div>
                </div>
              )}
              {location && (
                <div className="flex-sc gap-2">
                  <div className="flex-cc w-10 h-10 rounded-lg bg-accent/10 text-accent">
                    <Icon name="map-pin" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-base-content/50 font-medium">
                      Location
                    </p>
                    <p className="font-semibold">{location}</p>
                  </div>
                </div>
              )}
              {captainName && (
                <div className="flex-sc gap-2">
                  <div className="flex-cc w-10 h-10 rounded-lg bg-secondary/10 text-secondary">
                    <Icon name="user-star" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-base-content/50 font-medium">
                      Project Captain
                    </p>
                    <p className="font-semibold">{captainName}</p>
                    {captainEmail && (
                      <a
                        href={`mailto:${captainEmail}`}
                        className="text-xs text-primary hover:underline"
                      >
                        {captainEmail}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Skills Needed */}
          {skillsNeeded.length > 0 && (
            <div className="bg-base-100 rounded-box border border-base-200 p-6">
              <h3 className="text-base font-semibold mb-4 flex-sc gap-2">
                <Icon name="tools" size={20} className="text-primary" />
                Skills Needed
              </h3>
              <div className="flex flex-wrap gap-2">
                {skillsNeeded.map(skill => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Equipment Needed */}
          {equipmentNeeded.length > 0 && (
            <div className="bg-base-100 rounded-box border border-base-200 p-6">
              <h3 className="text-base font-semibold mb-4 flex-sc gap-2">
                <Icon name="tool" size={20} className="text-accent" />
                Equipment Needed
              </h3>
              <div className="flex flex-wrap gap-2">
                {equipmentNeeded.map(item => (
                  <span
                    key={item}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-accent/10 text-accent"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* No skills or equipment info */}
          {skillsNeeded.length === 0 && equipmentNeeded.length === 0 && (
            <div className="rounded-box border border-base-200 bg-base-100 p-8 text-center">
              <p className="text-base-content/50 text-sm">
                No specific skills or equipment listed for this project yet.
              </p>
            </div>
          )}

          {/* Request to Join */}
          <div className="bg-base-100 rounded-box border border-base-200 p-6">
            {!profile ? null : !volunteerId ? (
              <div className="text-center">
                <Icon name="user-heart" size={36} className="mx-auto text-base-content/20 mb-3" />
                <p className="text-base-content/50 font-medium text-sm">
                  Complete your volunteer profile to request to join this project
                </p>
                <Link
                  to="/profile?tab=volunteer"
                  className="kbtn kbtn-primary kbtn-sm mt-3"
                >
                  Complete Volunteer Profile
                </Link>
              </div>
            ) : !assocInit || assocLoading ? (
              <div className="flex-cc py-2">
                <span className="kloading kloading-spinner kloading-sm" />
              </div>
            ) : submitted || existingAssociation?.values?.['Status'] === 'Pending Approval' ? (
              <div className="flex-sc gap-3">
                <div className="flex-cc w-10 h-10 rounded-lg bg-warning/10 text-warning">
                  <Icon name="clock" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-sm">Request Pending</p>
                  <p className="text-xs text-base-content/50">
                    Your request to join this project is awaiting captain approval.
                  </p>
                </div>
              </div>
            ) : existingAssociation?.values?.['Status'] === 'Active' ? (
              <div className="flex-sc gap-3">
                <div className="flex-cc w-10 h-10 rounded-lg bg-success/10 text-success">
                  <Icon name="circle-check" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-sm">You&apos;re assigned to this project</p>
                  <p className="text-xs text-base-content/50">
                    Check My Volunteering for project details.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-semibold mb-2 flex-sc gap-2">
                  <Icon name="heart-handshake" size={20} className="text-primary" />
                  Interested in This Project?
                </h3>
                <p className="text-sm text-base-content/60 mb-4">
                  Request to join and the Project Captain will review your volunteer profile.
                </p>
                <textarea
                  className="ktextarea ktextarea-bordered w-full mb-3"
                  placeholder="Optional: Why do you want to join this project?"
                  maxLength={500}
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <div className="flex-sc gap-2">
                  <button
                    type="button"
                    className="kbtn kbtn-primary kbtn-sm"
                    onClick={handleRequestToJoin}
                    disabled={submitting}
                  >
                    {submitting ? 'Sending...' : 'Request to Join'}
                  </button>
                  {notes.length > 0 && (
                    <span className="text-xs text-base-content/40">
                      {notes.length}/500
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
