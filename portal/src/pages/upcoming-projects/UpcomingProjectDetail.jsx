import { useParams } from 'react-router-dom';
import { Icon } from '../../atoms/Icon.jsx';
import { Error } from '../../components/states/Error.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';

const formatDate = value => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

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

export const UpcomingProjectDetail = ({ projects, loading, error }) => {
  const { projectId } = useParams();
  const project = projects?.find(p => p['Project Id'] === projectId);

  if (error) {
    return (
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-lg mx-auto pt-1 pb-6">
          <PageHeading title="Project Details" backTo="/upcoming-projects" />
          <Error error={error} />
        </div>
      </div>
    );
  }

  if (loading && !project) {
    return (
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-lg mx-auto pt-1 pb-6">
          <PageHeading title="Project Details" backTo="/upcoming-projects" />
          <Loading />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-lg mx-auto pt-1 pb-6">
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
                    <p className="font-semibold">{formatDate(scheduledDate)}</p>
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
        </div>
      </div>
    </div>
  );
};
