import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ExternalLink, Download, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import './Mappool.css';

const Mappool = () => {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [mappool, setMappool] = useState([]);
  const [activeStage, setActiveStage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tRes = await axios.get(`/api/tournaments/${slug}`);
        setTournament(tRes.data);
        const mRes = await axios.get(`/api/mappool?tournamentId=${tRes.data.id}`);
        setMappool(mRes.data);
        const stages = [...new Set(mRes.data.map(m => m.stage))];
        if (stages.length > 0) setActiveStage(stages[0]);
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  const stages = [...new Set(mappool.map(m => m.stage))];
  const currentPool = mappool.filter(m => m.stage === activeStage);
  
  const averageSR = currentPool.length > 0 
    ? (currentPool.reduce((acc, curr) => acc + curr.sr, 0) / currentPool.length).toFixed(2)
    : 0;

  const getModColor = (mod) => {
    const m = mod.substring(0, 2).toUpperCase();
    const colors = { NM: '#4fc3f7', HD: '#ffd54f', HR: '#ef5350', DT: '#ab47bc', FM: '#66bb6a', TB: '#ff7043', EX: '#e040fb' };
    return colors[m] || '#90a4ae';
  };

  const formatLength = (seconds) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return <div className="container page-header"><p>Loading...</p></div>;

  return (
    <div className="mp-page">
      <div className="container">
        <div className="page-header" style={{ textAlign: 'left', paddingBottom: '1rem' }}>
          <Link to={`/tournament/${slug}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
            <ArrowLeft size={16} /> {tournament?.shortName || slug}
          </Link>
          <h1>Mappool</h1>
          <p>Beatmaps selected for each stage.</p>
        </div>

        {stages.length === 0 ? (
          <div className="empty-state glass-panel" style={{ padding: '3rem' }}>
            <p>No mappools have been announced yet.</p>
          </div>
        ) : (
          <>
            <div className="tabs" style={{ marginBottom: '2rem' }}>
              {stages.map(stage => (
                <button
                  key={stage}
                  className={`tab ${activeStage === stage ? 'active' : ''}`}
                  onClick={() => setActiveStage(stage)}
                >
                  {stage}
                </button>
              ))}
            </div>
            
            <div className="stage-stats" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Stage Average Difficulty:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffd54f' }}>{averageSR}★</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>Calculated dynamically based on mod attributes</span>
            </div>

            <div className="mp-grid">
              {currentPool.map((map, i) => (
                <div key={map.id} className={`mp-card animate-in stagger-${Math.min(i + 1, 5)}`}>
                  {map.coverImage ? (
                    <a 
                      href={`https://osu.ppy.sh/beatmaps/${map.beatmapId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mp-cover" 
                      style={{ backgroundImage: `url(${map.coverImage})`, display: 'block' }}
                    >
                      <div className="mp-cover-overlay" />
                    </a>
                  ) : (
                    <a 
                      href={`https://osu.ppy.sh/beatmaps/${map.beatmapId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mp-cover" 
                      style={{ background: 'var(--color-bg-tertiary)', display: 'block' }} 
                    />
                  )}
                  
                  <div className="mp-mod-badge" style={{ color: getModColor(map.mod), borderColor: getModColor(map.mod) }}>
                    {map.mod}
                  </div>

                  <div className="mp-content">
                    <h3 className="mp-title">{map.title}</h3>
                    <p className="mp-artist">{map.artist}</p>
                    <div className="mp-details">
                      <p className="mp-detail-line">Difficulty: <span>{map.diffName}</span></p>
                      <p className="mp-detail-line">Mapped by: <span>{map.mapper}</span></p>
                      <p className="mp-detail-line">Picked by: <span>{map.picker || '-'}</span></p>
                    </div>
                    
                    <div className="mp-stats-row">
                      <div className="mp-stat" style={{ color: '#ffd54f' }}><span>SR</span>{map.sr.toFixed(2)}★</div>
                      <div className="mp-stat"><span>BPM</span>{map.bpm}</div>
                      <div className="mp-stat"><span>Length</span>{formatLength(map.length)}</div>
                      <div className="mp-stat"><span>OD</span>{map.od}</div>
                      <div className="mp-stat"><span>HP</span>{map.hp}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Mappool;
