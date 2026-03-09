import t from 'prop-types';
import { useMemo } from 'react';
import { executeIntegration } from '../../../helpers/api.js';
import { useData } from '../../../helpers/hooks/useData.js';
import { useSelector } from 'react-redux';
import { Icon } from '../../../atoms/Icon.jsx';

const formatValue = value => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—';
  return String(value);
};

export const FamilyInformation = ({ familyRecord, familyLoading }) => {
  const { kappSlug } = useSelector(state => state.app);
  const mobile = useSelector(state => state.view.mobile);
  const {
    firstName,
    lastName,
    email,
    phone,
    phoneDigits,
    nativeLanguage,
    needsInterpreter,
    addressLines,
    cityLine,
    fullAddress,
    county,
    address1,
    address2,
    city,
    state,
    zip,
    familyId,
  } = familyRecord || {};
  const mapHref = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        fullAddress,
      )}`
    : '';

  const familyMembersParams = useMemo(
    () =>
      familyId
        ? {
            kappSlug,
            integrationName: 'Family Members - Retrieve',
            parameters: { 'Family ID': familyId },
          }
        : null,
    [kappSlug, familyId],
  );

  const {
    initialized: familyMembersInitialized,
    loading: familyMembersLoading,
    response: familyMembersResponse,
  } = useData(executeIntegration, familyMembersParams);

  const familyMembersError = familyMembersResponse?.error;
  const familyMembers =
    familyMembersResponse?.['Family Members'] ||
    familyMembersResponse?.Result ||
    familyMembersResponse?.familyMembers ||
    familyMembersResponse?.data ||
    [];

  const handleDownloadContact = () => {
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Family';
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${lastName || ''};${firstName || ''};;;`,
      `FN:${fullName}`,
      phoneDigits ? `TEL;TYPE=CELL:${phoneDigits}` : null,
      address1 || address2 || city || state || zip
        ? `ADR;TYPE=HOME:;;${[address1, address2]
            .filter(Boolean)
            .join(' ')};${city || ''};${state || ''};${zip || ''};`
        : null,
      'END:VCARD',
    ].filter(Boolean);

    const blob = new Blob([lines.join('\n')], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fullName.replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const hasContact = fullName || phone || email;

  const details = [
    nativeLanguage && { label: 'Language', value: nativeLanguage },
    needsInterpreter && { label: 'Interpreter', value: needsInterpreter },
    county && { label: 'County', value: county },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-box border bg-base-100 p-5">
        <div className="flex-bc gap-3 mb-3">
          <div className="text-lg font-semibold">Family Information</div>
          {!familyLoading && familyRecord && (
            <button
              type="button"
              className="kbtn kbtn-ghost kbtn-circle kbtn-sm"
              onClick={handleDownloadContact}
              disabled={!firstName && !lastName && !phoneDigits}
              title="Download Contact"
              aria-label="Download Contact"
            >
              <Icon name="download" size={18} />
            </button>
          )}
        </div>

      {familyLoading && (
        <div className="text-sm text-base-content/60">
          Loading family details...
        </div>
      )}

      {!familyLoading && !hasContact && (
        <div className="text-sm text-base-content/60">
          No family information available.
        </div>
      )}

      {!familyLoading && hasContact && (
        <div className="flex flex-col gap-3">
          {/* Name and contact actions */}
          <div className="flex-sc gap-3 flex-wrap">
            {fullName && (
              <span className="text-base font-semibold">{fullName}</span>
            )}
            <div className="flex-sc gap-1">
              {phoneDigits && (
                <a
                  href={`tel:${phoneDigits}`}
                  className="kbtn kbtn-ghost kbtn-circle kbtn-sm"
                  title={formatValue(phone)}
                  aria-label={`Call ${formatValue(phone)}`}
                >
                  <Icon name="phone" size={16} />
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="kbtn kbtn-ghost kbtn-circle kbtn-sm"
                  title={email}
                  aria-label={`Email ${email}`}
                >
                  <Icon name="mail" size={16} />
                </a>
              )}
              {fullAddress && (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className="kbtn kbtn-ghost kbtn-circle kbtn-sm"
                  title="Open in Maps"
                  aria-label="Open address in Maps"
                >
                  <Icon name="map-pin" size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Address */}
          {fullAddress && (
            <div className="flex-sc gap-2 text-sm text-base-content/70">
              <span>{addressLines.join(', ')}, {cityLine}</span>
            </div>
          )}

          {/* Contact details */}
          <div className="flex-sc gap-4 flex-wrap text-sm text-base-content/70">
            {phone && (
              <a
                href={`tel:${phoneDigits}`}
                className="flex-sc gap-1.5 hover:text-primary transition-colors"
              >
                <Icon name="phone" size={14} />
                {formatValue(phone)}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex-sc gap-1.5 hover:text-primary transition-colors"
              >
                <Icon name="mail" size={14} />
                {email}
              </a>
            )}
          </div>

          {/* Details row */}
          {details.length > 0 && (
            <div className="flex-sc gap-4 flex-wrap text-xs text-base-content/50">
              {details.map(d => (
                <span key={d.label}>
                  <span className="font-medium">{d.label}:</span>{' '}
                  {formatValue(d.value)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      </div>

      {familyRecord && (
        <div className="rounded-box border bg-base-100 p-6">
          <div className="text-lg font-semibold">Family Members</div>

          {!familyMembersInitialized && (
            <div className="mt-3 text-sm text-base-content/60">
              Loading family members...
            </div>
          )}

          {familyMembersLoading && (
            <div className="mt-3 text-sm text-base-content/60">
              Loading family members...
            </div>
          )}

          {familyMembersError && (
            <div className="mt-3 text-sm text-error">
              Unable to load family members.
            </div>
          )}

          {!familyMembersLoading &&
            !familyMembersError &&
            Array.isArray(familyMembers) &&
            familyMembers.length === 0 && (
              <div className="mt-3 text-sm text-base-content/60">
                No family members found.
              </div>
            )}

          {!familyMembersLoading &&
            !familyMembersError &&
            Array.isArray(familyMembers) &&
            familyMembers.length > 0 && (
              <>
                {mobile ? (
                  <div className="mt-3 grid gap-3">
                    {familyMembers.map((member, index) => (
                      <div
                        key={`${member['Submission Id'] || index}`}
                        className="rounded-box border bg-base-100 p-3"
                      >
                        <div className="text-sm font-semibold">
                          {[member['First Name'], member['Last Name']]
                            .filter(Boolean)
                            .join(' ') || 'Family Member'}
                        </div>
                        <div className="mt-2 grid gap-1 text-xs text-base-content/70">
                          <div>
                            <span className="font-medium text-base-content/80">
                              Type:
                            </span>{' '}
                            {member['Type'] || '—'}
                          </div>
                          <div>
                            <span className="font-medium text-base-content/80">
                              Gender:
                            </span>{' '}
                            {member['Gender'] || '—'}
                          </div>
                          <div>
                            <span className="font-medium text-base-content/80">
                              Age:
                            </span>{' '}
                            {member['Age'] || '—'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-box border bg-base-100">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="bg-base-200 text-xs uppercase tracking-wide text-base-content/70">
                        <tr>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">First Name</th>
                          <th className="px-4 py-2">Last Name</th>
                          <th className="px-4 py-2">Gender</th>
                          <th className="px-4 py-2">Age</th>
                        </tr>
                      </thead>
                      <tbody>
                        {familyMembers.map((member, index) => (
                          <tr
                            key={`${member['Submission Id'] || index}`}
                            className="border-t border-base-200"
                          >
                            <td className="px-4 py-2">
                              {member['Type'] || '—'}
                            </td>
                            <td className="px-4 py-2">
                              {member['First Name'] || '—'}
                            </td>
                            <td className="px-4 py-2">
                              {member['Last Name'] || '—'}
                            </td>
                            <td className="px-4 py-2">
                              {member['Gender'] || '—'}
                            </td>
                            <td className="px-4 py-2">
                              {member['Age'] || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
        </div>
      )}
    </div>
  );
};

FamilyInformation.propTypes = {
  familyRecord: t.shape({
    firstName: t.string,
    lastName: t.string,
    email: t.string,
    phone: t.any,
    phoneDigits: t.string,
    nativeLanguage: t.any,
    needsInterpreter: t.any,
    addressLines: t.arrayOf(t.string),
    cityLine: t.string,
    fullAddress: t.string,
    county: t.any,
    address1: t.any,
    address2: t.any,
    city: t.any,
    state: t.any,
    zip: t.any,
  }),
  familyLoading: t.bool,
};
