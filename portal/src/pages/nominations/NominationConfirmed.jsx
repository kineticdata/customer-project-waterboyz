import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../atoms/Icon.jsx';

const CONTENT = {
  'swat-project-nomination': {
    heading: 'Thank you for your nomination!',
    subtext:
      'Your SWAT project nomination has been received. Our leadership team will review it and reach out to schedule a project.',
    steps: [
      'Leadership reviews nomination',
      'Project Captain assigned',
      'Volunteers scheduled',
      'Project day!',
    ],
    cta: { label: 'Submit another nomination', to: '/forms/swat-project-nomination' },
    secondary: { label: 'View my nominations', to: '/nominations' },
  },
  'christmas-alive-family-nomination': {
    heading: 'Thank you for nominating a family!',
    subtext:
      'Your Christmas Alive nomination has been submitted. Our team will review and reach out to the family.',
    steps: [
      'Nomination reviewed',
      'Family contacted',
      'Gifts delivered',
    ],
    cta: {
      label: 'Submit another nomination',
      to: '/forms/christmas-alive-family-nomination',
    },
    secondary: { label: 'View my nominations', to: '/nominations' },
  },
};

const FALLBACK = {
  heading: 'Your nomination was submitted!',
  subtext: "Thank you. We'll be in touch soon.",
  steps: null,
  cta: null,
  secondary: { label: 'View my nominations', to: '/nominations' },
};

export const NominationConfirmed = () => {
  const [searchParams] = useSearchParams();
  const formSlug = searchParams.get('form');
  const content = CONTENT[formSlug] || FALLBACK;

  return (
    <div className="gutter py-16 md:py-24 flex-c-cc">
      <div className="w-full max-w-lg bg-base-100 rounded-box shadow-lg border border-base-200 p-8 md:p-12 flex-c-cc gap-6 text-center">
        {/* Checkmark */}
        <div className="flex-cc w-24 h-24 rounded-full bg-success/10 text-success">
          <Icon name="circle-check" size={64} />
        </div>

        {/* Heading + subtext */}
        <div className="flex-c-cc gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">{content.heading}</h1>
          <p className="text-base-content/65 text-sm md:text-base max-w-sm">
            {content.subtext}
          </p>
        </div>

        {/* Steps */}
        {content.steps && (
          <div className="w-full flex-c-st gap-3 mt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
              What happens next
            </p>
            <ol className="w-full flex-c-st gap-2">
              {content.steps.map((step, index) => (
                <li key={index} className="flex-sc gap-3">
                  <span className="flex-cc w-7 h-7 rounded-full bg-primary text-primary-content text-xs font-bold flex-none">
                    {index + 1}
                  </span>
                  <span className="text-sm text-base-content/70">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* CTAs */}
        <div className="flex-c-cc gap-3 w-full mt-2">
          {content.cta && (
            <Link to={content.cta.to} className="kbtn kbtn-primary w-full">
              {content.cta.label}
            </Link>
          )}
          <Link
            to={content.secondary.to}
            className="kbtn kbtn-ghost w-full"
          >
            {content.secondary.label}
          </Link>
        </div>
      </div>
    </div>
  );
};
