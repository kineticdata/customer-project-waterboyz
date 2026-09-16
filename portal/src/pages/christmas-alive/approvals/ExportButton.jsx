import t from 'prop-types';
import { Icon } from '../../../atoms/Icon.jsx';
import { buildExportCsv } from '../../../helpers/christmasAlive.js';

/**
 * Column order is taken verbatim from the requirements document, so the
 * download matches what leadership asked for and what the table on screen
 * shows.
 *
 * "Family ID" here is the human family number ("Family 1", "Family 2") that
 * sponsors quote at pickup, not the submission id.
 */
export const ExportButton = ({ rows, season, label }) => {
  const download = () => {
    const blob = new Blob([buildExportCsv(rows)], { type: 'text/csv;charset=utf-8;' });
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
