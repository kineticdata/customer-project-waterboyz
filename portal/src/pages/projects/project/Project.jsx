import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchSubmission } from '@kineticdata/react';
import { Loading } from '../../../components/states/Loading.jsx';
import { Error } from '../../../components/states/Error.jsx';
import { useData } from '../../../helpers/hooks/useData.js';
import { PageHeading } from '../../../components/PageHeading.jsx';
import clsx from 'clsx';
import { Panel } from '../../../atoms/Panel.jsx';
import { Icon } from '../../../atoms/Icon.jsx';
import { executeIntegration } from '../../../helpers/api.js';
import { FamilyInformation } from './FamilyInformation.jsx';
import { ProjectDetails } from './ProjectDetails.jsx';
import { ProjectExpenses } from './ProjectExpenses.jsx';
import { ProjectNotes } from './ProjectNotes.jsx';
import { ProjectPhotos } from './ProjectPhotos.jsx';
import { ProjectTasks } from './ProjectTasks.jsx';
import { Volunteers } from './Volunteers.jsx';

const navItems = [
  { label: 'Family Information', to: 'family' },
  { label: 'Volunteers', to: 'volunteers' },
  { label: 'Notes', to: 'notes' },
  { label: 'Tasks', to: 'tasks' },
  { label: 'Expenses', to: 'expenses' },
  { label: 'Details', to: 'details' },
  { label: 'Photos', to: 'photos' },
];

