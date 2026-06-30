import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, UserCheck, Shield } from 'lucide-react';

const Staff = () => {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [staffGroups, setStaffGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const res = await axios.get(`/api/tournaments/${slug}`);
        setTournament(res.data);
        
        // Filter approved staff
        const approvedStaff = res.data.staff.filter(s => s.status === 'approved' || !s.status);
        
        // Group by role
        const groups = {};
        const roleOrder = ['Host', 'Admin', 'Developer', 'Mappooler', 'Referee', 'Streamer', 'Commentator', 'GFX'];
        
        roleOrder.forEach(r => { groups[r] = []; });
        
        approvedStaff.forEach(s => {
          if (!groups[s.staffRole]) groups[s.staffRole] = [];
          groups[s.staffRole].push(s);
        });

        // Convert to array and filter empty groups
        const groupedArray = roleOrder
          .map(role => ({ role, members: groups[role] }))
          .filter(g => g.members.length > 0);
          
        setStaffGroups(groupedArray);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTournament();
  }, [slug]);

  if (loading) return <div className="container page-header"><p>Loading staff...</p></div>;
  if (!tournament) return <div className="container page-header"><p>Tournament not found</p></div>;

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ textAlign: 'left', paddingBottom: '1rem' }}>
        <Link to={`/tournament/${slug}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> {tournament.shortName || slug}
        </Link>
        <h1>Staff</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginTop: '2rem' }}>
        {staffGroups.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No staff members assigned yet.</p>
        ) : (
          staffGroups.map(group => (
            <div key={group.role}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <Shield size={20} className="accent" /> {group.role}
              </h3>
              <div className="grid-4" style={{ gap: '1rem' }}>
                {group.members.map((s, i) => (
                  <div key={i} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flexShrink: 0 }}>
                      {s.user.avatarUrl ? (
                        <img src={s.user.avatarUrl} alt={s.user.username} style={{ width: 48, height: 48, borderRadius: '4px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: '4px', background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                          {s.user.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{s.user.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Staff;
