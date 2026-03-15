import { Link } from 'react-router-dom';

/**
 * Standard home page content section with a heading row and optional "View all"
 * link. Used on all role-specific home pages to avoid repeating the gutter /
 * max-width / heading layout boilerplate.
 */
export const HomeSection = ({
  title,
  viewAllTo,
  children,
  className = 'gutter mt-8 md:mt-10',
}) => (
  <div className={className}>
    <div className="max-w-screen-xl mx-auto flex-c-st gap-4">
      <div className="flex-bc">
        <h2 className="text-lg md:text-xl font-bold">{title}</h2>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="text-sm text-primary font-medium hover:underline"
          >
            View all
          </Link>
        )}
      </div>
      {children}
    </div>
  </div>
);
