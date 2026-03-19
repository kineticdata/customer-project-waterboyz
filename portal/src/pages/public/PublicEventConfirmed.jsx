import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../../atoms/Icon.jsx';
import { PublicLayout } from '../../components/PublicLayout.jsx';

export const PublicEventConfirmed = () => {
  const { formSlug } = useParams();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');

  return (
    <PublicLayout>
      <div className="gutter py-16 md:py-24 flex-c-cc">
        <div className="w-full max-w-lg bg-base-100 rounded-box shadow-lg border border-base-200 p-8 md:p-12 flex-c-cc gap-6 text-center">
          {/* Checkmark */}
          <div className="flex-cc w-24 h-24 rounded-full bg-success/10 text-success">
            <Icon name="circle-check" size={64} />
          </div>

          {/* Heading */}
          <div className="flex-c-cc gap-2">
            <h1 className="text-2xl md:text-3xl font-bold">
              You&apos;re signed up!
            </h1>
            <p className="text-base-content/65 text-sm md:text-base max-w-sm">
              Thank you for volunteering with Waterboyz for Jesus. We&apos;re excited
              to have you join us!
            </p>
          </div>

          {/* What happens next */}
          <div className="w-full flex-c-st gap-3 mt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
              What happens next
            </p>
            <ol className="w-full flex-c-st gap-2">
              {[
                "You'll receive an email to create your account",
                'Set your password and log in',
                'Complete your volunteer profile with skills & availability',
                "We'll assign you to a project before the serve day",
              ].map((step, index) => (
                <li key={index} className="flex-sc gap-3">
                  <span className="flex-cc w-7 h-7 rounded-full bg-primary text-primary-content text-xs font-bold flex-none">
                    {index + 1}
                  </span>
                  <span className="text-sm text-base-content/70 text-left">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* CTAs */}
          <div className="flex-c-cc gap-3 w-full mt-2">
            <Link
              to={`/public/events/${formSlug}${eventId ? `?eventId=${eventId}` : ''}`}
              className="kbtn kbtn-primary w-full"
            >
              <Icon name="user-plus" size={18} />
              Sign up another volunteer
            </Link>
            <Link to="/public/events" className="kbtn kbtn-ghost w-full">
              Back to events
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};
