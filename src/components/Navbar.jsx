import React, { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Menu, X, Drum, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const params = useParams();
  const { user, login, logout, loading } = useAuth();

  const slug = location.pathname.match(/\/tournament\/([^/]+)/)?.[1];
  const isInTournament = !!slug;

  const communityLinks = [
    { name: 'Home', path: '/' },
  ];

  const tournamentLinks = slug ? [
    { name: 'Overview', path: `/tournament/${slug}` },
    { name: 'Mappool', path: `/tournament/${slug}/mappool` },
    { name: 'Schedule', path: `/tournament/${slug}/schedule` },
    { name: 'Stats', path: `/tournament/${slug}/stats` },
    { name: 'Rules', path: `/tournament/${slug}/rules` },
    { name: 'Staff', path: `/tournament/${slug}/staff` },
  ] : [];

  const links = isInTournament ? tournamentLinks : communityLinks;

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="nav-logo">
          <Drum size={24} className="nav-logo-icon" />
          <span className="nav-logo-text">V<span className="accent">Taiko</span></span>
        </Link>

        <div className="nav-links">
          {isInTournament && (
            <Link to="/" className="nav-link nav-back">← Community</Link>
          )}
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.name}
            </Link>
          ))}
          {user && (user.role === 'STAFF' || user.role === 'ADMIN') && (
            <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
              Admin
            </Link>
          )}
        </div>

        <div className="nav-actions">
          {loading ? (
            <div className="nav-loading" />
          ) : user ? (
            <div className="nav-user">
              <img src={user.avatarUrl} alt="" className="nav-avatar" />
              <span className="nav-username">{user.username}</span>
              <button onClick={logout} className="btn btn-ghost btn-sm">Logout</button>
            </div>
          ) : (
            <button onClick={login} className="btn btn-primary btn-sm">
              Login with osu!
            </button>
          )}
        </div>

        <button className="nav-mobile-btn" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isOpen && (
        <div className="nav-mobile-menu">
          {isInTournament && (
            <Link to="/" className="nav-mobile-link" onClick={() => setIsOpen(false)}>
              ← Community
            </Link>
          )}
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-mobile-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          {!user && !loading && (
            <button onClick={() => { login(); setIsOpen(false); }} className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>
              Login with osu!
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
