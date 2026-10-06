import t from 'prop-types';
import clsx from 'clsx';
import logo from '../../assets/images/logo.png';

/**
 * "A program of Waterboyz for Jesus" -- the endorsement the brand guidelines
 * require on every Christmas Alive piece. The Waterboyz mark always plays the
 * supporting role: small, in a footer, never merged with campaign artwork.
 */
export const Endorsement = ({ className }) => (
  <p className={clsx('ca-endorsement flex-sc gap-3 text-sm m-0', className)}>
    <span>A program of</span>
    <img src={logo} alt="Waterboyz for Jesus" />
  </p>
);

Endorsement.propTypes = { className: t.string };
