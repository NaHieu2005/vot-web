import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, GitMerge } from 'lucide-react';
import axios from 'axios';
import './Bracket.css';

const Bracket = () => {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [bracketNodes, setBracketNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tRes = await axios.get(`/api/tournaments/${slug}`);
        setTournament(tRes.data);
        const bRes = await axios.get(`/api/bracket?tournamentId=${tRes.data.id}`);
        setBracketNodes(bRes.data);
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  if (loading) return <div className="container page-header"><p>Loading...</p></div>;

  // Group by Bracket Type -> Round
  const brackets = bracketNodes.reduce((acc, node) => {
    if (!acc[node.bracketType]) acc[node.bracketType] = {};
    if (!acc[node.bracketType][node.round]) acc[node.bracketType][node.round] = [];
    acc[node.bracketType][node.round].push(node);
    return acc;
  }, {});

  const getIncomingLabels = (node) => {
    const incomingWinners = bracketNodes.filter(n => n.nextWinnerMatchId === node.id);
    const incomingLosers = bracketNodes.filter(n => n.nextLoserMatchId === node.id);
    
    let labels = [];
    incomingWinners.forEach(n => labels.push(`Winner of ${n.matchIdentifier || 'M'+n.matchOrder}`));
    incomingLosers.forEach(n => labels.push(`Loser of ${n.matchIdentifier || 'M'+n.matchOrder}`));
    
    labels.sort();
    return labels;
  };

  const getRoundName = (roundNum, type) => {
    const r = parseInt(roundNum);
    if (type === 'Grand Final') return 'Grand Final';
    if (tournament?.id) { // Just to have access, but we need size
      // We can infer size from bracketNodes length. Size 16 = 30 nodes. Size 8 = 14 nodes.
      const size = bracketNodes.length > 15 ? 16 : 8;
      if (type === 'Winners') {
        if (size === 16) {
          if (r === 1) return 'Round of 16';
          if (r === 2) return 'Quarterfinals';
          if (r === 3) return 'Semifinals';
          if (r === 4) return 'Finals';
        } else {
          if (r === 1) return 'Quarterfinals';
          if (r === 2) return 'Semifinals';
          if (r === 3) return 'Finals';
        }
      } else if (type === 'Losers') {
        if (size === 16) {
          if (r === 1) return 'Quarterfinals';
          if (r === 2 || r === 3) return 'Semifinals';
          if (r === 4 || r === 5) return 'Finals';
          if (r === 6) return 'Grand Final';
        } else {
          if (r === 1) return 'Semifinals';
          if (r === 2 || r === 3) return 'Finals';
          if (r === 4) return 'Grand Final';
        }
      }
    }
    return `Round ${r}`;
  };

  const renderBracketStage = (title, roundsData) => {
    if (!roundsData || Object.keys(roundsData).length === 0) return null;
    
    // Sort rounds numerically
    const sortedRounds = Object.keys(roundsData).sort((a, b) => parseInt(a) - parseInt(b));

    return (
      <div className="bracket-stage" key={title}>
        <h3 className="bracket-title">{title}</h3>
        <div className="bracket-scroll-container">
          <div className="bracket-grid">
            {sortedRounds.map(roundNum => {
              const nodes = roundsData[roundNum].sort((a, b) => a.matchOrder - b.matchOrder);
              return (
                <div key={roundNum} className="bracket-column">
                  <div className="bracket-round-header">{getRoundName(roundNum, title.replace(' Bracket', ''))}</div>
                  <div className="bracket-nodes-container">
                    {nodes.map(node => {
                      const incoming = getIncomingLabels(node);
                      const tbd1 = incoming[0] || 'TBD';
                      const tbd2 = incoming[1] || (incoming.length === 1 ? 'TBD' : 'TBD');

                      return (
                        <div key={node.id} className="bracket-node-wrapper">
                          <div className="bracket-node">
                            <div className="bracket-node-meta">
                              <span>{node.matchIdentifier || `M${node.matchOrder}`}</span>
                              {node.bestOf && <span>BO{node.bestOf}</span>}
                            </div>
                            <div className={`bracket-player ${node.score1 !== null && node.score2 !== null && node.score1 > node.score2 ? 'winner' : ''}`}>
                              <span className={`bracket-name ${!node.player1 ? 'tbd' : ''}`}>{node.player1 || tbd1}</span>
                              <span className="bracket-score">{node.score1 !== null ? node.score1 : '-'}</span>
                            </div>
                            <div className={`bracket-player ${node.score1 !== null && node.score2 !== null && node.score2 > node.score1 ? 'winner' : ''}`}>
                              <span className={`bracket-name ${!node.player2 ? 'tbd' : ''}`}>{node.player2 || tbd2}</span>
                              <span className="bracket-score">{node.score2 !== null ? node.score2 : '-'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ textAlign: 'left', paddingBottom: '1rem' }}>
        <Link to={`/tournament/${slug}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> {tournament?.shortName || slug}
        </Link>
        <h1>Bracket</h1>
      </div>

      {bracketNodes.length === 0 ? (
        <div className="empty-state glass-panel" style={{ padding: '3rem' }}>
          <GitMerge size={48} />
          <p>The bracket has not been generated yet.</p>
        </div>
      ) : (
        <div className="bracket-wrapper">
          {renderBracketStage('Winners Bracket', brackets['Winners'])}
          {renderBracketStage('Losers Bracket', brackets['Losers'])}
          {renderBracketStage('Grand Final', brackets['Grand Final'])}
        </div>
      )}
    </div>
  );
};

export default Bracket;
