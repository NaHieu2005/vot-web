import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Upload, Settings, Music, Calendar, Users, Edit } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('tournaments');

  // Tournament form
  const [tForm, setTForm] = useState({ name: '', slug: '', shortName: '', description: '', rules: '', status: 'upcoming', accentColor: '#d92332', startDate: '', endDate: '' });
  const [editingTournamentId, setEditingTournamentId] = useState(null);

  // Mappool form
  const [mpForm, setMpForm] = useState({ beatmapId: '', stage: 'Qualifiers', mod: 'NM1', picker: '' });
  const [mpStatus, setMpStatus] = useState('');
  const [mappoolList, setMappoolList] = useState([]);
  const [editingMapId, setEditingMapId] = useState(null);
  
  // Mappool
  const [filterStage, setFilterStage] = useState('All');
  const [savingOrder, setSavingOrder] = useState(false);

  // Excel & Stats
  const [excelFile, setExcelFile] = useState(null);
  const [excelStatus, setExcelStatus] = useState('');
  const [statsList, setStatsList] = useState([]);
  const [editingStatId, setEditingStatId] = useState(null);

  // Schedule
  const [scheduleList, setScheduleList] = useState([]);
  const [sForm, setSForm] = useState({ stage: 'Group Stage', player1Name: '', player2Name: '', date: '', matchTime: '', status: 'upcoming', streamer: '', commentators: '', player1Avatar: '', player2Avatar: '' });
  const [editingScheduleId, setEditingScheduleId] = useState(null);

  // Staff
  const [staffList, setStaffList] = useState([]);
  const [staffForm, setStaffForm] = useState({ identifier: '', staffRole: 'Referee' });
  const [editingStaffId, setEditingStaffId] = useState(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (!selectedTournament) return;
    if (activeTab === 'mappool') fetchMappoolList();
    if (activeTab === 'stats') fetchStatsList();
    if (activeTab === 'schedule') fetchScheduleList();
    if (activeTab === 'staff') fetchStaffList();
  }, [activeTab, selectedTournament]);

  const fetchMappoolList = async () => {
    try {
      const res = await axios.get(`/api/mappool?tournamentId=${selectedTournament.id}`);
      setMappoolList(res.data);
    } catch (err) {}
  };

  const fetchStatsList = async () => {
    try {
      const res = await axios.get(`/api/stats?tournamentId=${selectedTournament.id}`);
      setStatsList(res.data);
    } catch (err) {}
  };

  const fetchScheduleList = async () => {
    try {
      const res = await axios.get(`/api/schedule?tournamentId=${selectedTournament.id}`);
      setScheduleList(res.data);
    } catch (err) {}
  };

  const fetchStaffList = async () => {
    try {
      const res = await axios.get(`/api/staff?tournamentId=${selectedTournament.id}`);
      setStaffList(res.data);
    } catch (err) {}
  };

  const fetchTournaments = async () => {
    try {
      const res = await axios.get('/api/tournaments');
      setTournaments(res.data);
      if (res.data.length > 0 && !selectedTournament) setSelectedTournament(res.data[0]);
    } catch (err) {}
  };

  if (authLoading) return <div className="container page-header"><p>Loading...</p></div>;
  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) return <div className="container page-header"><h2>Access Denied</h2><p>Admin and Staff only.</p></div>;

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    try {
      if (editingTournamentId) {
        await axios.put(`/api/tournaments/${editingTournamentId}`, tForm);
        setEditingTournamentId(null);
      } else {
        await axios.post('/api/tournaments', tForm);
      }
      setTForm({ name: '', slug: '', shortName: '', description: '', rules: '', status: 'upcoming', accentColor: '#d92332', startDate: '', endDate: '' });
      fetchTournaments();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEditTournament = (t) => {
    setTForm({
      name: t.name, slug: t.slug, shortName: t.shortName || '', 
      description: t.description || '', rules: t.rules || '', 
      status: t.status, accentColor: t.accentColor, 
      startDate: t.startDate || '', endDate: t.endDate || ''
    });
    setEditingTournamentId(t.id);
  };

  const handleAddMap = async (e) => {
    e.preventDefault();
    if (!selectedTournament) return;
    setMpStatus('Đang tải...');
    try {
      const idMatch = mpForm.beatmapId.match(/beatmaps\/(\d+)|b\/(\d+)|#(?:osu|taiko|catch|mania)\/(\d+)/);
      const beatmapId = idMatch ? idMatch[1] || idMatch[2] || idMatch[3] : mpForm.beatmapId;
      await axios.post('/api/mappool', { ...mpForm, beatmapId: parseInt(beatmapId), tournamentId: selectedTournament.id });
      setMpStatus('✅ Map added successfully!');
      setMpForm({ ...mpForm, beatmapId: '' });
      fetchMappoolList();
    } catch (err) {
      setMpStatus('❌ ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteMap = async (id) => {
    if (!window.confirm('Delete this map?')) return;
    try {
      await axios.delete(`/api/mappool/${id}`);
      fetchMappoolList();
    } catch (err) {
      alert('Error deleting map');
    }
  };

  const handleUpdateMap = async (map) => {
    try {
      await axios.put(`/api/mappool/${map.id}`, { stage: map.stage, mod: map.mod, picker: map.picker });
      setEditingMapId(null);
      fetchMappoolList();
    } catch (err) {
      alert('Error updating map');
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const filtered = filterStage === 'All' ? mappoolList : mappoolList.filter(m => m.stage === filterStage);
    const reordered = Array.from(filtered);
    const [movedItem] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, movedItem);

    if (filterStage === 'All') {
      setMappoolList(reordered);
    } else {
      let counter = 0;
      const newList = mappoolList.map(m => {
        if (m.stage === filterStage) {
          return reordered[counter++];
        }
        return m;
      });
      setMappoolList(newList);
    }
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      const payload = filterStage === 'All' 
        ? mappoolList.map((map, index) => ({ id: map.id, order: index }))
        : mappoolList.filter(m => m.stage === filterStage).map((map, index) => ({ id: map.id, order: index }));
        
      await axios.post('/api/mappool/reorder', { maps: payload });
      setSavingOrder(false);
      fetchMappoolList();
    } catch (err) {
      alert('Failed to save order');
      setSavingOrder(false);
    }
  };

  const handleUploadExcel = async (e) => {
    e.preventDefault();
    if (!excelFile || !selectedTournament) return;
    setExcelStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('tournamentId', selectedTournament.id);
    try {
      const res = await axios.post('/api/stats/upload', formData);
      setExcelStatus(`✅ Imported ${res.data.imported} records.`);
      fetchStatsList();
    } catch (err) {
      setExcelStatus('❌ Error uploading');
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      if (editingStaffId) {
        await axios.put(`/api/staff/${editingStaffId}`, { staffRole: staffForm.staffRole });
        setEditingStaffId(null);
      } else {
        await axios.post('/api/staff', { ...staffForm, tournamentId: selectedTournament.id });
      }
      setStaffForm({ identifier: '', staffRole: 'Referee' });
      fetchStaffList();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateStat = async (stat) => {
    try {
      await axios.put(`/api/stats/${stat.id}`, { score: stat.score, accuracy: stat.accuracy, misses: stat.misses });
      setEditingStatId(null);
      fetchStatsList();
    } catch (err) {
      alert('Error updating stat');
    }
  };

  const handleDeleteStat = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await axios.delete(`/api/stats/${id}`);
      fetchStatsList();
    } catch (err) {
      alert('Error deleting stat');
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Remove this staff?')) return;
    try {
      await axios.delete(`/api/staff/${id}`);
      fetchStaffList();
    } catch (err) {
      alert('Error removing staff');
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    try {
      if (editingScheduleId) {
        await axios.put(`/api/schedule/${editingScheduleId}`, sForm);
        setEditingScheduleId(null);
      } else {
        await axios.post('/api/schedule', { ...sForm, tournamentId: selectedTournament.id });
      }
      setSForm({ stage: 'Group Stage', player1Name: '', player2Name: '', date: '', matchTime: '', status: 'upcoming', streamer: '', commentators: '', player1Avatar: '', player2Avatar: '' });
      fetchScheduleList();
    } catch (err) {
      alert('Error saving schedule');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this match?')) return;
    try {
      await axios.delete(`/api/schedule/${id}`);
      fetchScheduleList();
    } catch (err) {
      alert('Error deleting schedule');
    }
  };

  return (
    <div className="admin container" style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Admin <span className="accent">Dashboard</span></h1>

      <div className="tabs" style={{ marginBottom: '2rem', flexWrap: 'wrap' }}>
        {['tournaments', 'mappool', 'stats', 'schedule', 'staff'].map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'tournaments' && <><Settings size={14} /> Tournaments</>}
            {t === 'mappool' && <><Music size={14} /> Mappool</>}
            {t === 'stats' && <><Upload size={14} /> Stats</>}
            {t === 'schedule' && <><Calendar size={14} /> Schedule</>}
            {t === 'staff' && <><Users size={14} /> Staff</>}
          </button>
        ))}
      </div>

      {/* Tournament Selector */}
      {activeTab !== 'tournaments' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>Tournament:</label>
          <select className="input" value={selectedTournament?.id || ''} onChange={e => setSelectedTournament(tournaments.find(t => t.id === parseInt(e.target.value)))}>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {/* Tournaments Tab */}
      {activeTab === 'tournaments' && (
        <div className="grid-2">
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}><Plus size={18} /> {editingTournamentId ? 'Edit Tournament' : 'Create New Tournament'}</h3>
            <form onSubmit={handleCreateTournament} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="input" placeholder="Tournament Name" value={tForm.name} onChange={e => setTForm({...tForm, name: e.target.value})} required />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input className="input" placeholder="slug (vot6)" value={tForm.slug} onChange={e => setTForm({...tForm, slug: e.target.value})} required />
                <input className="input" placeholder="Short (VOT6)" value={tForm.shortName} onChange={e => setTForm({...tForm, shortName: e.target.value})} />
              </div>
              <textarea className="input" placeholder="Description" value={tForm.description} onChange={e => setTForm({...tForm, description: e.target.value})} rows={2} style={{ resize: 'vertical' }} />
              <textarea className="input" placeholder="Rules (Markdown Supported)" value={tForm.rules} onChange={e => setTForm({...tForm, rules: e.target.value})} rows={6} style={{ resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <select className="input" value={tForm.status} onChange={e => setTForm({...tForm, status: e.target.value})}>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
                <input className="input" type="color" value={tForm.accentColor} onChange={e => setTForm({...tForm, accentColor: e.target.value})} style={{ width: '60px', padding: '0.25rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input className="input" type="date" placeholder="Start" value={tForm.startDate} onChange={e => setTForm({...tForm, startDate: e.target.value})} />
                <input className="input" type="date" placeholder="End" value={tForm.endDate} onChange={e => setTForm({...tForm, endDate: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-primary">{editingTournamentId ? 'Save Changes' : 'Create Tournament'}</button>
                {editingTournamentId && (
                  <button type="button" className="btn btn-secondary" onClick={() => { setEditingTournamentId(null); setTForm({ name: '', slug: '', shortName: '', description: '', rules: '', status: 'upcoming', accentColor: '#d92332', startDate: '', endDate: '' }); }}>Cancel</button>
                )}
              </div>
            </form>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Tournament List</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tournaments.map(t => (
                <div key={t.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>/{t.slug} • {t.status}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEditTournament(t)}><Edit size={14}/></button>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.accentColor }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mappool Tab */}
      {activeTab === 'mappool' && selectedTournament && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}><Music size={18} /> Add Beatmap to {selectedTournament.shortName}</h3>
            <form onSubmit={handleAddMap} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="input" placeholder="osu! Beatmap URL or ID" value={mpForm.beatmapId} onChange={e => setMpForm({...mpForm, beatmapId: e.target.value})} required />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <select className="input" value={mpForm.stage} onChange={e => setMpForm({...mpForm, stage: e.target.value})}>
                  {['Qualifiers', 'RO32', 'RO16', 'QF', 'SF', 'F', 'GF'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input className="input" placeholder="Mod (NM1, HD1...)" value={mpForm.mod} onChange={e => setMpForm({...mpForm, mod: e.target.value})} required />
                <input className="input" placeholder="Picked by" value={mpForm.picker} onChange={e => setMpForm({...mpForm, picker: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary">Add Beatmap</button>
              {mpStatus && <p style={{ fontSize: '0.9rem' }}>{mpStatus}</p>}
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Manage Mappool ({mappoolList.length})</h3>
              <button className="btn btn-secondary btn-sm" onClick={handleSaveOrder} disabled={savingOrder}>
                {savingOrder ? 'Saving...' : 'Save Order'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {['All', 'Qualifiers', 'RO32', 'RO16', 'QF', 'SF', 'F', 'GF'].map(s => (
                <button 
                  key={s} 
                  className={`btn btn-sm ${filterStage === s ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderRadius: '20px' }}
                  onClick={() => setFilterStage(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Drag and drop cards to reorder them. Remember to click <strong>Save Order</strong>.
            </p>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="mappool">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(filterStage === 'All' ? mappoolList : mappoolList.filter(m => m.stage === filterStage)).map((map, index) => {
                      const isEditing = editingMapId === map.id;
                      return (
                        <Draggable key={map.id.toString()} draggableId={map.id.toString()} index={index}>
                          {(provided, snapshot) => {
                            const child = (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`card mappool-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                style={provided.draggableProps.style}
                              >
                                <div className="mappool-card-content">
                                  <div className="mappool-card-drag-handle" {...provided.dragHandleProps}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                                  </div>
                                  
                                  <div className="mappool-card-mod">
                                    {isEditing ? (
                                      <input className="input" style={{ width: '60px', padding: '0.2rem' }} value={map.mod} onChange={e => setMappoolList(mappoolList.map(m => m.id === map.id ? {...m, mod: e.target.value} : m))} />
                                    ) : (
                                      <span className={`mod-badge ${map.mod.substring(0,2).toLowerCase()}`}>{map.mod}</span>
                                    )}
                                  </div>

                                  <div className="mappool-card-info">
                                    <div className="title" style={{ fontWeight: 600, fontSize: '0.9rem' }}>{map.title}</div>
                                    <div className="artist" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{map.artist} // {map.mapper} <span className="diff">[{map.diffName}]</span></div>
                                  </div>

                                  <div className="mappool-card-stage">
                                    {isEditing ? (
                                      <select className="input" style={{ padding: '0.2rem' }} value={map.stage} onChange={e => setMappoolList(mappoolList.map(m => m.id === map.id ? {...m, stage: e.target.value} : m))}>
                                        {['Qualifiers', 'RO32', 'RO16', 'QF', 'SF', 'F', 'GF'].map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                    ) : (
                                      <span className="stage-pill">{map.stage}</span>
                                    )}
                                  </div>

                                  <div className="mappool-card-picker">
                                    {isEditing ? (
                                      <input className="input" style={{ width: '100px', padding: '0.2rem' }} placeholder="Picker" value={map.picker || ''} onChange={e => setMappoolList(mappoolList.map(m => m.id === map.id ? {...m, picker: e.target.value} : m))} />
                                    ) : (
                                      map.picker ? <span className="picker-badge">Pick: {map.picker}</span> : null
                                    )}
                                  </div>

                                  <div className="mappool-card-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                                    {isEditing ? (
                                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdateMap(map)}>Save</button>
                                    ) : (
                                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingMapId(map.id)}><Edit size={14}/></button>
                                    )}
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-accent-primary)' }} onClick={() => handleDeleteMap(map.id)}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );

                            if (snapshot.isDragging) {
                              return createPortal(child, document.body);
                            }
                            return child;
                          }}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && selectedTournament && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}><Upload size={18} /> Upload Statistics for {selectedTournament.shortName}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Format Excel: OsuId, Username, Stage, Score, Accuracy, Misses
            </p>
            <form onSubmit={handleUploadExcel} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input type="file" className="input" accept=".xlsx,.xls" onChange={e => setExcelFile(e.target.files[0])} />
              <button type="submit" className="btn btn-primary">Upload Excel</button>
            </form>
            {excelStatus && <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>{excelStatus}</p>}
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Manage Stats ({statsList.length})</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Stage</th>
                    <th>Score</th>
                    <th>Accuracy</th>
                    <th>Misses</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {statsList.map(stat => {
                    const isEditing = editingStatId === stat.id;
                    return (
                      <tr key={stat.id}>
                        <td style={{ fontWeight: 600 }}>{stat.user.username}</td>
                        <td>{stat.stage}</td>
                        <td>
                          {isEditing ? (
                            <input className="input" style={{ padding: '0.4rem', width: '80px' }} type="number" value={stat.score} onChange={e => setStatsList(statsList.map(s => s.id === stat.id ? {...s, score: parseInt(e.target.value)} : s))} />
                          ) : stat.score.toLocaleString()}
                        </td>
                        <td>
                          {isEditing ? (
                            <input className="input" style={{ padding: '0.4rem', width: '80px' }} type="number" step="0.01" value={stat.accuracy} onChange={e => setStatsList(statsList.map(s => s.id === stat.id ? {...s, accuracy: parseFloat(e.target.value)} : s))} />
                          ) : `${stat.accuracy.toFixed(2)}%`}
                        </td>
                        <td>
                          {isEditing ? (
                            <input className="input" style={{ padding: '0.4rem', width: '60px' }} type="number" value={stat.misses} onChange={e => setStatsList(statsList.map(s => s.id === stat.id ? {...s, misses: parseInt(e.target.value)} : s))} />
                          ) : stat.misses}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {isEditing ? (
                              <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStat(stat)}>Save</button>
                            ) : (
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditingStatId(stat.id)}>Edit</button>
                            )}
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-accent-primary)' }} onClick={() => handleDeleteStat(stat.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && selectedTournament && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}><Calendar size={18} /> {editingScheduleId ? 'Edit Match' : 'Add Match'}</h3>
            <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input className="input" placeholder="Stage (e.g. RO32)" value={sForm.stage} onChange={e => setSForm({...sForm, stage: e.target.value})} required />
                <input className="input" type="date" value={sForm.date} onChange={e => setSForm({...sForm, date: e.target.value})} required />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input className="input" placeholder="Player 1" value={sForm.player1Name} onChange={e => setSForm({...sForm, player1Name: e.target.value})} />
                <span>VS</span>
                <input className="input" placeholder="Player 2" value={sForm.player2Name} onChange={e => setSForm({...sForm, player2Name: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <select className="input" value={sForm.status} onChange={e => setSForm({...sForm, status: e.target.value})}>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
                <input className="input" type="datetime-local" value={sForm.matchTime ? new Date(new Date(sForm.matchTime).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''} onChange={e => setSForm({...sForm, matchTime: new Date(e.target.value).toISOString()})} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input className="input" placeholder="Streamer (Optional)" value={sForm.streamer || ''} onChange={e => setSForm({...sForm, streamer: e.target.value})} />
                <input className="input" placeholder="Commentators (Optional)" value={sForm.commentators || ''} onChange={e => setSForm({...sForm, commentators: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Avatars (leave blank to auto-fetch from osu!)</span>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input className="input" placeholder="P1 Avatar URL" value={sForm.player1Avatar || ''} onChange={e => setSForm({...sForm, player1Avatar: e.target.value})} />
                  <input className="input" placeholder="P2 Avatar URL" value={sForm.player2Avatar || ''} onChange={e => setSForm({...sForm, player2Avatar: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-primary">{editingScheduleId ? 'Save Changes' : 'Add Match'}</button>
                {editingScheduleId && (
                  <button type="button" className="btn btn-secondary" onClick={() => { setEditingScheduleId(null); setSForm({ stage: 'Group Stage', player1Name: '', player2Name: '', date: '', matchTime: '', status: 'upcoming' }); }}>Cancel</button>
                )}
              </div>
            </form>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Match Schedule ({scheduleList.length})</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Stage</th>
                    <th>Date / Time</th>
                    <th>Matchup</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleList.map(s => (
                    <tr key={s.id}>
                      <td>{s.stage}</td>
                      <td>
                        <div>{s.date}</div>
                        {s.matchTime && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(s.matchTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.player1Name || 'TBD'} <span style={{ color: 'var(--color-text-muted)', margin: '0 0.5rem', fontWeight: 400 }}>vs</span> {s.player2Name || 'TBD'}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: s.status === 'completed' ? 'rgba(76, 175, 80, 0.1)' : s.status === 'active' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255,255,255,0.05)', color: s.status === 'completed' ? '#4caf50' : s.status === 'active' ? '#ff9800' : 'inherit' }}>
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {s.streamer && <div style={{ fontSize: '0.8rem' }}>🎥 {s.streamer}</div>}
                        {s.commentators && <div style={{ fontSize: '0.8rem' }}>🎙️ {s.commentators}</div>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { 
                            setSForm({ 
                              stage: s.stage, 
                              player1Name: s.player1Name || '', 
                              player2Name: s.player2Name || '', 
                              date: s.date, 
                              matchTime: s.matchTime || '', 
                              status: s.status,
                              streamer: s.streamer || '',
                              commentators: s.commentators || '',
                              player1Avatar: s.player1Avatar || '',
                              player2Avatar: s.player2Avatar || ''
                            }); 
                            setEditingScheduleId(s.id); 
                          }}>Edit</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-accent-primary)' }} onClick={() => handleDeleteSchedule(s.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {activeTab === 'staff' && selectedTournament && (
        <div className="grid-2">
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}><Users size={18} /> {editingStaffId ? 'Edit Staff' : 'Add Staff'}</h3>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input 
                className="input" 
                placeholder="osu! ID or Exact Username" 
                value={staffForm.identifier} 
                onChange={e => setStaffForm({...staffForm, identifier: e.target.value})} 
                required 
                disabled={!!editingStaffId} 
              />
              <select className="input" value={staffForm.staffRole} onChange={e => setStaffForm({...staffForm, staffRole: e.target.value})}>
                {['Host', 'Admin', 'Mappooler', 'Referee', 'Streamer', 'Commentator', 'GFX', 'Developer'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-primary">{editingStaffId ? 'Save Changes' : 'Add Staff'}</button>
                {editingStaffId && (
                  <button type="button" className="btn btn-secondary" onClick={() => { setEditingStaffId(null); setStaffForm({ identifier: '', staffRole: 'Referee' }); }}>Cancel</button>
                )}
              </div>
            </form>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Staff Roster ({staffList.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {staffList.map(s => (
                <div key={s.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.user.username}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.staffRole}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setStaffForm({ identifier: s.user.username, staffRole: s.staffRole }); setEditingStaffId(s.id); }}><Edit size={14}/></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-accent-primary)' }} onClick={() => handleDeleteStaff(s.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
