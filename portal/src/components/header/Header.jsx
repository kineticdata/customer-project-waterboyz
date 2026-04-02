import { Fragment } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import logo from '../../assets/images/logo.png';
import { Icon } from '../../atoms/Icon.jsx';
import { HeaderPortal } from './HeaderPortal.jsx';
import { Avatar } from '../../atoms/Avatar.jsx';
import { Popover, usePopover } from '@ark-ui/react/popover';
import clsx from 'clsx';
import { openSearch } from '../../helpers/search.js';
import { FooterPortal } from '../footer/FooterPortal.jsx';
import { useRoles } from '../../helpers/hooks/useRoles.js';
import { useHasNominations } from '../../helpers/hooks/useHasNominations.js';

export const Header = () => {
  const profile = useSelector(state => state.app.profile);
  const themeLogo = useSelector(state => state.theme.data?.logo?.default);
  const mobile = useSelector(state => state.view.mobile);
  const roles = useRoles();
  const { hasProjectAccess } = roles;
  const hasNominations = useHasNominations();

  return (
    <>
      {/* Top navigation bar */}
      <HeaderPortal>
        <nav className="relative flex-sc gap-3 md:gap-5 h-16 md:h-18 px-4 md:px-6 bg-base-100 border-b-3 border-primary shadow-sm z-20">
          <HeaderMenu profile={profile} roles={roles} hasNominations={hasNominations} />
          <Link to="/" className="flex-initial" aria-label="Home">
            <img
              src={themeLogo || logo}
              alt="Waterboyz for Jesus"
              className="h-10 md:h-12 object-contain"
            />
          </Link>
          <div className="mx-auto" />
          {!mobile && (
            <div className="flex-sc gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  clsx(
                    'kbtn kbtn-ghost kbtn-sm font-medium text-base-content/60 hover:text-primary',
                    isActive && '!text-primary !bg-primary/8',
                  )
                }
              >
                Home
              </NavLink>
              {hasNominations && (
                <NavLink
                  to="/nominations"
                  className={({ isActive }) =>
                    clsx(
                      'kbtn kbtn-ghost kbtn-sm font-medium text-base-content/60 hover:text-primary',
                      isActive && '!text-primary !bg-primary/8',
                    )
                  }
                >
                  My Nominations
                </NavLink>
              )}
              <NavLink
                to="/my-volunteering"
                className={({ isActive }) =>
                  clsx(
                    'kbtn kbtn-ghost kbtn-sm font-medium text-base-content/60 hover:text-primary',
                    isActive && '!text-primary !bg-primary/8',
                  )
                }
              >
                My Volunteering
              </NavLink>
              {hasProjectAccess && (
                <NavLink
                  to="/actions"
                  className={({ isActive }) =>
                    clsx(
                      'kbtn kbtn-ghost kbtn-sm font-medium text-base-content/60 hover:text-primary',
                      isActive && '!text-primary !bg-primary/8',
                    )
                  }
                >
                  My Tasks
                </NavLink>
              )}
              {hasProjectAccess && (
                <NavLink
                  to="/project-captains"
                  className={({ isActive }) =>
                    clsx(
                      'kbtn kbtn-ghost kbtn-sm font-medium text-base-content/60 hover:text-primary',
                      isActive && '!text-primary !bg-primary/8',
                    )
                  }
                >
                  Projects
                </NavLink>
              )}
            </div>
          )}
          <div className="mx-auto" />
          <button
            className="kbtn kbtn-ghost kbtn-square kbtn-md text-base-content/60 hover:text-primary"
            onClick={() => openSearch({ searchOnly: true })}
            aria-label="Search"
          >
            <Icon name="search" size={20} />
          </button>
          <Avatar
            username={profile?.username}
            size="md"
            className="flex-none"
            as="link"
            to="/profile"
          />
        </nav>
      </HeaderPortal>

      {/* Mobile bottom navigation */}
      {mobile && <MobileBottomNav roles={roles} hasNominations={hasNominations} />}
    </>
  );
};

