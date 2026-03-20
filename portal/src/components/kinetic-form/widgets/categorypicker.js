import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { searchSubmissions } from '@kineticdata/react';
import {
  registerWidget,
  validateContainer,
  validateField,
  WidgetAPI,
} from './index.js';
import { useData } from '../../../helpers/hooks/useData.js';
import { Icon } from '../../../atoms/Icon.jsx';
import { executeIntegration } from '../../../helpers/api.js';

/**
 * Fetches data from a kapp or form integration.
 */
const fetchIntegrationData = ({ integration }) =>
  executeIntegration({
    kappSlug: integration.kappSlug,
    formSlug: integration.formSlug,
    integrationName: integration.integrationName,
    parameters: integration.parameters,
  });

/**
 * Fetches data from a datastore form via searchSubmissions.
 */
const fetchSearchData = ({ search }) =>
  searchSubmissions({
    kapp: search.kappSlug,
    form: search.formSlug,
    search: { include: ['values'], limit: search.limit ?? 1000 },
  });

/**
 * Groups items by category and sorts them according to categoryOrder.
 *
 * @param {Object[]} items Array of objects with category and value properties.
 * @param {string} categoryField Property name for the category.
 * @param {string} valueField Property name for the value.
 * @param {string[]} [categoryOrder] Ordered list of category names.
 * @param {Object} [categoryIcons] Map of category name to icon name.
 * @param {Object} [categoryLabels] Map of category name to display label.
 */
function groupItems(
  items,
  categoryField,
  valueField,
  categoryOrder,
  categoryIcons,
  categoryLabels,
) {
  const groups = {};
  for (const item of items) {
    const category = item[categoryField] || 'Other';
    const value = item[valueField];
    if (!value) continue;
    if (!groups[category]) groups[category] = [];
    groups[category].push(value);
  }
  // Sort values alphabetically within each group
  for (const cat of Object.keys(groups)) {
    groups[cat].sort();
  }
  // Order categories: those in categoryOrder first, then any extras alphabetically
  const ordered = categoryOrder
    ? categoryOrder.filter(cat => groups[cat])
    : [];
  const extra = Object.keys(groups)
    .filter(cat => !ordered.includes(cat))
    .sort();
  return [...ordered, ...extra].map(cat => ({
    category: cat,
    label: categoryLabels?.[cat] || cat,
    icon: categoryIcons?.[cat],
    items: groups[cat],
  }));
}

