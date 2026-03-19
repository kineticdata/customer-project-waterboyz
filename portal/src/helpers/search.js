import { regRedux } from '../redux.js';

/**
 * Use redux state to store the open state of the search modal.
 */
const searchActions = regRedux(
  'search',
  { open: false, searchOnly: false },
  {
    open(state, { searchOnly } = {}) {
      state.open = true;
      state.searchOnly = searchOnly;
    },
    close(state) {
      state.open = false;
      state.searchOnly = false;
    },
  },
);

/**
 * Opens the search modal.
 *
 * @param {object} [options]
 * @param {boolean} [options.searchOnly] Should the modal only show the search.
 */
export const openSearch = options => {
  searchActions.open(options);
};

/**
 * Closes the search modal.
 */
export const closeSearch = () => {
  searchActions.close();
};

