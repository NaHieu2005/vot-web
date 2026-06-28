import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import axios from 'axios';

import { useAuth } from '../context/AuthContext';
import './Schedule.css';

const Schedule = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tRes = await axios.get(`/api/tournaments/${slug}`);
        setTournament(tRes.data);
        const sRes = await axios.get(`/api/schedule?tournamentId=${tRes.data.id}`);
        setSchedule(sRes.data);
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  const handleRescheduleAction = async (matchId, action, newTime = null) => {
    try {
      const payload = action === 'request' ? { rescheduleTime: newTime } : {};
      const endpoint = action === 'request' ? 'reschedule' : `reschedule/${action}`;
      await axios.post(`/api/schedule/${matchId}/${endpoint}`, payload);
      
      // Refresh schedule
      const sRes = await axios.get(`/api/schedule?tournamentId=${tournament.id}`);
      setSchedule(sRes.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to perform reschedule action');
    }
  };

  const handleClaim = async (matchId, type, action) => {
    try {
      await axios.post(`/api/schedule/${matchId}/claim`, { type, action });
      const sRes = await axios.get(`/api/schedule?tournamentId=${tournament.id}`);
      setSchedule(sRes.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to claim');
    }
  };

  if (loading) return <div className="container page-header"><p>Loading...</p></div>;

  const grouped = schedule.reduce((acc, m) => {
    if (!acc[m.stage]) acc[m.stage] = [];
    acc[m.stage].push(m);
    return acc;
  }, {});

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ textAlign: 'left', paddingBottom: '1rem' }}>
        <Link to={`/tournament/${slug}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> {tournament?.shortName || slug}
        </Link>
        <h1>Schedule</h1>
        <p>Tournament schedule.</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state glass-panel" style={{ padding: '3rem' }}>
          <Clock size={48} />
          <p>No matches scheduled.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([stage, matches]) => (
          <div key={stage} style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>{stage}</h3>
            <div className="match-list">
              {matches.map(m => {
                const isPlayer1 = user && user.username === m.player1Name;
                const isPlayer2 = user && user.username === m.player2Name;
                const isParticipant = isPlayer1 || isPlayer2;
                const defaultAvatar = 'https://osu.ppy.sh/images/layout/avatar-guest.png';

                return (
                  <div key={m.id} className="match-card">
                    <div className="match-header">
                      <div className="match-time">
                        <Clock size={14} /> {m.matchTime ? new Date(m.matchTime).toLocaleString() : m.date}
                      </div>
                      <span className={`badge badge-${m.status === 'completed' ? 'completed' : m.status === 'active' ? 'live' : 'upcoming'}`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="match-players">
                      <div className="match-player p1">
                        <span className="match-player-name">{m.player1Name || `#${m.player1Id || '-'}`}</span>
                        <img src={m.player1Avatar || defaultAvatar} className="match-avatar" alt="" />
                      </div>
                      <div className="match-score">
                        {m.score1 !== null ? `${m.score1} - ${m.score2}` : 'VS'}
                      </div>
                      <div className="match-player p2">
                        <img src={m.player2Avatar || defaultAvatar} className="match-avatar" alt="" />
                        <span className="match-player-name">{m.player2Name || `#${m.player2Id || '-'}`}</span>
                      </div>
                    </div>

                    <div className="match-footer" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                      <div className="match-staff" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                        {m.refereeName && <span><span style={{ color: 'var(--color-accent-primary)' }}>Ref:</span> {m.refereeName}</span>}
                        {m.streamer && <span>🎥 {m.streamer}</span>}
                        {m.commentators && <span>🎙️ {m.commentators}</span>}
                        
                        {user && (user.role === 'ADMIN' || user.role === 'STAFF') && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                            {m.streamer === user.username ? (
                              <button className="btn btn-ghost btn-sm" onClick={() => handleClaim(m.id, 'streamer', 'unclaim')}>Unclaim Streamer</button>
                            ) : (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleClaim(m.id, 'streamer', 'claim')}>Claim Streamer</button>
                            )}

                            {m.commentators && m.commentators.split(',').map(c => c.trim()).includes(user.username) ? (
                              <button className="btn btn-ghost btn-sm" onClick={() => handleClaim(m.id, 'commentator', 'unclaim')}>Unclaim Caster</button>
                            ) : (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleClaim(m.id, 'commentator', 'claim')}>Claim Caster</button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {isParticipant && m.status !== 'completed' && (
                      <div className="match-reschedule">
                        <span style={{ fontWeight: 600 }}>Reschedule</span>
                        {m.rescheduleStatus === 'pending' ? (
                          <>
                            <span style={{ fontSize: '0.9rem' }}>
                              Requested by {m.rescheduleBy}: <strong>{new Date(m.rescheduleTime).toLocaleString()}</strong>
                            </span>
                            {m.rescheduleBy !== user.username ? (
                              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                                <button className="btn btn-primary btn-sm" onClick={() => handleRescheduleAction(m.id, 'accept')}>Accept</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleRescheduleAction(m.id, 'reject')}>Reject</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Waiting for opponent...</span>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleRescheduleAction(m.id, 'reject')}>Cancel</button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                            <input type="datetime-local" className="input" id={`reschedule-${m.id}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} />
                            <button className="btn btn-secondary btn-sm" onClick={() => {
                              const val = document.getElementById(`reschedule-${m.id}`).value;
                              if (val) handleRescheduleAction(m.id, 'request', new Date(val).toISOString());
                            }}>Request New Time</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Schedule;
