import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Modal } from '../atoms/Modal.jsx';
import { CoreForm, updateSubmission } from '@kineticdata/react';
import { Loading as Pending } from './states/Loading.jsx';
import { toastSuccess, toastError } from '../helpers/toasts.js';

/**
 * Modal that renders the event sign-up form for a given event.
 * Uses the form slug defined on the event (Sign Up Form Slug field),
 * falling back to 'event-signups' if none is configured.
 *
 * When a cancelled signup is passed, opens the original submission in edit
 * mode so the user can re-register rather than creating a duplicate.
 *
 * @param {Object} props
 * @param {Object} props.event - The event submission object
 * @param {Object} [props.signup] - Existing signup submission (may be cancelled)
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onClose - Called when the modal should close
 * @param {Function} props.onCreated - Called after successful signup
 */
export const EventSignupModal = ({ event, signup, open, onClose, onCreated }) => {
  const { kappSlug } = useSelector(state => state.app);

  const formSlug = event?.values?.['Sign Up Form Slug'] || 'serve-day-sign-up';
  const eventName = event?.values?.['Event Name'] || 'Event';
  const isCancelledReregistration =
    signup?.values?.['Signup Status'] === 'Cancelled';

  // When re-registering, reset the status to Signed Up before rendering the form
  const [isResetting, setIsResetting] = useState(false);
  useEffect(() => {
    if (open && isCancelledReregistration) {
      setIsResetting(true);
      updateSubmission({ id: signup.id, values: { 'Signup Status': 'Signed Up' } }).then(
        result => {
          if (result?.error) {
            toastError({ title: 'Could not reset signup', description: result.error.message });
            onClose?.();
          }
          setIsResetting(false);
        },
      );
    }
  }, [open, isCancelledReregistration, signup?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitted = useCallback(
    response => {
      if (response.submission.coreState === 'Submitted') {
        toastSuccess({ title: `Signed up for ${eventName}!` });
        onCreated?.();
        onClose?.();
      }
    },
    [eventName, onCreated, onClose],
  );

  return (
    <Modal
      open={open}
      onOpenChange={({ open: isOpen }) => !isOpen && onClose?.()}
      title={`Sign Up — ${eventName}`}
      size="md"
    >
      <div slot="body">
        {open && event && (
          isCancelledReregistration ? (
            isResetting ? <Pending /> : (
              <CoreForm
                submission={signup.id}
                components={{ Pending }}
                updated={handleSubmitted}
              />
            )
          ) : (
            <CoreForm
              kapp={kappSlug}
              form={formSlug}
              values={{
                'Event ID': event.id,
                'Signup Status': 'Signed Up',
              }}
              components={{ Pending }}
              created={handleSubmitted}
            />
          )
        )}
      </div>
    </Modal>
  );
};
