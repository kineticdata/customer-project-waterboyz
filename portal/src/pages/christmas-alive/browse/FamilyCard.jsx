import t from 'prop-types';
import { Icon } from '../../../atoms/Icon.jsx';
import { describeHousehold, familyLabel } from '../../../helpers/christmasAlive.js';

/**
 * One anonymized family on the sponsor browse list.
 *
 * The family number is the hero: it is the sponsor's handle on this family and
 * the number they quote at curb-side pickup. Names deliberately do not appear —
 * the footnote says so out loud, so the absence reads as a privacy decision
 * rather than as missing data.
 */
export const FamilyCard = ({ family, onSponsor, disabled }) => {
  const { familyNumber, city, county, nativeLanguage } = family;
  const household = describeHousehold(family);

  return (
    <li className="flex-c-st gap-3 p-4 rounded-lg border border-base-300 bg-base-100">
      <div className="flex-bs gap-3">
        <div className="flex-c-st">
          <span className="text-h2 font-bold leading-none">
            {familyLabel(familyNumber)}
          </span>
          <span className="text-sm text-base-content/80 mt-1">{household}</span>
        </div>
        <Icon name="users" size={24} className="text-accent flex-none" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 m-0 text-sm">
        <div className="flex-c-st">
          <dt className="text-base-content/60">Area</dt>
          <dd className="m-0">
            {/* Frederick city sits in Frederick county — "Frederick, Frederick"
                reads like a bug, so collapse the duplicate. */}
            {[city, city === county ? null : county]
              .filter(Boolean)
              .join(', ') || 'Not given'}
          </dd>
        </div>
        <div className="flex-c-st">
          <dt className="text-base-content/60">Language</dt>
          <dd className="m-0">{nativeLanguage || 'Not given'}</dd>
        </div>
      </dl>

      <button
        type="button"
        className="kbtn kbtn-accent w-full"
        onClick={() => onSponsor(family)}
        disabled={disabled}
      >
        <Icon name="gift" size={18} />
        Sponsor this family
      </button>
    </li>
  );
};

FamilyCard.propTypes = {
  family: t.object.isRequired,
  onSponsor: t.func.isRequired,
  disabled: t.bool,
};
