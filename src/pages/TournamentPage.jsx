import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Trophy, Calendar, Users, Music, BarChart3, BookOpen, UserCheck, ArrowRight, Gamepad2, Shield, GitMerge, MessageSquare, Tv, Table } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './TournamentPage.css';

const TournamentPage = () => {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [playerForm, setPlayerForm] = useState({ discordName: '', discordId: '' });
  const [staffForm, setStaffForm] = useState({ staffRole: 'Referee' });

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = () => {
    axios.get(`/api/tournaments/${slug}`)
      .then(res => setTournament(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleRegisterPlayer = async (e) => {
    e.preventDefault();
    if (!user) return alert('Please login first!');
    try {
      await axios.post(`/api/tournaments/${tournament.id}/register/player`, playerForm);
      alert('Registered successfully!');
      setShowPlayerModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    if (!user) return alert('Please login first!');
    try {
      await axios.post(`/api/tournaments/${tournament.id}/register/staff`, staffForm);
      alert('Application submitted! Pending approval.');
      setShowStaffModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    }
  };

  if (loading) return <div className="container page-header"><p>Loading...</p></div>;
  if (!tournament) return <div className="container page-header"><h2>Tournament not found</h2></div>;

  const navItems = [
    { icon: <Music size={20} />, label: 'Mappool', path: `/tournament/${slug}/mappool`, count: tournament._count?.mappools },
    { icon: <Calendar size={20} />, label: 'Schedule', path: `/tournament/${slug}/schedule`, count: tournament._count?.schedules },
    { icon: <GitMerge size={20} />, label: 'Bracket', path: `/tournament/${slug}/bracket` },
    { icon: <BarChart3 size={20} />, label: 'Statistics', path: `/tournament/${slug}/stats`, count: tournament._count?.stats },
    { icon: <Users size={20} />, label: 'Players', path: `/tournament/${slug}/players`, count: tournament._count?.players },
    { icon: <BookOpen size={20} />, label: 'Rules', path: `/tournament/${slug}/rules` },
    { icon: <UserCheck size={20} />, label: 'Staff', path: `/tournament/${slug}/staff` },
  ];

  const getStatusBadge = (status) => {
    if (status === 'ongoing') return <span className="badge badge-live">● Ongoing</span>;
    if (status === 'upcoming') return <span className="badge badge-upcoming">Upcoming</span>;
    return <span className="badge badge-completed">Completed</span>;
  };

  return (
    <div className="tp">
      {/* Banner */}
      <div className="tp-banner" style={{ '--accent': tournament.accentColor || '#d92332' }}>
        <div className="tp-banner-bg" style={{ 
          backgroundImage: `linear-gradient(0deg, var(--color-bg-primary) 0%, transparent 80%), radial-gradient(circle at top right, rgba(244, 34, 75, 0.15), transparent 60%), ${tournament.bannerImage ? `url(${tournament.bannerImage})` : 'var(--accent, #f4224b)'}` 
        }} />
        <div className="container tp-banner-content animate-in">
          {getStatusBadge(tournament.status)}
          <h1 className="tp-title">{tournament.name}</h1>
          <p className="tp-desc">{tournament.description}</p>
          <div className="tp-meta-row" style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
            {tournament.startDate && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={16} /> {tournament.startDate} — {tournament.endDate || 'TBD'}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={16} /> {tournament._count?.players || 0} Registered Players
            </span>
          </div>
          
          <div className="tp-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setShowPlayerModal(true)}>
              <Gamepad2 size={16} /> Register as Player
            </button>
            <button className="btn btn-secondary" onClick={() => setShowStaffModal(true)}>
              <Shield size={16} /> Apply for Staff
            </button>
            {tournament.forumLink && (
              <a href={tournament.forumLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                <MessageSquare size={16} /> Forum Post
              </a>
            )}
            {tournament.twitchLink && (
              <a href={tournament.twitchLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ color: '#a970ff' }}>
                <Tv size={16} /> Twitch
              </a>
            )}
            {tournament.spreadsheetLink && (
              <a href={tournament.spreadsheetLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ color: '#107c41' }}>
                <Table size={16} /> Spreadsheet
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Player Registration Modal */}
      {showPlayerModal && (
        <div className="modal-backdrop" onClick={() => setShowPlayerModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-in" onClick={e => e.stopPropagation()} style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Register as Player</h3>
            <form onSubmit={handleRegisterPlayer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input className="input" placeholder="Discord Username (e.g. wubwoofwolf)" value={playerForm.discordName} onChange={e => setPlayerForm({...playerForm, discordName: e.target.value})} required />
              <input className="input" placeholder="Discord ID (e.g. 1234567890)" value={playerForm.discordId} onChange={e => setPlayerForm({...playerForm, discordId: e.target.value})} required />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Register</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPlayerModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Registration Modal */}
      {showStaffModal && (
        <div className="modal-backdrop" onClick={() => setShowStaffModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-in" onClick={e => e.stopPropagation()} style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Apply for Staff</h3>
            <form onSubmit={handleRegisterStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <select className="input" value={staffForm.staffRole} onChange={e => setStaffForm({...staffForm, staffRole: e.target.value})}>
                {['Mappooler', 'Referee', 'Streamer', 'Commentator', 'GFX', 'Developer'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit Application</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowStaffModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation Cards */}
      <div className="container">
        <div className="tp-nav-grid animate-in stagger-2">
          {navItems.map((item) => (
            <Link to={item.path} key={item.label} className="tp-nav-card card">
              <div className="tp-nav-icon" style={{ color: tournament.accentColor || '#d92332' }}>
                {item.icon}
              </div>
              <div className="tp-nav-info">
                <h3>{item.label}</h3>
                {item.count !== undefined && (
                  <span className="tp-nav-count">{item.count} items</span>
                )}
              </div>
              <ArrowRight size={16} className="tp-nav-arrow" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TournamentPage;