export const CategoryPickerComponent = forwardRef(
  (
    {
      integration,
      search,
      options,
      categoryField,
      valueField,
      categoryOrder,
      categoryIcons,
      categoryLabels,
      field,
      onChange,
    },
    ref,
  ) => {
    // Selected items state - initialize from the Kinetic field value
    const [selected, setSelected] = useState(() => {
      if (!field) return new Set();
      try {
        const val = field.value();
        const arr = typeof val === 'string' ? JSON.parse(val) : val;
        return new Set(Array.isArray(arr) ? arr : []);
      } catch {
        return new Set();
      }
    });

    // Track which categories are expanded
    const [expanded, setExpanded] = useState(new Set());

    // Determine fetch function and params based on data source
    const fetchFn = useMemo(() => {
      if (integration) return fetchIntegrationData;
      if (search) return fetchSearchData;
      return () => Promise.resolve(null);
    }, [integration, search]);
    const fetchParams = useMemo(() => {
      if (integration) return { integration };
      if (search) return { search };
      return null;
    }, [integration, search]);
    const { loading, response } = useData(fetchFn, fetchParams);

    // Resolve items from integration, search, or static options
    const items = useMemo(() => {
      if (options) return options;
      if (integration && response) {
        return response[integration.listProperty] ?? null;
      }
      if (search && response?.submissions) {
        return response.submissions.map(s => s.values);
      }
      return null;
    }, [options, integration, search, response]);

    // Group items by category
    const groups = useMemo(
      () =>
        items
          ? groupItems(
              items,
              categoryField,
              valueField,
              categoryOrder,
              categoryIcons,
              categoryLabels,
            )
          : [],
      [items, categoryField, valueField, categoryOrder, categoryIcons, categoryLabels],
    );

    // Auto-expand categories that have selected items
    useEffect(() => {
      if (groups.length > 0 && selected.size > 0) {
        const catsWithSelection = new Set();
        for (const group of groups) {
          if (group.items.some(item => selected.has(item))) {
            catsWithSelection.add(group.category);
          }
        }
        setExpanded(prev => {
          const next = new Set(prev);
          for (const cat of catsWithSelection) next.add(cat);
          return next;
        });
      }
      // Only run on initial load
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groups]);

    // Sync selection back to the Kinetic field
    const syncToField = selectedSet => {
      const arr = [...selectedSet];
      const value = JSON.stringify(arr);
      if (field) field.value(value);
      if (onChange) onChange(arr);
    };

    const toggleItem = item => {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(item)) next.delete(item);
        else next.add(item);
        syncToField(next);
        return next;
      });
    };

    const toggleCategory = category => {
      setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(category)) next.delete(category);
        else next.add(category);
        return next;
      });
    };

    const countForCategory = group =>
      group.items.filter(item => selected.has(item)).length;

    // API ref
    const api = useRef({
      getSelected: () => [...selected],
      setSelected: values => {
        const next = new Set(Array.isArray(values) ? values : []);
        setSelected(next);
        syncToField(next);
      },
    });
    useEffect(() => {
      Object.assign(api.current, {
        getSelected: () => [...selected],
      });
    }, [selected]);

    if (loading) {
      return (
        <WidgetAPI ref={ref} api={api.current}>
          <div className="py-4 text-base-content/60">Loading...</div>
        </WidgetAPI>
      );
    }

    return (
      <WidgetAPI ref={ref} api={api.current}>
        <div className="w-full flex flex-col gap-1">
          {groups.map(group => {
            const isExpanded = expanded.has(group.category);
            const count = countForCategory(group);
            return (
              <div
                key={group.category}
                className="border border-base-300 rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(group.category)}
                  className={clsx(
                    'flex items-center gap-3 w-full px-4 py-3 text-left',
                    'hover:bg-base-200/50 transition-colors',
                    isExpanded && 'bg-base-200/30',
                  )}
                >
                  <Icon
                    name={group.icon || 'category'}
                    className="text-primary shrink-0"
                    size={20}
                  />
                  <span className="font-semibold flex-auto">
                    {group.label}
                  </span>
                  {count > 0 && (
                    <span className="kbadge kbadge-primary kbadge-sm">
                      {count}
                    </span>
                  )}
                  <Icon
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    className="text-base-content/50 shrink-0"
                  />
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {group.items.map(item => (
                      <label
                        key={item}
                        className={clsx(
                          'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer',
                          'hover:bg-base-200/50 transition-colors',
                          selected.has(item) && 'bg-primary/5',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary"
                          checked={selected.has(item)}
                          onChange={() => toggleItem(item)}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {selected.size > 0 && (
            <p className="text-sm text-base-content/60 mt-1">
              {selected.size} item{selected.size !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </WidgetAPI>
    );
  },
);

/**
 * Validates the CategoryPicker configuration.
 */
const validateConfig = config => {
  let valid = true;

  if (!config.integration && !config.search && !config.options) {
    console.error(
      'CategoryPicker Widget Error: You must provide an `integration` object, a `search` object, or a static `options` array.',
    );
    valid = false;
  }

  if (config.integration) {
    if (!config.integration.kappSlug || !config.integration.integrationName || !config.integration.listProperty) {
      console.error(
        'CategoryPicker Widget Error: The `integration.kappSlug`, `integration.integrationName`, and `integration.listProperty` properties are all required.',
      );
      valid = false;
    }
  }

  if (config.search) {
    if (!config.search.kappSlug || !config.search.formSlug) {
      console.error(
        'CategoryPicker Widget Error: The `search.kappSlug` and `search.formSlug` properties are required.',
      );
      valid = false;
    }
  }

  if (config.options && !Array.isArray(config.options)) {
    console.error(
      'CategoryPicker Widget Error: The `options` property must be an array of objects.',
    );
    valid = false;
  }

  if (!config.categoryField || !config.valueField) {
    console.error(
      'CategoryPicker Widget Error: The `categoryField` and `valueField` properties are required.',
    );
    valid = false;
  }

  return valid;
};

/**
 * Function that initializes a CategoryPicker widget.
 *
 * @param {HTMLElement} container HTML Element into which to render the widget.
 * @param {Object} config Configuration object for the widget.
 * @param {Object} [config.integration] Integration config for fetching data.
 * @param {string} config.integration.kappSlug Kapp slug for the integration.
 * @param {string} [config.integration.formSlug] Form slug for form-level integrations.
 * @param {string} config.integration.integrationName Name of the integration.
 * @param {string} config.integration.listProperty Response property containing the list.
 * @param {Object} [config.integration.parameters] Parameters to pass to the integration.
 * @param {Object} [config.search] Search config for fetching from a datastore form.
 * @param {string} config.search.kappSlug Kapp slug for the datastore form.
 * @param {string} config.search.formSlug Form slug for the datastore form.
 * @param {number} [config.search.limit] Max submissions to fetch (default 1000).
 * @param {Object[]} [config.options] Static array of options (alternative to integration/search).
 * @param {string} config.categoryField Property name for the category in each item.
 * @param {string} config.valueField Property name for the value in each item.
 * @param {string[]} [config.categoryOrder] Ordered list of categories for display.
 * @param {Object} [config.categoryIcons] Map of category name to Tabler icon name.
 * @param {Object} [config.categoryLabels] Map of category name to display label.
 * @param {Object} [config.field] Kinetic field reference for syncing the value.
 * @param {Function} [config.onChange] Callback when selection changes.
 * @param {string} [id] Optional id for retrieving the widget API.
 */
export const CategoryPicker = ({ container, config, id } = {}) => {
  if (!validateContainer(container, 'CategoryPicker')) {
    return Promise.reject(
      'The CategoryPicker widget container is invalid. See the console for details.',
    );
  }
  if (!validateConfig(config)) {
    return Promise.reject(
      'The CategoryPicker widget config is invalid. See the console for details.',
    );
  }
  if (config?.field && !validateField(config.field, null, 'CategoryPicker')) {
    return Promise.reject(
      'The CategoryPicker widget field is invalid. See the console for details.',
    );
  }
  return registerWidget(CategoryPicker, {
    container,
    Component: CategoryPickerComponent,
    props: { ...config },
    id,
  });
};
