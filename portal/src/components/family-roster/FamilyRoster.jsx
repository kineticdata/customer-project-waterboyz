import { useCallback, useMemo, useState } from 'react';
import t from 'prop-types';
import clsx from 'clsx';
import { Icon } from '../../atoms/Icon.jsx';
import {
  parseRoster,
  serializeRoster,
  householdCounts,
  describeHousehold,
  suggestMemberType,
  MEMBER_TYPES,
  GENDERS,
} from '../../helpers/christmasAlive.js';

let seq = 0;
const nextId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

const blankMember = () => ({
  id: nextId(),
  firstName: '',
  lastName: '',
  age: '',
  gender: '',
  type: suggestMemberType(''),
  shirtSize: '',
  shoeSize: '',
});

const hasContent = m =>
  !!(m.firstName || m.lastName || m.age || m.gender || m.shirtSize || m.shoeSize);

/**
 * Editable family roster.
 *
 * Renders and edits the `Family Members JSON` array. Used two ways: directly
 * inside pure-React admin screens, and mounted into the Kinetic nomination
 * form through `familyRoster.widget.js`. Both paths share this component so
 * there is only ever one roster editor to maintain.
 *
 * Counts shown here derive from local state, never from a stored snapshot, so
 * the summary can never lag behind what the person is typing.
 *
 * @param {string|Array} value    Current roster (JSON string or array)
 * @param {Function} onChange     Called with the serialized JSON string
 * @param {boolean} [disabled]
 */
