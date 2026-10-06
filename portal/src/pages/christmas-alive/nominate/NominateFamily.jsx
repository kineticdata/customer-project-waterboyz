import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { KineticForm } from '../../../components/kinetic-form/KineticForm.jsx';
import { nominationDefaults } from '../../../helpers/nominationDefaults.js';

const FORM_SLUG = 'christmas-alive-family-nomination';

/**
 * Nominate a Family.
 *
 * The nomination stays a Kinetic form rather than a React screen: it is the
 * immutable intake artifact, it has workflows bound to it, and the
 * FamilyRoster widget mounts into it. This page is the wrapper that puts it in
 * Christmas Alive context and prefills what we already know about the
 * nominator.
 */
export const NominateFamily = () => {
  const navigate = useNavigate();
  const kappSlug = useSelector(state => state.app.kappSlug);
  const profile = useSelector(state => state.app.profile);

  // Shared with the generic /forms page so every way into this form
  // pre-fills the same way. See helpers/nominationDefaults.js.
  const values = useMemo(() => nominationDefaults(FORM_SLUG, profile), [profile]);

  const handleCompleted = useCallback(
    response => {
      if (response.submission?.displayedPage?.type !== 'confirmation') {
        navigate(`/nominations/confirmed?form=${FORM_SLUG}`);
      }
    },
    [navigate],
  );

  return (
    <div className="flex-c-st gap-5">
      <div className="flex-c-st gap-2 max-w-prose">
        <h1 className="text-h1 font-bold m-0">Nominate a family</h1>
        <p className="text-base-content/80 m-0">
          Recommend a family in your community to receive Christmas gifts. A
          Christmas Alive admin reviews every nomination before the family is
          offered for sponsorship, so add anything that would help them decide.
        </p>
      </div>

      <KineticForm
        kappSlug={kappSlug}
        formSlug={FORM_SLUG}
        values={values}
        completed={handleCompleted}
      />
    </div>
  );
};
