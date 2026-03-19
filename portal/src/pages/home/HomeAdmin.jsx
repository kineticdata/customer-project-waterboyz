import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HomeHero } from '../../components/home/HomeHero.jsx';
import { ActivityList, WorkList } from './Home.jsx';
import { NominateSection } from './HomeNominator.jsx';

export const HomeAdmin = () => {
  const { profile } = useSelector(state => state.app);

  return (
    <div className="flex-c-st gap-0 pb-24 md:pb-8">
      <HomeHero
        eyebrow="SWAT Leadership"
        title={profile?.displayName}
        subtitle="Manage projects, volunteers, and events."
      />

      {/* Two-column layout: nominations left, tasks sidebar right */}
      <div className="gutter mt-8 md:mt-10">
        <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Left column — nominations, nominate a family */}
          <div className="lg:col-span-2 flex-c-st gap-8 md:gap-10">
            <div className="flex-c-st gap-4">
              <div className="flex-bc">
                <h2 className="text-lg md:text-xl font-bold">My Nominations</h2>
                <Link
                  to="/nominations"
                  className="text-sm text-primary font-medium hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="bg-base-100 rounded-box border border-base-200 overflow-hidden">
                <ActivityList limit={3} />
              </div>
            </div>

            <NominateSection />
          </div>

          {/* Right column — tasks sidebar (sticky on desktop) */}
          <div className="lg:sticky lg:top-6 lg:self-start flex-c-st gap-4">
            <div className="flex-bc">
              <h2 className="text-lg md:text-xl font-bold">My Tasks</h2>
              <Link
                to="/actions"
                className="text-sm text-primary font-medium hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="bg-base-100 rounded-box border border-base-200 overflow-hidden">
              <WorkList limit={10} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
