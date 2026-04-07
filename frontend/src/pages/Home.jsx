import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Home = ({ context }) => {
    const [data, setData] = useState({ hospitals: [], doctors: [], labs: [] });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isListening, setIsListening] = useState(false);

    const urls = window.DjangoUrls || {};

    useEffect(() => {
        axios.get('/api/home/')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Home API failed', err);
                setLoading(false);
            });
    }, []);

    // Navigate to Django search page
    const goToSearch = (query) => {
        const q = query || searchQuery;
        if (q && q.trim()) {
            const searchUrl = urls.search || '/search/';
            window.location.href = `${searchUrl}?q=${encodeURIComponent(q.trim())}`;
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        goToSearch(searchQuery);
    };

    const handleVoiceSearch = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Your browser does not support voice search. Please use Chrome.');
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        setIsListening(true);

        recognition.start();
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setSearchQuery(transcript);
            setIsListening(false);
            goToSearch(transcript);
        };
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            <p style={{ marginTop: '12px', color: '#64748b' }}>Loading healthcare services...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div>
            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                color: 'white',
                padding: '60px 40px',
                borderRadius: '24px',
                marginBottom: '36px',
                textAlign: 'center',
                boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
            }}>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '3rem', fontWeight: 700 }}>
                    Find Your Healthcare Solution
                </h1>
                <p style={{ fontSize: '1.25rem', opacity: 0.9, marginBottom: '36px' }}>
                    Book appointments with top doctors and clinics near you.
                </p>

                {/* Hero Search Box */}
                <div style={{ maxWidth: '760px', margin: '0 auto', background: 'white', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <form
                        id="home-search-form"
                        onSubmit={handleSearchSubmit}
                        style={{ display: 'flex', alignItems: 'center', flex: 1, position: 'relative' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ marginLeft: '12px' }}>
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isListening ? 'Listening...' : 'Search doctors, hospitals, lab tests...'}
                            style={{
                                flex: 1,
                                border: 'none',
                                outline: 'none',
                                background: 'transparent',
                                fontSize: '1.1rem',
                                color: '#1e293b',
                                padding: '10px 15px'
                            }}
                        />
                        {/* Voice search */}
                        <button
                            type="button"
                            onClick={handleVoiceSearch}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: '10px',
                                color: isListening ? '#ef4444' : '#94a3b8', display: 'flex', alignItems: 'center',
                                transition: 'color 0.2s'
                            }}
                        >
                            <svg fill="currentColor" viewBox="0 0 24 24" width="22" height="22" style={isListening ? { animation: 'pulse 1s infinite' } : {}}>
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path>
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
                            </svg>
                        </button>
                        {/* Search button */}
                        <button
                            type="submit"
                            style={{
                                background: '#2563eb', color: '#fff', border: 'none',
                                borderRadius: '10px', padding: '12px 36px', cursor: 'pointer',
                                fontWeight: 700, fontSize: '1rem', marginLeft: '10px',
                                transition: 'opacity 0.2s'
                            }}
                        >
                            Search
                        </button>
                    </form>
                </div>

                {/* Tags Section */}
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['Cardiologist', 'Dentist', 'Dermatologist', 'Orthopedic', 'Eye Specialist'].map(tag => (
                        <button
                            key={tag}
                            onClick={() => goToSearch(tag)}
                            style={{
                                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
                                color: '#fff', borderRadius: '999px', padding: '6px 20px',
                                cursor: 'pointer', fontSize: '0.9rem', backdropFilter: 'blur(4px)',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Hospitals Section */}
            <section style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0 }}>Top Hospitals Near You</h2>
                    <a href={urls.hospitalList || '/hospitals/'} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>View All →</a>
                </div>
                {data.hospitals.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>No hospitals found for your location.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {data.hospitals.map(hospital => (
                            <div key={hospital.id} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #eee', transition: 'box-shadow 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'}
                                onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'}
                            >
                                {hospital.image ? (
                                    <img src={hospital.image} alt={hospital.name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '160px', background: 'linear-gradient(135deg, #e2e8f0, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                        </svg>
                                    </div>
                                )}
                                <div style={{ padding: '15px' }}>
                                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{hospital.name}</h3>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        {hospital.location}
                                    </div>
                                    <div style={{ marginTop: '15px' }}>
                                        <a href={`/hospital/${hospital.id}/`} className="btn-outline" style={{ display: 'block', textAlign: 'center', padding: '8px', textDecoration: 'none' }}>View Details</a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Doctors Section */}
            <section style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0 }}>Top Doctors Near You</h2>
                    <a href={urls.doctorList || '/doctors/'} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>View All →</a>
                </div>
                {data.doctors.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>No doctors found for your location.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {data.doctors.map(doctor => (
                            <div key={doctor.id} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #eee', transition: 'box-shadow 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'}
                                onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'}
                            >
                                <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #f1f5f9' }}>
                                    {doctor.image ? (
                                        <img src={doctor.image} alt={doctor.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>
                                            {doctor.name ? doctor.name[0] : 'D'}
                                        </div>
                                    )}
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{doctor.name}</h3>
                                        <div style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 500 }}>{doctor.specialty}</div>
                                    </div>
                                </div>
                                <div style={{ padding: '15px' }}>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '5px' }}><strong>Hospital:</strong> {doctor.hospital}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}><strong>Experience:</strong> {doctor.experience} years</div>
                                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                        <a href={`/doctor/${doctor.id}/`} className="btn-outline" style={{ flex: 1, textAlign: 'center', padding: '8px', textDecoration: 'none', fontSize: '0.9rem' }}>Profile</a>
                                        <a href={`/book/${doctor.id}/`} className="btn-solid" style={{ flex: 1, textAlign: 'center', padding: '8px', textDecoration: 'none', fontSize: '0.9rem' }}>Book</a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <style>{`
                @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.2); } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default Home;
