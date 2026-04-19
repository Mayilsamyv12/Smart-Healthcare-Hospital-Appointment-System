import React, { useState, useEffect, useRef } from 'react';
import './DoctorAdminPanel.css';

/* ─── Helper ─────────────────────────────────────────── */
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
        Authorization: token ? `Bearer ${token}` : undefined,
    };
    if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
    }
    return fetch(url, { ...opts, headers, credentials: 'include' });
};

/* ─── Sub-components ──────────────────────────────────── */
const StatusBadge = ({ s }) => {
    const colors = {
        Pending: { bg: '#fff7ed', c: '#c2410c' },
        Completed: { bg: '#f0fdf4', c: '#15803d' },
        Cancelled: { bg: '#f8fafc', c: '#64748b' },
    };
    const st = colors[s] || colors.Cancelled;
    return (
        <span style={{ background: st.bg, color: st.c, borderRadius: '20px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
            {s}
        </span>
    );
};

/* ═══════════════════════════════════════════════════════
   SCHEDULE & AVAILABILITY MANAGER
═══════════════════════════════════════════════════════ */
const ScheduleManager = ({ doctor, onUpdate }) => {
    // Generate Next 7 Days Range
    const today = new Date();
    const dateRange = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayAbbr = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { dateStr, dayAbbr, dayName, label };
    });

    const [form, setForm] = useState({
        slot_duration_minutes: doctor?.slot_duration_minutes || 15,
        patients_per_slot: doctor?.patients_per_slot || 3,
        unavailable_dates: doctor?.unavailable_dates || '',
        weekly_schedule: doctor?.weekly_schedule && Object.keys(doctor.weekly_schedule).length > 0
            ? doctor.weekly_schedule
            : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].reduce((acc, d) => ({
                ...acc,
                [d]: {
                    start: doctor?.shift_start_time?.substring(0, 5) || '09:00',
                    end: doctor?.shift_end_time?.substring(0, 5) || '17:00',
                    active: (doctor?.available_days || '').includes(d)
                }
            }), {})
    });

    const [selectedDateObj, setSelectedDateObj] = useState(dateRange[0]);
    const [saving, setSaving] = useState(false);

    // Derived State: Is current selected date active?
    // Check if it's in the weekly template AND NOT in the unavailable_dates list
    const isDateInactive = form.unavailable_dates.includes(selectedDateObj.dateStr);
    const dayConfig = form.weekly_schedule[selectedDateObj.dayAbbr] || { start: '09:00', end: '17:00', active: false };

    const toggleDateAvailability = (checked) => {
        const date = selectedDateObj.dateStr;
        let newList = form.unavailable_dates.split(',').map(d => d.trim()).filter(d => d);

        if (!checked) {
            // Mark as Unavailable (Add to list)
            if (!newList.includes(date)) newList.push(date);
        } else {
            // Mark as Available (Remove from list)
            newList = newList.filter(d => d !== date);
        }

        setForm(prev => ({ ...prev, unavailable_dates: newList.join(', ') }));
    };

    const updateDayConfig = (field, value) => {
        setForm(prev => ({
            ...prev,
            weekly_schedule: {
                ...prev.weekly_schedule,
                [selectedDateObj.dayAbbr]: { ...prev.weekly_schedule[selectedDateObj.dayAbbr], [field]: value }
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        const activeDays = Object.entries(form.weekly_schedule)
            .filter(([_, cfg]) => cfg.active)
            .map(([d]) => d)
            .join(', ');

        const payload = {
            ...form,
            available_days: activeDays,
            shift_start_time: (form.weekly_schedule['Mon']?.start || '09:00') + ':00',
            shift_end_time: (form.weekly_schedule['Mon']?.end || '17:00') + ':00',
        };

        try {
            const res = await apiFetch('/api/doctor/profile/', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('Clinic schedule and date exceptions fully synchronized!');
                onUpdate();
            } else {
                alert('Error syncing schedule.');
            }
        } catch (e) {
            alert('Network error.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-content-fade">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                {/* Left: 7-Day Date Selection */}
                <div className="patient-card">
                    <h3 className="rx-subtitle">7-Day Operations</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                        Manage availability for specific dates in the coming week.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {dateRange.map(d => {
                            const isExc = form.unavailable_dates.includes(d.dateStr);
                            const isTempActive = form.weekly_schedule[d.dayAbbr]?.active;
                            const statusColor = (isTempActive && !isExc) ? '#10b981' : '#ef4444';
                            const isSelected = selectedDateObj.dateStr === d.dateStr;

                            return (
                                <button key={d.dateStr}
                                    onClick={() => setSelectedDateObj(d)}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '14px 18px', borderRadius: '12px', transition: 'all 0.2s',
                                        border: isSelected ? '2px solid #6366f1' : '1.5px solid #e2e8f0',
                                        background: isSelected ? '#f5f3ff' : '#fff',
                                        boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none',
                                        cursor: 'pointer'
                                    }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '0.75rem', color: isSelected ? '#6366f1' : '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>{d.dayName}</div>
                                        <div style={{ fontSize: '1.05rem', color: isSelected ? '#6366f1' : '#1e293b', fontWeight: 600 }}>{d.label}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.75rem', color: statusColor, fontWeight: 700 }}>{(isTempActive && !isExc) ? 'OPEN' : 'CLOSED'}</span>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusColor }} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Date-Specific Configuration */}
                <div className="patient-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 className="rx-subtitle" style={{ margin: 0 }}>{selectedDateObj.dayName} Settings</h3>
                            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{selectedDateObj.label} · Template Mapping</span>
                        </div>
                        <label className="mode-toggle">
                            <input type="checkbox" checked={dayConfig.active && !isDateInactive}
                                onChange={e => {
                                    // If template is off, we must turn it on first
                                    if (!dayConfig.active) {
                                        updateDayConfig('active', true);
                                    }
                                    toggleDateAvailability(e.target.checked);
                                }} />
                            <span className="mode-slider"></span>
                        </label>
                    </div>

                    {(!dayConfig.active || isDateInactive) ? (
                        <div style={{ padding: '60px 40px', textAlign: 'center', background: '#fff1f2', borderRadius: '16px', color: '#e11d48', border: '1.5px dashed #fecdd3' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📅</div>
                            <strong style={{ display: 'block', marginBottom: '5px' }}>Date is Currently Closed</strong>
                            <p style={{ fontSize: '0.9rem', color: '#fb7185' }}>
                                Patients cannot book appointments on <strong>{selectedDateObj.label}</strong>.
                                {isDateInactive ? " (Individual date exception active)" : " (Weekly template is inactive for this day)"}
                            </p>
                            {isDateInactive && (
                                <button className="action-btn outline" style={{ marginTop: '1rem', background: '#fff' }} onClick={() => toggleDateAvailability(true)}>
                                    Re-open this Specific Date
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '24px' }}>
                            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <span>🕒 SHIFT PROTOCOL</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-section">
                                        <label className="form-label">Shift Start</label>
                                        <input type="time" className="premium-input" value={dayConfig.start}
                                            onChange={e => updateDayConfig('start', e.target.value)} />
                                    </div>
                                    <div className="form-section">
                                        <label className="form-label">Shift End</label>
                                        <input type="time" className="premium-input" value={dayConfig.end}
                                            onChange={e => updateDayConfig('end', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-section">
                                    <label className="form-label">Slot Duration (Mins)</label>
                                    <input type="number" className="premium-input" value={form.slot_duration_minutes}
                                        onChange={e => setForm({ ...form, slot_duration_minutes: parseInt(e.target.value) || 15 })} />
                                </div>
                                <div className="form-section">
                                    <label className="form-label">Patients Per Slot</label>
                                    <input type="number" className="premium-input" value={form.patients_per_slot}
                                        onChange={e => setForm({ ...form, patients_per_slot: parseInt(e.target.value) || 1 })} />
                                </div>
                            </div>

                            <div style={{ marginTop: '1rem' }}>
                                <h4 style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    📋 Master Leave Checklist
                                </h4>
                                <textarea className="premium-textarea" rows={3} placeholder="Format: YYYY-MM-DD, YYYY-MM-DD"
                                    value={form.unavailable_dates} onChange={e => setForm({ ...form, unavailable_dates: e.target.value })} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid #f1f5f9', paddingTop: '1.5rem' }}>
                <button className="action-btn prescribe" style={{ padding: '14px 60px', borderRadius: '12px', fontSize: '1rem', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)' }}
                    onClick={handleSave} disabled={saving}>
                    {saving ? 'Synchronizing Live Schedule...' : 'Sync & Save Schedule'}
                </button>
            </div>
        </div>
    );
};
const DoctorAdminPanel = ({ context }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [doctorInfo, setDoctorInfo] = useState(null);

    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await apiFetch('/users/logout/', { method: 'POST' });
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/doctor-login/';
        } catch (e) {
            window.location.href = '/doctor-login/';
        }
    };

    useEffect(() => {
        fetchAll(true);

        // Auto-refresh interval for real-time updates fallback
        const intervalId = setInterval(() => {
            fetchAll(false); // fetch quietly
        }, 10000);
        return () => clearInterval(intervalId);
    }, []);

    const fetchAll = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [dashRes, apptRes, profRes] = await Promise.all([
                apiFetch('/api/doctor/dashboard/'),
                apiFetch('/api/appointments/'),
                apiFetch('/api/doctor/profile/'),
            ]);

            if (dashRes.ok) {
                const d = await dashRes.json();
                setDoctorInfo(d.doctor);
                setIsAdmin(d.is_admin || false);
            }
            if (apptRes.ok) {
                const d = await apptRes.json();
                const newAppts = Array.isArray(d) ? d : (d.results || []);

                // Show toast if status changed
                if (!showLoading && appointments.length > 0) {
                    newAppts.forEach(newAppt => {
                        const oldAppt = appointments.find(a => a.id === newAppt.id);
                        if (oldAppt && oldAppt.status !== newAppt.status && oldAppt.last_updated_by !== 'Doctor') {
                            showToast(`Appointment #${newAppt.id} for ${newAppt.patient_name || newAppt.user?.username} is now ${newAppt.status}`);
                        }
                    });
                }

                setAppointments(newAppts);
            }

            if (profRes.ok) {
                setDoctorProfile(await profRes.json());
            }
        } catch (e) { console.error(e); }
        finally { if (showLoading) setLoading(false); }
    };

    // Toast Notification System
    const [toastMsg, setToastMsg] = useState('');
    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 5000);
    };

    const [doctorProfile, setDoctorProfile] = useState(null);





    const updateStatus = async (apptId, newStatus) => {
        // Optimistically update local UI
        setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: newStatus } : a));

        const res = await apiFetch(`/api/appointments/${apptId}/update_status/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) {
            alert('Failed to update status.');
            fetchAll(); // Revert back
        }
    };

    /* ─────── Stats ─────── */
    const apptsList = Array.isArray(appointments) ? appointments : [];
    const pending = apptsList.filter(a => a?.status === 'Pending').length;
    const completed = apptsList.filter(a => a?.status === 'Completed').length;
    const cancelled = apptsList.filter(a => a?.status === 'Cancelled').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = apptsList.filter(a => a?.date === todayStr && a?.status !== 'Cancelled').length;

    /* ─────── Render sections ─────── */
    const renderDashboard = () => (
        <div className="admin-content-fade">
            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                {[
                    ['', 'Today\'s Patients', todayCount],
                    ['', 'Pending', pending, '#fff7ed'],
                    ['', 'Completed', completed, '#eff6ff'],
                    ['', 'Cancelled', cancelled, '#fef2f2']
                ].map(([icon, label, val, bg]) => (
                    <div key={label} className="stat-card" style={{ background: bg || '#fff' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
                        <div className="stat-number">{val || 0}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>{label}</div>
                    </div>
                ))}
            </div>
            {renderAppointmentTable(apptsList.filter(a => a?.status !== 'Cancelled').slice(0, 8))}
        </div>
    );

    const renderAppointments = () => (
        <div className="admin-content-fade">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {['All', 'Pending', 'Completed', 'Cancelled'].map(f => (
                    <button key={f}
                        onClick={() => setApptFilter(f)}
                        style={{
                            padding: '6px 14px', borderRadius: '20px', border: '1.5px solid', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                            background: apptFilter === f ? '#6366f1' : '#f8fafc',
                            color: apptFilter === f ? '#fff' : '#475569',
                            borderColor: apptFilter === f ? '#6366f1' : '#e2e8f0',
                        }}>{f}</button>
                ))}
            </div>
            {renderAppointmentTable(filteredAppts)}
        </div>
    );

    const [apptFilter, setApptFilter] = useState('All');
    const filteredAppts = apptFilter === 'All' ? apptsList : apptsList.filter(a => a?.status === apptFilter);

    const renderAppointmentTable = (list) => (
        <>
            <h3 className="section-title">Patient Consultations</h3>
            <div className="custom-table-container">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Patient</th>
                            {isAdmin && <th>Doctor</th>}
                            <th>Slot</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.length === 0 && (
                            <tr><td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No appointments found.</td></tr>
                        )}
                        {list.map(appt => (
                            <tr key={appt?.id || Math.random()}>
                                <td className="patient-cell">
                                    <div className="avatar-circle">{(appt.patient_name || appt.user?.username || 'P')[0].toUpperCase()}</div>
                                    <div>
                                        <strong>{appt.patient_name || appt.user?.username}</strong>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Age: {appt.patient_age || '—'}</div>
                                    </div>
                                </td>
                                {isAdmin && (
                                    <td>
                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{appt.doctor?.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{appt.doctor?.hospital?.name}</div>
                                    </td>
                                )}
                                <td>
                                    <span style={{ fontWeight: 600 }}>{appt.time}</span>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{appt.date}</div>
                                </td>

                                <td>
                                    <select
                                        value={appt.status}
                                        onChange={(e) => updateStatus(appt.id, e.target.value)}
                                        style={{
                                            padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1',
                                            fontSize: '0.78rem', fontWeight: 600, background: '#fff', color: '#334155', cursor: 'pointer', outline: 'none'
                                        }}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {/* Reduced Actions */}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );



    /* ─── Sidebar nav items ─── */
    const navItems = [
        { key: 'dashboard', label: 'Overview' },
        { key: 'appointments', label: 'Appointments' },
        { key: 'scheduling', label: 'Scheduling' },
    ];

    return (
        <div className="doctor-admin-wrapper">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-brand"><span className="brand-accent">Doc</span>Admin</div>
                {doctorInfo && (
                    <div className="sidebar-profile">
                        <div className="sidebar-avatar">
                            {doctorInfo.name?.[0]?.toUpperCase() || 'D'}
                        </div>
                        <div className="sidebar-info">
                            <div className="doctor-name">Dr. {doctorInfo.name}</div>
                            <div className="doctor-specialty">{doctorInfo.specialty_name}</div>
                        </div>
                    </div>
                )}
                <nav className="admin-nav">
                    {navItems.map(n => (
                        <button key={n.key}
                            className={`nav-item ${activeTab === n.key ? 'active' : ''}`}
                            onClick={() => { setActiveTab(n.key); }}>
                            <span className="icon">{n.icon}</span>{n.label}
                        </button>
                    ))}
                </nav>
                <div className="admin-sidebar-footer">
                    <button className="nav-item text-danger" onClick={() => window.location.href = '/'}>
                        <span className="icon"></span>Exit Portal
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="admin-main-area">
                <header className="admin-topbar">
                    <div className="greeting">
                        <h2>{navItems.find(n => n.key === activeTab)?.label || 'Overview'}</h2>
                        <p>Manage consultations, patient schedules & clinic availability.</p>
                    </div>
                    <div className="topbar-actions">


                        <div className="profile-menu-container" ref={profileMenuRef}>
                            <div className="doctor-avatar" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                                {doctorInfo?.name?.[0]?.toUpperCase() || 'DR'}
                            </div>

                            {showProfileMenu && (
                                <div className="profile-dropdown">
                                    <div className="dropdown-header">
                                        <div className="doctor-name">Dr. {doctorInfo?.name}</div>
                                        <div className="doctor-email">{doctorInfo?.specialty_name}</div>
                                    </div>
                                    <ul className="dropdown-list">
                                        <li className="logout-item" onClick={handleLogout}>
                                            <span className="icon"></span> Logout
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="admin-dynamic-content">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                            <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
                            Loading your workspace…
                        </div>
                    ) : (
                        <>
                            {activeTab === 'dashboard' && renderDashboard()}
                            {activeTab === 'appointments' && renderAppointments()}

                            {activeTab === 'scheduling' && (
                                <div className="admin-content-fade">
                                    <h3 className="section-title">Schedule & Availability</h3>
                                    <ScheduleManager doctor={doctorProfile} onUpdate={fetchAll} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>



            {/* Real-time Toast Notification */}
            {toastMsg && (
                <div style={{
                    position: 'fixed', bottom: '20px', left: '20px', background: '#1e293b', color: '#fff',
                    padding: '16px 24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600,
                    animation: 'slideInLeft 0.3s ease-out'
                }}>
                    <span style={{ fontSize: '1.4rem' }}></span>
                    {toastMsg}
                    <button onClick={() => setToastMsg('')} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', marginLeft: '10px', fontSize: '1.2rem' }}>×</button>
                    <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
                </div>
            )}
        </div>
    );
};


export default DoctorAdminPanel;
