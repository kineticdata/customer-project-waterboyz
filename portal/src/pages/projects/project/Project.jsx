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
import clsx from 'clsx';
import { Panel } from '../../../atoms/Panel.jsx';
import { Icon } from '../../../atoms/Icon.jsx';
import { executeIntegration } from '../../../helpers/api.js';
import { ProjectDetails } from './ProjectDetails.jsx';
import { ProjectExpenses } from './ProjectExpenses.jsx';
import { ProjectNotes } from './ProjectNotes.jsx';
import { ProjectPhotos } from './ProjectPhotos.jsx';
import { ProjectTasks } from './ProjectTasks.jsx';
import { ProjectInstructions } from './ProjectInstructions.jsx';
import { Volunteers } from './Volunteers.jsx';

const fetchCaptains = ({ kappSlug }) =>
  executeIntegration({
    kappSlug,
    integrationName: 'Project Captains Retrieve',
  });

const navItems = [
  { label: 'Instructions', to: 'instructions', icon: 'list-check' },
  { label: 'Details', to: 'details', icon: 'info-circle' },
  { label: 'Volunteers', to: 'volunteers', icon: 'heart-handshake' },
  { label: 'Notes', to: 'notes', icon: 'notes' },
  { label: 'Tasks', to: 'tasks', icon: 'checklist' },
  { label: 'Expenses', to: 'expenses', icon: 'receipt', disabled: true },
  { label: 'Photos', to: 'photos', icon: 'camera' },
];

export const Project = () => {
  const { submissionId } = useParams();
  const location = useLocation();
  const { kappSlug } = useSelector(state => state.app);
  const mobile = useSelector(state => state.view.mobile);
  const backTo = location.state?.backPath || '/project-captains';
  const captainsParams = useMemo(() => ({ kappSlug }), [kappSlug]);
  const { response: captainsResponse } = useData(fetchCaptains, captainsParams);
  const [navOpen, setNavOpen] = useState(false);
  const [family, setFamily] = useState(null);
  const [familyRecord, setFamilyRecord] = useState(null);
  const [familyError, setFamilyError] = useState(null);

  const activeKey = location.pathname.split('/').pop();
  const activeItem = navItems.find(item => item.to === activeKey);
  const activeLabel = activeItem?.label || 'Sections';

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
    const email = getValue(rawFamily, 'Email');
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
      email,
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
        <div className="max-w-screen-xl mx-auto pt-8 pb-6">
          <Loading />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gutter">
        <div className="max-w-screen-xl mx-auto pt-8 pb-6">
          <Error error={error} />
        </div>
      </div>
    );
  }

  const projectStatus = data?.values?.['Project Status'] || 'Active';

  return (
    <div className="pb-24 md:pb-8">
      {/* Project header bar */}
      <div className="bg-base-100 border-b border-base-200">
        <div className="gutter py-4 md:py-6">
          <div className="max-w-screen-xl mx-auto">
            <div className="flex-sc gap-3 mb-2">
              <Link
                className="kbtn kbtn-ghost kbtn-sm kbtn-circle"
                to={backTo}
                aria-label="Back to projects"
              >
                <Icon name="arrow-left" />
              </Link>
              <span className="text-sm text-base-content/50 font-medium">
                SWAT Projects
              </span>
            </div>
            <div className="flex-bc flex-wrap gap-3">
              <h1 className="text-xl md:text-2xl font-bold">
                {data?.label || 'Project'}
              </h1>
              <span
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-semibold',
                  projectStatus === 'Active'
                    ? 'bg-success text-success-content'
                    : projectStatus === 'Completed'
                      ? 'bg-primary/15 text-primary'
                      : 'bg-base-300 text-base-content/70',
                )}
              >
                {projectStatus}
              </span>
            </div>
            {data?.values?.['Project Captain'] && (
              <p className="text-sm text-base-content/60 mt-1">
                <span className="font-medium">Captain:</span>{' '}
                {captainsResponse?.['Team Captains']?.find(
                  c => c['User Name'] === data.values['Project Captain'],
                )?.['User Display Name'] || data.values['Project Captain']}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="gutter mt-4 md:mt-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="gap-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* Navigation */}
            {mobile ? (
              <Panel
                open={navOpen}
                onOpenChange={({ open }) => setNavOpen(open)}
              >
                <button
                  type="button"
                  className="kbtn w-full justify-between mb-4 border border-base-200"
                  slot="trigger"
                >
                  <span className="flex-sc gap-2">
                    {activeItem && (
                      <Icon name={activeItem.icon} size={18} />
                    )}
                    {activeLabel}
                  </span>
                  <Icon name="chevron-down" size={18} />
                </button>
                <div slot="content" className="flex-c-st gap-4">
                  <div className="flex-bc gap-3">
                    <span className="h3">Sections</span>
                    <button
                      className="kbtn kbtn-sm kbtn-circle kbtn-ghost absolute right-2 top-2"
                      onClick={() => setNavOpen(false)}
                      aria-label="Close"
                    >
                      <Icon name="x" size={20} />
                    </button>
                  </div>
                  <nav className="flex flex-col gap-1">
                    {navItems.map(item =>
                      item.disabled ? (
                        <span
                          key={item.to}
                          title="Coming soon"
                          className="kbtn kbtn-ghost justify-start gap-3 opacity-40 cursor-not-allowed"
                        >
                          <Icon name={item.icon} size={18} />
                          {item.label}
                          <span className="kbadge kbadge-xs kbadge-ghost ml-auto">
                            Coming soon
                          </span>
                        </span>
                      ) : (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setNavOpen(false)}
                          className={({ isActive }) =>
                            clsx(
                              'kbtn kbtn-ghost justify-start gap-3',
                              isActive && 'bg-primary/8 text-primary',
                            )
                          }
                        >
                          <Icon name={item.icon} size={18} />
                          {item.label}
                        </NavLink>
                      ),
                    )}
                  </nav>
                </div>
              </Panel>
            ) : (
              <nav className="flex flex-col gap-1">
                {navItems.map(item =>
                  item.disabled ? (
                    <span
                      key={item.to}
                      title="Coming soon"
                      className="flex-sc gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-base-content/30 cursor-not-allowed"
                    >
                      <Icon name={item.icon} size={18} />
                      {item.label}
                    </span>
                  ) : (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        clsx(
                          'flex-sc gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/8 text-primary'
                            : 'text-base-content/60 hover:bg-base-200 hover:text-base-content',
                        )
                      }
                    >
                      <Icon name={item.icon} size={18} />
                      {item.label}
                    </NavLink>
                  )
                )}
              </nav>
            )}

            {/* Content */}
            <div className="flex flex-col gap-4">
              {familyError && (
                <div className="rounded-box border border-error/30 bg-error/10 px-4 py-3 text-sm text-error flex-sc gap-2">
                  <Icon name="alert-circle" size={16} />
                  Unable to load family information.
                  <button
                    type="button"
                    className="kbtn kbtn-xs kbtn-ghost ml-auto"
                    onClick={reloadFamily}
                  >
                    Retry
                  </button>
                </div>
              )}
              <Routes>
                <Route index element={<Navigate to="instructions" replace />} />
                <Route
                  path="instructions"
                  element={<ProjectInstructions />}
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
                  element={<ProjectNotes project={data} />}
                />
                <Route
                  path="tasks"
                  element={
                    <ProjectTasks
                      project={data}
                      reloadProject={reloadProject}
                    />
                  }
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
                      familyRecord={familyRecord}
                      familyLoading={familyLoading}
                      reloadProject={reloadProject}
                      captains={captainsResponse?.['Team Captains'] ?? []}
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
    </div>
  );
};