export const FamilyRoster = ({ value, onChange, disabled = false }) => {
  const roster = useMemo(() => parseRoster(value), [value]);
  // Household totals, so the head of household -- who is a record field, not
  // a roster row -- is counted. Otherwise the summary reads one adult short.
  const counts = useMemo(() => householdCounts(roster), [roster]);

  const emit = useCallback(next => onChange(serializeRoster(next)), [onChange]);

  const updateMember = useCallback(
    (index, patch) => {
      const next = roster.map((m, i) => (i === index ? { ...m, ...patch } : m));
      // Keep `type` in step with age unless the person has chosen one
      // themselves — typing an age is the common path, picking a type is not.
      if (patch.age !== undefined && !next[index].typeTouched) {
        next[index].type = suggestMemberType(patch.age);
      }
      emit(next);
    },
    [roster, emit],
  );

  const addMember = useCallback(() => {
    emit([...roster, blankMember()]);
  }, [roster, emit]);

  // Inline confirmation rather than a modal: this component also runs inside a
  // Kinetic form via its own React root, where the app's Redux-backed
  // confirmation modal is not mounted. Inline also keeps the person in place
  // for what is a small, easily-undone action.
  const [pendingRemove, setPendingRemove] = useState(null);

  const requestRemove = useCallback(
    index => {
      if (hasContent(roster[index])) {
        setPendingRemove(index);
        return;
      }
      emit(roster.filter((_, i) => i !== index));
    },
    [roster, emit],
  );

  const confirmRemove = useCallback(
    index => {
      setPendingRemove(null);
      emit(roster.filter((_, i) => i !== index));
    },
    [roster, emit],
  );

  const onLastFieldKeyDown = useCallback(
    (event, index) => {
      if (event.key === 'Enter' && index === roster.length - 1) {
        event.preventDefault();
        addMember();
      }
    },
    [roster.length, addMember],
  );

  return (
    <div className="flex-c-st gap-3">
      {roster.length === 0 ? (
        <div className="rounded-lg border border-dashed border-base-300 p-6 text-center">
          <p className="font-medium">No other household members added yet</p>
          <p className="text-sm text-base-content/70 mt-1">
            Add everyone else living in the home — a spouse, children, other
            adults. The head of household is already captured above.
          </p>
          <button
            type="button"
            className="kbtn kbtn-primary kbtn-sm mt-4"
            onClick={addMember}
            disabled={disabled}
          >
            <Icon name="plus" size={16} />
            Add a household member
          </button>
        </div>
      ) : (
        <>
          <ul className="flex-c-st gap-3 list-none p-0 m-0">
            {roster.map((member, index) => (
              <li
                key={member.id || index}
                className="rounded-lg border border-base-300 bg-base-100 p-3"
              >
                <div className="flex-bc gap-2 mb-2">
                  <span className="text-sm font-semibold text-base-content/70">
                    {member.type || `Member ${index + 1}`}
                  </span>
                  {pendingRemove === index ? (
                    <span className="flex-ec gap-2 text-sm">
                      <span>
                        Remove{' '}
                        {[member.firstName, member.lastName]
                          .filter(Boolean)
                          .join(' ') || 'this person'}
                        ?
                      </span>
                      <button
                        type="button"
                        className="kbtn kbtn-error kbtn-xs"
                        onClick={() => confirmRemove(index)}
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        className="kbtn kbtn-ghost kbtn-xs"
                        onClick={() => setPendingRemove(null)}
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="kbtn kbtn-ghost kbtn-xs"
                      onClick={() => requestRemove(index)}
                      disabled={disabled}
                      aria-label={`Remove member ${index + 1}`}
                    >
                      <Icon name="trash" size={16} />
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <label className="flex-c-st gap-1">
                    <span className="text-xs text-base-content/70">First name</span>
                    <input
                      className="kinput kinput-bordered w-full"
                      value={member.firstName || ''}
                      onChange={e => updateMember(index, { firstName: e.target.value })}
                      disabled={disabled}
                    />
                  </label>
                  <label className="flex-c-st gap-1">
                    <span className="text-xs text-base-content/70">Last name</span>
                    <input
                      className="kinput kinput-bordered w-full"
                      value={member.lastName || ''}
                      onChange={e => updateMember(index, { lastName: e.target.value })}
                      disabled={disabled}
                    />
                  </label>
                  <label className="flex-c-st gap-1">
                    <span className="text-xs text-base-content/70">Age</span>
                    <input
                      className="kinput kinput-bordered w-full"
                      type="number"
                      min="0"
                      max="120"
                      value={member.age ?? ''}
                      onChange={e => updateMember(index, { age: e.target.value })}
                      disabled={disabled}
                    />
                  </label>
                  <label className="flex-c-st gap-1">
                    <span className="text-xs text-base-content/70">Gender</span>
                    <select
                      className="kselect kselect-bordered w-full"
                      value={member.gender || ''}
                      onChange={e => updateMember(index, { gender: e.target.value })}
                      disabled={disabled}
                    >
                      <option value="">Not given</option>
                      {GENDERS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex-c-st gap-1">
                    <span className="text-xs text-base-content/70">Relationship</span>
                    <select
                      className="kselect kselect-bordered w-full"
                      value={member.type || ''}
                      onChange={e =>
                        updateMember(index, { type: e.target.value, typeTouched: true })
                      }
                      disabled={disabled}
                    >
                      {MEMBER_TYPES.map(ty => (
                        <option key={ty} value={ty}>{ty}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex-c-st gap-1">
                    <span className="text-xs text-base-content/70">
                      Shirt size <span className="text-base-content/50">(optional)</span>
                    </span>
                    <input
                      className="kinput kinput-bordered w-full"
                      value={member.shirtSize || ''}
                      onChange={e => updateMember(index, { shirtSize: e.target.value })}
                      disabled={disabled}
                    />
                  </label>
                  <label className="flex-c-st gap-1">
                    <span className="text-xs text-base-content/70">
                      Shoe size <span className="text-base-content/50">(optional)</span>
                    </span>
                    <input
                      className="kinput kinput-bordered w-full"
                      value={member.shoeSize || ''}
                      onChange={e => updateMember(index, { shoeSize: e.target.value })}
                      onKeyDown={e => onLastFieldKeyDown(e, index)}
                      disabled={disabled}
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex-bc gap-3 flex-wrap">
            <button
              type="button"
              className="kbtn kbtn-outline kbtn-sm"
              onClick={addMember}
              disabled={disabled}
            >
              <Icon name="plus" size={16} />
              Add family member
            </button>
            <p className={clsx('text-sm font-medium')} aria-live="polite">
              {describeHousehold(counts)}
              <span className="font-normal text-base-content/60">
                {' '}
                (including head of household)
              </span>
            </p>
          </div>
        </>
      )}
    </div>
  );
};

FamilyRoster.propTypes = {
  value: t.oneOfType([t.string, t.array]),
  onChange: t.func.isRequired,
  disabled: t.bool,
};