export const Project = () => {
  const { submissionId } = useParams();
  const location = useLocation();
  const { kappSlug } = useSelector(state => state.app);
  const mobile = useSelector(state => state.view.mobile);
  const backTo = location.state?.backPath || '/projects';
  const [navOpen, setNavOpen] = useState(false);
  const [family, setFamily] = useState(null);
  const [familyRecord, setFamilyRecord] = useState(null);
  const [familyError, setFamilyError] = useState(null);

  const activeKey = location.pathname.split('/').pop();
  const activeLabel =
    navItems.find(item => item.to === activeKey)?.label || 'Sections';

  const params = useMemo(
    () => ({
      id: submissionId,
      include:
        'activities,activities.details,details,form.attributesMap[Icon],form.pages,values,values.raw',
    }),
    [submissionId],
  );
  const {
    response,
    actions: { reloadData: reloadProject },
  } = useData(fetchSubmission, params);
  const { error, submission: data } = response || {};

  const familyId = data?.values?.['Family ID'] || null;
  const familyParams = useMemo(
    () =>
      familyId
        ? {
            kappSlug,
            integrationName: 'Family - Retrieve By ID',
            parameters: { 'Family ID': familyId },
          }
        : null,
    [kappSlug, familyId],
  );
  const {
    response: familyResponse,
    actions: { reloadData: reloadFamily },
    loading: familyLoading,
  } = useData(executeIntegration, familyParams);

  useEffect(() => {
    if (!familyResponse) return;
    if (familyResponse.error) {
      setFamilyError(familyResponse.error);
      return;
    }

    const rawFamily =
      familyResponse.Result ||
      familyResponse.family ||
      familyResponse.data ||
      familyResponse;

    const getValue = (record, label) => {
      if (!record) return null;
      const direct = record[label];
      if (direct !== undefined && direct !== null && direct !== '') return direct;
      return null;
    };

    const firstName = getValue(rawFamily, 'First Name');
    const lastName = getValue(rawFamily, 'Last Name');
    const phone = getValue(rawFamily, 'Phone Number');
    const phoneDigits = phone ? String(phone).replace(/[^\d+]/g, '') : '';
    const address1 = getValue(rawFamily, 'Address Line 1');
    const address2 = getValue(rawFamily, 'Address Line 2');
    const city = getValue(rawFamily, 'City');
    const county = getValue(rawFamily, 'County');
    const state = getValue(rawFamily, 'State');
    const zip = getValue(rawFamily, 'Zip');

    const addressLines = [address1, address2].filter(Boolean);
    const cityLine = [city, state, zip].filter(Boolean).join(', ');
    const fullAddress = [addressLines.join(' '), cityLine]
      .filter(Boolean)
      .join(', ');

    const familyRecordParsed = {
      raw: rawFamily,
      firstName,
      lastName,
      phone,
      phoneDigits,
      nativeLanguage: getValue(rawFamily, 'Native Language'),
      needsInterpreter: getValue(rawFamily, 'Needs Interpreter'),
      address1,
      address2,
      city,
      county,
      state,
      zip,
      addressLines,
      cityLine,
      fullAddress,
      familyId: getValue(rawFamily, 'Family ID'),
    };

    setFamilyError(null);
    setFamily(rawFamily);
    setFamilyRecord(familyRecordParsed);
  }, [familyResponse]);

  if (!data && !error) {
    return (
      <div className="gutter">
        <div className="max-w-screen-xl pt-1 pb-6">
          <Loading />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gutter">
        <div className="max-w-screen-xl pt-1 pb-6">
          <Error error={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="gutter">
      <div className="max-w-screen-xl pt-1 pb-6">
        <PageHeading
          title={data?.label || 'Project'}
          backTo={backTo}
          className="flex-wrap"
          before={
            mobile ? (
              <Link
                className="kbtn kbtn-ghost kbtn-sm kbtn-circle"
                to={backTo}
                aria-label="Back to projects"
              >
                <Icon name="arrow-left" />
              </Link>
            ) : null
          }
        >
        </PageHeading>

        <div className="mt-4 gap-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
          {mobile ? (
            <Panel open={navOpen} onOpenChange={({ open }) => setNavOpen(open)}>
              <button
                type="button"
                className="kbtn kbtn-alert w-full justify-between mb-3"
                slot="trigger"
              >
                {activeLabel}
                <Icon name="chevron-down" />
              </button>
              <div slot="content" className="flex-c-st gap-6">
                <div className="flex-bc gap-3">
                  <span className="h3">Project Sections</span>
                  <button
                    className="kbtn kbtn-sm kbtn-circle kbtn-alert absolute right-2 top-2"
                    onClick={() => setNavOpen(false)}
                    aria-label="Close"
                  >
                    <Icon name="x" size={20} />
                  </button>
                </div>
                <nav className="flex flex-col gap-2">
                  {navItems.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setNavOpen(false)}
                      className={({ isActive }) =>
                        clsx(
                          'kbtn kbtn-ghost justify-start',
                          isActive && 'kbtn-neutral',
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
            </Panel>
          ) : (
            <nav className="flex flex-col gap-2">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'kbtn kbtn-ghost justify-start',
                      isActive && 'kbtn-neutral',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="flex flex-col gap-4">
            {familyError && (
              <div className="rounded-box border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                Unable to load family information.
                <button
                  type="button"
                  className="kbtn kbtn-xs kbtn-ghost ml-2"
                  onClick={reloadFamily}
                >
                  Retry
                </button>
              </div>
            )}
            <Routes>
              <Route index element={<Navigate to="family" replace />} />
              <Route
                path="family"
                element={
                  <FamilyInformation
                    project={data}
                    family={family}
                    familyRecord={familyRecord}
                    familyLoading={familyLoading}
                  />
                }
              />
              <Route
                path="volunteers"
                element={
                  <Volunteers
                    project={data}
                    family={family}
                    familyRecord={familyRecord}
                    familyLoading={familyLoading}
                  />
                }
              />
              <Route
                path="notes"
                element={
                  <ProjectNotes
                    project={data}
                    family={family}
                    familyRecord={familyRecord}
                    familyLoading={familyLoading}
                    reloadProject={reloadProject}
                  />
                }
              />
              <Route
                path="tasks"
                element={<ProjectTasks project={data} reloadProject={reloadProject} />}
              />
              <Route
                path="expenses"
                element={
                  <ProjectExpenses
                    project={data}
                    family={family}
                    familyRecord={familyRecord}
                    familyLoading={familyLoading}
                  />
                }
              />
              <Route
                path="details"
                element={
                  <ProjectDetails
                    project={data}
                    family={family}
                    familyRecord={familyRecord}
                    familyLoading={familyLoading}
                  />
                }
              />
              <Route
                path="photos"
                element={
                  <ProjectPhotos
                    project={data}
                    family={family}
                    familyRecord={familyRecord}
                    familyLoading={familyLoading}
                    reloadProject={reloadProject}
                  />
                }
              />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};
