import { Link } from 'react-router-dom';
import { Icon } from '../../atoms/Icon.jsx';

export const Privacy = () => (
  <div className="gutter pb-8">
    <div className="max-w-screen-md mx-auto pt-1 pb-6">
      <div className="flex-sc gap-3 mb-6">
        <Link
          to="/"
          className="kbtn kbtn-ghost kbtn-sm kbtn-circle"
          aria-label="Back to home"
        >
          <Icon name="arrow-left" />
        </Link>
        <h1 className="text-xl font-bold">Privacy Notice</h1>
      </div>

      <div className="rounded-box border bg-base-100 p-6 flex flex-col gap-4 text-sm text-base-content/80 leading-relaxed">
        <p>
          Waterboyz for Jesus is committed to protecting your privacy. This
          notice describes how we collect, use, and safeguard your personal
          information when you use this portal.
        </p>

        <h2 className="text-base font-semibold text-base-content mt-2">
          Information We Collect
        </h2>
        <p>
          We collect information you provide directly, such as your name, email
          address, phone number, and mailing address when you create an account,
          volunteer, or submit a service request.
        </p>

        <h2 className="text-base font-semibold text-base-content mt-2">
          How We Use Your Information
        </h2>
        <p>
          Your information is used to coordinate volunteer projects, communicate
          with you about upcoming events, and manage service requests for
          families in need.
        </p>

        <h2 className="text-base font-semibold text-base-content mt-2">
          Data Sharing
        </h2>
        <p>
          We do not sell or share your personal information with third parties
          for marketing purposes. Information may be shared with project
          captains and team leaders as necessary to coordinate volunteer
          activities.
        </p>

        <h2 className="text-base font-semibold text-base-content mt-2">
          Contact Us
        </h2>
        <p>
          If you have questions about this privacy notice or your personal data,
          please contact us through the portal or reach out to your local
          Waterboyz chapter.
        </p>
      </div>
    </div>
  </div>
);
