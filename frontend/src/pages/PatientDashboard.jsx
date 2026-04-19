import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
    Pending:   { bg: '#fef9c3', color: '#854d0e' },
    Completed: { bg: '#dbeafe', color: '#1e40af' },
    Cancelled: { bg: '#f1f5f9', color: '#475569' },
};

const Badge = ({ status }) => {
    const style = STATUS_COLORS[status] || STATUS_COLORS.Cancelled;
    return (
        <span style={{
            background: style.bg, color: style.color,
            borderRadius: '999px', padding: '3px 10px',
            fontSize: '0.78rem', fontWeight: 600,
        }}>{status}</span>
    );
};

const StatCard = ({ icon, label, value, accent }) => (
    <div style={{
        background: '#fff', borderRadius: '14px', padding: '20px 22px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: '16px',
    }}>
        <div style={{
            width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
            background: accent || '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
        }}>{icon}</div>
        <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>{label}</div>
        </div>
    </div>
);

const PatientDashboard = ({ context }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('appointments');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDashboard(true); // initial load
        
        // Auto-refresh fallback polling every 10 seconds for real-time sync
        const interval = setInterval(() => {
            fetchDashboard(false); // background load without spinner
        }, 10000);
        
        return () => clearInterval(interval);
    }, []);

    const fetchDashboard = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('access_token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch('/api/patient/dashboard/', { headers, credentials: 'include' });
            if (res.status === 401) {
                setError('Session expired. Please log in again.');
                return;
            }
            if (!res.ok) throw new Error('Failed to load dashboard.');
            const json = await res.json();
            
            // Check for status changes to trigger real-time toast notification
            if (!showLoading && data && data.appointments && json.appointments) {
                json.appointments.forEach(newAppt => {
                    const oldAppt = data.appointments.find(a => a.id === newAppt.id);
                    if (oldAppt && oldAppt.status !== newAppt.status) {
                        showToast(`Status updated: Your appointment with Dr. ${newAppt.doctor?.name || ''} is now ${newAppt.status}!`);
                    }
                });
            }
            
            setData(json);
        } catch (e) {
            setError(e.message || 'Could not load your dashboard.');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    // Toast Notification System
    const [toastMsg, setToastMsg] = useState('');
    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 5000);
    };

    if (!context?.isAuthenticated) {
        return (
            <div style={{ textAlign: 'center', padding: '80px 20px', marginTop: '80px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
                <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>Please Log In</h2>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>You need to be logged in to view your dashboard.</p>
                <a href="/users/login/" style={{
                    background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: '#fff',
                    padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontWeight: 600,
                }}>Login Now</a>
            </div>
        );
    }

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '80px 20px', marginTop: '80px' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#64748b' }}>Loading your health dashboard...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (error) return (
        <div style={{ textAlign: 'center', padding: '60px 20px', marginTop: '80px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
            <p style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</p>
            <button onClick={fetchDashboard} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
        </div>
    );

    const { profile, appointments = [], stats = {} } = data || {};

    // Filtered appointments
    const filteredAppts = appointments.filter(a =>
        !searchQuery ||
        (a.doctor?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.patient_problem || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.status || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tabs = [
        { id: 'appointments', label: '📅 Appointments', count: appointments.length },
    ];

    return (
        <div style={{ marginTop: '80px', fontFamily: "'Inter', sans-serif" }}>
            {/* Hero Header (Synced with PatientProfile style) */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e293b 100%)',
                borderRadius: '22px', padding: '28px 32px', marginBottom: '28px', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ 
                        width: '70px', height: '70px', borderRadius: '18px', 
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
                        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '2rem', fontWeight: 800, color: '#fff', 
                        boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)' 
                    }}>
                        {(profile?.first_name || profile?.username || 'P')[0].toUpperCase()}
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800 }}>
                            👋 Hello, {profile?.first_name || profile?.username || 'Patient'}
                        </h1>
                        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.95rem', opacity: 0.9 }}>
                            {profile?.contact_no || 'Mobile registered'}
                        </p>
                    </div>
                </div>
                <Link to="/patient/profile" style={{
                    background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '12px', padding: '10px 24px', textDecoration: 'none', 
                    fontWeight: 700, fontSize: '0.9rem', backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                >
                    ✏️ Edit Profile
                </Link>
            </div>

            {/* Real-time Toast Notification */}
            {toastMsg && (
                <div style={{
                    position: 'fixed', bottom: '20px', right: '20px', background: '#334155', color: '#fff',
                    padding: '16px 24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600,
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <span style={{ fontSize: '1.4rem' }}>🔔</span>
                    {toastMsg}
                    <button onClick={() => setToastMsg('')} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', marginLeft: '10px', fontSize: '1.2rem' }}>×</button>
                    <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
                </div>
            )}

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <StatCard icon="📅" label="Total Appointments" value={stats.total_appointments || 0} accent="#eff6ff" />
                <StatCard icon="⏳" label="Upcoming" value={stats.upcoming || 0} accent="#f0fdf4" />
                <StatCard icon="✅" label="Completed" value={stats.completed || 0} accent="#dcfce7" />
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '0' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '10px 16px', fontSize: '0.9rem', fontWeight: 600,
                            color: activeTab === tab.id ? '#2563eb' : '#64748b',
                            borderBottom: activeTab === tab.id ? '2.5px solid #2563eb' : '2.5px solid transparent',
                            marginBottom: '-2px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
                        }}
                    >
                        {tab.label}
                        <span style={{
                            background: activeTab === tab.id ? '#dbeafe' : '#f1f5f9',
                            color: activeTab === tab.id ? '#2563eb' : '#94a3b8',
                            borderRadius: '999px', padding: '1px 8px', fontSize: '0.75rem',
                        }}>{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* ── Appointments Tab ── */}
            {activeTab === 'appointments' && (
                <div>
                    <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Search by doctor, problem, status..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                flex: 1, minWidth: '200px', padding: '10px 14px', border: '1.5px solid #e2e8f0',
                                borderRadius: '8px', outline: 'none', fontSize: '0.9rem', fontFamily: 'inherit',
                            }}
                        />
                    </div>

                    {filteredAppts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '14px' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
                            <p style={{ color: '#64748b' }}>No appointments found.</p>
                            <a href="/doctors/" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Find a Doctor →</a>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredAppts.map(appt => (
                                <div key={appt.id} style={{
                                    background: '#fff', borderRadius: '14px', padding: '18px 20px',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
                                    display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                                }}>
                                    <div style={{
                                        width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(135deg, #e0f2fe, #bfdbfe)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                                    }}>
                                        {appt.doctor?.image ? (
                                            <img src={appt.doctor.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                        ) : '👨‍⚕️'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: '160px' }}>
                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>Dr. {appt.doctor?.name || '—'}</div>
                                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                                            {appt.doctor?.specialty_name} · {appt.doctor?.hospital?.name}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center', minWidth: '90px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>{appt.date}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{appt.time}</div>
                                    </div>
                                    <div>
                                        <Badge status={appt.status} />
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '200px', wordBreak: 'break-word' }}>
                                        {appt.patient_problem || 'General Consultation'}
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}


        </div>
    );
};

export default PatientDashboard;
