import React, { useState, useEffect, useRef } from 'react';
import './DoctorAdminPanel.css'; // Reusing doctor admin styles for consistency

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

const StatusBadge = ({ s }) => {
    const colors = {
        Pending: { bg: '#fff7ed', c: '#c2410c' },
        Booked: { bg: '#eff6ff', c: '#1d4ed8' },
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
   LAB SCHEDULE & AVAILABILITY MANAGER
   ═══════════════════════════════════════════════════════ */
const LabScheduleManager = ({ lab, onUpdate }) => {
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
        slot_duration_minutes: lab?.slot_duration_minutes || 30,
        patients_per_slot: lab?.patients_per_slot || 5,
        unavailable_dates: lab?.unavailable_dates || '',
        weekly_schedule: lab?.weekly_schedule && Object.keys(lab.weekly_schedule).length > 0
            ? lab.weekly_schedule
            : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].reduce((acc, d) => ({
                ...acc,
                [d]: {
                    start: lab?.shift_start_time?.substring(0, 5) || '09:00',
                    end: lab?.shift_end_time?.substring(0, 5) || '18:00',
                    active: (lab?.available_days || '').includes(d)
                }
            }), {})
    });

    const [selectedDateObj, setSelectedDateObj] = useState(dateRange[0]);
    const [saving, setSaving] = useState(false);

    // FIX: Sync form state when lab changes
    useEffect(() => {
        if (lab) {
            setForm({
                slot_duration_minutes: lab.slot_duration_minutes || 30,
                patients_per_slot: lab.patients_per_slot || 5,
                unavailable_dates: lab.unavailable_dates || '',
                weekly_schedule: lab.weekly_schedule && Object.keys(lab.weekly_schedule).length > 0
                    ? lab.weekly_schedule
                    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].reduce((acc, d) => ({
                        ...acc,
                        [d]: {
                            start: lab?.shift_start_time?.substring(0, 5) || '09:00',
                            end: lab?.shift_end_time?.substring(0, 5) || '18:00',
                            active: (lab?.available_days || '').includes(d)
                        }
                    }), {})
            });
        }
    }, [lab]);

    const isDateInactive = form.unavailable_dates.includes(selectedDateObj.dateStr);
    const dayConfig = form.weekly_schedule[selectedDateObj.dayAbbr] || { start: '09:00', end: '18:00', active: false };

    const toggleDateAvailability = (checked) => {
        const date = selectedDateObj.dateStr;
        let newList = form.unavailable_dates.split(',').map(d => d.trim()).filter(d => d);
        if (!checked) { if (!newList.includes(date)) newList.push(date); }
        else { newList = newList.filter(d => d !== date); }
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
            shift_end_time: (form.weekly_schedule['Mon']?.end || '18:00') + ':00',
        };

        try {
            const res = await apiFetch(`/api/commerce/labs/${lab.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('Lab schedule fully synchronized!');
                onUpdate();
            } else { alert('Error syncing schedule.'); }
        } catch (e) { alert('Network error.'); }
        finally { setSaving(false); }
    };

    return (
        <div className="admin-content-fade">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                <div className="patient-card">
                    <h3 className="rx-subtitle">7-Day Lab Operations</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {dateRange.map(d => {
                            const isExc = form.unavailable_dates.includes(d.dateStr);
                            const isTempActive = form.weekly_schedule[d.dayAbbr]?.active;
                            const statusColor = (isTempActive && !isExc) ? '#10b981' : '#ef4444';
                            const isSelected = selectedDateObj.dateStr === d.dateStr;
                            return (
                                <button key={d.dateStr} onClick={() => setSelectedDateObj(d)} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '14px 18px', border: isSelected ? '2px solid #0ea5e9' : '1.5px solid #e2e8f0',
                                    borderRadius: '12px', background: isSelected ? '#f0f9ff' : '#fff', cursor: 'pointer'
                                }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '0.75rem', color: isSelected ? '#0ea5e9' : '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>{d.dayName}</div>
                                        <div style={{ fontSize: '1.05rem', color: isSelected ? '#0ea5e9' : '#1e293b', fontWeight: 600 }}>{d.label}</div>
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

                <div className="patient-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 className="rx-subtitle" style={{ margin: 0 }}>{selectedDateObj.dayName} Settings</h3>
                            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{selectedDateObj.label} Lab Slots</span>
                        </div>
                        <label className="mode-toggle">
                            <input type="checkbox" checked={dayConfig.active && !isDateInactive} onChange={e => {
                                if (!dayConfig.active) updateDayConfig('active', true);
                                toggleDateAvailability(e.target.checked);
                            }} />
                            <span className="mode-slider"></span>
                        </label>
                    </div>

                    {(!dayConfig.active || isDateInactive) ? (
                        <div style={{ padding: '60px 40px', textAlign: 'center', background: '#fff1f2', borderRadius: '16px', color: '#e11d48', border: '1.5px dashed #fecdd3' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔬</div>
                            <strong>Lab is Closed on this Date</strong>
                            <p style={{ fontSize: '0.9rem', color: '#fb7185' }}>Patients cannot book slots on {selectedDateObj.label}.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '24px' }}>
                            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-section">
                                        <label className="form-label">Shift Start</label>
                                        <input type="time" className="premium-input" value={dayConfig.start} onChange={e => updateDayConfig('start', e.target.value)} />
                                    </div>
                                    <div className="form-section">
                                        <label className="form-label">Shift End</label>
                                        <input type="time" className="premium-input" value={dayConfig.end} onChange={e => updateDayConfig('end', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-section">
                                    <label className="form-label">Slot Duration (Mins)</label>
                                    <input type="number" className="premium-input" value={form.slot_duration_minutes} onChange={e => setForm({ ...form, slot_duration_minutes: parseInt(e.target.value) || 30 })} />
                                </div>
                                <div className="form-section">
                                    <label className="form-label">Max Patients/Slot</label>
                                    <input type="number" className="premium-input" value={form.patients_per_slot} onChange={e => setForm({ ...form, patients_per_slot: parseInt(e.target.value) || 1 })} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="action-btn prescribe" style={{ padding: '14px 60px', borderRadius: '12px', background: '#0ea5e9' }} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Sync Lab Schedule'}
                </button>
            </div>
        </div>
    );
};

const LabAdminPanel = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedLabId, setSelectedLabId] = useState(null);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/commerce/dashboard/');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                if (data.labs.length > 0) setSelectedLabId(data.labs[0].id);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const updateApptStatus = async (id, status) => {
        const res = await apiFetch(`/api/commerce/lab-appointments/${id}/update_status/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) fetchDashboard();
    };

    const currentLab = stats?.labs.find(l => l.id === selectedLabId);

    const renderDashboard = () => (
        <div className="admin-content-fade">
            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                <div className="stat-card" style={{ background: '#fff7ed' }}>
                    <div className="stat-number">{stats?.pending_count || 0}</div>
                    <div className="stat-label">Pending Bookings</div>
                </div>
                <div className="stat-card" style={{ background: '#eff6ff' }}>
                    <div className="stat-number">{stats?.today_appointments || 0}</div>
                    <div className="stat-label">Today's Tests</div>
                </div>
                <div className="stat-card" style={{ background: '#f0fdf4' }}>
                    <div className="stat-number">{stats?.completed_count || 0}</div>
                    <div className="stat-label">Completed Tests</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{stats?.total_appointments || 0}</div>
                    <div className="stat-label">Total Appointments</div>
                </div>
            </div>

            <h3 className="section-title">Recent Lab Appointments</h3>
            <div className="custom-table-container">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Patient</th>
                            <th>Lab / Test</th>
                            <th>Schedule</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats?.recent_appointments.map(a => (
                            <tr key={a.id}>
                                <td className="patient-cell">
                                    <div className="avatar-circle">{a.user.username[0].toUpperCase()}</div>
                                    <div><strong>{a.user.username}</strong><div style={{ fontSize: '0.7rem' }}>{a.user.contact_no}</div></div>
                                </td>
                                <td><strong>{a.lab_test.name}</strong></td>
                                <td>{a.date} · {a.time}</td>
                                <td><StatusBadge s={a.status} /></td>
                                <td>
                                    <select value={a.status} onChange={(e) => updateApptStatus(a.id, e.target.value)} style={{ padding: '4px', borderRadius: '6px' }}>
                                        <option value="Pending">Pending</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderAppointments = () => (
        <div className="admin-content-fade">
            <h3 className="section-title">All Lab Appointments</h3>
            <div className="custom-table-container">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Patient</th>
                            <th>Lab / Test</th>
                            <th>Schedule</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats?.recent_appointments.map(a => (
                            <tr key={a.id}>
                                <td className="patient-cell">
                                    <div className="avatar-circle">{a.user.username[0].toUpperCase()}</div>
                                    <div><strong>{a.user.username}</strong><div style={{ fontSize: '0.7rem' }}>{a.user.contact_no}</div></div>
                                </td>
                                <td><strong>{a.lab_test.name}</strong></td>
                                <td>{a.date} · {a.time}</td>
                                <td><StatusBadge s={a.status} /></td>
                                <td>
                                    <select value={a.status} onChange={(e) => updateApptStatus(a.id, e.target.value)} style={{ padding: '4px', borderRadius: '6px' }}>
                                        <option value="Pending">Pending</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const handleLogout = async () => {
        try {
            await apiFetch('/users/logout/', { method: 'POST' });
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/lab-login/';
        } catch (e) {
            window.location.href = '/lab-login/';
        }
    };

    return (
        <div className="doctor-admin-wrapper">
             <aside className="admin-sidebar" style={{ background: '#0f172a' }}>
                <div className="admin-brand">
                    <span style={{ color: '#0ea5e9' }}>{stats?.current_lab_id ? 'Local' : 'Global'}</span>
                    <span>LabAdmin</span>
                </div>
                <nav className="admin-nav">
                    <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Overview</button>
                    <button className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>Lab Appointments</button>
                    <button className={`nav-item ${activeTab === 'scheduling' ? 'active' : ''}`} onClick={() => setActiveTab('scheduling')}>Lab Scheduling</button>
                </nav>
                <div className="admin-sidebar-footer">
                    <button className="nav-item" onClick={handleLogout} style={{ color: '#fb7185' }}>Logout</button>
                    <button className="nav-item" onClick={() => window.location.href = '/'}>Exit Portal</button>
                </div>
            </aside>

            <main className="admin-main-area">
                <header className="admin-topbar">
                    <div className="greeting">
                        <h2>{activeTab === 'dashboard' ? 'Lab Dashboard' : activeTab === 'scheduling' ? 'Lab Scheduling' : 'Lab Appointments'}</h2>
                        <p>{stats?.current_lab_id ? `Managing ${currentLab?.name || 'Laboratory'}` : 'Manage all diagnostic tests and operational hours.'}</p>
                    </div>
                </header>

                <div className="admin-dynamic-content">
                    {loading ? <div style={{ textAlign: 'center', padding: '100px' }}>Loading...</div> : (
                        <>
                            {activeTab === 'dashboard' && renderDashboard()}
                            {activeTab === 'appointments' && renderAppointments()}
                            {activeTab === 'scheduling' && (
                                <div className="admin-content-fade">
                                    {!stats?.current_lab_id && (
                                        <div style={{ marginBottom: '2rem' }}>
                                            <label style={{ fontWeight: 700, color: '#64748b', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>SELECT LABORATORY</label>
                                            <select value={selectedLabId} onChange={e => setSelectedLabId(parseInt(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }}>
                                                {stats?.labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {currentLab && <LabScheduleManager lab={currentLab} onUpdate={fetchDashboard} />}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default LabAdminPanel;
