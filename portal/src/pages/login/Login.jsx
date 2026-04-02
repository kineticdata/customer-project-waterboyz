import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import logo from '../../assets/images/logo.png';
import logoWhite from '../../assets/images/logo-white.svg';

export const LoginCardWrapper = ({ children }) => (
  <div className="flex min-h-screen">
    {/* Left side - brand panel (hidden on mobile) */}
    <div
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      style={{ backgroundColor: '#1a2332' }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(0,117,169,0.25) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(0,117,169,0.15) 0%, transparent 50%)',
        }}
      />
      <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
        <img
          src={logoWhite}
          alt="Waterboyz for Jesus"
          className="w-72 mb-6 drop-shadow-lg"
        />
        <p className="text-lg font-semibold text-white/90 text-center tracking-wide">
          Christmas Alive &amp; SWAT Portal
        </p>
        <p className="text-sm text-white/60 text-center mt-1 italic">
          Bringing Drinks of Living Water &middot; Est. 2005
        </p>

        <div className="mt-10 w-full max-w-xs">
          <div className="text-xs uppercase tracking-widest text-white/40 text-center mb-4">
            2025 By The Numbers
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold">1.9K+</div>
              <div className="text-xs text-white/60 mt-1">People Served</div>
            </div>
            <div>
              <div className="text-3xl font-bold">1K+</div>
              <div className="text-xs text-white/60 mt-1">Volunteers</div>
            </div>
            <div>
              <div className="text-3xl font-bold">114</div>
              <div className="text-xs text-white/60 mt-1">SWAT Projects</div>
            </div>
            <div>
              <div className="text-3xl font-bold">240</div>
              <div className="text-xs text-white/60 mt-1">Families Served</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-3xl font-bold">3.5K+</div>
            <div className="text-xs text-white/60 mt-1">Volunteer Hours</div>
          </div>
        </div>
      </div>
    </div>

    {/* Right side - form */}
    <div className="flex-1 flex-cc bg-base-100">
      <div className="w-full max-w-md px-6 py-10">{children}</div>
    </div>
  </div>
);

export const Login = loginProps => {
  const {
    error,
    onChangePassword,
    onChangeUsername,
    onLogin,
    onSso,
    password,
    pending,
    username,
  } = loginProps;

  const themeLogo = useSelector(state => state.theme.data?.logo?.default);

  return (
    <LoginCardWrapper>
      <form className="flex-c-st gap-5 w-full">
        {/* Mobile logo */}
        <div className="lg:hidden flex-cc mb-4">
          <img
            src={themeLogo || logo}
            alt="Waterboyz for Jesus"
            className="w-48"
          />
        </div>

        <div className="mb-2">
          <h1 className="text-2xl font-bold text-base-content">Welcome back</h1>
          <p className="text-base-content/60 mt-1">
            Sign in to access your volunteer portal
          </p>
        </div>

        <div className="field">
          <label htmlFor="username">Email or Username</label>
          <input
            id="username"
            type="text"
            name="username"
            required={true}
            autoFocus
            value={username}
            onChange={onChangeUsername}
            placeholder="you@example.com"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            required={true}
            value={password}
            onChange={onChangePassword}
            placeholder="Enter your password"
          />
        </div>

        <div className="flex-ec">
          <Link
            to="/reset-password"
            className="text-sm text-primary font-medium hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <div className="flex-sc gap-2 px-4 py-3 rounded-lg bg-error text-error-content text-sm">
            <span className="kstatus kstatus-error"></span>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="kbtn kbtn-primary kbtn-lg w-full mt-2"
          onClick={onLogin}
          disabled={pending || !username || !password}
        >
          Sign In
        </button>

        {onSso && (
          <>
            <div className="flex items-center gap-3 text-base-content/40 text-sm">
              <hr className="flex-1" />
              or
              <hr className="flex-1" />
            </div>
            <button
              type="button"
              className="kbtn kbtn-lg kbtn-outline w-full"
              onClick={onSso}
              disabled={pending}
            >
              Enterprise Single Sign-On
            </button>
          </>
        )}

        <div className="text-center mt-4 text-sm text-base-content/60">
          Don&apos;t have an account?{' '}
          <Link
            to="/create-account"
            className="text-primary font-semibold hover:underline"
          >
            Sign up
          </Link>
        </div>

        <div className="text-center text-xs text-base-content/40">
          <Link
            to="/privacy"
            className="hover:text-base-content/60 transition-colors"
          >
            Privacy Notice
          </Link>
        </div>
      </form>
    </LoginCardWrapper>
  );
};
