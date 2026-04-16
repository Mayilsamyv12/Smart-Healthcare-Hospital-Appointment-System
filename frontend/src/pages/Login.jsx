import React, { useState, useRef, useEffect } from 'react';

// ── Shared OTP Input Component ──
const OtpInput = ({ value, onChange }) => {
    const inputs = useRef([]);
    const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

    const handleKeyDown = (e, idx) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            const next = [...digits];
            if (next[idx]) {
                next[idx] = '';
                onChange(next.join(''));
            } else if (idx > 0) {
                next[idx - 1] = '';
                onChange(next.join(''));
                inputs.current[idx - 1]?.focus();
            }
        }
    };

    const handleInput = (e, idx) => {
        const val = e.target.value.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[idx] = val;
        onChange(next.join(''));
        if (val && idx < 5) inputs.current[idx + 1]?.focus();
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        onChange(pasted.padEnd(6, '').slice(0, 6));
        if (pasted.length > 0) inputs.current[Math.min(pasted.length - 1, 5)]?.focus();
    };

    return (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '24px 0' }}>
            {digits.map((d, i) => (
                <input
                    key={i}
                    ref={el => inputs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleInput(e, i)}
                    onKeyDown={e => handleKeyDown(e, i)}
                    onPaste={handlePaste}
                    style={{
                        width: '52px', height: '64px',
                        textAlign: 'center', fontSize: '1.8rem', fontWeight: 800,
                        border: d ? '2px solid #2563eb' : '2px solid #e2e8f0',
                        borderRadius: '16px', outline: 'none',
                        background: d ? '#eff6ff' : '#f8fafc',
                        color: '#1e293b', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: d ? '0 0 0 4px rgba(37, 99, 235, 0.1)' : 'none'
                    }}
                />
            ))}
        </div>
    );
};

// ── Countdown Timer Component ──
const Countdown = ({ seconds, onDone }) => {
    const [left, setLeft] = useState(seconds);
    useEffect(() => { setLeft(seconds); }, [seconds]);
    useEffect(() => {
        if (left <= 0) { onDone?.(); return; }
        const t = setTimeout(() => setLeft(l => l - 1), 1000);
        return () => clearTimeout(t);
    }, [left]);
    return (
        <span style={{ color: left < 10 ? '#ef4444' : '#2563eb', fontWeight: 700 }}>
            {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
        </span>
    );
};

// ── Main Login Component ──
const LoginPage = () => {
    const [step, setStep] = useState('identifier'); // 'identifier' | 'otp'
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [canResend, setCanResend] = useState(false);
    const [countdownKey, setCountdownKey] = useState(0);

    const csrfToken = document.cookie
        .split('; ')
        .find(r => r.startsWith('csrftoken='))
        ?.split('=')[1] || '';

    const apiPost = async (url, data) => {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body: JSON.stringify(data),
        });
    };

    const handleRequestOtp = async (e) => {
        e?.preventDefault();
        if (!identifier.trim()) { setError('Please enter your email or phone.'); return; }
        setLoading(true); setError(''); setInfo('');
        try {
            const res = await apiPost('/users/api/send-otp/', { identifier });
            const data = await res.json().catch(() => ({ error: 'Invalid server response.' }));
            if (res.ok) {
                setStep('otp');
                setOtp('');
                setCanResend(false);
                setCountdownKey(k => k + 1);
                setInfo(`OTP Sent to ${identifier}`);
            } else {
                setError(data.error || 'Failed to send OTP.');
            }
        } catch (err) { 
            console.error(err);
            setError('Connection failed. Please check if the server is running.'); 
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e?.preventDefault();
        if (otp.length < 6) { setError('Enter full 6-digit code.'); return; }
        setLoading(true); setError('');
        try {
            const res = await apiPost('/users/api/verify-otp/', { identifier, otp });
            const data = await res.json().catch(() => ({ error: 'Invalid server response.' }));
            if (res.ok) {
                // Check if we need to store tokens for local storage (if using SPA mode)
                if (data.access) {
                    localStorage.setItem('access_token', data.access);
                    localStorage.setItem('refresh_token', data.refresh);
                }
                window.location.href = data.redirect || '/';
            } else {
                setError(data.error || 'Invalid OTP code.');
            }
        } catch (err) { 
            console.error(err);
            setError('Connection failed. Please check if the server is running.'); 
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #06b6d4 100%)',
            padding: '2rem', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden'
        }}>
            {/* Background Decoration */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>

            <div style={{
                background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)',
                borderRadius: '32px', padding: '3.5rem 3rem', maxWidth: '500px', width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', zIndex: 10, animation: 'fadeIn 0.6s ease-out'
            }}>
                {/* Brand Header */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', background: 'var(--primary)',
                        padding: '0.5rem 1.25rem', borderRadius: '16px', color: '#fff',
                        fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.02em'
                    }}>
                        OneMeds
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        Welcome Back
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '0.5rem', fontWeight: 500 }}>
                        Premium Healthcare Access
                    </p>
                </div>

                {step === 'identifier' ? (
                    <form onSubmit={handleRequestOtp}>
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                                Email or Mobile Number
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </div>
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={e => { setIdentifier(e.target.value); setError(''); }}
                                    placeholder="e.g. name@email.com"
                                    style={{
                                        width: '100%', padding: '1rem 1rem 1rem 3.5rem', border: '2px solid #e2e8f0',
                                        borderRadius: '16px', fontSize: '1.05rem', outline: 'none', transition: 'all 0.2s',
                                        background: '#f8fafc', color: '#1e293b'
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#fff'; }}
                                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                                />
                            </div>
                        </div>

                        {error && (
                            <div style={{ background: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '16px', marginBottom: '2rem', fontSize: '0.9rem', fontWeight: 600, display: 'flex', gap: '8px', border: '1px solid #fecaca' }}>
                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '1.1rem', background: '#0f172a', color: '#fff',
                                border: 'none', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', gap: '12px'
                            }}
                            onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.target.style.transform = 'translateY(0)'}
                        >
                            {loading ? 'Processing...' : 'Generate OTP'}
                            {!loading && <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14m-7-7l7 7-7 7"></path></svg>}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '2.5rem', color: '#64748b', fontWeight: 500 }}>
                            New user? <a href="/users/register/" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Create Account</a>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} style={{ animation: 'slideIn 0.4s ease-out' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <p style={{ color: '#64748b', fontSize: '1rem' }}>Enter the 6-digit code sent to</p>
                            <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.1rem', marginTop: '0.25rem' }}>{identifier}</p>
                        </div>

                        {info && <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.75rem', borderRadius: '12px', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>{info}</div>}

                        <OtpInput value={otp} onChange={v => { setOtp(v); setError(''); }} />

                        {error && <p style={{ color: '#ef4444', textAlign: 'center', fontWeight: 600, marginTop: '-1rem', marginBottom: '1.5rem' }}>{error}</p>}

                        <button
                            type="submit"
                            disabled={loading || otp.length < 6}
                            style={{
                                width: '100%', padding: '1.1rem', background: '#2563eb', color: '#fff',
                                border: 'none', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)'
                            }}
                        >
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '2rem', color: '#64748b', fontSize: '0.95rem' }}>
                            {canResend ? (
                                <button onClick={handleRequestOtp} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Resend Code</button>
                            ) : (
                                <>Resend code in <Countdown key={countdownKey} seconds={60} onDone={() => setCanResend(true)} /></>
                            )}
                        </div>
                    </form>
                )}
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
            `}</style>
        </div>
    );
};

export default LoginPage;
