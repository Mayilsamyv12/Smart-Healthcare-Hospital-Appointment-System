import React, { useState } from 'react';

const STEPS = { CREDENTIALS: 1, LAB_ID: 2, SUCCESS: 3 };

const getCookie = (name) => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : '';
};

const LabLogin = () => {
    const [step, setStep] = useState(STEPS.CREDENTIALS);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [labId, setLabId] = useState('');
    const [labName, setLabName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    // Step 1: Portal Login
    const handleCredentialLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const csrfToken = getCookie('csrftoken');
            const res = await fetch('/api/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError('Invalid credentials. Please contact administration.');
                return;
            }
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            setStep(STEPS.LAB_ID);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Lab ID Verification
    const handleLabIdVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const csrfToken = getCookie('csrftoken');
            const res = await fetch('/api/commerce/verify-lab-id/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-CSRFToken': csrfToken,
                },
                body: JSON.stringify({ lab_id: labId }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Invalid Lab ID.');
                return;
            }
            setLabName(data.lab_name);
            setStep(STEPS.SUCCESS);
            setTimeout(() => {
                window.location.href = '/lab-panel/';
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
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 14px',
                        background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2.2rem', boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
                    }}>🔬</div>
                    <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#0f172a' }}>
                        <span style={{ color: '#0ea5e9' }}>Lab</span>Portal
                    </h1>
                    <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                        Secure Diagnostic Management
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                        borderRadius: '9px', padding: '10px 14px', marginBottom: '18px',
                        fontSize: '0.875rem', display: 'flex', gap: '8px', alignItems: 'flex-start',
                    }}>
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                {step === STEPS.CREDENTIALS && (
                    <form onSubmit={handleCredentialLogin}>
                         <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Admin Username</label>
                            <input
                                type="text"
                                style={inputStyle}
                                placeholder="Enter username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required autoFocus
                            />
                        </div>

                        <div style={{ marginBottom: '28px' }}>
                            <label style={labelStyle}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    style={{ ...inputStyle, paddingRight: '46px' }}
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
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
                            {loading ? 'Verifying...' : 'Next Step →'}
                        </button>
                    </form>
                )}

                {step === STEPS.LAB_ID && (
                    <form onSubmit={handleLabIdVerify}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Enter Lab ID</label>
                            <input
                                type="text"
                                style={{
                                    ...inputStyle,
                                    textAlign: 'center',
                                    letterSpacing: '0.15em',
                                    fontSize: '1.25rem',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                }}
                                placeholder="e.g. LAB-1001"
                                value={labId}
                                onChange={e => setLabId(e.target.value.toUpperCase())}
                                required autoFocus
                            />
                        </div>

                        <button type="submit" style={btnPrimary} disabled={loading}>
                            {loading ? 'Verifying Lab ID...' : '🔓 Unlock Diagnostic Panel'}
                        </button>

                        <button type="button" onClick={() => setStep(STEPS.CREDENTIALS)} style={{
                             width: '100%', background: 'none', border: 'none', color: '#94a3b8',
                             marginTop: '15px', cursor: 'pointer', fontSize: '0.85rem'
                        }}>
                            ← Back to Credentials
                        </button>
                    </form>
                )}

                {step === STEPS.SUCCESS && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>✅</div>
                        <h2 style={{ color: '#16a34a', margin: '0 0 8px', fontSize: '1.35rem', fontWeight: 800 }}>
                            Lab Verified!
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
                            Welcome to <strong>{labName}</strong> dashboard.
                        </p>
                        <div style={{
                            width: '40px', height: '40px', border: '4px solid #f3f4f6',
                            borderTopColor: '#2563eb', borderRadius: '50%', margin: '0 auto',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <a href="/" style={{ color: '#94a3b8', fontSize: '0.83rem', textDecoration: 'none' }}>
                        ← Back to OneMeds Home
                    </a>
                </div>
            </div>
        </div>
    );
};

export default LabLogin;
