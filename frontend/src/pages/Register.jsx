import React, { useState } from 'react';

const Field = ({ label, children }) => (
    <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, color: '#374151', fontSize: '0.9rem' }}>
            {label}
        </label>
        {children}
    </div>
);

const inputStyle = {
    width: '100%', padding: '0.8rem 1rem',
    border: '2px solid #e2e8f0', borderRadius: '14px', fontSize: '1rem',
    outline: 'none', boxSizing: 'border-box', background: '#f8fafc', color: '#1e293b',
    transition: 'all 0.2s',
};

const COUNTRIES = [
    { name: 'India', code: '+91', digits: 10 },
    { name: 'USA', code: '+1', digits: 10 },
    { name: 'UK', code: '+44', digits: 10 },
    { name: 'Australia', code: '+61', digits: 9 },
    { name: 'UAE', code: '+971', digits: 9 },
    { name: 'Qatar', code: '+974', digits: 8 },
    { name: 'Singapore', code: '+65', digits: 8 },
];

const RegisterPage = () => {
    const [form, setForm] = useState({ name: '', age: '', gender: '', location: '', country_code: '+91', contact_no: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const selectedCountry = COUNTRIES.find(c => c.code === form.country_code) || { digits: 10 };

    const csrfToken = document.cookie
        .split('; ')
        .find(r => r.startsWith('csrftoken='))
        ?.split('=')[1] || '';

    const handleRegister = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!form.name.trim()) { setError('Full name is required.'); return; }
        if (!form.age || parseInt(form.age) <= 0) { setError('Please enter a valid age.'); return; }
        if (!form.gender) { setError('Please select your gender.'); return; }
        if (!form.location.trim()) { setError('Location is required.'); return; }
        if (!form.contact_no.trim()) { setError('Mobile number is required.'); return; }
        
        if (form.contact_no.length !== selectedCountry.digits) {
            setError(`${selectedCountry.name} mobile numbers must be exactly ${selectedCountry.digits} digits.`);
            return;
        }

        if (!form.password || form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/users/api/register/', {
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
                const firstError = Object.values(data)[0];
                setError(Array.isArray(firstError) ? firstError[0] : (data.error || 'Registration failed.'));
            }
        } catch (err) {
            console.error(err);
            setError('Connection failed. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
            padding: '2rem', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(10px)',
                borderRadius: '32px', padding: '2.5rem', maxWidth: '550px', width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', zIndex: 10, animation: 'fadeIn 0.6s ease-out'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#064e3b', marginBottom: '0.4rem' }}>Create Account</h1>
                    <p style={{ color: '#64748b', fontWeight: 500 }}>Join OneMeds Healthcare System</p>
                </div>

                <form onSubmit={handleRegister}>
                    <Field label="Full Name *">
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. John Doe"
                            style={inputStyle}
                        />
                    </Field>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Field label="Age *">
                            <input
                                type="number"
                                value={form.age}
                                onChange={e => setForm({ ...form, age: e.target.value })}
                                placeholder="Age"
                                style={inputStyle}
                            />
                        </Field>
                        <Field label="Gender *">
                            <select
                                value={form.gender}
                                onChange={e => setForm({ ...form, gender: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="">Select</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                                <option value="O">Other</option>
                            </select>
                        </Field>
                    </div>

                    <Field label="Location *">
                        <input
                            type="text"
                            value={form.location}
                            onChange={e => setForm({ ...form, location: e.target.value })}
                            placeholder="Your city"
                            style={inputStyle}
                        />
                    </Field>

                    <Field label="Mobile Number *">
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                value={form.country_code}
                                onChange={e => setForm({ ...form, country_code: e.target.value })}
                                style={{ ...inputStyle, width: '100px' }}
                            >
                                {COUNTRIES.map(c => (
                                    <option key={c.code} value={c.code}>{c.code} ({c.name})</option>
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
                                }}
                                placeholder={`${selectedCountry.digits} digits needed`}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem', marginLeft: '105px' }}>
                            {form.contact_no.length}/{selectedCountry.digits} digits entered
                        </div>
                    </Field>

                    <Field label="Set Password *">
                        <input
                            type="password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            placeholder="Minimum 6 characters"
                            style={inputStyle}
                        />
                    </Field>

                    {error && (
                        <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center', background: '#fef2f2', padding: '0.75rem', borderRadius: '12px' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '1.1rem', background: '#065f46', color: '#fff',
                            border: 'none', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.3s'
                        }}
                    >
                        {loading ? 'Creating Account...' : 'Register Now'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', color: '#64748b' }}>
                        Already have an account? <a href="/users/login/" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}>Login</a>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                input:focus, select:focus { border-color: #059669 !important; background: #fff !important; }
            `}</style>
        </div>
    );
};

export default RegisterPage;
