import { TicketList } from '../../../components/tickets/TicketList.jsx';

export const ActionsList = props => (
  <TicketList
    title="My Tasks"
    emptyMessage="There are no actions to show."
    type="actions"
    {...props}
  />
);
