import { useSelector } from 'react-redux';
import { useState, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { fetchProfile, updateProfile } from '@kineticdata/react';
import { useRoles } from '../../helpers/hooks/useRoles.js';
import { useVolunteerRecord } from '../../helpers/hooks/useVolunteerRecord.js';
import { usePoller } from '../../helpers/hooks/usePoller.js';
import { Avatar } from '../../atoms/Avatar.jsx';
import { Icon } from '../../atoms/Icon.jsx';
import { validateEmail } from '../../helpers/index.js';
import { getAttributeValue } from '../../helpers/records.js';
import { appActions } from '../../helpers/state.js';
import { toastError, toastSuccess } from '../../helpers/toasts.js';
import { KineticForm } from '../../components/kinetic-form/KineticForm.jsx';
import { markVolunteerProfileUpdated } from '../../helpers/volunteer.js';

export const Profile = () => {
  const { profile, kappSlug } = useSelector(state => state.app);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = location.state?.returnTo;

  // Account form state
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showChangedPassword, setShowChangedPassword] = useState(false);
  const [newEmail, setNewEmail] = useState(profile.email);
  const [newDisplayName, setNewDisplayName] = useState(profile.displayName);
  const [validationErrors, setValidationErrors] = useState({
    newEmail: '',
    newDisplayName: '',
    newPassword: '',
  });

  // Volunteer record — checks user attribute first, falls back to datastore lookup
  const { volunteerId, loading: volunteerLoading } = useVolunteerRecord();
  const { hasProjectAccess } = useRoles();

  // Auto-show the create form for captains/leadership who don't have a record
  const [showVolunteerForm, setShowVolunteerForm] = useState(
    !getAttributeValue(profile, 'Volunteer Id') && hasProjectAccess,
  );
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') || 'account',
  );

  // Polling for the Volunteer Id user attribute after creating a new record.
  // The workflow sets this asynchronously after submission.
  const [pollingForVolunteerId, setPollingForVolunteerId] = useState(false);

  const pollForVolunteerId = useCallback(async () => {
    const { profile: updatedProfile } = await fetchProfile({
      include: 'profileAttributesMap,attributesMap,memberships',
    });
    if (updatedProfile && getAttributeValue(updatedProfile, 'Volunteer Id')) {
      appActions.setProfile({ profile: updatedProfile });
      appActions.setVolunteerProfilePending(false);
      setPollingForVolunteerId(false);
      toastSuccess({ title: 'Volunteer profile is ready!' });
      if (returnTo) {
        navigate(returnTo, { state: { persistToasts: true } });
      }
    }
  }, [returnTo, navigate]);

  usePoller(pollingForVolunteerId ? pollForVolunteerId : null);

  const handleVolunteerCreated = useCallback(() => {
    toastSuccess({
      title: 'Volunteer profile saved.',
      description: 'Setting up your account — this may take a moment.',
    });
    markVolunteerProfileUpdated();
    appActions.setVolunteerProfilePending(true);
    pollForVolunteerId();
    setPollingForVolunteerId(true);
  }, [pollForVolunteerId]);

  const handleVolunteerSaved = useCallback(() => {
    toastSuccess({ title: 'Volunteer profile saved.' });
    markVolunteerProfileUpdated();
    if (returnTo) {
      navigate(returnTo, { state: { persistToasts: true } });
    }
  }, [returnTo, navigate]);

  const saveProfile = useCallback(
    async e => {
      e.preventDefault();

      const newValidationErrors = {
        newEmail:
          newEmail.length <= 0
            ? 'Email is required'
            : !validateEmail(newEmail)
              ? 'Invalid email format'
              : '',
        newDisplayName:
          newDisplayName.length <= 0 ? 'Display Name is required.' : '',
        newPassword:
          showChangedPassword && newPassword.length <= 0
            ? 'Password is required.'
            : '',
      };
      setValidationErrors(newValidationErrors);

      if (Object.values(newValidationErrors).some(o => o)) {
        return;
      }

      let newProfileData = { displayName: newDisplayName, email: newEmail };
      if (showChangedPassword && newPassword.length > 0) {
        newProfileData.password = newPassword;
      }

      updateProfile({
        profile: newProfileData,
      }).then(({ error, profile }) => {
        if (!error) {
          toastSuccess({ title: 'Your profile has been updated.' });
          appActions.updateProfile(profile);
        } else {
          toastError({
            title: 'Profile update failed.',
            description: error.message,
          });
        }
      });
    },
    [newPassword, newDisplayName, showChangedPassword, newEmail],
  );

  // Show a waiting state after the volunteer form was submitted but the
  // Volunteer Id hasn't propagated yet (workflow still running)
  const showVolunteerPendingState = pollingForVolunteerId && !volunteerId;

  return (
    <div className="gutter pb-24 md:pb-8">
      <div className="max-w-screen-md mx-auto pt-4 pb-6">
        {/* Back button */}
        <div className="flex-sc gap-3 mb-6">
          <button
            type="button"
            className="kbtn kbtn-ghost kbtn-sm kbtn-circle"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <Icon name="arrow-left" />
          </button>
          <span className="text-lg font-semibold">My Profile</span>
        </div>

        <div className="bg-base-100 rounded-box border border-base-200 overflow-hidden">
          {/* Profile header */}
          <div className="flex-c-sc gap-4 py-8 px-6 bg-base-200/40">
            <Avatar username={profile.username} size="2xl" />
            <div className="text-lg font-bold">{profile.displayName}</div>
            <div className="text-sm text-base-content/50">{profile.email}</div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-base-200">
            <button
              type="button"
              className={clsx(
                'flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors',
                activeTab === 'account'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-base-content/50 hover:text-base-content',
              )}
              onClick={() => {
                setActiveTab('account');
                setSearchParams({ tab: 'account' });
              }}
            >
              Account Info
            </button>
            <button
              type="button"
              className={clsx(
                'flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors',
                activeTab === 'volunteer'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-base-content/50 hover:text-base-content',
              )}
              onClick={() => {
                setActiveTab('volunteer');
                setSearchParams({ tab: 'volunteer' });
              }}
            >
              Volunteer Profile
            </button>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {activeTab === 'account' && (
              <form className="flex-c-st gap-5 w-full">
                <div
                  className={clsx('field required', {
                    'has-error': validationErrors.newEmail,
                  })}
                >
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="text"
                    name="email"
                    required={true}
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                  />
                  {validationErrors.newEmail && (
                    <p className="flex-sc gap-2 text-error-content text-sm mt-1">
                      <span className="kstatus kstatus-error"></span>
                      {validationErrors.newEmail}
                    </p>
                  )}
                </div>
                <div
                  className={clsx('field required', {
                    'has-error': validationErrors.newDisplayName,
                  })}
                >
                  <label htmlFor="displayName">Display Name</label>
                  <input
                    id="displayName"
                    type="text"
                    name="displayName"
                    required={true}
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value)}
                  />
                  {validationErrors.newDisplayName && (
                    <p className="flex-sc gap-2 text-error-content text-sm mt-1">
                      <span className="kstatus kstatus-error"></span>
                      {validationErrors.newDisplayName}
                    </p>
                  )}
                </div>
                {showChangedPassword && (
                  <div
                    className={clsx('field required', {
                      'has-error': validationErrors.newPassword,
                    })}
                  >
                    <label htmlFor="password">Password</label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        required={true}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="pr-12"
                      />
                      <button
                        type="button"
                        className="kbtn kbtn-ghost kbtn-xs kbtn-circle absolute right-3 top-2 z-1"
                        onClick={() => setShowPassword(prev => !prev)}
                        aria-label={`${showPassword ? 'Hide Password' : 'Show Password'}`}
                      >
                        <Icon name={showPassword ? 'eye-off' : 'eye'} />
                      </button>
                    </div>
                    {validationErrors.newPassword && (
                      <p className="flex-sc gap-2 text-error-content text-sm mt-1">
                        <span className="kstatus kstatus-error"></span>
                        {validationErrors.newPassword}
                      </p>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  className="kbtn kbtn-ghost kbtn-xs self-end -mt-2 text-primary"
                  onClick={() => setShowChangedPassword(!showChangedPassword)}
                >
                  {showChangedPassword === false ? 'Change Password' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="kbtn kbtn-primary kbtn-lg w-full mt-4"
                  onClick={saveProfile}
                  disabled={
                    profile.email === newEmail &&
                    profile.displayName === newDisplayName &&
                    !showChangedPassword
                  }
                >
                  Save Changes
                </button>
              </form>
            )}

            {activeTab === 'volunteer' && (
              <div>
                {showVolunteerPendingState ? (
                  <div className="flex-c-cc gap-4 py-12">
                    <Icon
                      name="loader-2"
                      size={36}
                      className="animate-spin text-primary"
                    />
                    <p className="font-semibold">
                      Setting up your volunteer profile…
                    </p>
                    <p className="text-sm text-base-content/60 text-center max-w-sm">
                      We&apos;re linking your account to your volunteer record.
                      This usually takes just a few seconds.
                    </p>
                  </div>
                ) : volunteerLoading ? (
                  <div className="flex-cc py-12">
                    <Icon
                      name="loader-2"
                      size={28}
                      className="animate-spin text-base-content/30"
                    />
                  </div>
                ) : volunteerId ? (
                  <KineticForm
                    kappSlug={kappSlug}
                    formSlug="volunteers"
                    submissionId={volunteerId}
                    created={handleVolunteerSaved}
                    updated={handleVolunteerSaved}
                  />
                ) : showVolunteerForm ? (
                  <KineticForm
                    kappSlug={kappSlug}
                    formSlug="volunteers"
                    created={handleVolunteerCreated}
                    values={{
                      Username: profile.username,
                      'First Name': profile.displayName.split(' ')[0],
                      'Last Name': profile.displayName.split(' ').slice(1).join(' ') || '',
                      'Email Address': profile.email,
                    }}
                  />
                ) : (
                  <div className="flex-c-cc gap-4 py-8">
                    <div className="flex-cc w-16 h-16 rounded-full bg-primary/10 text-primary">
                      <Icon name="heart-handshake" size={32} />
                    </div>
                    <p className="text-base-content/60 text-center max-w-sm">
                      Join our volunteer community and help families in need
                    </p>
                    <button
                      type="button"
                      className="kbtn kbtn-primary kbtn-lg"
                      onClick={() => setShowVolunteerForm(true)}
                    >
                      Sign up to Volunteer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-base-200 p-6">
            <a
              href="/app/logout"
              className="kbtn kbtn-ghost w-full text-base-content/50 hover:text-error"
            >
              <Icon name="logout" size={18} />
              <span>Log Out</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
