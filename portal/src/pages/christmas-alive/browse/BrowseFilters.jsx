import t from 'prop-types';
import { Icon } from '../../../atoms/Icon.jsx';
import { SIZE_BANDS } from '../../../helpers/christmasAlive.js';

/**
 * Filters for the browse list. Each dropdown shows only values that actually
 * occur in the current set, so a sponsor can never pick a filter that returns
 * nothing. "Clear filters" appears only when something is filtered.
 */
export const BrowseFilters = ({ families, filters, onChange, resultCount }) => {
  const distinct = key =>
    [...new Set(families.map(f => f[key]).filter(Boolean))].sort();

  const active = Object.values(filters).some(Boolean);

  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex-c-st gap-3">
      <div className="flex-ss gap-3 flex-wrap">
        <label className="flex-c-st gap-1">
          <span className="text-xs text-base-content/70">County</span>
          <select
            className="kselect kselect-bordered kselect-sm"
            value={filters.county}
            onChange={e => set('county', e.target.value)}
          >
            <option value="">All counties</option>
            {distinct('county').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="flex-c-st gap-1">
          <span className="text-xs text-base-content/70">City</span>
          <select
            className="kselect kselect-bordered kselect-sm"
            value={filters.city}
            onChange={e => set('city', e.target.value)}
          >
            <option value="">All cities</option>
            {distinct('city').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="flex-c-st gap-1">
          <span className="text-xs text-base-content/70">Language</span>
          <select
            className="kselect kselect-bordered kselect-sm"
            value={filters.nativeLanguage}
            onChange={e => set('nativeLanguage', e.target.value)}
          >
            <option value="">Any language</option>
            {distinct('nativeLanguage').map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>

        <label className="flex-c-st gap-1">
          <span className="text-xs text-base-content/70">Family size</span>
          <select
            className="kselect kselect-bordered kselect-sm"
            value={filters.size}
            onChange={e => set('size', e.target.value)}
          >
            <option value="">Any size</option>
            {SIZE_BANDS.map(b => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex-sc gap-3 text-sm">
        <span className="text-base-content/70">
          {resultCount} {resultCount === 1 ? 'family' : 'families'} available
        </span>
        {active && (
          <button
            type="button"
            className="kbtn kbtn-ghost kbtn-xs"
            onClick={() => onChange({ county: '', city: '', nativeLanguage: '', size: '' })}
          >
            <Icon name="x" size={14} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

BrowseFilters.propTypes = {
  families: t.array.isRequired,
  filters: t.object.isRequired,
  onChange: t.func.isRequired,
  resultCount: t.number.isRequired,
};
