import { useCallback } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CoreForm } from '@kineticdata/react';
import { Icon } from '../../atoms/Icon.jsx';
import { Loading } from '../../components/states/Loading.jsx';
import { PublicLayout } from '../../components/PublicLayout.jsx';

export const PublicEventSignup = () => {
  const { formSlug } = useParams();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const authenticated = useSelector(state => state.app.authenticated);
  const kappSlug = useSelector(state => state.app.kappSlug);
  const navigate = useNavigate();

  if (authenticated) return <Navigate to="/events" replace />;

  const handleCreated = useCallback(
    response => {
      if (response.submission.coreState === 'Submitted') {
        navigate(`/public/events/${formSlug}/confirmed${eventId ? `?eventId=${eventId}` : ''}`);
      }
    },
    [formSlug, navigate],
  );

  return (
    <PublicLayout>
      <div className="gutter pb-24 md:pb-8">
        <div className="max-w-screen-sm mx-auto pt-8 pb-6">
          {/* Info banner */}
          <div className="rounded-box bg-info/10 border border-info/20 p-4 mb-6">
            <div className="flex gap-3">
              <Icon
                name="info-circle"
                size={20}
                className="text-info flex-none mt-0.5"
              />
              <div className="text-sm text-base-content/70">
                <p className="font-medium text-base-content/80 mb-1">
                  Signing up individually or as a group?
                </p>
                <p>
                  If you're signing up for multiple people (a family, a group),
                  you only need to submit once — mention everyone in the Notes
                  field. If each person wants their own account and volunteer
                  profile, have them sign up individually.
                </p>
              </div>
            </div>
          </div>

          {/* CoreForm */}
          {kappSlug && (
            <div className="rounded-box border border-base-200 bg-base-100 p-5 md:p-8">
              <CoreForm
                kapp={kappSlug}
                form={formSlug}
                public={true}
                values={{
                  ...(eventId ? { 'Event ID': eventId } : {}),
                  'Signup Status': 'Signed Up',
                }}
                created={handleCreated}
                components={{ Pending: Loading }}
              />
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};
