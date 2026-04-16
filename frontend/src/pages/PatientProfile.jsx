import React, { useState, useEffect } from 'react';

/* ─── helpers ──────────────────────────────────────────────── */
const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
};

const apiFetch = (url, opts = {}) => {
    const token = localStorage.getItem('access_token');
    const csrfToken = getCookie('csrftoken');
    const headers = { 
        ...(opts.headers || {}), 
        Authorization: token ? `Bearer ${token}` : undefined 
    };
    if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
    }
    return fetch(url, { ...opts, headers, credentials: 'include' });
};

const Badge = ({ s }) => {
    const map = {
        Pending:   '#fff7ed|#c2410c',
        Accepted:  '#eff6ff|#1d4ed8',
        Completed: '#f0fdf4|#15803d',
        Rejected:  '#fef2f2|#b91c1c',
        Cancelled: '#f8fafc|#475569',
    };
    const [bg, c] = (map[s] || map.Cancelled).split('|');
    return (
        <span style={{ background: bg, color: c, borderRadius: '999px', padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
            {s}
        </span>
    );
};

/* ══════════════════════════════════════════════════════════════
   APPOINTMENT DETAIL DRAWER
══════════════════════════════════════════════════════════════ */
const ApptDetailPanel = ({ apptId, onClose }) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch(`/api/appointments/${apptId}/detail/`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { setDetail(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [apptId]);

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={onClose}>
            <div style={{
                background: '#fff', borderRadius: '20px', padding: '2rem', width: '90%', maxWidth: 700,
                maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem' }}>📋 Appointment Record</h3>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                </div>

                {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading…</div>}

                {!loading && !detail && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>Failed to load record.</div>
                )}

                {detail && (() => {
                    const { appointment: appt, prescription: rx, medical_records: recs } = detail;
                    return (
                        <>
                            {/* Appointment summary */}
                            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f)', borderRadius: '14px', padding: '16px 20px', color: '#fff', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '12px' }}>
                                    {[
                                        ['Doctor', `Dr. ${appt.doctor?.name}`],
                                        ['Specialty', appt.doctor?.specialty_name],
                                        ['Hospital', appt.doctor?.hospital?.name],
                                        ['Date', appt.date],
                                        ['Time', appt.time],
                                        ['Status', appt.status],
                                    ].map(([l, v]) => (
                                        <div key={l}>
                                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>{l}</div>
                                            <div style={{ fontWeight: 600, marginTop: '2px' }}>{v || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Prescription */}
                            <h4 style={{ margin: '0 0 12px', fontWeight: 700, color: '#1e293b' }}>Prescription</h4>
                            {!rx ? (
                                <div style={{ background: '#fffbeb', borderRadius: '10px', padding: '16px', border: '1.5px dashed #fbbf24', color: '#92400e', marginBottom: '1.5rem', textAlign: 'center' }}>
                                    ⚠️ No prescription has been generated for this appointment.
                                </div>
                            ) : (
                                <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '14px', overflow: 'hidden', marginBottom: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                                    <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', padding: '14px 18px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>Dr. {rx.doctor_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                        </div>
                                        <span style={{ background: rx.generate_method === 'upload' ? '#0ea5e9' : '#6366f1', color: '#fff', fontSize: '0.72rem', fontWeight: 700, borderRadius: '999px', padding: '3px 10px' }}>
                                            {rx.generate_method === 'upload' ? '📎 File' : '📝 Template'}
                                        </span>
                                    </div>
                                    <div style={{ padding: '18px' }}>
                                        {rx.generate_method === 'upload' && rx.prescription_file ? (
                                            <div style={{ textAlign: 'center' }}>
                                                {rx.prescription_file.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                                    <img src={rx.prescription_file} alt="Prescription" style={{ maxWidth: '100%', borderRadius: '10px' }} />
                                                ) : (
                                                    <a href={rx.prescription_file} target="_blank" rel="noreferrer"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#eff6ff', color: '#2563eb', borderRadius: '10px', padding: '12px 24px', textDecoration: 'none', fontWeight: 700 }}>
                                                        📄 View Prescription PDF
                                                    </a>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                {rx.symptoms && <div style={{ marginBottom: '10px' }}><div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '3px' }}>Symptoms</div><div style={{ fontSize: '0.9rem' }}>{rx.symptoms}</div></div>}
                                                <div style={{ marginBottom: '10px' }}><div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '3px' }}>Diagnosis</div><div style={{ fontWeight: 700, color: '#1e293b' }}>{rx.diagnosis || '—'}</div></div>
                                                {rx.medicines?.length > 0 && (
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Medicines</div>
                                                        {rx.medicines.map((m, i) => (
                                                            <div key={i} style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px 12px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                                <strong>{m.name}</strong>
                                                                <span style={{ color: '#64748b' }}>{m.dosage} · {m.duration}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {rx.instructions && <div style={{ background: '#faf5ff', borderRadius: '8px', padding: '10px 12px', borderLeft: '3px solid #7c3aed' }}><div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed', marginBottom: '3px' }}>INSTRUCTIONS</div><div style={{ fontSize: '0.85rem' }}>{rx.instructions}</div></div>}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Medical Records */}
                            <h4 style={{ margin: '0 0 12px', fontWeight: 700, color: '#1e293b' }}>Medical Records</h4>
                            {recs.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', background: '#f8fafc', borderRadius: '10px' }}>
                                    No additional records uploaded.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {recs.map(r => (
                                        <div key={r.id} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <div style={{ fontSize: '1.5rem' }}>{r.record_type === 'X-Ray' ? '🦴' : r.record_type === 'Scan' ? '🔬' : r.record_type === 'Lab Report' ? '🧪' : '📄'}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{r.title}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{r.record_type} · {new Date(r.uploaded_at).toLocaleDateString('en-IN')}</div>
                                            </div>
                                            <a href={r.file} target="_blank" rel="noreferrer"
                                                style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '8px', padding: '6px 14px', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem' }}>
                                                ⬇ View
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>
        </div>
    );
};


/* ══════════════════════════════════════════════════════════════
   COMPLETED ORDERS SECTION (medicine/prescription orders)
══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   COMPLETED ORDERS SECTION (Commerce Orders)
   ══════════════════════════════════════════════════════════════ */
const CompletedOrders = ({ orders }) => {
    if (!orders || orders.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
                <p style={{ color: '#64748b' }}>No completed medicine orders yet.</p>
                <a href="/pharmacy" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Order Medicines →</a>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {orders.map(order => (
                <div key={order.id} style={{
                    background: '#fff', borderRadius: '14px', overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg,#1e293b,#334155)',
                        padding: '14px 20px', color: '#fff', display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontWeight: 700 }}>Order ID: #{order.id}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                Placed on: {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>₹{order.total_amount}</div>
                            <Badge s={order.status} />
                        </div>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Items Ordered</div>
                            <div style={{ color: '#1e293b', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                {order.items || 'Medicine items details...'}
                            </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Delivery Address</div>
                                <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '3px' }}>
                                    {order.house_no}, {order.street}, {order.city} - {order.pincode}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Payment</div>
                                <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '3px' }}>
                                    {order.payment_method}
                                </div>
                            </div>
                        </div>

                        {order.prescription && (
                            <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                <a href={order.prescription} target="_blank" rel="noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f0f9ff', color: '#0369a1', borderRadius: '8px', padding: '6px 14px', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem' }}>
                                    📎 View Attached Prescription
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};


/* ══════════════════════════════════════════════════════════════
   MAIN PATIENT PROFILE PAGE
══════════════════════════════════════════════════════════════ */
const PatientProfile = ({ context }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('profile');
    const [selectedApptId, setSelectedApptId] = useState(null);

    useEffect(() => {
        apiFetch('/api/patient/dashboard/')
            .then(r => {
                if (r.status === 401) throw new Error('Please log in to view your profile.');
                if (!r.ok) throw new Error('Could not load profile.');
                return r.json();
            })
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/users/logout/';
    };

    /* ── guards ── */
    if (!context?.isAuthenticated) {
        return (
            <div id="patient-profile-auth-gate" style={{ textAlign: 'center', padding: '100px 20px', marginTop: '80px' }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔒</div>
                <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>Please Log In</h2>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>You need to be logged in to view your profile.</p>
                <a href="/users/login/" id="profile-login-btn" style={{
                    background: 'linear-gradient(135deg,#0ea5e9,#2563eb)', color: '#fff', padding: '12px 32px',
                    borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '1rem',
                }}>Login Now</a>
            </div>
        );
    }

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '100px 20px', marginTop: '80px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: '#64748b' }}>Loading your profile…</p>
        </div>
    );

    if (error) return (
        <div style={{ textAlign: 'center', padding: '80px 20px', marginTop: '80px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
            <p style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</p>
            <a href="/users/login/" style={{ background: '#2563eb', color: '#fff', borderRadius: '8px', padding: '10px 24px', textDecoration: 'none', fontWeight: 600 }}>Login</a>
        </div>
    );

    const { profile, appointments = [], prescriptions = [], orders = [], stats = {} } = data || {};
    const completedAppts = appointments.filter(a => a.status === 'Completed');

    const tabs = [
        { id: 'profile', icon: '👤', label: 'My Profile' },
        { id: 'appointments', icon: '📅', label: 'Completed Appointments', badge: completedAppts.length },
        { id: 'orders', icon: '💊', label: 'Medicine Orders', badge: orders.length },
    ];

    return (
        <div id="patient-profile-page" style={{ marginTop: '80px', fontFamily: "'Inter',sans-serif", maxWidth: 960, margin: '80px auto 40px', padding: '0 20px' }}>

            {/* Hero Banner */}
            <div style={{
                background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e293b 100%)',
                borderRadius: '22px', padding: '28px 32px', marginBottom: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '70px', height: '70px', borderRadius: '18px',
                        background: 'linear-gradient(135deg,#6366f1,#a855f7)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', fontWeight: 800, color: '#fff',
                        boxShadow: '0 8px 20px rgba(99,102,241,0.4)',
                    }}>
                        {(profile?.first_name || profile?.username || 'P')[0].toUpperCase()}
                    </div>
                    <div>
                        <h1 id="patient-profile-greeting" style={{ margin: 0, color: '#fff', fontSize: '1.6rem', fontWeight: 800 }}>
                            {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : profile?.username}
                        </h1>
                        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                            {profile?.email}{profile?.contact_no ? ` · ${profile.contact_no}` : ''}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button id="patient-logout-btn" onClick={handleLogout} style={{
                        background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1.5px solid rgba(239,68,68,0.3)',
                        borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                        transition: 'all 0.2s',
                    }}>
                        🚪 Logout
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px', marginBottom: '28px' }}>
                {[
                    ['📅', 'Total Visits', stats.total_appointments || 0, '#eff6ff'],
                    ['⏳', 'Upcoming', stats.upcoming || 0, '#f0fdf4'],
                    ['✅', 'Completed', stats.completed || 0, '#dcfce7'],
                    ['💊', 'Prescriptions', stats.total_prescriptions || 0, '#faf5ff'],
                ].map(([icon, lbl, val, bg]) => (
                    <div key={lbl} style={{ background: '#fff', borderRadius: '14px', padding: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{icon}</div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{val}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>{lbl}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '22px', borderBottom: '2px solid #f1f5f9', paddingBottom: '0' }}>
                {tabs.map(t => (
                    <button key={t.id} id={`profile-tab-${t.id}`}
                        onClick={() => setActiveTab(t.id)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px',
                            fontSize: '0.88rem', fontWeight: 700, transition: 'all 0.2s',
                            color: activeTab === t.id ? '#2563eb' : '#64748b',
                            borderBottom: activeTab === t.id ? '2.5px solid #2563eb' : '2.5px solid transparent',
                            marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                    >
                        {t.icon} {t.label}
                        {t.badge != null && (
                            <span style={{
                                background: activeTab === t.id ? '#dbeafe' : '#f1f5f9',
                                color: activeTab === t.id ? '#2563eb' : '#94a3b8',
                                borderRadius: '999px', padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700,
                            }}>{t.badge}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Profile Tab ── */}
            {activeTab === 'profile' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
                    <div style={{ background: '#fff', borderRadius: '18px', padding: '28px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontWeight: 700, color: '#1e293b', marginTop: 0, marginBottom: '20px' }}>Personal Details</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '24px' }}>
                            {[
                                ['👤 Full Name', profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : profile?.username],
                                ['📧 Email', profile?.email],
                                ['📱 Contact', profile?.contact_no || 'Not provided'],
                                ['🎂 Age', profile?.age ? `${profile.age} years` : 'Not provided'],
                                ['⚥ Gender', profile?.gender || 'Not provided'],
                                ['📍 Location', profile?.location || 'Not provided'],
                                ['🏥 Role', profile?.role || 'Patient'],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{value || '—'}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
                            <a href="/users/profile/" id="edit-profile-btn" style={{
                                background: 'linear-gradient(135deg,#0ea5e9,#2563eb)', color: '#fff', borderRadius: '10px',
                                padding: '10px 22px', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem',
                            }}>✏️ Edit Profile</a>
                            <button id="profile-logout-btn2" onClick={handleLogout} style={{
                                background: '#fff', color: '#ef4444', border: '1.5px solid #fecaca', borderRadius: '10px',
                                padding: '10px 22px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                            }}>🚪 Logout</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Completed Appointments Tab ── */}
            {activeTab === 'appointments' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    {completedAppts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
                            <p style={{ color: '#64748b' }}>No completed appointments yet.</p>
                            <a href="/doctors/" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Book Your First Appointment →</a>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {completedAppts.map(appt => (
                                <div key={appt.id} id={`appt-card-${appt.id}`} style={{
                                    background: '#fff', borderRadius: '16px', padding: '18px 22px',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
                                    display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }} onClick={() => setSelectedApptId(appt.id)}
                                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.12)'}
                                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)'}
                                >
                                    {/* Doctor avatar */}
                                    <div style={{
                                        width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                                    }}>
                                        {appt.doctor?.image ? (
                                            <img src={appt.doctor.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                        ) : '👨‍⚕️'}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>Dr. {appt.doctor?.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            {appt.doctor?.specialty_name} · {appt.doctor?.hospital?.name}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center', minWidth: '90px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{appt.date}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{appt.time}</div>
                                    </div>

                                    <Badge s={appt.status} />

                                    <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '180px' }}>
                                        {appt.patient_problem || 'General Consultation'}
                                    </div>

                                    <button id={`view-rx-btn-${appt.id}`}
                                        onClick={e => { e.stopPropagation(); setSelectedApptId(appt.id); }}
                                        style={{
                                            background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', color: '#2563eb',
                                            border: 'none', borderRadius: '10px', padding: '8px 16px',
                                            cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap',
                                        }}>
                                        View Rx &amp; Records →
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Medicine Orders Tab ── */}
            {activeTab === 'orders' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <CompletedOrders orders={orders} />
                </div>
            )}

            {/* Appointment Detail Drawer */}
            {selectedApptId && (
                <ApptDetailPanel apptId={selectedApptId} onClose={() => setSelectedApptId(null)} />
            )}
        </div>
    );
};

export default PatientProfile;
