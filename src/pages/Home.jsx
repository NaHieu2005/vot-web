import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, ArrowRight, Drum, Sparkles, Calendar } from 'lucide-react';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/tournaments')
      .then(res => setTournaments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status) => {
    if (status === 'ongoing') return <span className="badge badge-live">● Live</span>;
    if (status === 'upcoming') return <span className="badge badge-upcoming">Upcoming</span>;
    return <span className="badge badge-completed">Completed</span>;
  };

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-effects">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-grid" />
        </div>
        <div className="container hero-content">
          <div className="animate-in">
            <div className="hero-badge-row">
              <span className="badge badge-live">● Community Hub</span>
            </div>
            <h1 className="hero-title">
              Vietnam<br />
              osu!<span className="accent">taiko</span>
            </h1>
            <p className="hero-subtitle">
              The community platform for Vietnamese osu!taiko players.
              Join tournaments, track results, and connect with others.
            </p>
            <div className="hero-actions">
              <a href="#tournaments" className="btn btn-primary btn-lg">
                View Tournaments <ArrowRight size={18} />
              </a>
              <a href="https://discord.gg/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">
                Join Discord
              </a>
            </div>
          </div>

          <div className="hero-stats animate-in stagger-2">
            <div className="hero-stat">
              <Drum size={20} />
              <span className="hero-stat-value">6</span>
              <span className="hero-stat-label">Seasons</span>
            </div>
            <div className="hero-stat">
              <Users size={20} />
              <span className="hero-stat-value">100+</span>
              <span className="hero-stat-label">Players</span>
            </div>
            <div className="hero-stat">
              <Trophy size={20} />
              <span className="hero-stat-value">5</span>
              <span className="hero-stat-label">Champions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tournaments */}
      <section className="section container" id="tournaments">
        <div className="section-header animate-in stagger-3">
          <h2>Featured <span className="accent">Tournaments</span></h2>
          <p>Top osu!taiko tournaments in Vietnam</p>
        </div>

        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : tournaments.length === 0 ? (
          <div className="empty-state">No tournaments found.</div>
        ) : (
          <div className="tournament-grid">
            {tournaments.map((t, i) => (
              <Link to={`/tournament/${t.slug}`} key={t.id} className={`tournament-card card animate-in stagger-${i + 1}`}>
                <div className="tc-banner" style={{ background: `linear-gradient(135deg, ${t.accentColor || '#d92332'}22, ${t.accentColor || '#d92332'}08)` }}>
                  <div className="tc-accent-line" style={{ background: t.accentColor || '#d92332' }} />
                  <Drum size={48} style={{ color: t.accentColor || '#d92332', opacity: 0.3 }} />
                </div>
                <div className="tc-body">
                  <div className="tc-header">
                    {getStatusBadge(t.status)}
                    <span className="tc-short">{t.shortName}</span>
                  </div>
                  <h3 className="tc-name">{t.name}</h3>
                  <p className="tc-desc">{t.description}</p>
                  <div className="tc-meta">
                    {t.startDate && (
                      <span className="tc-date">
                        <Calendar size={14} /> {t.startDate}
                      </span>
                    )}
                    <span className="tc-arrow">View details →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Community Section */}
      <section className="section container">
        <div className="community-cta glass-panel animate-in stagger-4">
          <Sparkles size={32} className="accent" />
          <h2>Join the community</h2>
          <p>Connect with hundreds of other taiko players on our Discord server.</p>
          <a href="https://discord.gg/" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
            Join Discord Server
          </a>
        </div>
      </section>
    </div>
  );
};

export default Home;
