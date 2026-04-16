import React, { useState } from 'react';

const STEPS = { CREDENTIALS: 1, DOCTOR_ID: 2, SUCCESS: 3 };

const getCookie = (name) => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : '';
};

const DoctorLogin = () => {
    const [step, setStep] = useState(STEPS.CREDENTIALS);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [doctorId, setDoctorId] = useState('');
    const [doctorName, setDoctorName] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    // ── Step 1: Shared portal credentials ──────────────────
    const handleCredentialLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const csrfToken = getCookie('csrftoken');
            const res = await fetch('/api/auth/doctor-login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || (data.hint ? `${data.error} — ${data.hint}` : 'Login failed.'));
                return;
            }
            setAccessToken(data.access);
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            setStep(STEPS.DOCTOR_ID);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Doctor ID verification ─────────────────────
    const handleDoctorIdVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const csrfToken = getCookie('csrftoken');
            const res = await fetch('/api/auth/verify-doctor-id/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'X-CSRFToken': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({ doctor_id: doctorId }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Invalid Doctor ID.');
                return;
            }
            setDoctorName(data.doctor_name || '');
            setStep(STEPS.SUCCESS);
            setTimeout(() => {
                window.location.href = data.panel_url || '/doctor-panel/';
            }, 1800);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '13px 16px', fontSize: '0.97rem',
        border: '1.5px solid #e2e8f0', borderRadius: '10px',
        outline: 'none', boxSizing: 'border-box', color: '#1e293b',
        background: '#f8fafc', transition: 'border-color 0.2s',
        fontFamily: 'inherit',
    };
    const btnPrimary = {
        width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700,
        background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0ea5e9, #2563eb)',
        color: '#fff', border: 'none', borderRadius: '10px',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s', letterSpacing: '0.01em',
    };
    const btnGhost = {
        ...btnPrimary,
        background: '#f1f5f9', color: '#475569', fontWeight: 500, marginTop: '10px',
    };
    const labelStyle = {
        display: 'block', marginBottom: '6px',
        fontSize: '0.875rem', fontWeight: 600, color: '#374151',
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #0369a1 100%)',
            fontFamily: "'Inter', sans-serif", padding: '20px',
        }}>
            <div style={{
                background: '#fff', borderRadius: '22px', padding: '44px 40px',
                width: '100%', maxWidth: '430px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            }}>

                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: '26px' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 14px',
                        background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
                    }}>🩺</div>
                    <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#0f172a' }}>
                        <span style={{ color: '#0ea5e9' }}>One</span>Meds
                    </h1>
                    <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                        Doctor Portal — Secure Access
                    </p>
                </div>

                {/* Step Progress Bar */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{
                            flex: 1, height: '4px', borderRadius: '4px',
                            background: step >= s
                                ? 'linear-gradient(90deg, #0ea5e9, #2563eb)'
                                : '#e2e8f0',
                            transition: 'background 0.4s',
                        }} />
                    ))}
                </div>

                {/* Error Banner */}
                {error && (
                    <div style={{
                        background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                        borderRadius: '9px', padding: '10px 14px', marginBottom: '18px',
                        fontSize: '0.875rem', display: 'flex', gap: '8px', alignItems: 'flex-start',
                    }}>
                        <span style={{ flexShrink: 0 }}>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* ── STEP 1: Shared Portal Login ── */}
                {step === STEPS.CREDENTIALS && (
                    <form onSubmit={handleCredentialLogin}>
                        <div style={{ marginBottom: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            Step 1 of 2 — Portal Access
                        </div>
                        <h2 style={{ margin: '4px 0 6px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                            Doctor Portal Login
                        </h2>

                        {/* Info callout */}
                        <div style={{
                            background: '#f0f9ff', border: '1px solid #bae6fd',
                            borderRadius: '9px', padding: '10px 14px', marginBottom: '22px',
                            fontSize: '0.83rem', color: '#0369a1', lineHeight: 1.5,
                        }}>
                            <strong>ℹ️ Shared Login:</strong> All doctors use the same portal username &amp; password,
                            provided by the Main Admin. Your personal Doctor ID is entered in Step 2.
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Portal Username</label>
                            <input
                                id="doctor-username"
                                type="text"
                                style={inputStyle}
                                placeholder="Enter portal username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required autoFocus
                                onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Portal Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="doctor-password"
                                    type={showPass ? 'text' : 'password'}
                                    style={{ ...inputStyle, paddingRight: '46px' }}
                                    placeholder="Enter portal password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                                    position: 'absolute', right: '12px', top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: '1.05rem', color: '#94a3b8',
                                }}>
                                    {showPass ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button type="submit" style={btnPrimary} disabled={loading}>
                            {loading ? 'Verifying...' : 'Continue →'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '18px' }}>
                            <a href="/" style={{ color: '#94a3b8', fontSize: '0.83rem', textDecoration: 'none' }}>
                                ← Back to OneMeds
                            </a>
                        </div>
                    </form>
                )}

                {/* ── STEP 2: Unique Doctor ID ── */}
                {step === STEPS.DOCTOR_ID && (
                    <form onSubmit={handleDoctorIdVerify}>
                        <div style={{ marginBottom: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            Step 2 of 2 — Your Workspace
                        </div>
                        <h2 style={{ margin: '4px 0 6px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                            Enter Your Doctor ID
                        </h2>
                        <p style={{ margin: '0 0 22px', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
                            Your unique Doctor ID was assigned by the Main Admin when your profile was created.
                            Each doctor has a <strong>different ID</strong> — this is what grants you access to your own workspace.
                        </p>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Doctor ID</label>
                            <input
                                id="doctor-id-input"
                                type="text"
                                style={{
                                    ...inputStyle,
                                    textAlign: 'center',
                                    letterSpacing: '0.18em',
                                    fontSize: '1.2rem',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                }}
                                placeholder="e.g. DOC-1001"
                                value={doctorId}
                                onChange={e => setDoctorId(e.target.value.toUpperCase())}
                                required
                                maxLength={12}
                                autoFocus
                                onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>

                        <button type="submit" style={btnPrimary} disabled={loading}>
                            {loading ? 'Verifying ID...' : '🔓 Unlock My Workspace'}
                        </button>

                        <button
                            type="button"
                            style={btnGhost}
                            onClick={() => { setStep(STEPS.CREDENTIALS); setError(''); setDoctorId(''); }}
                        >
                            ← Back to Login
                        </button>
                    </form>
                )}

                {/* ── STEP 3: Success ── */}
                {step === STEPS.SUCCESS && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '14px' }}>✅</div>
                        <h2 style={{ color: '#16a34a', margin: '0 0 8px', fontSize: '1.35rem', fontWeight: 800 }}>
                            Workspace Unlocked!
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '6px' }}>
                            {doctorName ? `Welcome, Dr. ${doctorName}` : 'Welcome, Doctor'}
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '24px' }}>
                            Redirecting to your portal...
                        </p>
                        <div style={{
                            width: '44px', height: '44px',
                            border: '4px solid #e2e8f0', borderTopColor: '#2563eb',
                            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                            margin: '0 auto',
                        }} />
                    </div>
                )}

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                `}</style>
            </div>
        </div>
    );
};

export default DoctorLogin;
