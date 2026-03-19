import t from 'prop-types';
import { Icon } from '../../../atoms/Icon.jsx';
import { formatPhone } from '../../../helpers/format.js';

const formatValue = value => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—';
  return String(value);
};

export const FamilyInformation = ({ familyRecord, familyLoading }) => {
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
  } = familyRecord || {};
  const mapHref = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        fullAddress,
      )}`
    : '';

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
                  title={formatPhone(phone)}
                  aria-label={`Call ${formatPhone(phone)}`}
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
                {formatPhone(phone)}
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
    </div>
  );
};

FamilyInformation.propTypes = {
  familyRecord: t.object,
  familyLoading: t.bool,
};
