import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { createSubmission } from '@kineticdata/react';
import clsx from 'clsx';
import { Modal } from '../../../atoms/Modal.jsx';
import { Icon } from '../../../atoms/Icon.jsx';
import { toastSuccess } from '../../../helpers/toasts.js';

const VOLUNTEERS_FORM = 'volunteers';

// Mirrors the `pattern` on the `volunteers` form's Email Address field so
// client-side validation matches what the platform would enforce.
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const EMAIL_PATTERN_MESSAGE = 'Please provide a valid email address.';

const emptyValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  org: '',
};

export const CreateVolunteerModal = ({ open, onClose, affiliates = [], onCreated }) => {
  const { kappSlug } = useSelector(state => state.app);
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (name, value) =>
    setValues(v => ({ ...v, [name]: value }));

  const handleClose = useCallback(() => {
    if (submitting) return;
    setValues(emptyValues);
    setErrors({});
    setSubmitError(null);
    onClose();
  }, [submitting, onClose]);

  const validate = () => {
    const next = {};
    if (!values.firstName.trim()) next.firstName = 'First Name is required.';
    if (!values.lastName.trim()) next.lastName = 'Last Name is required.';
    const email = values.email.trim();
    // Email is required here (admin-create flow relies on it to send the
    // portal invitation) even though the form itself marks it optional.
    if (!email) next.email = 'Email is required.';
    else if (!EMAIL_PATTERN.test(email)) next.email = EMAIL_PATTERN_MESSAGE;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    const email = values.email.trim();
    const result = await createSubmission({
      kappSlug,
      formSlug: VOLUNTEERS_FORM,
      completed: true,
      values: {
        'First Name': values.firstName.trim(),
        'Last Name': values.lastName.trim(),
        'Email Address': email,
        'Phone Number': values.phone.trim(),
        'Affiliated Organization': values.org,
        Username: email,
      },
    });
    setSubmitting(false);

    if (result?.error) {
      setSubmitError(
        result.error.message || 'Unable to create volunteer. Please try again.',
      );
      return;
    }

    toastSuccess({
      title: 'Volunteer added',
      description: 'An invitation will be sent to the volunteer.',
    });
    const created = result?.submission;
    setValues(emptyValues);
    setErrors({});
    onClose();
    onCreated?.(created);
  };

  return (
    <Modal
      open={open}
      onOpenChange={({ open: isOpen }) => !isOpen && handleClose()}
      title="Add Volunteer"
      size="sm"
      closeOnInteractOutside={!submitting}
      closeOnEscape={!submitting}
    >
      <form slot="body" onSubmit={handleSubmit} className="flex-c-st gap-4">
        {submitError && (
          <div className="rounded-lg bg-error/10 border border-error/30 text-error-content px-3 py-2 text-sm flex-sc gap-2">
            <Icon name="alert-circle" size={16} className="flex-none" />
            <span>{submitError}</span>
          </div>
        )}

        <div className={clsx('field required', errors.firstName && 'has-error')}>
          <label htmlFor="cv-first-name">First Name</label>
          <input
            id="cv-first-name"
            type="text"
            value={values.firstName}
            onChange={e => setField('firstName', e.target.value)}
            autoFocus
          />
          {errors.firstName && (
            <p className="flex-sc gap-2 text-error-content text-sm mt-1">
              <span className="kstatus kstatus-error" />
              {errors.firstName}
            </p>
          )}
        </div>

        <div className={clsx('field required', errors.lastName && 'has-error')}>
          <label htmlFor="cv-last-name">Last Name</label>
          <input
            id="cv-last-name"
            type="text"
            value={values.lastName}
            onChange={e => setField('lastName', e.target.value)}
          />
          {errors.lastName && (
            <p className="flex-sc gap-2 text-error-content text-sm mt-1">
              <span className="kstatus kstatus-error" />
              {errors.lastName}
            </p>
          )}
        </div>

        <div className={clsx('field required', errors.email && 'has-error')}>
          <label htmlFor="cv-email">Email Address</label>
          <input
            id="cv-email"
            type="text"
            value={values.email}
            onChange={e => setField('email', e.target.value)}
          />
          {errors.email && (
            <p className="flex-sc gap-2 text-error-content text-sm mt-1">
              <span className="kstatus kstatus-error" />
              {errors.email}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="cv-phone">Phone Number</label>
          <input
            id="cv-phone"
            type="text"
            value={values.phone}
            onChange={e => setField('phone', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="cv-org">Affiliated Organization</label>
          <select
            id="cv-org"
            value={values.org}
            onChange={e => setField('org', e.target.value)}
          >
            <option value="">— None —</option>
            {affiliates.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div slot="footer">
        <button
          type="button"
          className="kbtn kbtn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting && (
            <Icon name="loader-2" size={16} className="animate-spin" />
          )}
          Create Volunteer
        </button>
        <button
          type="button"
          className="kbtn kbtn-ghost"
          onClick={handleClose}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
};
