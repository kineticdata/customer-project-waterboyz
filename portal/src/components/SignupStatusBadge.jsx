/**
 * Renders a DaisyUI badge for event signup status values.
 * Centralizes the status → color mapping used across the portal.
 */
const STATUS_CLASSES = {
  'Signed Up': 'badge badge-primary badge-sm',
  'Pending Assignment': 'badge badge-warning badge-sm',
  Assigned: 'badge badge-success badge-sm',
  Waitlisted: 'badge badge-warning badge-sm',
  Cancelled: 'badge badge-error badge-sm',
};

export const SignupStatusBadge = ({ status }) => {
  const cls = STATUS_CLASSES[status] ?? 'badge badge-ghost badge-sm';
  return <span className={cls}>{status || 'Signed Up'}</span>;
};
