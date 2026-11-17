import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../data/api';
import { SignOutIcon } from './Icons';
import { Logo } from './Logo';

export function TopBar() {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="Magizhi Threads, go to all profiles">
          <Logo />
          <span>
            <span className="brand-name">MAGIZHI</span>
            <span className="brand-sub">Threads <span>· Measurement book</span></span>
          </span>
        </Link>
        <span className="spacer" />
        {api.mode === 'demo' && <span className="pill" title="Sample data only. Nothing is saved.">Demo</span>}
        {user && (
          <button type="button" className="bar-btn" onClick={() => void logout()} aria-label="Sign out">
            <SignOutIcon /><span className="bar-btn-text">Sign out</span>
          </button>
        )}
      </div>
      <div className="tape" aria-hidden="true" />
    </header>
  );
}
