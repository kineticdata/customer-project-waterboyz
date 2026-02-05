import t from 'prop-types';

const PlaceholderSection = ({ title, description }) => (
  <div className="rounded-box border bg-base-100 p-6">
    <div className="text-lg font-semibold">{title}</div>
    <p className="mt-2 text-base-content/70">{description}</p>
  </div>
);

export const ProjectPhotos = ({
  project: _project,
  family: _family,
  familyLoading: _familyLoading,
}) => (
  <PlaceholderSection
    title="Project Photos"
    description="Before/after photos and uploads."
  />
);

ProjectPhotos.propTypes = {
  project: t.object,
  family: t.any,
  familyLoading: t.bool,
};
