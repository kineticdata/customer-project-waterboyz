import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import clsx from 'clsx';
import { Icon } from '../../atoms/Icon.jsx';
import { PageHeading } from '../../components/PageHeading.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { useRoles } from '../../helpers/hooks/useRoles.js';

const AdminCard = ({ icon = 'settings', to, label, description }) => {
  const mobile = useSelector(state => state.view.mobile);
  return (
    <Link
      to={to}
      className={clsx(
        'md:col-start-1 md:col-end-5 md:grid md:grid-cols-[subgrid]',
        'group relative',
      )}
    >
      <div
        className={clsx(
          'flex py-1.25 px-3',
          'md:col-start-1 md:col-end-5 md:grid md:grid-cols-[subgrid] md:py-2.75 md:px-6',
          'group relative gap-3 items-center min-h-16 rounded-box bg-base-100 border transition',
          'hover:bg-base-200 focus-within:bg-base-200',
        )}
      >
        <div className="icon-box flex-none">
          <Icon name={icon} />
        </div>
        {mobile ? (
          <div className="flex flex-col gap-1 min-w-0">
            <div className="font-medium leading-4 line-clamp-2">{label}</div>
            <div className="text-gray-900 text-xs line-clamp-2">{description}</div>
          </div>
        ) : (
          <>
            <div className="font-medium leading-5 line-clamp-2">{label}</div>
            <div className="text-gray-900 line-clamp-2">{description}</div>
          </>
        )}
      </div>
    </Link>
  );
};

export const Admin = ({ adminForms }) => {
  const { isAdmin } = useRoles();

  const staticCards = [
    {
      icon: 'report-analytics',
      label: 'SWAT Reports',
      description:
        'Project reporting by county, hours, and family type for grant applications.',
      to: '/admin/reports',
    },
    {
      icon: 'table',
      label: 'Volunteer Management',
      description:
        'Search and filter all volunteers by skills, location, language, and more.',
      to: '/admin/volunteer-management',
    },
    {
      icon: 'mail',
      label: 'Volunteer Notifications',
      description:
        'Send mass email notifications to volunteers about upcoming projects.',
      to: '/admin/notify-volunteers',
    },
    {
      icon: 'users-group',
      label: 'Captain Management',
      description: 'Add or remove members of the Project Captains team.',
      to: '/admin/captain-management',
    },
    isAdmin && {
      icon: 'database',
      label: 'Datastore',
      description: 'Browse and edit all datastore records.',
      to: '/settings/datastore',
    },
  ].filter(Boolean);

  if (!adminForms) {
    return (
      <div className="max-w-screen-lg pt-6 pb-6">
        <PageHeading title="Admin" backTo="/" />
        <Loading />
      </div>
    );
  }

  const dynamicCards = adminForms.map(form => ({
    icon: form.attributesMap?.['Icon']?.[0] || 'settings',
    label: form.name,
    description: form.description,
    to: `/admin/${form.slug}`,
  }));

  const cards = [...dynamicCards, ...staticCards];

  return (
    <div className="max-w-screen-lg pt-6 pb-6">
      <PageHeading title="Admin" backTo="/" />
      <div className="flex flex-col gap-4 mb-4 md:mb-6 md:grid md:grid-cols-[auto_auto_1fr]">
        {cards.map(card => (
          <AdminCard key={card.to} {...card} />
        ))}
      </div>
    </div>
  );
};
