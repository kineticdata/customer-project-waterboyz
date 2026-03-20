import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Icon } from '../../../atoms/Icon.jsx';
import { toArray, formatPhone, buildSmsHref } from '../../../helpers/format.js';
import { EditVolunteerModal } from './EditVolunteerModal.jsx';
import { ProjectAssociations } from './ProjectAssociations.jsx';
import { EventAssociations } from './EventAssociations.jsx';
import { useVolunteerAssociations } from './useVolunteerAssociations.js';

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const tabs = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'events', label: 'Events', icon: 'calendar-heart' },
  { id: 'projects', label: 'Projects', icon: 'hammer' },
];

// ---------------------------------------------------------------------------
// Drawer
// ---------------------------------------------------------------------------

export const VolunteerDetailDrawer = ({
  volunteer,
  onClose,
  // Data for association components
  allProjects,
  allEvents,
  allAssignments,
  allSignups,
  eventsById,
  // Callback to reload all data after mutations
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [editOpen, setEditOpen] = useState(false);

  const associationActions = useVolunteerAssociations({
    onSuccess: onDataChanged,
  });

  if (!volunteer) return null;

  const v = volunteer.values ?? {};
  const firstName = v['First Name'] || '';
  const lastName = v['Last Name'] || '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Volunteer';
  const initials =
    [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || '?';
  const email = v['Email Address'];
  const phone = v['Phone Number'];
  const smsHref = buildSmsHref(phone);
  const username = v['Username'];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-xl z-50 bg-base-100 shadow-2xl flex-c-st animate-slide-in-right">
        {/* ── Header ── */}
        <div className="flex-none px-6 pt-5 pb-4 border-b border-base-200/80">
          <div className="flex-ss gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex-cc flex-none text-primary font-bold text-lg">
              {initials}
            </div>

            {/* Name + org */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-base-content truncate leading-tight">
                {name}
              </h2>
              {v['Affiliated Organization'] && (
                <p className="text-sm text-base-content/50 truncate mt-0.5">
                  {v['Affiliated Organization']}
                </p>
              )}
              {/* Quick contact row */}
              <div className="flex-sc gap-3 mt-2">
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-1.5 text-xs text-base-content/50 hover:text-primary transition-colors"
                    title={email}
                  >
                    <Icon name="mail" size={13} />
                    <span className="truncate max-w-[180px]">{email}</span>
                  </a>
                )}
                {phone && (
                  <a
                    href={smsHref || `tel:${phone}`}
                    className="inline-flex items-center gap-1.5 text-xs text-base-content/50 hover:text-primary transition-colors"
                  >
                    <Icon name="phone" size={13} />
                    {formatPhone(phone)}
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex-sc gap-1 flex-none -mt-1">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="kbtn kbtn-sm kbtn-ghost kbtn-square"
                title="Edit volunteer profile"
              >
                <Icon name="pencil" size={16} />
              </button>
              {username && (
                <Link
                  to={`/profile/${username}`}
                  className="kbtn kbtn-sm kbtn-ghost kbtn-square"
                  title="View full profile"
                >
                  <Icon name="external-link" size={16} />
                </Link>
              )}
              <button
                type="button"
                onClick={onClose}
                className="kbtn kbtn-sm kbtn-ghost kbtn-square"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex-none flex border-b border-base-200/80 px-6 gap-1">
          {tabs.map(tab => {
            const count =
              tab.id === 'events'
                ? volunteer.eventCount
                : tab.id === 'projects'
                  ? volunteer.projectCount
                  : 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex-sc gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-base-content/40 hover:text-base-content/70',
                )}
              >
                <Icon name={tab.icon} size={15} />
                {tab.label}
                {count > 0 && (
                  <span
                    className={clsx(
                      'inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold leading-none',
                      activeTab === tab.id
                        ? 'bg-primary text-primary-content'
                        : 'bg-base-200 text-base-content/50',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'profile' && <ProfileTab v={v} />}
          {activeTab === 'events' && (
            <EventAssociations
              volunteer={volunteer}
              allEvents={allEvents}
              allSignups={allSignups}
              eventsById={eventsById}
              actions={associationActions}
            />
          )}
          {activeTab === 'projects' && (
            <ProjectAssociations
              volunteer={volunteer}
              allProjects={allProjects}
              allAssignments={allAssignments}
              actions={associationActions}
            />
          )}
        </div>
      </div>

      {/* Edit modal */}
      <EditVolunteerModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        volunteerId={volunteer.id}
        onSaved={onDataChanged}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// Profile Tab
// ---------------------------------------------------------------------------

const Section = ({ icon, title, children }) => (
  <div className="py-4 px-6 border-b border-base-200/60">
    <div className="flex-sc gap-2 mb-3">
      <Icon name={icon} size={15} className="text-base-content/30" />
      <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

const InfoField = ({ label, value, children }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-medium text-base-content/35 mb-0.5">
      {label}
    </p>
    {children || (
      <p className="text-sm text-base-content/80">
        {value || (
          <span className="text-base-content/20 italic">Not provided</span>
        )}
      </p>
    )}
  </div>
);

const PillGroup = ({
  items,
  color = 'primary',
  emptyText = 'None listed',
}) => {
  if (!items.length)
    return <p className="text-sm text-base-content/20 italic">{emptyText}</p>;
  const colors = {
    primary: 'bg-primary/8 text-primary/80 border-primary/10',
    secondary: 'bg-secondary/8 text-secondary/80 border-secondary/10',
    accent: 'bg-accent/8 text-accent/80 border-accent/10',
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span
          key={item}
          className={clsx(
            'inline-block px-2 py-0.5 rounded-md text-xs font-medium border',
            colors[color],
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
};

const ProfileTab = ({ v }) => {
  const languages = toArray(v['Languages You Know']);
  const skills = toArray(v['Skill Areas']);
  const tools = toArray(v['Tools']);
  const serviceAreas = toArray(v['Preferred Service Area']);
  const dietary = toArray(v['Dietary Restrictions']);

  const hasAddress = v['Address Line 1'] || v['City'] || v['State'];
  const addressParts = [
    v['Address Line 1'],
    v['Address Line 2'],
    [v['City'], v['State']].filter(Boolean).join(', '),
    v['Zip'],
  ].filter(Boolean);

  return (
    <div>
      {/* Location & Languages */}
      <Section icon="map-pin" title="Location & Languages">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <InfoField
            label="Address"
            value={hasAddress ? addressParts.join(', ') : null}
          />
          <InfoField label="Languages">
            {languages.length > 0 ? (
              <PillGroup items={languages} color="accent" />
            ) : (
              <p className="text-sm text-base-content/20 italic">
                Not provided
              </p>
            )}
          </InfoField>
        </div>
      </Section>

      {/* Skills & Tools */}
      <Section icon="tool" title="Skills & Tools">
        <div className="flex-c-st gap-3">
          <InfoField label="Skills">
            <PillGroup
              items={skills}
              color="primary"
              emptyText="No skills listed"
            />
          </InfoField>
          {v['Other Skills'] && (
            <InfoField label="Other Skills" value={v['Other Skills']} />
          )}
          <InfoField label="Tools">
            <PillGroup
              items={tools}
              color="secondary"
              emptyText="No tools listed"
            />
          </InfoField>
        </div>
      </Section>

      {/* Availability */}
      <Section icon="clock" title="Availability">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <InfoField
            label="How often"
            value={v['How often can you volunteer']}
          />
          <InfoField
            label="Other availability"
            value={v['Other Availability']?.trim()}
          />
          {serviceAreas.length > 0 && (
            <div className="col-span-2">
              <InfoField label="Preferred Service Area">
                <PillGroup items={serviceAreas} color="primary" />
              </InfoField>
            </div>
          )}
        </div>
      </Section>

      {/* Preferences */}
      <Section icon="settings" title="Preferences">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <InfoField label="Photo Consent">
            {v['Photo Consent'] === 'No' ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warning-content bg-warning/30 px-2 py-0.5 rounded-md">
                <Icon name="camera-off" size={13} /> No Photos
              </span>
            ) : v['Photo Consent'] === 'Yes' ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-content bg-success/30 px-2 py-0.5 rounded-md">
                <Icon name="check" size={13} /> Yes
              </span>
            ) : (
              <p className="text-sm text-base-content/20 italic">
                Not provided
              </p>
            )}
          </InfoField>
          {dietary.length > 0 && (
            <InfoField label="Dietary Restrictions">
              <PillGroup items={dietary} color="accent" />
            </InfoField>
          )}
        </div>
      </Section>

      {/* Bio */}
      {v['Bio'] && (
        <Section icon="notes" title="Bio">
          <p className="text-sm text-base-content/70 whitespace-pre-wrap leading-relaxed">
            {v['Bio']}
          </p>
        </Section>
      )}
    </div>
  );
};
