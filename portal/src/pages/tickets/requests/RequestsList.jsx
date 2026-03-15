import { TicketList } from '../../../components/tickets/TicketList.jsx';

export const RequestsList = props => (
  <TicketList
    title="My Nominations"
    emptyMessage={({ previousPage }) =>
      `There are no nominations to show${previousPage ? ' on this page' : ''}.`
    }
    type="requests"
    {...props}
  />
);
