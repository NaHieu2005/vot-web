import React from 'react';
import { Link } from 'react-router-dom';
import { Drum, ExternalLink } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-content">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <Drum size={20} />
            <span>V<span className="accent">Taiko</span></span>
          </Link>
          <p>Vietnam osu!taiko Community Platform</p>
        </div>
        <div className="footer-links">
          <a href="https://discord.gg/teHvDXp7Ef" target="_blank" rel="noopener noreferrer">Discord <ExternalLink size={12} /></a>
          <a href="https://osu.ppy.sh" target="_blank" rel="noopener noreferrer">osu! <ExternalLink size={12} /></a>
        </div>
        <div className="footer-copy">
          © 2026 VTaiko. Made with ♥ for the community.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
