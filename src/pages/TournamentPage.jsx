import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Trophy, Calendar, Users, Music, BarChart3, BookOpen, UserCheck, ArrowRight } from 'lucide-react';
import axios from 'axios';
import './TournamentPage.css';

const TournamentPage = () => {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/tournaments/${slug}`)
      .then(res => setTournament(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="container page-header"><p>Loading...</p></div>;
  if (!tournament) return <div className="container page-header"><h2>Tournament not found</h2></div>;

  const navItems = [
    { icon: <Music size={20} />, label: 'Mappool', path: `/tournament/${slug}/mappool`, count: tournament._count?.mappools },
    { icon: <Calendar size={20} />, label: 'Schedule', path: `/tournament/${slug}/schedule`, count: tournament._count?.schedules },
    { icon: <BarChart3 size={20} />, label: 'Statistics', path: `/tournament/${slug}/stats`, count: tournament._count?.stats },
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
        <div className="tp-banner-bg" />
        <div className="container tp-banner-content animate-in">
          {getStatusBadge(tournament.status)}
          <h1 className="tp-title">{tournament.name}</h1>
          <p className="tp-desc">{tournament.description}</p>
          {tournament.startDate && (
            <div className="tp-dates">
              <Calendar size={16} /> {tournament.startDate} — {tournament.endDate || 'TBD'}
            </div>
          )}
        </div>
      </div>

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
