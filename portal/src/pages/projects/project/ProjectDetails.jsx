import t from 'prop-types';

const PlaceholderSection = ({ title, description }) => (
  <div className="rounded-box border bg-base-100 p-6">
    <div className="text-lg font-semibold">{title}</div>
    <p className="mt-2 text-base-content/70">{description}</p>
  </div>
);

export const ProjectDetails = ({
  project: _project,
  family: _family,
  familyLoading: _familyLoading,
}) => (
  <PlaceholderSection
    title="Project Details"
    description="Update Project Captain and project status."
  />
);

ProjectDetails.propTypes = {
  project: t.object,
  family: t.any,
  familyLoading: t.bool,
};
