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

    return (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '2rem 0' }}>
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
                    style={{
                        width: '52px', height: '64px',
                        textAlign: 'center', fontSize: '1.8rem', fontWeight: 800,
                        border: d ? '2px solid #059669' : '2px solid #e2e8f0',
                        borderRadius: '16px', outline: 'none',
                        background: d ? '#ecfdf5' : '#f8fafc',
                        color: '#1e293b', transition: 'all 0.2s',
                        boxShadow: d ? '0 0 0 4px rgba(5, 150, 105, 0.1)' : 'none'
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
        <span style={{ color: left < 10 ? '#ef4444' : '#059669', fontWeight: 700 }}>
            {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
        </span>
    );
};

// ── Field Component ──
const Field = ({ label, icon, children }) => (
    <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#374151', fontSize: '0.9rem' }}>
            {label}
        </label>
        <div style={{ position: 'relative' }}>
            {icon && (
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                    {icon}
                </div>
            )}
            {children}
        </div>
    </div>
);

const inputStyle = (hasIcon = true) => ({
    width: '100%', padding: `0.75rem 1rem 0.75rem ${hasIcon ? '3.5rem' : '1rem'}`,
    border: '2px solid #e2e8f0', borderRadius: '14px', fontSize: '1rem',
    outline: 'none', boxSizing: 'border-box', background: '#f8fafc', color: '#1e293b',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
});

// ── Main Register Component ──
const RegisterPage = () => {
    const [step, setStep] = useState('details'); // 'details' | 'otp'
    const [form, setForm] = useState({ name: '', age: '', gender: '', location: '', identifier: '' });
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
        if (!form.name.trim()) { setError('Full name is required.'); return; }
        if (!form.identifier.trim()) { setError('Email or mobile number is required.'); return; }

        setLoading(true); setError(''); setInfo('');
        try {
            const res = await apiPost('/users/api/register/request-otp/', form);
            const data = await res.json();
            if (res.ok) {
                setStep('otp');
                setOtp('');
                setCanResend(false);
                setCountdownKey(k => k + 1);
                setInfo(data.dev_otp ? `OTP Sent! (Dev Code: ${data.dev_otp})` : `OTP Sent to ${form.identifier}`);
            } else {
                setError(data.error || 'Failed to send OTP.');
            }
        } catch { setError('Network error. Please try again.'); }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e?.preventDefault();
        if (otp.length < 6) { setError('Enter full 6-digit code.'); return; }
        setLoading(true); setError('');
        try {
            const res = await apiPost('/users/api/register/verify-otp/', { otp });
            const data = await res.json();
            if (res.ok) {
                window.location.href = data.redirect || '/users/login/';
            } else {
                setError(data.error || 'Invalid OTP code.');
            }
        } catch { setError('Network error. Please try again.'); }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
            padding: '2rem', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden'
        }}>
            {/* Background Decoration */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)', borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(0,0,0,0.05) 0%, transparent 70%)', borderRadius: '50%' }}></div>

            <div style={{
                background: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(10px)',
                borderRadius: '32px', padding: '3rem', maxWidth: '550px', width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', zIndex: 10, animation: 'fadeIn 0.6s ease-out'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#064e3b', marginBottom: '0.5rem' }}>Create Account</h1>
                    <p style={{ color: '#64748b', fontWeight: 500 }}>Join the world's best healthcare system</p>
                </div>

                {step === 'details' ? (
                    <form onSubmit={handleRequestOtp}>
                        <Field label="Full Name *" icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>}>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => { setForm({ ...form, name: e.target.value }); setError(''); }}
                                placeholder="e.g. John Doe"
                                style={inputStyle()}
                                onFocus={e => { e.target.style.borderColor = '#059669'; e.target.style.background = '#fff'; }}
                                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                            />
                        </Field>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                            <Field label="Age">
                                <input
                                    type="number"
                                    value={form.age}
                                    onChange={e => setForm({ ...form, age: e.target.value })}
                                    placeholder="Age"
                                    style={inputStyle(false)}
                                    onFocus={e => { e.target.style.borderColor = '#059669'; e.target.style.background = '#fff'; }}
                                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                                />
                            </Field>
                            <Field label="Gender">
                                <select
                                    value={form.gender}
                                    onChange={e => setForm({ ...form, gender: e.target.value })}
                                    style={inputStyle(false)}
                                    onFocus={e => { e.target.style.borderColor = '#059669'; e.target.style.background = '#fff'; }}
                                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                                >
                                    <option value="">Select</option>
                                    <option value="M">Male</option>
                                    <option value="F">Female</option>
                                    <option value="O">Other</option>
                                </select>
                            </Field>
                        </div>

                        <Field label="Location" icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path><circle cx="12" cy="9" r="2"></circle></svg>}>
                            <input
                                type="text"
                                value={form.location}
                                onChange={e => setForm({ ...form, location: e.target.value })}
                                placeholder="Your city"
                                style={inputStyle()}
                                onFocus={e => { e.target.style.borderColor = '#059669'; e.target.style.background = '#fff'; }}
                                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                            />
                        </Field>

                        <Field label="Email or Mobile *" icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>}>
                            <input
                                type="text"
                                value={form.identifier}
                                onChange={e => { setForm({ ...form, identifier: e.target.value }); setError(''); }}
                                placeholder="name@email.com or +91 9999999999"
                                style={inputStyle()}
                                onFocus={e => { e.target.style.borderColor = '#059669'; e.target.style.background = '#fff'; }}
                                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                            />
                        </Field>

                        {error && <p style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>{error}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '1.1rem', background: '#065f46', color: '#fff',
                                border: 'none', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(6, 95, 70, 0.3)'
                            }}
                        >
                            {loading ? 'Creating Verification...' : 'Begin Security Verification'}
                            {!loading && <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14m-7-7l7 7-7 7"></path></svg>}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '2rem', color: '#64748b', fontWeight: 500 }}>
                            Already a member? <a href="/users/login/" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}>Login</a>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} style={{ animation: 'slideIn 0.4s ease-out' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                            <p style={{ color: '#64748b' }}>Check your phone/email for the 6-digit code</p>
                        </div>

                        {info && <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.75rem', borderRadius: '12px', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>{info}</div>}

                        <OtpInput value={otp} onChange={v => { setOtp(v); setError(''); }} />

                        {error && <p style={{ color: '#ef4444', textAlign: 'center', fontWeight: 600, marginBottom: '2rem' }}>{error}</p>}

                        <button
                            type="submit"
                            disabled={loading || otp.length < 6}
                            style={{
                                width: '100%', padding: '1.1rem', background: '#059669', color: '#fff',
                                border: 'none', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)'
                            }}
                        >
                            {loading ? 'Finalizing Setup...' : 'Complete Registration'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '2rem', color: '#64748b' }}>
                            Didn't get the code? <button onClick={handleRequestOtp} style={{ background: 'none', border: 'none', color: '#059669', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Resend Now</button>
                        </div>
                    </form>
                )}
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                input:focus { border-color: #059669 !important; box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.1); }
            `}</style>
        </div>
    );
};

export default RegisterPage;
