import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Trash2 } from 'lucide-react';
import axios from 'axios';

import { useAuth } from '../context/AuthContext';
import './Schedule.css';

const Schedule = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoreInputs, setScoreInputs] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ stage: 'Qualifiers', player1Name: '', player2Name: '', date: '' });

  const fetchSchedule = async (tournamentId) => {
    try {
      const sRes = await axios.get(`/api/schedule?tournamentId=${tournamentId}`);
      setSchedule(sRes.data);
    } catch (err) {}
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tRes = await axios.get(`/api/tournaments/${slug}`);
        setTournament(tRes.data);
        await fetchSchedule(tRes.data.id);
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

  const handleScoreChange = (matchId, player, value) => {
    setScoreInputs(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [player]: value
      }
    }));
  };

  const handleSubmitScore = async (matchId) => {
    const scores = scoreInputs[matchId];
    if (!scores || scores.p1 === undefined || scores.p2 === undefined) return alert('Enter both scores');
    try {
      await axios.post(`/api/schedule/${matchId}/result`, { score1: scores.p1, score2: scores.p2, mpLink: scores.mpLink });
      setScoreInputs(prev => { const n = {...prev}; delete n[matchId]; return n; });
      await fetchSchedule(tournament.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit score');
    }
  };

  const handleAddMatch = async (e) => {
    e.preventDefault();
    try {
      const isQualifier = addForm.stage.toLowerCase().includes('qualifier');
      await axios.post('/api/schedule', {
        tournamentId: tournament.id,
        stage: addForm.stage,
        type: isQualifier ? 'qualifier' : 'match',
        matchIdentifier: addForm.matchIdentifier || null,
        player1Name: addForm.player1Name || null,
        player2Name: addForm.player2Name || null,
        date: addForm.date || 'TBD'
      });
      setShowAddModal(false);
      setAddForm({ stage: 'Qualifiers', matchIdentifier: '', player1Name: '', player2Name: '', date: '' });
      await fetchSchedule(tournament.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create match');
    }
  };

  const handleJoinLobby = async (id) => {
    try {
      await axios.post(`/api/schedule/${id}/join`);
      await fetchSchedule(tournament.id);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to join lobby');
    }
  };

  const handleManualJoinLobby = async (id, username) => {
    if (!username.trim()) return;
    try {
      await axios.post(`/api/schedule/${id}/join-manual`, { username: username.trim() });
      await fetchSchedule(tournament.id);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to manually add player');
    }
  };

  const handleLeaveLobby = async (id) => {
    if (!window.confirm('Are you sure you want to leave this lobby?')) return;
    try {
      await axios.delete(`/api/schedule/${id}/leave`);
      await fetchSchedule(tournament.id);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to leave lobby');
    }
  };

  const handleManualLeaveLobby = async (scheduleId, targetUserId) => {
    if (!window.confirm('Remove this player from the lobby?')) return;
    try {
      await axios.delete(`/api/schedule/${scheduleId}/leave-manual/${targetUserId}`);
      await fetchSchedule(tournament.id);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to remove player');
    }
  };

  if (loading) return <div className="container page-header"><p>Loading...</p></div>;

  const grouped = schedule.reduce((acc, m) => {
    if (!acc[m.stage]) acc[m.stage] = [];
    acc[m.stage].push(m);
    return acc;
  }, {});

  const stageOrder = Object.keys(grouped).sort((a, b) => {
    // Determine chronological order by finding the lowest match ID in each stage
    const minIdA = Math.min(...grouped[a].map(m => m.id));
    const minIdB = Math.min(...grouped[b].map(m => m.id));
    return minIdB - minIdA; // Descending: newest stages first
  });

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ textAlign: 'left', paddingBottom: '1rem' }}>
        <Link to={`/tournament/${slug}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> {tournament?.shortName || slug}
        </Link>
        <h1>Schedule</h1>
      </div>

      {user && (user.role === 'ADMIN' || user.role === 'STAFF') && (
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={() => setShowAddModal(!showAddModal)}>
            {showAddModal ? 'Close Form' : '+ Add Manual Match'}
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Create Schedule Match</h3>
          <form onSubmit={handleAddMatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <input className="input" placeholder="Stage (e.g. Qualifiers)" value={addForm.stage} onChange={e => setAddForm({...addForm, stage: e.target.value})} required style={{ flex: 1 }} />
              <input type="datetime-local" className="input" value={addForm.date} onChange={e => setAddForm({...addForm, date: e.target.value})} style={{ flex: 1 }} />
            </div>
            {addForm.stage.toLowerCase().includes('qualifier') ? (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input className="input" placeholder="Lobby Name (Optional)" value={addForm.matchIdentifier || ''} onChange={e => setAddForm({...addForm, matchIdentifier: e.target.value})} style={{ flex: 1 }} />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input className="input" placeholder="Match ID (Optional)" value={addForm.matchIdentifier || ''} onChange={e => setAddForm({...addForm, matchIdentifier: e.target.value})} style={{ width: '100px' }} />
                <input className="input" placeholder="Player 1 Name (Optional)" value={addForm.player1Name} onChange={e => setAddForm({...addForm, player1Name: e.target.value})} style={{ flex: 1 }} />
                <input className="input" placeholder="Player 2 Name (Optional)" value={addForm.player2Name} onChange={e => setAddForm({...addForm, player2Name: e.target.value})} style={{ flex: 1 }} />
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Create</button>
          </form>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state glass-panel" style={{ padding: '3rem' }}>
          <Clock size={48} />
          <p>No matches scheduled.</p>
        </div>
      ) : (
        stageOrder.map(stage => {
          const matches = grouped[stage].sort((a, b) => {
            const timeA = a.matchTime ? new Date(a.matchTime).getTime() : 0;
            const timeB = b.matchTime ? new Date(b.matchTime).getTime() : 0;
            return timeA - timeB;
          });
          
          return (
          <div key={stage} style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>{stage}</h3>
            <div className="match-list">
              {matches.map(m => {
                const isPlayer1 = user && user.username === m.player1Name;
                const isPlayer2 = user && user.username === m.player2Name;
                const isAdminOrStaff = user && (user.role === 'ADMIN' || user.role === 'STAFF');
                const isParticipant = isPlayer1 || isPlayer2 || isAdminOrStaff || m.lobbyPlayers?.some(lp => lp.userId === user?.id);
                const defaultAvatar = 'https://osu.ppy.sh/images/layout/avatar-guest.png';
                
                const isQualifier = m.type === 'qualifier';
                const hasJoinedThisLobby = isQualifier && user && m.lobbyPlayers?.some(lp => lp.userId === user.id);
                const hasJoinedAnyLobby = isQualifier && user && schedule.some(s => s.type === 'qualifier' && s.lobbyPlayers?.some(lp => lp.userId === user.id));

                return (
                  <div key={m.id} className="match-card">
                    <div className="match-header">
                      <div className="match-time">
                        <Clock size={14} /> {m.matchTime ? new Date(m.matchTime).toLocaleString() : m.date}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {m.matchIdentifier && (
                          <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#fff', fontWeight: 'bold' }}>
                            {m.matchIdentifier}
                          </span>
                        )}
                        <span className={`badge badge-${m.status === 'completed' ? 'completed' : m.status === 'active' ? 'live' : 'upcoming'}`}>
                          {m.status}
                        </span>
                      </div>
                    </div>

                    {isQualifier ? (
                      <div className="match-players" style={{ flexDirection: 'column', alignItems: 'center', padding: '1rem' }}>
                        <h4 style={{ marginBottom: '1rem' }}>Qualifier Lobby ({m.lobbyPlayers?.length || 0} players)</h4>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
                          {m.lobbyPlayers?.map(lp => (
                            <div key={lp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '16px' }}>
                              <img src={lp.user.avatarUrl || defaultAvatar} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                              <span style={{ fontSize: '0.85rem' }}>{lp.user.username}</span>
                              {isAdminOrStaff && (
                                <button className="btn btn-ghost btn-sm" style={{ padding: '0 4px', color: 'var(--color-accent-primary)', minHeight: 'auto', height: 'auto' }} onClick={() => handleManualLeaveLobby(m.id, lp.userId)}>
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {user && user.role === 'PLAYER' && m.status === 'upcoming' && (
                          <div style={{ marginTop: '0.5rem' }}>
                            {hasJoinedThisLobby ? (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleLeaveLobby(m.id)}>Leave Lobby</button>
                            ) : !hasJoinedAnyLobby ? (
                              <button className="btn btn-primary btn-sm" onClick={() => handleJoinLobby(m.id)}>Join Lobby</button>
                            ) : null}
                          </div>
                        )}
                        {isAdminOrStaff && (
                          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input type="text" className="input" placeholder="osu! username" id={`manual-join-${m.id}`} style={{ width: '150px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} />
                            <button className="btn btn-primary btn-sm" onClick={() => {
                              const val = document.getElementById(`manual-join-${m.id}`).value;
                              if (val) handleManualJoinLobby(m.id, val);
                            }}>Add Player</button>
                          </div>
                        )}
                      </div>
                    ) : (
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
                    )}

                    {m.mpLink && (
                      <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                        <a href={m.mpLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ padding: '0.2rem 1rem', fontSize: '0.8rem', borderRadius: '12px' }}>
                          View MP Link
                        </a>
                      </div>
                    )}

                    <div className="match-footer" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                      <div className="match-staff" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                        {m.refereeName && <span><span style={{ color: 'var(--color-accent-primary)', fontWeight: 600 }}>Ref:</span> {m.refereeName}</span>}
                        {m.streamer && <span><span style={{ color: 'var(--color-accent-primary)', fontWeight: 600 }}>Streamer:</span> {m.streamer}</span>}
                        {m.commentators && <span><span style={{ color: 'var(--color-accent-primary)', fontWeight: 600 }}>Commentator:</span> {m.commentators}</span>}
                        
                        {user && (user.role === 'ADMIN' || user.role === 'STAFF') && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
                            {m.refereeName === user.username ? (
                              <button className="btn btn-ghost btn-sm" onClick={() => handleClaim(m.id, 'referee', 'unclaim')}>Unclaim Ref</button>
                            ) : (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleClaim(m.id, 'referee', 'claim')}>Claim Ref</button>
                            )}

                            {m.streamer === user.username ? (
                              <button className="btn btn-ghost btn-sm" onClick={() => handleClaim(m.id, 'streamer', 'unclaim')}>Unclaim Streamer</button>
                            ) : (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleClaim(m.id, 'streamer', 'claim')}>Claim Streamer</button>
                            )}

                            {m.commentators && m.commentators.split(',').map(c => c.trim()).includes(user.username) ? (
                              <button className="btn btn-ghost btn-sm" onClick={() => handleClaim(m.id, 'commentator', 'unclaim')}>Unclaim Commentator</button>
                            ) : (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleClaim(m.id, 'commentator', 'claim')}>Claim Commentator</button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {user && (user.role === 'ADMIN' || user.role === 'STAFF') && m.refereeName === user.username && (
                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '0.5rem' }}>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 1rem', fontSize: '0.8rem', borderRadius: '12px' }} onClick={() => setScoreInputs(prev => ({ ...prev, [m.id]: { p1: m.score1 !== null ? m.score1 : '', p2: m.score2 !== null ? m.score2 : '', mpLink: m.mpLink || '' } }))}>
                            {m.status === 'completed' ? 'Edit Match Result' : 'Input Match Result'}
                          </button>
                        </div>
                      )}
                      
                      {scoreInputs[m.id] !== undefined && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', width: '100%', marginTop: '1rem', background: 'var(--color-bg-tertiary)', padding: '0.75rem', borderRadius: '4px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Result:</span>
                          {!isQualifier && (
                            <>
                              <input type="number" className="input" placeholder="P1 Score" value={scoreInputs[m.id].p1} onChange={(e) => handleScoreChange(m.id, 'p1', e.target.value)} style={{ width: '80px', padding: '0.25rem' }} />
                              <span>-</span>
                              <input type="number" className="input" placeholder="P2 Score" value={scoreInputs[m.id].p2} onChange={(e) => handleScoreChange(m.id, 'p2', e.target.value)} style={{ width: '80px', padding: '0.25rem' }} />
                            </>
                          )}
                          <input type="text" className="input" placeholder="MP Link (Optional)" value={scoreInputs[m.id].mpLink || ''} onChange={(e) => handleScoreChange(m.id, 'mpLink', e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '0.25rem' }} />
                          <button className="btn btn-primary btn-sm" onClick={() => handleSubmitScore(m.id)}>Submit</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setScoreInputs(prev => { const n = {...prev}; delete n[m.id]; return n; })}>Cancel</button>
                        </div>
                      )}
                    </div>

                    {!isQualifier && isParticipant && m.status !== 'completed' && (
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
                            }}>Request</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })
      )}
    </div>
  );
};

export default Schedule;
