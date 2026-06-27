import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import TournamentPage from './pages/TournamentPage';
import Mappool from './pages/Mappool';
import Schedule from './pages/Schedule';
import Participants from './pages/Participants';
import Rules from './pages/Rules';
import Staff from './pages/Staff';
import Statistics from './pages/Statistics';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="tournament/:slug" element={<TournamentPage />} />
        <Route path="tournament/:slug/mappool" element={<Mappool />} />
        <Route path="tournament/:slug/schedule" element={<Schedule />} />
        <Route path="tournament/:slug/participants" element={<Participants />} />
        <Route path="tournament/:slug/rules" element={<Rules />} />
        <Route path="tournament/:slug/staff" element={<Staff />} />
        <Route path="tournament/:slug/stats" element={<Statistics />} />
        <Route path="admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
