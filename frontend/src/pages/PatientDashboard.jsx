import React, { useState, useEffect } from 'react';

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
    const [expandedPrescription, setExpandedPrescription] = useState(null);
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

    const { profile, appointments = [], prescriptions = [], medical_records = [], stats = {} } = data || {};

    // Filtered appointments
    const filteredAppts = appointments.filter(a =>
        !searchQuery ||
        (a.doctor?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.patient_problem || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.status || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tabs = [
        { id: 'appointments', label: '📅 Appointments', count: appointments.length },
        { id: 'prescriptions', label: '💊 Prescriptions', count: prescriptions.length },
        { id: 'records', label: '📁 Medical Records', count: medical_records.length },
    ];

    return (
        <div style={{ marginTop: '80px', fontFamily: "'Inter', sans-serif" }}>
            {/* Hero Header */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
                borderRadius: '20px', padding: '28px 32px', marginBottom: '28px', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800 }}>
                        👋 Hello, {profile?.first_name || profile?.username || 'Patient'}
                    </h1>
                    <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.95rem' }}>
                        {profile?.email} {profile?.contact_no ? `· ${profile.contact_no}` : ''}
                    </p>
                </div>
                <a href="/users/profile/" style={{
                    background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px', padding: '10px 20px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
                }}>
                    ✏️ Edit Profile
                </a>
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
                <StatCard icon="💊" label="Prescriptions" value={stats.total_prescriptions || 0} accent="#faf5ff" />
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
                                    {appt.status === 'Completed' && (
                                        <button
                                            onClick={() => { setExpandedPrescription(appt.id); setActiveTab('prescriptions'); }}
                                            style={{ background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                                        >
                                            View Rx →
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Prescriptions Tab ── */}
            {activeTab === 'prescriptions' && (
                <div>
                    {prescriptions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '14px' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💊</div>
                            <p style={{ color: '#64748b' }}>No prescriptions yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
                            {prescriptions.map(rx => (
                                <div key={rx.id} style={{
                                    background: '#fff', borderRadius: '16px', overflow: 'hidden',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9',
                                }}>
                                    {/* Rx Header */}
                                    <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '16px 20px', color: '#fff' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Dr. {rx.doctor_name}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{rx.appointment?.date}</div>
                                            </div>
                                            <span style={{ fontSize: '1.5rem' }}>📋</span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '18px 20px' }}>
                                        {rx.symptoms && (
                                            <div style={{ marginBottom: '10px' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '3px' }}>Symptoms</div>
                                                <div style={{ fontSize: '0.9rem', color: '#334155' }}>{rx.symptoms}</div>
                                            </div>
                                        )}
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '3px' }}>Diagnosis</div>
                                            <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>{rx.diagnosis || '—'}</div>
                                        </div>
                                        {rx.medicines?.length > 0 && (
                                            <div style={{ marginBottom: '10px' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Medicines</div>
                                                {rx.medicines.map((med, i) => (
                                                    <div key={i} style={{
                                                        background: '#f8fafc', borderRadius: '8px', padding: '8px 12px', marginBottom: '5px',
                                                        display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem',
                                                    }}>
                                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{med.name}</span>
                                                        <span style={{ color: '#64748b' }}>{med.dosage} · {med.duration}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {rx.instructions && (
                                            <div style={{ background: '#faf5ff', borderRadius: '8px', padding: '10px 12px', borderLeft: '3px solid #8b5cf6' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', marginBottom: '3px' }}>INSTRUCTIONS</div>
                                                <div style={{ fontSize: '0.85rem', color: '#4a044e' }}>{rx.instructions}</div>
                                            </div>
                                        )}
                                        <div style={{ marginTop: '14px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
                                            Issued: {new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Medical Records Tab ── */}
            {activeTab === 'records' && (
                <div>
                    {medical_records.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '14px' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📁</div>
                            <p style={{ color: '#64748b' }}>No medical records uploaded yet.</p>
                        </div>
                    ) : (
                        <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                        {['Title', 'Type', 'Uploaded By', 'Date', 'Action'].map(col => (
                                            <th key={col} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {medical_records.map((rec, idx) => (
                                        <tr key={rec.id} style={{ borderBottom: idx < medical_records.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                            <td style={{ padding: '13px 16px', fontWeight: 600, color: '#1e293b' }}>{rec.title}</td>
                                            <td style={{ padding: '13px 16px' }}>
                                                <span style={{ background: '#eff6ff', color: '#2563eb', borderRadius: '6px', padding: '3px 8px', fontSize: '0.78rem', fontWeight: 600 }}>{rec.record_type}</span>
                                            </td>
                                            <td style={{ padding: '13px 16px', color: '#64748b' }}>Dr. {rec.doctor_name || 'Self'}</td>
                                            <td style={{ padding: '13px 16px', color: '#64748b' }}>{new Date(rec.uploaded_at).toLocaleDateString('en-IN')}</td>
                                            <td style={{ padding: '13px 16px' }}>
                                                <a href={rec.file} target="_blank" rel="noreferrer" style={{
                                                    background: '#dcfce7', color: '#16a34a', borderRadius: '7px',
                                                    padding: '6px 12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem',
                                                }}>
                                                    ⬇ Download
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PatientDashboard;
