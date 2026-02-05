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

  const fields = [
    { label: 'First Name', value: firstName },
    { label: 'Last Name', value: lastName },
    { label: 'Phone Number', value: phone, isPhone: true },
    { label: 'Native Language', value: nativeLanguage },
    { label: 'Needs Interpreter', value: needsInterpreter },
    { label: 'County', value: county },
  ].filter(field => field.value !== null && field.value !== undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-box border bg-base-100 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Family Information</div>
          </div>
          {!familyLoading && familyRecord && (
            <button
              type="button"
              className="kbtn kbtn-ghost kbtn-circle"
              onClick={handleDownloadContact}
              disabled={!firstName && !lastName && !phoneDigits}
              title="Download Contact"
              aria-label="Download Contact"
            >
              <Icon name="download" />
            </button>
          )}
        </div>

      {familyLoading && (
        <div className="mt-4 text-sm text-base-content/60">
          Loading family details...
        </div>
      )}

      {!familyLoading && (!familyRecord || fields.length === 0) && (
        <div className="mt-4 text-sm text-base-content/60">
          No family information available.
        </div>
      )}

      {!familyLoading && fields.length > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-box border bg-base-100/60 p-4">
            <div className="text-xs uppercase tracking-wide text-base-content/60">
              Contact
            </div>
            <div className="mt-3 grid gap-3">
              {fields
                .filter(field =>
                  [
                    'First Name',
                    'Last Name',
                    'Phone Number',
                    'Native Language',
                    'Needs Interpreter',
                  ].includes(field.label),
                )
                .map(field => (
                  <div key={field.label}>
                    <div className="text-xs uppercase tracking-wide text-base-content/60">
                      {field.label}
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      {field.isPhone && field.value ? (
                        <a
                          href={`tel:${phoneDigits}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {formatValue(field.value)}
                        </a>
                      ) : (
                        formatValue(field.value)
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-box border bg-base-100/60 p-4">
            <div className="text-xs uppercase tracking-wide text-base-content/60">
              Address
            </div>
            <div className="mt-3 text-sm font-medium">
              {fullAddress ? (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  <div>{addressLines.join(', ')}</div>
                  <div>{cityLine}</div>
                </a>
              ) : (
                '—'
              )}
            </div>
          </div>
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
