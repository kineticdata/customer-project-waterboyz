import { useCallback, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { createSubmission, getCsrfToken, login } from '@kineticdata/react';
import { useSelector } from 'react-redux';
import { toastSuccess } from '../../helpers/toasts.js';
import { LoginCardWrapper } from './Login.jsx';
import logo from '../../assets/images/logo.png';
import { Icon } from '../../atoms/Icon.jsx';

export const ResetPassword = () => {
  let { token } = useParams();
  let [searchParams] = useSearchParams();

  return (
    <LoginCardWrapper>
      <div className="flex-ss w-full mb-4">
        <Link
          to="./.."
          className="kbtn kbtn-circle kbtn-ghost"
          aria-label="Back to Login"
        >
          <Icon name="arrow-left" />
        </Link>
      </div>
      {token ? (
        <ResetPasswordChangeForm
          token={token}
          username={decodeURIComponent(searchParams.get('u'))}
        />
      ) : (
        <ResetPasswordRequestForm />
      )}
    </LoginCardWrapper>
  );
};

const ResetPasswordRequestForm = () => {
  const kappSlug = useSelector(state => state.app.kappSlug);
  const themeLogo = useSelector(state => state.theme.data?.logo?.default);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [username, setUsername] = useState('');
  const onChangeUsername = useCallback(e => {
    setUsername(e.target.value);
  }, []);

  const submitRequest = useCallback(
    async e => {
      e.preventDefault();
      const { error } = await createSubmission({
        kappSlug,
        formSlug: 'account-password-reset',
        values: { Username: username },
        public: true,
      });

      if (error) {
        setError('There was a problem requesting a password reset.');
      } else {
        setSubmitted(true);
      }
    },
    [username, kappSlug],
  );

  return (
    <form className="flex-c-st gap-5 w-full">
      <div className="lg:hidden flex-cc mb-4">
        <img
          src={themeLogo || logo}
          alt="Waterboyz for Jesus"
          className="w-48"
        />
      </div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-base-content">
          Reset Password
        </h1>
        <p className="text-base-content/60 mt-1">
          Enter your username and we&apos;ll send you a reset link
        </p>
      </div>
      <div className="field">
        <label htmlFor="username">Username</label>
        <input
          id="email"
          type="text"
          name="username"
          required={true}
          autoFocus
          value={username}
          onChange={onChangeUsername}
          disabled={submitted}
          placeholder="you@example.com"
        />
      </div>
      {submitted && (
        <div className="px-4 py-3 rounded-lg bg-success text-success-content text-sm">
          Your request has been submitted. You should receive an email with a
          password reset link shortly.
        </div>
      )}
      {error && (
        <div className="flex-sc gap-2 px-4 py-3 rounded-lg bg-error text-error-content text-sm">
          <span className="kstatus kstatus-error"></span>
          {error}
        </div>
      )}
      <button
        type="submit"
        className="kbtn kbtn-lg kbtn-primary w-full mt-2"
        onClick={submitRequest}
        disabled={!username || submitted}
      >
        Reset Password
      </button>
    </form>
  );
};

const ResetPasswordChangeForm = ({ token, username }) => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const themeLogo = useSelector(state => state.theme.data?.logo?.default);

  const [password, setPassword] = useState('');
  const onChangePassword = useCallback(e => {
    setPassword(e.target.value);
  }, []);
  const [confirmPassword, setConfirmPassword] = useState('');
  const onChangeConfirmPassword = useCallback(e => {
    setConfirmPassword(e.target.value);
  }, []);

  const [untouchedFields, setUntouchedFields] = useState([
    'password',
    'passwordConfirmation',
  ]);
  const onBlurPasswordField = useCallback(e => {
    setUntouchedFields(fields =>
      fields.filter(field => field !== e.target.name),
    );
  }, []);
  const passwordMismatch =
    untouchedFields.length === 0 && password !== confirmPassword;

  const submitRequest = useCallback(
    async e => {
      e.preventDefault();
      setSubmitted(true);
      const response = await fetch(`/app/reset-password/token`, {
        method: 'POST',
        body: new URLSearchParams({
          username,
          password,
          confirmPassword,
          token,
        }),
        headers: { 'X-XSRF-TOKEN': getCsrfToken() },
      });

      if (response.status === 302 || (response.ok && response.redirected)) {
        const loginResult = await login({ username, password });
        if (!loginResult?.error) {
          window.location.replace('#/');
          window.location.reload();
        } else {
          navigate('/', { state: { persistToasts: true } });
          toastSuccess({ title: 'Password was successfully updated.' });
        }
      } else {
        try {
          const json = await response.json();
          if (json.error) setError(json.error);
        } catch {
          setError(
            'There was a problem resetting your password! Please note that password reset links may only be used once.',
          );
        }
      }
    },
    [navigate, username, password, confirmPassword, token],
  );

  return (
    <form className="flex-c-st gap-5 w-full">
      <div className="lg:hidden flex-cc mb-4">
        <img
          src={themeLogo || logo}
          alt="Waterboyz for Jesus"
          className="w-48"
        />
      </div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-base-content">
          Set New Password
        </h1>
        <p className="text-base-content/60 mt-1">
          Choose a strong password for your account
        </p>
      </div>
      {!token || !username ? (
        <div className="px-4 py-3 rounded-lg bg-error text-error-content text-sm">
          The reset password link is invalid.
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="email"
              type="text"
              name="username"
              required={true}
              value={username}
              disabled={true}
            />
          </div>
          <div className="field">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              name="password"
              required={true}
              disabled={submitted}
              value={password}
              onChange={onChangePassword}
              onBlur={onBlurPasswordField}
              placeholder="Enter new password"
            />
          </div>
          <div className="field">
            <label htmlFor="passwordConfirmation">Confirm Password</label>
            <input
              id="passwordConfirmation"
              type="password"
              name="passwordConfirmation"
              required={true}
              disabled={submitted}
              value={confirmPassword}
              onChange={onChangeConfirmPassword}
              onBlur={onBlurPasswordField}
              placeholder="Confirm new password"
            />
          </div>
          {passwordMismatch && (
            <div className="flex-sc gap-2 px-4 py-3 rounded-lg bg-error text-error-content text-sm">
              <span className="kstatus kstatus-error"></span>
              Passwords must match.
            </div>
          )}
          {error && (
            <div className="flex-sc gap-2 px-4 py-3 rounded-lg bg-error text-error-content text-sm">
              <span className="kstatus kstatus-error"></span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="kbtn kbtn-lg kbtn-primary w-full mt-2"
            onClick={submitRequest}
            disabled={
              submitted || !password || !confirmPassword || passwordMismatch
            }
          >
            Reset Password
          </button>
        </>
      )}
    </form>
  );
};
