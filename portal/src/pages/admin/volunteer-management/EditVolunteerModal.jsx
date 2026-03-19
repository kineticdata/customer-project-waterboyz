import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Modal } from '../../../atoms/Modal.jsx';
import { KineticForm } from '../../../components/kinetic-form/KineticForm.jsx';
import { toastSuccess } from '../../../helpers/toasts.js';

/**
 * Modal that renders the Kinetic `volunteers` form for editing an existing
 * volunteer record. Uses CoreForm under the hood so all form fields, validation,
 * and widgets (SkillPicker, etc.) work automatically.
 */
export const EditVolunteerModal = ({ open, onClose, volunteerId, onSaved }) => {
  const { kappSlug } = useSelector(state => state.app);

  const handleUpdated = useCallback(() => {
    toastSuccess({ title: 'Volunteer profile updated.' });
    onSaved?.();
    onClose();
  }, [onSaved, onClose]);

  return (
    <Modal
      open={open}
      onOpenChange={({ open: isOpen }) => !isOpen && onClose()}
      title="Edit Volunteer Profile"
      size="lg"
    >
      <div slot="body">
        {volunteerId && (
          <div className="embedded-core-form">
            <KineticForm
              kappSlug={kappSlug}
              formSlug="volunteers"
              submissionId={volunteerId}
              updated={handleUpdated}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
