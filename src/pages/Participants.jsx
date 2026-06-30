import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import axios from 'axios';

const Participants = () => {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/tournaments/${slug}`)
      .then(res => {
        setTournament(res.data);
        return axios.get(`/api/tournaments/${res.data.id}/players`);
      })
      .then(res => {
        setPlayers(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="container page-header"><p>Loading...</p></div>;
  if (!tournament) return <div className="container page-header"><h2>Tournament not found</h2></div>;

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ textAlign: 'left', paddingBottom: '1rem' }}>
        <Link to={`/tournament/${slug}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> {tournament.shortName || slug}
        </Link>
        <h1>Players</h1>
      </div>

      {players.length === 0 ? (
        <div className="empty-state glass-panel" style={{ padding: '3rem' }}>
          <Users size={48} />
          <p>No players have registered yet.</p>
        </div>
      ) : (
        <div className="grid-3" style={{ gap: '1rem' }}>
          {players.map(p => (
            <div key={p.id} className="card glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <a href={`https://osu.ppy.sh/users/${p.user.username}`} target="_blank" rel="noopener noreferrer">
                <img 
                  src={p.user.avatarUrl} 
                  alt={p.user.username} 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--color-accent-primary)', objectFit: 'cover' }} 
                />
              </a>
              <div>
                <a 
                  href={`https://osu.ppy.sh/users/${p.user.username}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-text)', textDecoration: 'none' }}
                >
                  {p.user.username}
                </a>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Discord: {p.discordName}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Participants;
