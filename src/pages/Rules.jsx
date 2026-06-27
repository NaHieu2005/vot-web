import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Rules = () => {
  const { slug } = useParams();

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ textAlign: 'left', paddingBottom: '1rem' }}>
        <Link to={`/tournament/${slug}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <h1>Rules</h1>
        <p>Tournament rules and regulations.</p>
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} className="accent" /> General Rules
            </h3>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
              <li>The tournament is only for players with a Vietnamese flag on osu!.</li>
              <li>All players must have a valid, unrestricted osu! account.</li>
              <li>Score V2 is used for all matches.</li>
              <li>Losing 2 matches in the Group Stage results in elimination.</li>
            </ul>
          </div>

          <div>
            <h3 style={{ marginBottom: '0.75rem' }}>Match Rules</h3>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
              <li>Each match will have an assigned referee.</li>
              <li>Players have 10 minutes to join the room after being invited.</li>
              <li>Warmup maps must be under 4 minutes.</li>
              <li>Each player gets 1 ban and 1 pick (depending on the stage).</li>
              <li>The tiebreaker will be played with FreeMod (mods not required).</li>
            </ul>
          </div>

          <div>
            <h3 style={{ marginBottom: '0.75rem' }}>Reschedules</h3>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
              <li>Reschedule requests must be sent 24 hours in advance.</li>
              <li>Both players must agree to the new schedule.</li>
              <li>Staff reserve the right to refuse a reschedule if unreasonable.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rules;
