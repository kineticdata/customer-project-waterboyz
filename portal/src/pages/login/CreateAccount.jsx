import { useCallback, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { createSubmission, getCsrfToken } from '@kineticdata/react';
import { useSelector } from 'react-redux';
import { toastSuccess } from '../../helpers/toasts.js';
import { LoginCardWrapper } from './Login.jsx';
import logo from '../../assets/images/logo.png';
import { Icon } from '../../atoms/Icon.jsx';

export const CreateAccount = () => {
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
        <SetPasswordForm
          token={token}
          username={decodeURIComponent(searchParams.get('u'))}
        />
      ) : (
        <RegisterForm />
      )}
    </LoginCardWrapper>
  );
};

const RegisterForm = () => {
  const kappSlug = useSelector(state => state.app.kappSlug);
  const themeLogo = useSelector(state => state.theme.data?.logo?.default);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [email, setEmail] = useState('');
  const onChangeEmail = useCallback(e => {
    setEmail(e.target.value);
  }, []);

  const [name, setName] = useState('');
  const onChangeName = useCallback(e => {
    setName(e.target.value);
  }, []);

  const submitRequest = useCallback(
    async e => {
      e.preventDefault();
      const { error } = await createSubmission({
        kappSlug,
        formSlug: 'account-registration',
        values: { 'Display Name': name, 'Email Address': email },
        public: true,
      });

      if (error) {
        setError('There was a problem requesting a new account.');
      } else {
        setSubmitted(true);
      }
    },
    [name, email, kappSlug],
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
          Create Account
        </h1>
        <p className="text-base-content/60 mt-1">
          Join the Waterboyz volunteer community
        </p>
      </div>
      <div className="field">
        <label htmlFor="name">First and Last Name</label>
        <input
          id="name"
          type="text"
          name="name"
          required={true}
          autoFocus
          value={name}
          onChange={onChangeName}
          disabled={submitted}
          placeholder="John Smith"
        />
      </div>
      <div className="field">
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="text"
          name="email"
          required={true}
          value={email}
          onChange={onChangeEmail}
          disabled={submitted}
          placeholder="you@example.com"
        />
      </div>
      {submitted && (
        <div className="px-4 py-3 rounded-lg bg-success text-success-content text-sm">
          Thanks for registering! You should receive an email momentarily to set
          your password and login.
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
        disabled={!name || !email || submitted}
      >
        Create My Account
      </button>

      <div className="text-center text-sm text-base-content/60">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-primary font-semibold hover:underline"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
};

const SetPasswordForm = ({ token, username }) => {
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
        navigate('/', { state: { persistToasts: true } });
        toastSuccess({ title: 'Password was successfully updated.' });
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
          Set Your Password
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
            Set Password
          </button>
        </>
      )}
    </form>
  );
};
