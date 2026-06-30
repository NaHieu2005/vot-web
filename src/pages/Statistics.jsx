import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import axios from 'axios';
import './Statistics.css';

const Statistics = () => {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [data, setData] = useState({ matchScores: [], mappools: [] });
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tRes = await axios.get(`/api/tournaments/${slug}`);
        setTournament(tRes.data);
        const sRes = await axios.get(`/api/stats/mp?tournamentId=${tRes.data.id}`);
        setData(sRes.data);
        
        // Find stages
        const stages = [...new Set(sRes.data.mappools.map(m => m.stage))];
        if (stages.length > 0) setActiveStage(stages[0]);
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  if (loading) return <div className="container page-header"><p>Loading...</p></div>;

  const stages = [...new Set(data.mappools.map(m => m.stage))];
  const stagePool = data.mappools.filter(m => m.stage === activeStage).sort((a, b) => a.order - b.order);
  const stageScores = data.matchScores.filter(s => s.stage === activeStage);

  // 1. Get highest score per player per map
  const highestScores = {}; // { beatmapId: { playerName: scoreObj } }
  stageScores.forEach(s => {
    if (!highestScores[s.beatmapId]) highestScores[s.beatmapId] = {};
    if (!highestScores[s.beatmapId][s.playerName] || highestScores[s.beatmapId][s.playerName].score < s.score) {
      highestScores[s.beatmapId][s.playerName] = s;
    }
  });

  // 2. Calculate ranks per map
  const mapRanks = {}; // { beatmapId: { playerName: rank } }
  Object.keys(highestScores).forEach(bId => {
    const bIdInt = parseInt(bId);
    mapRanks[bIdInt] = {};
    const players = Object.values(highestScores[bIdInt]).sort((a, b) => b.score - a.score);
    players.forEach((p, idx) => {
      mapRanks[bIdInt][p.playerName] = idx + 1;
    });
  });

  // 3. Build player stats
  const playersMap = {}; // { playerName: { maps: {}, avgRank, mapsPlayed } }
  stageScores.forEach(s => {
    if (!playersMap[s.playerName]) playersMap[s.playerName] = { name: s.playerName, maps: {}, totalRank: 0, mapsPlayed: 0 };
  });

  stagePool.forEach(map => {
    if (highestScores[map.beatmapId]) {
      Object.values(highestScores[map.beatmapId]).forEach(s => {
        const rank = mapRanks[map.beatmapId][s.playerName];
        playersMap[s.playerName].maps[map.mod] = { ...s, rank };
        playersMap[s.playerName].totalRank += rank;
        playersMap[s.playerName].mapsPlayed += 1;
      });
    }
  });

  const sortedPlayers = Object.values(playersMap).map(p => ({
    ...p,
    avgRank: p.mapsPlayed > 0 ? (p.totalRank / p.mapsPlayed) : 999
  })).sort((a, b) => a.avgRank - b.avgRank);

  const renderRankCell = (rank) => {
    if (!rank) return <td>-</td>;
    let className = 'stat-rank';
    if (rank === 1) className += ' rank-gold';
    else if (rank === 2) className += ' rank-silver';
    else if (rank === 3) className += ' rank-bronze';
    
    return <td className={className}>{rank}</td>;
  };

  const renderScoreCell = (mapStat) => {
    if (!mapStat) return <td className="stat-score-empty">-</td>;
    return (
      <td className="stat-score-cell" title={`Acc: ${mapStat.accuracy.toFixed(2)}% | 300: ${mapStat.count300} | 100: ${mapStat.count100} | Miss: ${mapStat.countMiss}`}>
        <div className="stat-score-val">{mapStat.score.toLocaleString()}</div>
      </td>
    );
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem', maxWidth: '1400px' }}>
      <div className="page-header" style={{ textAlign: 'left', paddingBottom: '1rem' }}>
        <Link to={`/tournament/${slug}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> {tournament?.shortName || slug}
        </Link>
        <h1>Statistics</h1>
      </div>

      {stages.length === 0 ? (
        <div className="empty-state glass-panel" style={{ padding: '3rem' }}>
          <BarChart3 size={48} />
          <p>No statistics available yet. Ensure Mappools are created and MP Links are submitted in Schedule.</p>
        </div>
      ) : (
        <>
          <div className="tabs" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {stages.map(st => (
              <button 
                key={st} 
                className={`btn ${activeStage === st ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setActiveStage(st)}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="table-wrapper glass-panel" style={{ padding: '1rem', overflowX: 'auto' }}>
            <table className="stats-table">
              <thead>
                <tr>
                  <th className="sticky-col">Player</th>
                  {stagePool.map(m => (
                    <th key={`h-rank-${m.id}`} className="col-rank">{m.mod} Rank</th>
                  ))}
                  <th className="col-avg">Avg Rank</th>
                  {stagePool.map(m => (
                    <th key={`h-score-${m.id}`} className="col-score">{m.mod} Score</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p, idx) => (
                  <tr key={p.name}>
                    <td className="sticky-col player-name">
                      <span className="player-idx">{idx + 1}.</span> {p.name}
                    </td>
                    
                    {/* Ranks */}
                    {stagePool.map(m => renderRankCell(p.maps[m.mod]?.rank))}
                    
                    {/* Avg Rank */}
                    <td className="stat-avg">{p.avgRank !== 999 ? p.avgRank.toFixed(2) : '-'}</td>
                    
                    {/* Scores */}
                    {stagePool.map(m => renderScoreCell(p.maps[m.mod]))}
                  </tr>
                ))}
                {sortedPlayers.length === 0 && (
                  <tr>
                    <td colSpan={stagePool.length * 2 + 2} style={{ textAlign: 'center', padding: '2rem' }}>
                      No matches played in this stage yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Statistics;
