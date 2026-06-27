import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserCheck } from 'lucide-react';

const Staff = () => {
  const { slug } = useParams();

  const staffGroups = [
    { role: 'Host', members: [{ name: 'TBD', avatar: null }] },
    { role: 'Mappooler', members: [{ name: 'TBD', avatar: null }] },
    { role: 'Referee', members: [{ name: 'TBD', avatar: null }] },
    { role: 'Streamer', members: [{ name: 'TBD', avatar: null }] },
    { role: 'GFX', members: [{ name: 'TBD', avatar: null }] },
  ];

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ textAlign: 'left', paddingBottom: '1rem' }}>
        <Link to={`/tournament/${slug}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <h1>Staff</h1>
        <p>The tournament organizing team.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {staffGroups.map(group => (
          <div key={group.role}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={18} className="accent" /> {group.role}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {group.members.map((m, i) => (
                <div key={i} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                    {m.avatar ? <img src={m.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} /> : m.name[0]}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Staff;
