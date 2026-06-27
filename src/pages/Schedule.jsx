import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import axios from 'axios';

const Schedule = () => {
  const { slug } = useParams();
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
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Player 1</th>
                    <th>Score</th>
                    <th>Player 2</th>
                    <th>Referee</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(m => (
                    <tr key={m.id}>
                      <td>{m.date}</td>
                      <td style={{ fontWeight: 600 }}>{m.player1Name || `#${m.player1Id || '-'}`}</td>
                      <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        {m.score1 !== null ? `${m.score1} - ${m.score2}` : 'vs'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{m.player2Name || `#${m.player2Id || '-'}`}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{m.refereeName || '-'}</td>
                      <td>
                        <span className={`badge badge-${m.status === 'completed' ? 'completed' : m.status === 'active' ? 'live' : 'upcoming'}`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Schedule;
