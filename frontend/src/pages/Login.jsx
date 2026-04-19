import React, { useState } from 'react';

const COUNTRIES = [
    { name: 'India', code: '+91', digits: 10 },
    { name: 'USA', code: '+1', digits: 10 },
    { name: 'UK', code: '+44', digits: 10 },
    { name: 'Australia', code: '+61', digits: 9 },
    { name: 'UAE', code: '+971', digits: 9 },
    { name: 'Qatar', code: '+974', digits: 8 },
    { name: 'Singapore', code: '+65', digits: 8 },
];

const LoginPage = () => {
    const [form, setForm] = useState({ contact_no: '', country_code: '+91', password: '' });
    const [resetForm, setResetForm] = useState({ contact_no: '', country_code: '+91', name: '', new_password: '' });
    const [showReset, setShowReset] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const selectedCountry = COUNTRIES.find(c => c.code === (showReset ? resetForm.country_code : form.country_code)) || { digits: 10 };

    const csrfToken = document.cookie
        .split('; ')
        .find(r => r.startsWith('csrftoken='))
        ?.split('=')[1] || '';

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!form.contact_no.trim() || !form.password) {
            setError('Please enter both mobile number and password.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/users/api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify(form),
            });
            const data = await res.json().catch(() => ({ error: 'Invalid server response.' }));

            if (res.ok) {
                if (data.access) {
                    localStorage.setItem('access_token', data.access);
                    localStorage.setItem('refresh_token', data.refresh);
                }
                window.location.href = data.redirect || '/';
            } else {
                setError(data.error || 'Invalid credentials.');
            }
        } catch (err) {
            console.error(err);
            setError('Connection failed. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        if (!resetForm.contact_no || !resetForm.name || !resetForm.new_password) {
            setError('Please fill all fields to reset password.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await fetch('/users/api/reset-password/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify(resetForm),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage(data.message);
                setTimeout(() => setShowReset(false), 2000);
            } else {
                setError(data.error || 'Reset failed.');
            }
        } catch (err) {
            setError('Reset failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #06b6d4 100%)',
            padding: '2rem', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden'
        }}>
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>

            <div style={{
                background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)',
                borderRadius: '32px', padding: '3rem', maxWidth: '500px', width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', zIndex: 10, animation: 'fadeIn 0.6s ease-out'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', background: '#2563eb',
                        padding: '0.5rem 1.25rem', borderRadius: '16px', color: '#fff',
                        fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.02em'
                    }}>
                        OneMeds
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {showReset ? 'Reset Password' : 'Welcome Back'}
                    </h1>
                </div>

                {!showReset ? (
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                Mobile Number
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                    value={form.country_code}
                                    onChange={e => setForm({ ...form, country_code: e.target.value })}
                                    style={{
                                        width: '100px', padding: '0.8rem', border: '2px solid #e2e8f0',
                                        borderRadius: '16px', outline: 'none', background: '#f8fafc'
                                    }}
                                >
                                    {COUNTRIES.map(c => (
                                        <option key={c.code} value={c.code}>{c.code}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    value={form.contact_no}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= selectedCountry.digits) {
                                            setForm({ ...form, contact_no: val });
                                        }
                                        setError('');
                                    }}
                                    placeholder={`${selectedCountry.digits} digits`}
                                    style={{ flex: 1, padding: '1rem', border: '2px solid #e2e8f0', borderRadius: '16px', outline: 'none', background: '#f8fafc' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '0.5rem' }}>
                            <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }}
                                placeholder="••••••••"
                                style={{ width: '100%', padding: '1rem', border: '2px solid #e2e8f0', borderRadius: '16px', outline: 'none', background: '#f8fafc' }}
                            />
                        </div>

                        <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
                            <button type="button" onClick={() => { setShowReset(true); setError(''); setMessage(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                                Forgot Password?
                            </button>
                        </div>

                        {error && (
                            <div style={{ color: '#ef4444', background: '#fef2f2', padding: '0.75rem', borderRadius: '12px', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600, border: '1px solid #fecaca' }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '1.1rem', background: '#0f172a', color: '#fff',
                                border: 'none', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.3s'
                            }}
                        >
                            {loading ? 'Logging in...' : 'Login Now'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleReset}>
                        <div style={{ marginBottom: '1.2rem' }}>
                            <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Mobile Number</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                    value={resetForm.country_code}
                                    onChange={e => setResetForm({ ...resetForm, country_code: e.target.value })}
                                    style={{ width: '90px', padding: '0.6rem', border: '2px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}
                                >
                                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                                <input
                                    type="text"
                                    value={resetForm.contact_no}
                                    onChange={e => setResetForm({ ...resetForm, contact_no: e.target.value.replace(/\D/g, '') })}
                                    placeholder="Mobile No."
                                    style={{ flex: 1, padding: '0.8rem', border: '2px solid #e2e8f0', borderRadius: '12px', outline: 'none', background: '#f8fafc' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.2rem' }}>
                            <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Registered First Name</label>
                            <input
                                type="text"
                                value={resetForm.name}
                                onChange={e => setResetForm({ ...resetForm, name: e.target.value })}
                                placeholder="Enter your first name"
                                style={{ width: '100%', padding: '0.8rem', border: '2px solid #e2e8f0', borderRadius: '12px', outline: 'none', background: '#f8fafc' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '0.5rem', fontSize: '0.85rem' }}>New Password</label>
                            <input
                                type="password"
                                value={resetForm.new_password}
                                onChange={e => setResetForm({ ...resetForm, new_password: e.target.value })}
                                placeholder="Min. 6 characters"
                                style={{ width: '100%', padding: '0.8rem', border: '2px solid #e2e8f0', borderRadius: '12px', outline: 'none', background: '#f8fafc' }}
                            />
                        </div>

                        {error && <div style={{ color: '#ef4444', background: '#fef2f2', padding: '0.75rem', borderRadius: '10px', textAlign: 'center', marginBottom: '1.2rem', fontSize: '0.8rem', fontWeight: 700 }}>{error}</div>}
                        {message && <div style={{ color: '#059669', background: '#f0fdf4', padding: '0.75rem', borderRadius: '10px', textAlign: 'center', marginBottom: '1.2rem', fontSize: '0.8rem', fontWeight: 700 }}>{message}</div>}

                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{ width: '100%', padding: '1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', marginBottom: '1rem' }}
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                        
                        <button type="button" onClick={() => setShowReset(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>
                            Back to Login
                        </button>
                    </form>
                )}

                <div style={{ textAlign: 'center', marginTop: '2.5rem', color: '#64748b' }}>
                    New user? <a href="/users/register/" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Create Account</a>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                input:focus, select:focus { border-color: #2563eb !important; background: #fff !important; }
            `}</style>
        </div>
    );
};

export default LoginPage;
