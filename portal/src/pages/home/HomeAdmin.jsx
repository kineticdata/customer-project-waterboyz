import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchForms } from '@kineticdata/react';
import { Icon } from '../../atoms/Icon.jsx';
import { useData } from '../../helpers/hooks/useData.js';
import { HomeHero } from '../../components/home/HomeHero.jsx';
import { HomeSection } from '../../components/home/HomeSection.jsx';
import { WorkList, Shortcuts } from './Home.jsx';

const STATIC_LINKS = [
  {
    to: '/admin/volunteers',
    icon: 'users',
    label: 'Volunteers',
    description: 'View volunteer directory',
  },
  {
    to: '/project-captains',
    icon: 'tool',
    label: 'Projects',
    description: 'View all SWAT projects',
  },
];

export const HomeAdmin = () => {
  const { profile, kappSlug } = useSelector(state => state.app);

  const adminFormsParams = useMemo(
    () => ({
      kappSlug,
      include: 'attributesMap',
      q: 'type = "Admin" AND (status = "Active" OR status = "New")',
    }),
    [kappSlug],
  );

  const { response } = useData(fetchForms, adminFormsParams);

  const adminLinks = useMemo(() => {
    const dynamic = (response?.forms ?? []).map(form => ({
      to: `/admin/${form.slug}`,
      icon: form.attributesMap?.['Icon']?.[0] || 'settings',
      label: form.name,
      description: form.description || '',
    }));
    return [...dynamic, ...STATIC_LINKS];
  }, [response]);

  return (
    <div className="flex-c-st gap-0 pb-24 md:pb-8">
      <HomeHero
        eyebrow="Admin"
        title={profile?.displayName}
        subtitle="Manage the Waterboyz portal."
      />

      {/* Admin Quick Nav — custom "Admin area" link instead of generic "View all" */}
      <HomeSection title="Administration" viewAllTo="/admin">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {adminLinks.map(({ to, icon, label, description }) => (
            <Link
              key={to}
              to={to}
              className="flex-c-cc gap-2 p-4 bg-base-100 rounded-box border border-base-200 text-center hover:bg-base-200/60 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex-cc w-10 h-10 rounded-full bg-primary/10 text-primary">
                <Icon name={icon} size={20} />
              </div>
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs text-base-content/50 leading-snug">
                {description}
              </span>
            </Link>
          ))}
        </div>
      </HomeSection>

      <HomeSection title="My Tasks" viewAllTo="/actions">
        <div className="bg-base-100 rounded-box border border-base-200 overflow-hidden">
          <WorkList limit={5} />
        </div>
      </HomeSection>

      <Shortcuts className="gutter mt-8 md:mt-10 pb-4" />
    </div>
  );
};
