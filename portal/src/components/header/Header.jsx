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

const PROJECT_TEAMS = ['SWAT Leadership', 'SWAT Project Captains'];

export const Header = () => {
  const profile = useSelector(state => state.app.profile);
  const themeLogo = useSelector(state => state.theme.data?.logo?.default);
  const mobile = useSelector(state => state.view.mobile);
  const hasProjectAccess = profile?.memberships?.some(({ team }) =>
    PROJECT_TEAMS.includes(team.name),
  );

  return (
    <>
      {/* Top navigation bar */}
      <HeaderPortal>
        <nav className="relative flex-sc gap-3 md:gap-5 h-16 md:h-18 px-4 md:px-6 bg-base-100 border-b border-base-200 z-20">
          {!mobile && <HeaderMenu profile={profile} hasProjectAccess={hasProjectAccess} />}
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
                    'kbtn kbtn-ghost kbtn-sm font-medium',
                    isActive && 'text-primary bg-primary/8',
                  )
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/requests"
                className={({ isActive }) =>
                  clsx(
                    'kbtn kbtn-ghost kbtn-sm font-medium',
                    isActive && 'text-primary bg-primary/8',
                  )
                }
              >
                My Requests
              </NavLink>
              <NavLink
                to="/actions"
                className={({ isActive }) =>
                  clsx(
                    'kbtn kbtn-ghost kbtn-sm font-medium',
                    isActive && 'text-primary bg-primary/8',
                  )
                }
              >
                My Work
              </NavLink>
              <NavLink
                to="/upcoming-projects"
                className={({ isActive }) =>
                  clsx(
                    'kbtn kbtn-ghost kbtn-sm font-medium',
                    isActive && 'text-primary bg-primary/8',
                  )
                }
              >
                Upcoming Projects
              </NavLink>
              {hasProjectAccess && (
                <NavLink
                  to="/project-captains"
                  className={({ isActive }) =>
                    clsx(
                      'kbtn kbtn-ghost kbtn-sm font-medium',
                      isActive && 'text-primary bg-primary/8',
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
            className="kbtn kbtn-ghost kbtn-square kbtn-md"
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
      {mobile && <MobileBottomNav hasProjectAccess={hasProjectAccess} />}
    </>
  );
};

const MobileBottomNav = ({ hasProjectAccess }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { label: 'Home', to: '/', icon: 'home', exact: true },
    { label: 'Upcoming', to: '/upcoming-projects', icon: 'calendar-event' },
    {
      label: 'Get Involved',
      action: () => openSearch(),
      icon: 'plus-circle',
      isAction: true,
    },
    { label: 'My Work', to: '/actions', icon: 'clipboard-check' },
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

const getMenuItems = (profile, { hasProjectAccess } = {}) =>
  [
    {
      items: [
        { label: 'Home', to: '/', icon: 'home' },
        {
          label: 'Submit a Request',
          onClick: () => openSearch(),
          icon: 'send',
        },
        { label: 'Check Status', to: '/requests', icon: 'file-text' },
        { label: 'My Work', to: '/actions', icon: 'clipboard-check' },
        { label: 'Upcoming Projects', to: '/upcoming-projects', icon: 'calendar-event' },
        hasProjectAccess && {
          label: 'Project Captains',
          to: '/project-captains',
          icon: 'hammer',
        },
      ].filter(Boolean),
    },
    profile?.spaceAdmin && {
      title: 'Admin',
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

const HeaderMenu = ({ profile, hasProjectAccess }) => {
  const popover = usePopover();
  const close = () => popover.setOpen(false);

  const menuItems = getMenuItems(profile, { hasProjectAccess });

  return (
    <Popover.RootProvider value={popover} autoFocus={false}>
      <Popover.Trigger asChild>
        <button className="kbtn kbtn-ghost kbtn-square kbtn-md">
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
        <Popover.Content className="flex-c-st h-full w-full gap-3 px-6 py-4 outline-0 bg-base-100 z-30 shadow-xl">
          <ul className="kmenu flex-nowrap gap-1 p-0 w-full flex-auto overflow-auto">
            {menuItems.map((item, i) => (
              <Fragment key={i}>
                {i !== 0 && <hr className="my-2" />}
                <HeaderMenuItem {...item} close={close} />
              </Fragment>
            ))}
          </ul>
          <ul className="kmenu p-0 w-full gap-1 flex-none">
            <hr className="my-2" />
            <HeaderMenuItem
              label="Settings"
              to="/settings"
              icon="settings"
              close={close}
            />
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
}) => {
  if (items) {
    if (title) {
      return (
        <li>
          <details>
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
