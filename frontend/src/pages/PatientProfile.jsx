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
        'Content-Type': 'application/json',
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



/* ─── icons ───────────────────────────────────────────────── */
const ApptIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#2563eb' }}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <line x1="20" y1="8" x2="20" y2="14"></line>
        <line x1="23" y1="11" x2="17" y2="11"></line>
    </svg>
);

const OrderIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#16a34a' }}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
    </svg>
);

/* ══════════════════════════════════════════════════════════════
   APPOINTMENT DETAIL DRAWER
   ══════════════════════════════════════════════════════════════ */
const ApptDetailPanel = ({ apptId, onClose }) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch(`/api/appointments/${apptId}/`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { setDetail(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [apptId]);

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: '#fff', borderRadius: '32px', padding: '3rem', width: '100%', maxWidth: 700,
                maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 100px rgba(0,0,0,0.15)', border: '1px solid #f1f5f9'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                    <div>
                        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: '#1e293b' }}>Medical Consultation Record</h3>
                        <p style={{ margin: '0.4rem 0 0', color: '#94a3b8', fontWeight: 500 }}>Ref ID: #{apptId}</p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f8fafc', border: 'none', borderRadius: '14px', width: 44, height: 44, cursor: 'pointer', fontSize: '1.2rem', color: '#64748b', transition: 'all 0.2s' }}>×</button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ width: '32px', height: '32px', border: '3px solid #f1f5f9', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                    </div>
                ) : (
                    detail && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div style={{ background: '#f8fafc', borderRadius: '24px', padding: '2.5rem', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
                                    {[
                                        ['Clinician', `Dr. ${detail.doctor?.name}`],
                                        ['Specialization', detail.doctor?.specialty_name],
                                        ['Healthcare Facility', detail.doctor?.hospital?.name],
                                        ['Consultation Mode', 'In-Person Visit'],
                                        ['Visit Date', detail.date],
                                        ['Visit Time', detail.time],
                                    ].map(([l, v]) => (
                                        <div key={l}>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.4rem', letterSpacing: '0.02em' }}>{l}</div>
                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{v || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', background: '#f0f9ff', borderRadius: '18px', border: '1px solid #e0f2fe' }}>
                                <div style={{ fontWeight: 800, color: '#0369a1' }}>Status:</div>
                                <Badge s={detail.status} />
                            </div>
                        </div>
                    )
                )}
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
};


/* ══════════════════════════════════════════════════════════════
   PHARMACY ORDERS SECTION
   ══════════════════════════════════════════════════════════════ */
const CompletedOrders = ({ orders }) => {
    if (!orders || orders.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px', background: '#fff', borderRadius: '32px', border: '1px solid #f1f5f9' }}>
                <div style={{ background: '#f8fafc', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <OrderIcon />
                </div>
                <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: '1.1rem' }}>No medicine orders found.</p>
                <a href="/pharmacy" style={{ color: '#2563eb', fontWeight: 800, textDecoration: 'none', transition: 'all 0.2s', display: 'inline-block', marginTop: '1rem' }}>Browse Pharmacy →</a>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Pharmacy Orders</h2>
            {orders.map(order => (
                <div key={order.id} style={{
                    background: '#fff', borderRadius: '32px', overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9',
                }}>
                    <div style={{
                        background: '#f8fafc', padding: '1.5rem 2.5rem', borderBottom: '1px solid #f1f5f9',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', gap: '2.5rem' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Order Number</div>
                                <div style={{ fontWeight: 800, color: '#1e293b' }}>#ORD-{order.id}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Date Placed</div>
                                <div style={{ fontWeight: 700, color: '#475569' }}>{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Total Amount</div>
                                <div style={{ fontWeight: 900, color: '#2563eb' }}>₹{order.total_amount}</div>
                            </div>
                        </div>
                        <Badge s={order.status} />
                    </div>

                    <div style={{ padding: '2.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '3rem' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1.2rem' }}>Itemized Receipt</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {(() => {
                                        try {
                                            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                                            if (Array.isArray(items)) {
                                                return items.map((item, idx) => (
                                                    <div key={idx} style={{ 
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        background: '#f8fafc', padding: '1rem 1.5rem', 
                                                        borderRadius: '16px', border: '1px solid #f1f5f9'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
                                                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.name}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Qty: {item.quantity}</span>
                                                            <span style={{ fontWeight: 800, color: '#0f172a' }}>₹{item.price}</span>
                                                        </div>
                                                    </div>
                                                ));
                                            }
                                        } catch (e) {
                                            return <p style={{ color: '#ef4444' }}>Error decoding order items.</p>;
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Shipping Destination</div>
                                    <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '20px', fontSize: '0.85rem', color: '#475569', fontWeight: 600, border: '1px solid #f1f5f9', lineHeight: 1.5 }}>
                                        {order.house_no}, {order.street}<br/>
                                        {order.landmark && <span>{order.landmark}<br/></span>}
                                        {order.city} - {order.pincode}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.2rem', background: '#e0f2fe', borderRadius: '16px', border: '1px solid #bae6fd' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>Method</span>
                                    <span style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.85rem' }}>{order.payment_method}</span>
                                </div>
                            </div>
                        </div>
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

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [editForm, setEditForm] = useState({});

    const fetchData = () => {
        apiFetch('/api/patient/dashboard/')
            .then(r => {
                if (r.status === 401) throw new Error('Please log in.');
                if (!r.ok) throw new Error('Could not load profile.');
                return r.json();
            })
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/users/logout/';
    };

    const handleEditToggle = () => {
        if (!isEditing) {
            setEditForm({
                first_name: data.profile.first_name || '',
                last_name: data.profile.last_name || '',
                contact_no: data.profile.contact_no || '',
                age: data.profile.age || '',
                gender: data.profile.gender || '',
                location: data.profile.location || '',
            });
        }
        setIsEditing(!isEditing);
    };

    const handleSaveProfile = async () => {
        setSaveLoading(true);
        try {
            const res = await apiFetch('/api/patient/dashboard/', {
                method: 'PATCH',
                body: JSON.stringify(editForm),
            });
            if (res.ok) {
                setIsEditing(false);
                fetchData();
            } else {
                const errData = await res.json();
                alert('Update Failed: ' + JSON.stringify(errData));
            }
        } catch (err) {
            console.error(err);
            alert('Connection failed.');
        } finally {
            setSaveLoading(false);
        }
    };

    if (!context?.isAuthenticated) {
        return (
            <div id="patient-profile-auth-gate" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem' }}>
                <div style={{ maxWidth: '400px', width: '100%', background: '#fff', padding: '3rem', borderRadius: '32px', textAlign: 'center', boxShadow: '0 20px 50px rgba(15,23,42,0.08)', border: '1px solid #f1f5f9' }}>
                    <div style={{ width: '80px', height: '80px', background: '#fef2f2', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
                    </div>
                    <h2 style={{ color: '#1e293b', fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Access Restricted</h2>
                    <p style={{ color: '#64748b', marginBottom: '2.5rem', lineHeight: 1.6 }}>Please log in to your patient account to view your medical history and profile.</p>
                    <a href="/users/login/" style={{ display: 'block', background: '#2563eb', color: '#fff', padding: '1.2rem', borderRadius: '16px', textDecoration: 'none', fontWeight: 800, transition: 'transform 0.2s', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)' }}>
                        Login to Continue
                    </a>
                </div>
            </div>
        );
    }

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
                <p style={{ color: '#94a3b8', fontWeight: 600 }}>Loading Patient Record...</p>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const { profile, appointments = [], orders = [], lab_appointments = [], stats = {} } = data || {};
    const completedAppts = appointments.filter(a => a.status === 'Completed');
    const completedLabs = lab_appointments.filter(a => a.status === 'Completed');

    const tabs = [
        { id: 'profile', label: 'My Settings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> },
        { id: 'appointments', label: 'Doctor Visits', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>, badge: completedAppts.length },
        { id: 'labs', label: 'Lab History', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"></path><path d="M12 18h.01"></path><path d="M7 14h10"></path><path d="M7 10h10"></path></svg>, badge: completedLabs.length },
        { id: 'orders', label: 'Pharmacy Orders', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>, badge: orders.length },
    ];

    const inputStyle = {
        width: '100%', padding: '14px', border: '1.5px solid #e2e8f0', borderRadius: '14px',
        fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', outline: 'none', transition: 'border-color 0.2s'
    };

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '100px 0 60px' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 350px) 1fr', gap: '3rem', alignItems: 'start' }}>
                    
                    {/* Sidebar */}
                    <aside style={{ position: 'sticky', top: '120px' }}>
                        {/* Profile Card Summary */}
                        <div style={{ background: '#fff', borderRadius: '32px', padding: '2.5rem', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', marginBottom: '2rem' }}>
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <div style={{ width: '100px', height: '100px', borderRadius: '32px', background: 'linear-gradient(135deg,#6366f1,#a855f7)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: '#fff', boxShadow: '0 15px 35px rgba(99,102,241,0.25)' }}>
                                    {(profile?.first_name || profile?.username || 'P')[0].toUpperCase()}
                                </div>
                                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
                                    {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : profile?.username}
                                </h1>
                                <p style={{ margin: '0.5rem 0 0', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>Patient ID: #PAT-2024{profile?.id || 'XX'}</p>
                            </div>

                            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {tabs.map(t => (
                                    <button key={t.id} onClick={() => setActiveTab(t.id)} 
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', border: 'none', borderRadius: '18px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', transition: 'all 0.2s',
                                                background: activeTab === t.id ? '#f0f7ff' : 'transparent',
                                                color: activeTab === t.id ? '#2563eb' : '#64748b'
                                            }}>
                                        <span style={{ display: 'flex', alignItems: 'center' }}>{t.icon}</span>
                                        {t.label}
                                        {t.badge != null && <span style={{ marginLeft: 'auto', background: activeTab === t.id ? '#2563eb' : '#f1f5f9', color: activeTab === t.id ? '#fff' : '#94a3b8', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem' }}>{t.badge}</span>}
                                    </button>
                                ))}
                            </nav>

                            <button onClick={handleLogout} style={{ width: '100%', marginTop: '2.5rem', padding: '1rem', border: '1.5px solid #fee2e2', borderRadius: '18px', background: '#fff5f5', color: '#ef4444', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                                Sign Out
                            </button>
                        </div>

                        {/* Mini Stats Card */}
                        <div style={{ background: 'linear-gradient(135deg,#0f172a,#2430d9)', borderRadius: '32px', padding: '2rem', color: '#fff', boxShadow: '0 15px 35px rgba(37, 99, 235, 0.2)' }}>
                            <h4 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 700, opacity: 0.9 }}>Health Overview</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.2rem', borderRadius: '20px' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stats.completed || 0}</div>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7 }}>Visits</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.2rem', borderRadius: '20px' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stats.lab_completed || 0}</div>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7 }}>Lab Tests</div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <main>
                        {activeTab === 'profile' && (
                            <div style={{ animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                <div style={{ background: '#fff', borderRadius: '32px', padding: '3.5rem', border: '1px solid #f1f5f9', boxShadow: '0 15px 50px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>Personal Settings</h2>
                                            <p style={{ margin: '0.4rem 0 0', color: '#94a3b8', fontWeight: 500 }}>Update your identity and contact information</p>
                                        </div>
                                        {!isEditing && (
                                            <button onClick={handleEditToggle} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '14px', padding: '12px 28px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 8px 20px rgba(37,99,235,0.2)' }}>
                                                Update Profile
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2.5rem' }}>
                                        {[
                                            { label: 'First Name', val: profile?.first_name, key: 'first_name', edit: true },
                                            { label: 'Last Name', val: profile?.last_name, key: 'last_name', edit: true },
                                            { label: 'Primary Contact', val: profile?.contact_no || 'Not set', key: 'contact_no', edit: true },
                                            { label: 'Age', val: profile?.age ? `${profile.age} Years` : '—', key: 'age', type: 'number', edit: true },
                                            { label: 'Gender', val: profile?.gender === 'M' ? 'Male' : profile?.gender === 'F' ? 'Female' : '—', key: 'gender', type: 'select', edit: true },
                                            { label: 'Permanent Address', val: profile?.location || 'Not set', key: 'location', span: 2, edit: true },
                                        ].map((f, i) => (
                                            <div key={i} style={{ gridColumn: f.span ? `span ${f.span}` : 'auto' }}>
                                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.02em' }}>{f.label}</label>
                                                {isEditing && f.edit ? (
                                                    f.type === 'select' ? (
                                                        <select style={inputStyle} value={editForm[f.key]} onChange={e => setEditForm({...editForm, [f.key]: e.target.value})}>
                                                            <option value="">Select Gender</option>
                                                            <option value="M">Male</option>
                                                            <option value="F">Female</option>
                                                        </select>
                                                    ) : (
                                                        <input style={inputStyle} type={f.type || 'text'} value={editForm[f.key]} onChange={e => setEditForm({...editForm, [f.key]: e.target.value})} />
                                                    )
                                                ) : (
                                                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', background: '#f8fafc', padding: '16px 20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>{f.val}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {isEditing && (
                                        <div style={{ marginTop: '4rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                            <button onClick={handleEditToggle} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '12px 30px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer' }}>Discard</button>
                                            <button onClick={handleSaveProfile} disabled={saveLoading} style={{ background: '#059669', color: '#fff', border: 'none', padding: '12px 40px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(5,150,105,0.2)' }}>
                                                {saveLoading ? 'Syncing...' : 'Save Updates'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'appointments' && (
                            <div style={{ animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Doctor Visit History</h2>
                                    {completedAppts.length === 0 ? (
                                        <div style={{ background: '#fff', padding: '5rem 2rem', borderRadius: '32px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                                            <div style={{ background: '#f8fafc', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                                <ApptIcon />
                                            </div>
                                            <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: '1.1rem' }}>No completed clinic visits recorded.</p>
                                        </div>
                                    ) : (
                                        completedAppts.map(appt => (
                                            <div key={appt.id} onClick={() => setSelectedApptId(appt.id)} style={{ background: '#fff', borderRadius: '32px', padding: '2rem 2.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '3rem', cursor: 'pointer', transition: 'transform 0.2s' }}>
                                                <div style={{ width: '70px', height: '70px', borderRadius: '24px', background: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #e0f2fe' }}>
                                                    {appt.doctor?.image ? <img src={appt.doctor.image} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '24px' }} alt="" /> : <ApptIcon />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.2rem', marginBottom: '0.3rem' }}>Dr. {appt.doctor?.name}</div>
                                                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>{appt.doctor?.specialty_name} · {appt.doctor?.hospital?.name}</div>
                                                </div>
                                                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>{appt.date}</div>
                                                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600, marginTop: '0.2rem' }}>{appt.time}</div>
                                                </div>
                                                <Badge s={appt.status} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'labs' && (
                             <div style={{ animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Lab Test History</h2>
                                    {completedLabs.length === 0 ? (
                                        <div style={{ background: '#fff', padding: '5rem 2rem', borderRadius: '32px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                                            <div style={{ background: '#f0fdf4', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                                🔬
                                            </div>
                                            <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: '1.1rem' }}>No completed lab tests found.</p>
                                        </div>
                                    ) : (
                                        completedLabs.map(appt => (
                                            <div key={appt.id} style={{ background: '#fff', borderRadius: '32px', padding: '2rem 2.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '3rem', transition: 'transform 0.2s' }}>
                                                <div style={{ width: '70px', height: '70px', borderRadius: '24px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #ddd6fe', fontSize: '2rem' }}>
                                                    🧪
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.2rem', marginBottom: '0.3rem' }}>{appt.lab_test?.name}</div>
                                                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>{appt.lab_test?.location}</div>
                                                </div>
                                                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>{appt.date}</div>
                                                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600, marginTop: '0.2rem' }}>{appt.time}</div>
                                                </div>
                                                <Badge s={appt.status} />
                                            </div>
                                        ))
                                    )}
                                </div>
                             </div>
                        )}

                        {activeTab === 'orders' && <div style={{ animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}><CompletedOrders orders={orders} /></div>}
                    </main>
                </div>
            </div>
            {selectedApptId && <ApptDetailPanel apptId={selectedApptId} onClose={() => setSelectedApptId(null)} />}
            <style>{`
                @keyframes slideIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
            `}</style>
        </div>
    );
};


export default PatientProfile;
