import { Icon } from '../atoms/Icon.jsx';
import { Modal } from '../atoms/Modal.jsx';
import { DetailRow, BulletList } from '../atoms/DetailRow.jsx';
import { toArray, buildSmsHref } from '../helpers/format.js';

/**
 * Shared volunteer detail modal used by EventsAssign and project Volunteers.
 *
 * @param {object}  props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {object}  [props.volunteer]  - Volunteer datastore submission (values)
 * @param {object}  [props.signup]     - Event signup submission (optional, for event context)
 */
export const VolunteerDetailModal = ({ open, onClose, volunteer, signup }) => {
  const vol = volunteer?.values ?? volunteer ?? {};
  const hasProfile = !!volunteer;

  const name =
    [vol['First Name'], vol['Last Name']].filter(Boolean).join(' ') ||
    [signup?.values?.['First Name'], signup?.values?.['Last Name']]
      .filter(Boolean)
      .join(' ') ||
    'Volunteer';

  const email = vol['Email Address'] || signup?.values?.['Email'] || null;
  const phone = vol['Phone Number'] || signup?.values?.['Phone Number'] || null;
  const smsHref = buildSmsHref(phone);

  const skills = toArray(vol['Skill Areas']);
  const tools = toArray(vol['Tools']);
  const serviceAreas = toArray(vol['Preferred Service Area']);
  const dietary = toArray(vol['Dietary Restrictions']);

  return (
    <Modal
      open={open}
      onOpenChange={({ open: isOpen }) => !isOpen && onClose()}
      title={name}
      size="md"
    >
      <div slot="body">
        <div className="flex-c-st gap-5 py-2">
          {signup && !hasProfile && (
            <div className="flex-sc gap-2 px-3 py-2 rounded-lg bg-warning/10 text-warning text-sm">
              <Icon name="alert-triangle" size={16} className="flex-none" />
              <span>This volunteer has not created an account yet.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {email && (
              <DetailRow label="Email">
                <a
                  href={`mailto:${email}`}
                  className="text-sm text-primary underline-offset-2 hover:underline"
                >
                  {email}
                </a>
              </DetailRow>
            )}
            {phone && (
              <DetailRow label="Phone">
                {smsHref ? (
                  <a
                    href={smsHref}
                    className="text-sm text-primary underline-offset-2 hover:underline"
                  >
                    {phone}
                  </a>
                ) : (
                  <p className="text-sm">{phone}</p>
                )}
              </DetailRow>
            )}
          </div>

          {signup?.values?.['Affiliated Organization'] && (
            <DetailRow label="Affiliated Organization">
              <p className="text-sm">{signup.values['Affiliated Organization']}</p>
            </DetailRow>
          )}

          {signup?.values?.['Who is Serving'] === 'With Others' && (
            <div className="rounded-lg bg-base-200/40 p-3 flex-c-st gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon name="users" size={16} className="text-base-content/50" />
                Group of {signup.values?.['Total Number of Volunteers'] || '?'}
              </div>
              {signup.values?.['Who Else Is Serving'] && (
                <p className="text-sm text-base-content/70 ml-6">
                  {signup.values['Who Else Is Serving']}
                </p>
              )}
            </div>
          )}

          {signup?.values?.['Project Preference'] && (
            <DetailRow label="Project Preference">
              <p className="text-sm">{signup.values['Project Preference']}</p>
            </DetailRow>
          )}

          {signup?.values?.['Notes'] && (
            <DetailRow label="Signup Notes">
              <p className="text-sm text-base-content/70">
                {signup.values['Notes']}
              </p>
            </DetailRow>
          )}

          {hasProfile && (
            <>
              <DetailRow label="Skills">
                <BulletList items={skills} emptyText="No skills listed." />
              </DetailRow>

              {vol['Other Skills'] && (
                <DetailRow label="Other Skills">
                  <p className="text-sm">{vol['Other Skills']}</p>
                </DetailRow>
              )}

              <DetailRow label="Tools">
                <BulletList items={tools} emptyText="No tools listed." />
              </DetailRow>

              <div className="grid grid-cols-2 gap-4">
                {vol['How often can you volunteer'] && (
                  <DetailRow label="Availability">
                    <p className="text-sm">
                      {vol['How often can you volunteer']}
                    </p>
                  </DetailRow>
                )}
                {vol['Other Availability']?.trim() && (
                  <DetailRow label="Other Availability">
                    <p className="text-sm">{vol['Other Availability']}</p>
                  </DetailRow>
                )}
              </div>

              {serviceAreas.length > 0 && (
                <DetailRow label="Preferred Service Area">
                  <p className="text-sm">{serviceAreas.join(', ')}</p>
                </DetailRow>
              )}

              <div className="grid grid-cols-2 gap-4">
                {dietary.length > 0 && (
                  <DetailRow label="Dietary Restrictions">
                    <p className="text-sm">{dietary.join(', ')}</p>
                  </DetailRow>
                )}
                <DetailRow label="Photo Consent">
                  <p className="text-sm">
                    {vol['Photo Consent'] === 'No' ? (
                      <span className="inline-flex items-center gap-1 text-warning font-medium">
                        <Icon name="camera-off" size={14} />
                        No Photos
                      </span>
                    ) : vol['Photo Consent'] === 'Yes' ? (
                      'Yes'
                    ) : (
                      '—'
                    )}
                  </p>
                </DetailRow>
              </div>

              {vol['Bio'] && (
                <DetailRow label="Bio">
                  <p className="text-sm text-base-content/70 whitespace-pre-wrap">
                    {vol['Bio']}
                  </p>
                </DetailRow>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
