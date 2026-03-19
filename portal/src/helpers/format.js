/**
 * Normalize a value that may be a native array, a JSON string, or null.
 */
export const toArray = raw => {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

/**
 * Get display name from a volunteer record and/or signup submission.
 * Prefers volunteer record fields, falls back to signup contact fields.
 */
export const getSignupName = (signup, vol) => {
  if (vol) {
    return (
      `${vol.values?.['First Name'] ?? ''} ${vol.values?.['Last Name'] ?? ''}`.trim() ||
      '—'
    );
  }
  const first = signup?.values?.['First Name'] ?? '';
  const last = signup?.values?.['Last Name'] ?? '';
  return `${first} ${last}`.trim() || signup?.values?.['Volunteer ID'] || '—';
};

/**
 * Normalize phone numbers into +E.164-ish format for SMS links.
 */
export const normalizePhone = phone => {
  if (!phone) return '';
  let digits = String(phone).replace(/[^\d+]/g, '');
  if (digits.startsWith('1') && digits.length === 11) {
    digits = `+${digits}`;
  } else if (!digits.startsWith('+') && digits.length === 10) {
    digits = `+1${digits}`;
  }
  return digits;
};

/**
 * Format a phone number as (XXX) XXX-XXXX for display.
 */
export const formatPhone = phone => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
};

/**
 * Build a platform-appropriate sms: link.
 */
export const buildSmsHref = phone => {
  const digits = normalizePhone(phone);
  if (!digits) return '';
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent || '';
  if (/iPad|iPhone|iPod|Macintosh|Mac OS X/i.test(ua)) {
    return `sms://open?addresses=${digits}`;
  }
  return `sms:${digits}`;
};
