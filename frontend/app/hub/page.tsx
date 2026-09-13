'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Inbox, Shield, Vote, Calendar, Tag, Users, MapPin, Clock, User, HeartHandshake } from 'lucide-react';
import {
  getElections, createElection, updateElection, deleteElection,
  getVolunteerPrograms, createVolunteerProgram, updateVolunteerProgram, deleteVolunteerProgram,
  joinVolunteerProgram, getVolunteerParticipants, VolunteerParticipant
} from '@/lib/api';

export default function HubPage() {
  const { t } = useTranslation();
  const [userRole, setUserRole] = useState('');
  const [elections, setElections] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [participants, setParticipants] = useState<Record<number, VolunteerParticipant[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Modal states for Elections
  const [elecModal, setElecModal] = useState({ open: false, mode: 'add', item: null as any });
  const [elecForm, setElecForm] = useState({ title: '', date: '', type: '', status: '' });

  // Modal states for Volunteers
  const [volModal, setVolModal] = useState({ open: false, mode: 'add', item: null as any });
  const [volForm, setVolForm] = useState({ name: '', ward: '', date: '', spots: 0, icon: 'Hands' });

  useEffect(() => {
    setMounted(true);
    setUserRole(localStorage.getItem('cc_user_role') || '');
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const elecRes = await getElections();
      const volRes = await getVolunteerPrograms();
      setElections(elecRes.data.elections);
      setVolunteers(volRes.data.programs);

      const role = localStorage.getItem('cc_user_role');
      if (role === 'government' || role === 'admin') {
        const partsRes = await getVolunteerParticipants();
        const pMap: Record<number, VolunteerParticipant[]> = {};
        partsRes.data.participants.forEach((p: VolunteerParticipant) => {
          if (!pMap[p.program_id]) pMap[p.program_id] = [];
          pMap[p.program_id].push(p);
        });
        setParticipants(pMap);
      }
    } catch (err) {
      toast.error('Failed to load hub data.');
    } finally {
      setIsLoading(false);
    }
  };

  const isGov = userRole === 'government';

  // --- Election Handlers ---
  const openElecAdd = () => {
    setElecForm({ title: '', date: '', type: '', status: 'Upcoming' });
    setElecModal({ open: true, mode: 'add', item: null });
  };
  const openElecEdit = (item: any) => {
    setElecForm({ title: item.title, date: item.date, type: item.type, status: item.status });
    setElecModal({ open: true, mode: 'edit', item });
  };
  const handleElecSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (elecModal.mode === 'add') {
        await createElection(elecForm);
        toast.success('Election added!');
      } else {
        await updateElection(elecModal.item.id, elecForm);
        toast.success('Election updated!');
      }
      setElecModal({ open: false, mode: 'add', item: null });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error saving election');
    }
  };
  const handleElecDelete = async (id: number) => {
    if (!confirm('Delete this election?')) return;
    try {
      await deleteElection(id);
      toast.success('Election deleted!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error deleting election');
    }
  };

  // --- Volunteer Handlers ---
  const openVolAdd = () => {
    setVolForm({ name: '', ward: '', date: '', spots: 10, icon: 'Hands' });
    setVolModal({ open: true, mode: 'add', item: null });
  };
  const openVolEdit = (item: any) => {
    setVolForm({ name: item.name, ward: item.ward, date: item.date, spots: item.spots, icon: item.icon });
    setVolModal({ open: true, mode: 'edit', item });
  };
  const handleVolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (volModal.mode === 'add') {
        await createVolunteerProgram(volForm);
        toast.success('Program added!');
      } else {
        await updateVolunteerProgram(volModal.item.id, volForm);
        toast.success('Program updated!');
      }
      setVolModal({ open: false, mode: 'add', item: null });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error saving program');
    }
  };
  const handleVolDelete = async (id: number) => {
    if (!confirm('Delete this program?')) return;
    try {
      await deleteVolunteerProgram(id);
      toast.success('Program deleted!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error deleting program');
    }
  };

  const handleJoinProgram = async (programId: number) => {
    try {
      await joinVolunteerProgram(programId);
      toast.success('Successfully joined the volunteer program!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error joining program.');
    }
  };

  // --- Modal styles ---
  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
  };
  const modalContentStyle: React.CSSProperties = {
    background: 'white', padding: 24, borderRadius: 12, width: '100%', maxWidth: 400,
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', marginBottom: 12, border: '1px solid #ccc', borderRadius: 6
  };

  return (
    <>
      <Navbar />
      <div className="page-container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div className="page-header animate-fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Inbox size={28} /> {t('hub.title')}
            </h1>
            <p className="page-subtitle">Stay informed about local governance and get involved in your community</p>
          </div>
          {isGov && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 16px', borderRadius: 20,
              background: '#dbeafe', color: '#1e40af',
              fontSize: '0.78rem', fontWeight: 700,
            }}>
              <Shield size={14} /> Gov Hub Manager
            </span>
          )}
        </div>

        {/* Ward Info Banner */}
        <div
          className="animate-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
            borderRadius: 16,
            padding: '24px 32px',
            color: 'white',
            marginBottom: 32,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ opacity: 0.7, fontSize: '0.8rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t('hub.ward_info')}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>Ward 73 — Indiranagar</div>
            <div style={{ opacity: 0.75, fontSize: '0.9rem', marginTop: 4 }}>Bengaluru East Zone · BBMP</div>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: '0.8rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t('hub.councillor')}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Sri. Ravi Kumar B.S.</div>
            <div style={{ opacity: 0.75, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={12} /> +91 80 2345 6789
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
        ) : (
          <div className="grid-2">
            {/* Elections */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Vote size={20} color="#1a4fa0" /> {t('hub.elections')}
                </h2>
                {isGov && (
                  <button onClick={openElecAdd} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>+ Add</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {elections.map((e) => (
                  <div key={e.id} className="civic-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{e.title}</h3>
                      <span className="badge badge-in_progress">{e.status}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={14} /> {e.date} · <Tag size={14} /> {e.type}
                    </div>
                    {isGov ? (
                      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                        <button onClick={() => openElecEdit(e)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Edit</button>
                        <button onClick={() => handleElecDelete(e.id)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: '#ef4444', color: '#ef4444' }}>Delete</button>
                      </div>
                    ) : (
                      <button className="btn-secondary" style={{ marginTop: 14, padding: '7px 14px', fontSize: '0.8rem' }}>
                        {t('common.learnMore')}
                      </button>
                    )}
                  </div>
                ))}
                {elections.length === 0 && <p style={{ fontSize: '0.9rem', color: '#64748b' }}>No upcoming elections.</p>}
              </div>
            </div>

            {/* Volunteers */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={20} color="#10b981" /> {t('hub.volunteers')}
                </h2>
                {isGov && (
                  <button onClick={openVolAdd} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>+ Add</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {volunteers.map((v) => (
                  <div key={v.id} className="civic-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, background: '#d1fae5', borderRadius: 12 }}>
                        <HeartHandshake size={28} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>{v.name}</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> {v.ward}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> {v.date}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <User size={12} /> {v.spots} spots available
                          </span>
                          {mounted && userRole === 'citizen' && (
                            <button onClick={() => handleJoinProgram(v.id)} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                              {t('hub.volunteer_join')}
                            </button>
                          )}
                        </div>
                        {isGov && (
                          <>
                            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                              <button onClick={() => openVolEdit(v)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Edit</button>
                              <button onClick={() => handleVolDelete(v.id)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: '#ef4444', color: '#ef4444' }}>Delete</button>
                            </div>
                            {participants[v.id] && participants[v.id].length > 0 && (
                              <div style={{ marginTop: 16, background: '#f8fafc', padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Users size={14} /> Registered Volunteers ({participants[v.id].length})
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {participants[v.id].map(p => (
                                    <li key={p.id} style={{ fontSize: '0.8rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                                      {p.user_name} <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>joined {new Date(p.joined_at).toLocaleDateString()}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {volunteers.length === 0 && <p style={{ fontSize: '0.9rem', color: '#64748b' }}>No volunteer programs available.</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Election Modal --- */}
      {elecModal.open && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginBottom: 16 }}>{elecModal.mode === 'add' ? 'Add Election' : 'Edit Election'}</h3>
            <form onSubmit={handleElecSubmit}>
              <input required style={inputStyle} placeholder="Title (e.g. BBMP Council Elections)" value={elecForm.title} onChange={e => setElecForm({...elecForm, title: e.target.value})} />
              <input required style={inputStyle} placeholder="Date (e.g. Dec 15, 2025)" value={elecForm.date} onChange={e => setElecForm({...elecForm, date: e.target.value})} />
              <input required style={inputStyle} placeholder="Type (e.g. Local Body)" value={elecForm.type} onChange={e => setElecForm({...elecForm, type: e.target.value})} />
              <input required style={inputStyle} placeholder="Status (e.g. Upcoming)" value={elecForm.status} onChange={e => setElecForm({...elecForm, status: e.target.value})} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setElecModal({ open: false, mode: 'add', item: null })} className="btn-secondary" style={{ padding: '6px 12px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '6px 12px' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Volunteer Modal --- */}
      {volModal.open && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginBottom: 16 }}>{volModal.mode === 'add' ? 'Add Volunteer Program' : 'Edit Volunteer Program'}</h3>
            <form onSubmit={handleVolSubmit}>
              <input required style={inputStyle} placeholder="Name (e.g. Cleanup Drive)" value={volForm.name} onChange={e => setVolForm({...volForm, name: e.target.value})} />
              <input required style={inputStyle} placeholder="Ward (e.g. Ward 73)" value={volForm.ward} onChange={e => setVolForm({...volForm, ward: e.target.value})} />
              <input required style={inputStyle} placeholder="Date/Time (e.g. Every Sunday, 7-9 AM)" value={volForm.date} onChange={e => setVolForm({...volForm, date: e.target.value})} />
              <input required type="number" style={inputStyle} placeholder="Spots" value={volForm.spots} onChange={e => setVolForm({...volForm, spots: parseInt(e.target.value) || 0})} />
              <input required style={inputStyle} placeholder="Icon Theme" value={volForm.icon} onChange={e => setVolForm({...volForm, icon: e.target.value})} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setVolModal({ open: false, mode: 'add', item: null })} className="btn-secondary" style={{ padding: '6px 12px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '6px 12px' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
