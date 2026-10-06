import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { registerWidget, validateContainer, validateField, WidgetAPI } from './index.js';
import { FamilyRoster } from '../../family-roster/FamilyRoster.jsx';
import {
  parseRoster,
  rosterProblems,
  serializeRoster,
} from '../../../helpers/christmasAlive.js';

/**
 * Widget wrapper around the shared FamilyRoster component.
 *
 * The editor itself lives in `components/family-roster/FamilyRoster.jsx` and is
 * used directly by the pure-React admin screens. This module only adapts it to
 * the Kinetic form widget lifecycle, so there is exactly one roster editor to
 * maintain rather than two that drift apart.
 */
const FamilyRosterComponent = forwardRef(({ field, onChange, lastNameField }, ref) => {
  const [showErrors, setShowErrors] = useState(false);
  const rootRef = useRef(null);
  const [value, setValue] = useState(() => {
    try {
      return field ? (field.value() ?? '') : '';
    } catch {
      return '';
    }
  });

  const handleChange = useCallback(
    next => {
      setValue(next);
      if (field) field.value(next);
      if (typeof onChange === 'function') onChange(parseRoster(next));
    },
    [field, onChange],
  );

  // Called by the form's Submit event. Returns true when every row has its
  // required fields; otherwise turns on the highlighting and scrolls the
  // roster into view so the person can see what is missing.
  const validate = useCallback(() => {
    const complete = rosterProblems(parseRoster(value)).length === 0;
    setShowErrors(!complete);
    if (!complete) {
      rootRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
    return complete;
  }, [value]);

  // Read at the moment a row is added, so it follows edits to the head of
  // household's last name rather than capturing the value at mount.
  const defaultLastName = useCallback(() => {
    try {
      return lastNameField ? (lastNameField.value() ?? '') : '';
    } catch {
      return '';
    }
  }, [lastNameField]);

  const api = useRef({
    getRoster: () => parseRoster(value),
    setRoster: roster => handleChange(serializeRoster(roster)),
    validate,
  });

  useEffect(() => {
    api.current.getRoster = () => parseRoster(value);
    api.current.setRoster = roster => handleChange(serializeRoster(roster));
    api.current.validate = validate;
  }, [value, handleChange, validate]);

  return (
    <WidgetAPI ref={ref} api={api.current}>
      <div ref={rootRef}>
        <FamilyRoster
          value={value}
          onChange={handleChange}
          showErrors={showErrors}
          defaultLastName={defaultLastName}
        />
      </div>
    </WidgetAPI>
  );
});

FamilyRosterComponent.displayName = 'FamilyRosterComponent';

/**
 * Initializes a FamilyRoster widget.
 *
 * @param {HTMLElement} container HTML Element into which to render the widget.
 * @param {Object} config Configuration object for the widget.
 * @param {Object} config.field Kinetic field reference holding the roster JSON.
 * @param {Function} [config.onChange] Called with the parsed roster on change.
 * @param {Object} [config.lastNameField] Kinetic field reference for the head
 *   of household's last name; new rows default to it.
 * @param {string} [id] Optional id for retrieving the widget API.
 */
export const FamilyRosterWidget = ({ container, config, id } = {}) => {
  if (!validateContainer(container, 'FamilyRoster')) {
    return Promise.reject(
      'The FamilyRoster widget container is invalid. See the console for details.',
    );
  }
  if (!config?.field || !validateField(config.field, null, 'FamilyRoster')) {
    return Promise.reject(
      'The FamilyRoster widget requires a valid `field`. See the console for details.',
    );
  }
  return registerWidget(FamilyRosterWidget, {
    container,
    Component: FamilyRosterComponent,
    props: { ...config },
    id,
  });
};
