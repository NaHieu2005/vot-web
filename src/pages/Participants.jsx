import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';

const Participants = () => {
  const { slug } = useParams();

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ textAlign: 'left', paddingBottom: '1rem' }}>
        <Link to={`/tournament/${slug}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <h1>Participants</h1>
        <p>List of players participating in the tournament.</p>
      </div>

      <div className="empty-state glass-panel" style={{ padding: '3rem' }}>
        <Users size={48} />
        <p>The player list will be updated after registration closes.</p>
      </div>
    </div>
  );
};

export default Participants;
