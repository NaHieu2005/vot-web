import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import axios from 'axios';

const Statistics = () => {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tRes = await axios.get(`/api/tournaments/${slug}`);
        setTournament(tRes.data);
        const sRes = await axios.get(`/api/stats?tournamentId=${tRes.data.id}`);
        setStats(sRes.data);
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  if (loading) return <div className="container page-header"><p>Loading...</p></div>;

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ textAlign: 'left', paddingBottom: '1rem' }}>
        <Link to={`/tournament/${slug}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> {tournament?.shortName || slug}
        </Link>
        <h1>Statistics</h1>
        <p>Player performance statistics.</p>
      </div>

      {stats.length === 0 ? (
        <div className="empty-state glass-panel" style={{ padding: '3rem' }}>
          <BarChart3 size={48} />
          <p>No statistics available.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Stage</th>
                <th>Score</th>
                <th>Accuracy</th>
                <th>Misses</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, i) => (
                <tr key={stat.id}>
                  <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                    {i + 1}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {stat.user?.avatarUrl && (
                        <img src={stat.user.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                      )}
                      <span style={{ fontWeight: 600 }}>{stat.user?.username || 'Unknown'}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-completed">{stat.stage}</span></td>
                  <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{stat.score.toLocaleString()}</td>
                  <td>{stat.accuracy.toFixed(2)}%</td>
                  <td>{stat.misses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Statistics;
