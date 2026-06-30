import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import axios from 'axios';

const Rules = () => {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/tournaments/${slug}`)
      .then(res => setTournament(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="container page-header"><p>Loading...</p></div>;
  if (!tournament) return <div className="container page-header"><h2>Tournament not found</h2></div>;

  const renderMarkdown = (text) => {
    if (!text) return { __html: '' };
    
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold & Italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>');

    // Wrap consecutive li elements in ul
    html = html.replace(/(<li>.*<\/li>(?:\n<li>.*<\/li>)*)/gim, '<ul>$1</ul>');
    
    return { __html: html };
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ textAlign: 'left', paddingBottom: '1rem' }}>
        <Link to={`/tournament/${slug}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> {tournament.shortName || slug}
        </Link>
        <h1>Rules</h1>
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        {tournament.rules ? (
          <div 
            className="markdown-body" 
            style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: 'var(--color-text-primary)' }}
            dangerouslySetInnerHTML={renderMarkdown(tournament.rules)}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={18} className="accent" /> General Rules
              </h3>
              <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
                <li>No rules have been added for this tournament yet.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Rules;
