import React, { useState } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { Menu, X, Drum, ChevronDown, Bell, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const { user, login, logout, loading } = useAuth();

  React.useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
    } catch (err) {}
  };

  const markAsRead = async (id, link) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      if (link) {
        navigate(link);
        setShowNotifs(false);
      }
    } catch (err) {}
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {}
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
    { name: 'Players', path: `/tournament/${slug}/players` },
    { name: 'Rules', path: `/tournament/${slug}/rules` },
    { name: 'Staff', path: `/tournament/${slug}/staff` },
  ] : [];

  const links = isInTournament ? tournamentLinks : communityLinks;

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="nav-logo">
          <img src="/logo.png" alt="VTC" className="nav-logo-icon" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
          <span className="nav-logo-text"><span className="accent">VTC</span></span>
        </Link>

        <div className="nav-links">
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
            <div className="nav-user" style={{ gap: '1.5rem' }}>
              <div className="nav-notifs" style={{ position: 'relative' }}>
                <button className="btn btn-icon" onClick={() => setShowNotifs(!showNotifs)}>
                  <Bell size={20} />
                  {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                </button>
                {showNotifs && (
                  <div className="notif-dropdown">
                    <div className="notif-header">
                      <span>Notifications</span>
                      {unreadCount > 0 && <button className="btn btn-ghost btn-sm" onClick={markAllAsRead} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}><CheckCircle2 size={14} /> Mark all read</button>}
                    </div>
                    <div className="notif-list">
                      {notifications.length === 0 ? (
                        <div className="notif-empty">No notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`notif-item ${!n.isRead ? 'unread' : ''}`} onClick={() => markAsRead(n.id, n.link)}>
                            <p className="notif-message">{n.message}</p>
                            <span className="notif-time">{new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src={user.avatarUrl} alt="" className="nav-avatar" />
                <span className="nav-username">{user.username}</span>
                <button onClick={logout} className="btn btn-ghost btn-sm">Logout</button>
              </div>
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
