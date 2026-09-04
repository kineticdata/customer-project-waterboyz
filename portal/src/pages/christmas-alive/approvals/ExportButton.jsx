import t from 'prop-types';
import { Icon } from '../../../atoms/Icon.jsx';

/**
 * Column order is taken verbatim from the requirements document, so the
 * download matches what leadership asked for and what the table on screen
 * shows.
 *
 * "Family ID" here is the human family number ("Family 1", "Family 2") that
 * sponsors quote at pickup, not the submission id.
 */
const COLUMNS = [
  ['Family ID', r => r.familyNumber],
  ['Status', r => r.status],
  ['House Head First Name', r => r.firstName],
  ['House Head Last Name', r => r.lastName],
  ['House Head Email', r => r.email],
  ['House Head Phone', r => r.phone],
  ['Street', r => r.addressLine1],
  ['City', r => r.city],
  ['State', r => r.state],
  ['Zip', r => r.zip],
  ['Number of Members', r => r.totalMembers],
  ['Adults', r => r.totalAdults],
  ['Children', r => r.totalChildren],
];

/** Quote a CSV cell; a leading =, +, - or @ is prefixed so spreadsheets
 *  don't evaluate it as a formula. */
const cell = value => {
  const s = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

const toCsv = rows =>
  [
    COLUMNS.map(([label]) => cell(label)).join(','),
    ...rows.map(r => COLUMNS.map(([, get]) => cell(get(r))).join(',')),
  ].join('\r\n');

export const ExportButton = ({ rows, season, label }) => {
  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `christmas-alive-${season}-${label}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      className="kbtn kbtn-outline kbtn-sm"
      onClick={download}
      disabled={rows.length === 0}
    >
      <Icon name="download" size={16} />
      Export {rows.length} {rows.length === 1 ? 'family' : 'families'}
    </button>
  );
};

ExportButton.propTypes = {
  rows: t.array.isRequired,
  season: t.string,
  label: t.string.isRequired,
};
