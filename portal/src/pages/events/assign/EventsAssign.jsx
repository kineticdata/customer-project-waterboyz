import { useCallback, useState } from 'react';
import { updateSubmission } from '@kineticdata/react';
import { Loading } from '../../../components/states/Loading.jsx';
import { PageHeading } from '../../../components/PageHeading.jsx';
import { VolunteerDetailModal } from '../../../components/VolunteerDetailModal.jsx';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';
import { toArray } from '../../../helpers/format.js';
import { useAssignData } from './useAssignData.js';
import { useStagedAssignments } from './useStagedAssignments.js';
import { AssignDragDropContext } from './DragDropContext.jsx';
import { AssignFilters } from './AssignFilters.jsx';
import { VolunteerPanel } from './VolunteerPanel.jsx';
import { ProjectPanel } from './ProjectPanel.jsx';
import { ProjectDetailModal } from './ProjectDetailModal.jsx';
import { SaveBar } from './SaveBar.jsx';

export const EventsAssign = () => {
  const {
    initialized,
    event,
    signups,
    projects,
    assignments,
    volunteersById,
    signupByVolunteerId,
    signupsByOrg,
    allSkills,
    skillCounts,
    reload,
  } = useAssignData();

  const {
    stagedMap,
    serverMap,
    pendingChanges,
    dirty,
    saving,
    stageAssignment,
    unstageAssignment,
    discardChanges,
    saveChanges,
  } = useStagedAssignments({
    assignments,
    signupByVolunteerId,
    reload,
    initialized,
  });

  // Filter state
  const [orgFilter, setOrgFilter] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState([]);
  const [skillFilterOpen, setSkillFilterOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState({});

  // Detail modals
  const [volunteerModal, setVolunteerModal] = useState(null);
  const [projectModal, setProjectModal] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelSignup = useCallback(async (signup) => {
    setCancelling(true);
    const result = await updateSubmission({
      id: signup.id,
      values: { 'Signup Status': 'Cancelled' },
    });
    if (result?.error) {
      toastError({ title: 'Unable to cancel signup', description: result.error.message });
    } else {
      toastSuccess({ title: 'Signup cancelled.' });
      setVolunteerModal(null);
      reload();
    }
    setCancelling(false);
  }, [reload]);

  const toggleSkill = useCallback(skill => {
    setSkillFilter(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill],
    );
  }, []);

  const toggleProject = useCallback(projectId => {
    setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  }, []);

  // Filter logic — hide volunteers that are staged to a project
  const filterSignups = useCallback(
    list => {
      let filtered = list;
      if (nameSearch) {
        const term = nameSearch.toLowerCase();
        filtered = filtered.filter(signup => {
          const vid = signup.values?.['Volunteer ID'];
          const vol = volunteersById[vid];
          const first =
            vol?.values?.['First Name'] ?? signup?.values?.['First Name'] ?? '';
          const last =
            vol?.values?.['Last Name'] ?? signup?.values?.['Last Name'] ?? '';
          return `${first} ${last}`.toLowerCase().includes(term);
        });
      }
      if (skillFilter.length > 0) {
        const skillSet = new Set(skillFilter);
        filtered = filtered.filter(signup => {
          const vid = signup.values?.['Volunteer ID'];
          const vol = volunteersById[vid];
          return toArray(vol?.values?.['Skill Areas']).some(s =>
            skillSet.has(s),
          );
        });
      }
      return filtered;
    },
    [nameSearch, skillFilter, volunteersById],
  );

  if (!initialized) return <Loading />;

  const filteredSignupsByOrg = orgFilter
    ? signupsByOrg.filter(([org]) => org === orgFilter)
    : signupsByOrg;

  const allOrgs = signupsByOrg.map(([org]) => org);

  // Count visible volunteers (not staged to any project)
  const filteredCount = filteredSignupsByOrg.reduce(
    (sum, [, orgSignups]) =>
      sum +
      filterSignups(orgSignups).filter(s => {
        const vid = s.values?.['Volunteer ID'];
        return !vid || !stagedMap[vid];
      }).length,
    0,
  );

  // Count how many are saved (in serverMap)
  const savedCount = Object.keys(serverMap).length;

  return (
    <AssignDragDropContext
      stageAssignment={stageAssignment}
      unstageAssignment={unstageAssignment}
      volunteersById={volunteersById}
      signupByVolunteerId={signupByVolunteerId}
    >
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-xl mx-auto pt-6 pb-6">
          <PageHeading
            title={
              event
                ? `Assign: ${event.values?.['Event Name']}`
                : 'Assign Volunteers'
            }
            backTo="/events"
          >
            <span className="text-sm text-base-content/50 font-medium ml-auto">
              {signups.length} signed up · {savedCount} assigned
            </span>
          </PageHeading>

          <AssignFilters
            nameSearch={nameSearch}
            onNameSearchChange={setNameSearch}
            orgFilter={orgFilter}
            onOrgFilterChange={setOrgFilter}
            allOrgs={allOrgs}
            allSkills={allSkills}
            skillCounts={skillCounts}
            skillFilter={skillFilter}
            onToggleSkill={toggleSkill}
            onClearSkills={() => setSkillFilter([])}
            skillFilterOpen={skillFilterOpen}
            onToggleSkillFilter={() => setSkillFilterOpen(prev => !prev)}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <VolunteerPanel
              signupsByOrg={filteredSignupsByOrg}
              filteredCount={filteredCount}
              totalCount={signups.length}
              filterSignups={filterSignups}
              projects={projects}
              volunteersById={volunteersById}
              stagedMap={stagedMap}
              onStage={stageAssignment}
              onViewVolunteer={setVolunteerModal}
            />

            <ProjectPanel
              projects={projects}
              stagedMap={stagedMap}
              serverMap={serverMap}
              volunteersById={volunteersById}
              signupByVolunteerId={signupByVolunteerId}
              expandedProjects={expandedProjects}
              onToggleProject={toggleProject}
              onUnstage={unstageAssignment}
              onViewProject={setProjectModal}
              onViewVolunteer={setVolunteerModal}
            />
          </div>
        </div>
      </div>

      {dirty && (
        <SaveBar
          pendingChanges={pendingChanges}
          saving={saving}
          onSave={saveChanges}
          onDiscard={discardChanges}
        />
      )}

      <VolunteerDetailModal
        open={!!volunteerModal}
        onClose={() => setVolunteerModal(null)}
        volunteer={volunteerModal?.vol}
        signup={volunteerModal?.signup}
        onCancelSignup={handleCancelSignup}
        cancelling={cancelling}
      />
      <ProjectDetailModal
        project={projectModal}
        open={!!projectModal}
        onClose={() => setProjectModal(null)}
      />
    </AssignDragDropContext>
  );
};
