import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { defineKqlQuery, searchSubmissions } from '@kineticdata/react';
import { Modal } from '../../../atoms/Modal.jsx';
import { DetailRow, PillList } from '../../../atoms/DetailRow.jsx';
import { toArray } from '../../../helpers/format.js';
import { formatLocalDate } from '../../../helpers/index.js';
import { useData } from '../../../helpers/hooks/useData.js';

const notesQuery = defineKqlQuery()
  .equals('values[Project ID]', 'projectId')
  .end();

const fetchLatestNote = ({ kappSlug, projectId }) =>
  searchSubmissions({
    kapp: kappSlug,
    form: 'project-notes',
    search: {
      q: notesQuery({ projectId }),
      include: ['values'],
      limit: 1,
      orderBy: 'createdAt',
      direction: 'DESC',
    },
  });

export const ProjectDetailModal = ({ project, open, onClose }) => {
  const { kappSlug } = useSelector(state => state.app);
  const projectId = project?.id;
  const noteParams = useMemo(
    () => (projectId && open ? { kappSlug, projectId } : null),
    [kappSlug, projectId, open],
  );
  const { response: noteResponse } = useData(fetchLatestNote, noteParams);
  const latestNotes =
    noteResponse?.submissions?.[0]?.values?.['Content'] ||
    project?.values?.['Project Notes'] ||
    '';

  const skillsNeeded = toArray(project?.values?.['Skills Needed']);
  const equipmentNeeded = toArray(project?.values?.['Equipment Needed']);

  return (
    <Modal
      open={open}
      onOpenChange={({ open: isOpen }) => !isOpen && onClose()}
      title={project?.values?.['Project Name'] || 'Project Details'}
      size="md"
    >
      <div slot="body">
        <div className="flex-c-st gap-5 py-2">
          <div className="grid grid-cols-2 gap-4">
            {project?.values?.['Scheduled Date'] && (
              <DetailRow label="Scheduled Date">
                <p className="text-sm">
                  {formatLocalDate(project.values['Scheduled Date'])}
                </p>
              </DetailRow>
            )}
            {project?.values?.['Project Status'] && (
              <DetailRow label="Status">
                <p className="text-sm">{project.values['Project Status']}</p>
              </DetailRow>
            )}
          </div>

          {(project?.values?.['City'] || project?.values?.['State']) && (
            <DetailRow label="Location">
              <p className="text-sm">
                {[
                  project.values?.['Address Line 1'],
                  project.values?.['City'],
                  project.values?.['State'],
                  project.values?.['Zip'],
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </DetailRow>
          )}

          {project?.values?.['Additional Volunteers Needed'] && (
            <DetailRow label="Volunteers Needed">
              <p className="text-sm">
                {project.values['Additional Volunteers Needed']}
              </p>
            </DetailRow>
          )}

          <DetailRow label="Skills Needed">
            <PillList items={skillsNeeded} emptyText="None specified." />
          </DetailRow>

          <DetailRow label="Equipment Needed">
            <PillList items={equipmentNeeded} emptyText="None specified." />
          </DetailRow>

          {latestNotes && (
            <DetailRow label="Project Notes">
              <p className="text-sm text-base-content/70 whitespace-pre-wrap">
                {latestNotes}
              </p>
            </DetailRow>
          )}
        </div>
      </div>
    </Modal>
  );
};