const MobileBottomNav = ({ roles, hasNominations }) => {
  const { hasProjectAccess } = roles;
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { label: 'Home', to: '/', icon: 'home', exact: true },
    { label: 'My Volunteering', to: '/my-volunteering', icon: 'heart-handshake' },
    hasNominations && { label: 'My Nominations', to: '/nominations', icon: 'file-text' },
    hasProjectAccess && { label: 'Projects', to: '/project-captains', icon: 'hammer' },
  ].filter(Boolean);

  return (
    <FooterPortal>
      <nav className="flex-bt bg-base-100 border-t border-base-200 px-1 pb-[env(safe-area-inset-bottom)] z-20">
        {navItems.map(item => {
          const isActive = item.exact
            ? currentPath === item.to
            : item.to && currentPath.startsWith(item.to);

          if (item.isAction) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="flex-1 flex-c-sc gap-0.5 py-2 px-1"
              >
                <div className="flex-cc w-10 h-10 rounded-full bg-primary text-primary-content -mt-4 shadow-md">
                  <Icon name="plus" size={22} />
                </div>
                <span className="text-xs font-medium text-primary">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              className="flex-1 flex-c-sc gap-0.5 py-2 px-1"
            >
              <div
                className={clsx(
                  'flex-cc w-10 h-8 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-base-content/50',
                )}
              >
                <Icon name={item.icon} size={20} />
              </div>
              <span
                className={clsx(
                  'text-xs',
                  isActive
                    ? 'font-semibold text-primary'
                    : 'font-medium text-base-content/50',
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </FooterPortal>
  );
};

const getMenuItems = (profile, roles = {}, { hasNominations } = {}) => {
  const { hasProjectAccess, isAdmin, isLeadership } = roles;
  return [
    {
      items: [
        { label: 'Home', to: '/', icon: 'home' },
        { label: 'My Volunteering', to: '/my-volunteering', icon: 'heart-handshake' },
        hasNominations && { label: 'My Nominations', to: '/nominations', icon: 'file-text' },
        !hasProjectAccess && { label: 'Upcoming Projects', to: '/upcoming-projects', icon: 'calendar-event' },
        !(isAdmin || isLeadership) && { label: 'Events', to: '/events', icon: 'calendar-heart' },
        hasProjectAccess && { label: 'My Tasks', to: '/actions', icon: 'clipboard-check' },
        hasProjectAccess && {
          label: 'Projects',
          to: '/project-captains',
          icon: 'hammer',
        },
      ].filter(Boolean),
    },
    (isAdmin || isLeadership) && {
      title: 'Admin',
      defaultOpen: true,
      items: [
        { label: 'Events', to: '/events', icon: 'calendar-heart' },
        { label: 'SWAT Reports', to: '/admin/reports', icon: 'report-analytics' },
        { label: 'Volunteer Management', to: '/admin/volunteer-management', icon: 'table' },
        { label: 'Volunteer Notifications', to: '/admin/notify-volunteers', icon: 'mail' },
        { label: 'Captain Management', to: '/admin/captain-management', icon: 'users-group' },
        { label: 'Settings', to: '/settings/datastore', icon: 'settings' },
      ],
    },
    profile?.spaceAdmin && {
      title: 'System Admin',
      items: [
        { label: 'Theme Editor', to: '/theme', icon: 'palette' },
        {
          label: 'Platform Console',
          href: '/app/console',
          icon: 'terminal',
          endIcon: 'external-link',
        },
        {
          label: 'API Documentation',
          href: '/app/docs',
          icon: 'book',
          endIcon: 'external-link',
        },
      ],
    },
  ].filter(Boolean);
};

const HeaderMenu = ({ profile, roles, hasNominations }) => {
  const popover = usePopover();
  const close = () => popover.setOpen(false);

  const menuItems = getMenuItems(profile, roles, { hasNominations });

  return (
    <Popover.RootProvider value={popover} autoFocus={false}>
      <Popover.Trigger asChild>
        <button className="kbtn kbtn-ghost kbtn-square kbtn-md text-base-content/60 hover:text-primary">
          <Icon name="menu-2" size={20} />
        </button>
      </Popover.Trigger>
      {popover.open && (
        <div
          data-scope="menu"
          data-part="dialog"
          data-state="open"
          aria-hidden="true"
          className="fixed inset-0 top-18 bg-black/20"
        />
      )}
      <Popover.Positioner
        className={clsx('!fixed !inset-0 !top-18 w-80', {
          'pointer-events-none': !popover.open,
        })}
        style={{ transform: 'none' }}
      >
        <Popover.Content className="flex-c-st h-full w-full gap-3 px-6 py-4 outline-0 bg-base-100 text-base-content z-30 shadow-xl">
          <ul className="kmenu flex-nowrap gap-1 p-0 w-full flex-auto overflow-auto">
            {menuItems.map((item, i) => (
              <Fragment key={i}>
                {i !== 0 && <hr className="my-2" />}
                <HeaderMenuItem {...item} close={close} />
              </Fragment>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.RootProvider>
  );
};

const HeaderMenuItem = ({
  label,
  to,
  href,
  onClick,
  icon,
  endIcon,
  title,
  items,
  close,
  defaultOpen,
}) => {
  if (items) {
    if (title) {
      return (
        <li>
          <details open={defaultOpen}>
            <summary className="content-center h-8 text-xs uppercase tracking-wider text-base-content/50 font-semibold">
              {title}
            </summary>
            <ul>
              {items.map((item, i) => (
                <HeaderMenuItem key={i} {...item} close={close} />
              ))}
            </ul>
          </details>
        </li>
      );
    }
    return items.map((item, i) => (
      <HeaderMenuItem key={i} {...item} close={close} />
    ));
  }
  return (
    <li>
      {typeof onClick === 'function' ? (
        <button
          className="content-center h-12 text-base rounded-lg"
          onClick={() => {
            onClick();
            close();
          }}
        >
          {icon && <Icon name={icon} size={20} />}
          <span>{label || to}</span>
          {endIcon && (
            <Icon name={endIcon} size={18} className="ml-auto opacity-50" />
          )}
        </button>
      ) : href ? (
        <a
          className="content-center h-12 text-base rounded-lg"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          {icon && <Icon name={icon} size={20} />}
          <span>{label || to}</span>
          {endIcon && (
            <Icon name={endIcon} size={18} className="ml-auto opacity-50" />
          )}
        </a>
      ) : (
        <Link
          to={to}
          className="content-center h-12 text-base rounded-lg"
          onClick={close}
        >
          {icon && <Icon name={icon} size={20} />}
          <span>{label || to}</span>
          {endIcon && (
            <Icon name={endIcon} size={18} className="ml-auto opacity-50" />
          )}
        </Link>
      )}
    </li>
  );
};
