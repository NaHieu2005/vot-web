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
            <h1 className="hero-title" style={{ textAlign: 'center' }}>
              Vietnam<br />
              <span className="text-gradient">osu!taiko Community</span>
            </h1>
            <p className="hero-subtitle" style={{ textAlign: 'center', margin: '0 auto' }}>
              The premier platform for VTC players.
              Compete in high-stakes tournaments, track your legacy, and connect with the elite.
            </p>
            <div className="hero-actions" style={{ justifyContent: 'center' }}>
              <a href="#tournaments" className="btn btn-primary btn-lg">
                View Tournaments <ArrowRight size={18} />
              </a>
              <a href="https://discord.gg/teHvDXp7Ef" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">
                Join Discord
              </a>
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
          <div className="tournament-list">
            {tournaments.map((t, i) => (
              <Link to={`/tournament/${t.slug}`} key={t.id} className={`tournament-horizontal-card animate-in stagger-${i + 1}`} style={{ '--card-accent': t.accentColor || '#d92332' }}>
                <div className="tc-info">
                  <div className="tc-info-header">
                    {getStatusBadge(t.status)}
                    <span className="tc-short">{t.shortName}</span>
                  </div>
                  <h3 className="tc-name-italic">{t.name}</h3>
                  <p className="tc-desc">{t.description}</p>
                  <div className="tc-action">
                    <span className="btn-learn-more">Learn More</span>
                  </div>
                </div>
                <div className="tc-visual" style={{ backgroundImage: t.bannerImage ? `url(${t.bannerImage})` : 'none' }}>
                  {!t.bannerImage && <Drum size={120} className="tc-visual-icon" />}
                  <div className="tc-crosshair top-left"></div>
                  <div className="tc-crosshair top-right"></div>
                  <div className="tc-crosshair bottom-left"></div>
                  <div className="tc-crosshair bottom-right"></div>
                  <div className="tc-visual-overlay"></div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Removed Community CTA as requested */}
    </div>
  );
};

export default Home;
