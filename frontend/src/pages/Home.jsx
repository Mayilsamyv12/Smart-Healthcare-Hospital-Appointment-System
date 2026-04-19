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
        <div style={{ textAlign: 'center', padding: '50px', marginTop: '80px' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            <p style={{ marginTop: '12px', color: '#64748b' }}>Loading healthcare services...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ marginTop: '70px', overflowX: 'hidden', background: '#ffffff', minHeight: 'calc(100vh - 70px)', paddingBottom: '40px' }}>
            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                color: 'white',
                padding: 'clamp(40px, 7vw, 80px) clamp(20px, 5vw, 60px) 180px',
                borderRadius: '3.5rem',
                textAlign: 'center'
            }}>
                <h1 style={{ margin: '0 0 12px 0', fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.5px' }}>
                    Find Your Healthcare Solution
                </h1>
                <p style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.2rem)', opacity: 0.88, marginBottom: '32px', fontWeight: 400 }}>
                    Book appointments with top doctors and clinics near you.
                </p>

                {/* Hero Search Box — centered, constrained width with stunning glassmorphic wrapper */}
                <div style={{ maxWidth: '750px', margin: '0 auto', width: '100%', padding: '0 16px', boxSizing: 'border-box' }}>
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.15)', 
                        backdropFilter: 'blur(16px)', 
                        WebkitBackdropFilter: 'blur(16px)', 
                        padding: '12px', 
                        borderRadius: '60px', 
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.25)' 
                    }}>
                        <form
                            id="home-search-form"
                            onSubmit={handleSearchSubmit}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                background: '#ffffff',
                                borderRadius: '50px',
                                padding: '8px 8px 8px 24px',
                                boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
                                boxSizing: 'border-box',
                                gap: '8px'
                            }}
                        >
                            {/* Search icon */}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="M21 21l-4.35-4.35"></path>
                            </svg>

                            {/* Text input */}
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isListening ? 'Listening...' : 'Search doctors, hospitals, lab tests...'}
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    background: 'transparent',
                                    fontSize: '1.1rem',
                                    fontWeight: 500,
                                    color: '#1e293b',
                                    padding: '0 10px',
                                    margin: 0,
                                    minWidth: 0
                                }}
                            />

                            {/* Voice search button */}
                            <button
                                type="button"
                                onClick={handleVoiceSearch}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '10px',
                                    color: isListening ? '#ef4444' : '#64748b',
                                    transition: 'color 0.2s, transform 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    borderRadius: '50%'
                                }}
                                onMouseOver={e => !isListening && (e.currentTarget.style.color = '#2563eb')}
                                onMouseOut={e => !isListening && (e.currentTarget.style.color = '#64748b')}
                                title="Voice Search"
                            >
                                <svg fill="currentColor" viewBox="0 0 24 24" width="22" height="22" style={isListening ? { animation: 'pulse 1s infinite' } : {}}>
                                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path>
                                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
                                </svg>
                            </button>

                            {/* Search submit button */}
                            <button
                                type="submit"
                                style={{
                                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '40px',
                                    padding: '14px 36px',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    letterSpacing: '0.5px',
                                    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                                onMouseOver={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.6)'; e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; }}
                                onMouseOut={e => { e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 99, 235, 0.4)'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
                            >
                                Search
                            </button>
                        </form>
                    </div>
                </div>

                {/* Quick-search Tags */}
                <div style={{ marginTop: '20px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['Cardiologist', 'Dentist', 'Dermatologist', 'Orthopedic', 'Eye Specialist'].map(tag => (
                        <button
                            key={tag}
                            onClick={() => goToSearch(tag)}
                            style={{
                                background: 'rgba(255,255,255,0.18)',
                                border: '1px solid rgba(255,255,255,0.4)',
                                color: '#fff',
                                borderRadius: '999px',
                                padding: '5px 15px',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                backdropFilter: 'blur(4px)',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.32)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Service Cards overlapping Hero */}
            <div style={{ maxWidth: '1100px', margin: '-140px auto 60px auto', padding: '0 16px', position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                    {/* Card 1: Find Doctors */}
                    <a href={urls.doctorList || '/doctors/'} style={{ background: '#ffffff', borderRadius: '16px', padding: '24px 20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid rgba(0,0,0,0.02)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-8px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ width: '68px', height: '68px', background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5)' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 21a9 9 0 0 0 9-9v-3"></path>
                                <path d="M3 12a9 9 0 0 0 9 9"></path>
                                <path d="M3 5v7"></path>
                                <path d="M21 5v4"></path>
                                <circle cx="3" cy="5" r="2"></circle>
                                <circle cx="21" cy="5" r="2"></circle>
                                <circle cx="12" cy="21" r="3"></circle>
                            </svg>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0 0 10px 0', letterSpacing: '-0.3px' }}>Find Doctors</h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>Book instant consultations with top-rated specialists near you.</p>
                    </a>

                    {/* Card 2: Hospitals */}
                    <a href={urls.hospitalList || '/hospitals/'} style={{ background: '#ffffff', borderRadius: '16px', padding: '24px 20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid rgba(0,0,0,0.02)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-8px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ width: '68px', height: '68px', background: 'linear-gradient(135deg, #dcfce7, #86efac)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5)' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 21h18"></path>
                                <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
                                <path d="M9 10h6"></path>
                                <path d="M12 7v6"></path>
                            </svg>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0 0 10px 0', letterSpacing: '-0.3px' }}>Hospitals</h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>Locate top-rated hospitals with world-class medical facilities.</p>
                    </a>

                    {/* Card 3: Pharmacy */}
                    <a href={urls.medicineList || '/medicines/'} style={{ background: '#ffffff', borderRadius: '16px', padding: '24px 20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid rgba(0,0,0,0.02)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-8px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ width: '68px', height: '68px', background: 'linear-gradient(135deg, #fee2e2, #fca5a5)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5)' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.5 4.5l9 9a4.95 4.95 0 1 1-7 7l-9-9a4.95 4.95 0 1 1 7-7z"></path>
                                <path d="M14 10l-4 4"></path>
                            </svg>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0 0 10px 0', letterSpacing: '-0.3px' }}>Pharmacy</h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>Order medicines online safely and get them delivered fast.</p>
                    </a>

                    {/* Card 4: Lab Tests */}
                    <a href={urls.labTestList || '/lab-tests/'} style={{ background: '#ffffff', borderRadius: '16px', padding: '24px 20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid rgba(0,0,0,0.02)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-8px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ width: '68px', height: '68px', background: 'linear-gradient(135deg, #f3e8ff, #d8b4fe)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5)' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 18h8"></path>
                                <path d="M3 22h18"></path>
                                <path d="M14 22a7 7 0 1 0 0-14h-1"></path>
                                <path d="M9 14h2"></path>
                                <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"></path>
                                <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"></path>
                            </svg>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0 0 10px 0', letterSpacing: '-0.3px' }}>Lab Tests</h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>Book accurate diagnostic tests easily with home collection.</p>
                    </a>
                </div>
            </div>
            {/* Hospitals Section */}
            <section style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, fontSize: 'clamp(1.2rem, 4vw, 1.5rem)' }}>Top Hospitals Near You</h2>
                    <a href={urls.hospitalList || '/hospitals/'} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>View All →</a>
                </div>
                {data.hospitals.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>No hospitals found for your location.</p>
                ) : (
                    <div className="grid-4-cols">
                        {data.hospitals.map(hospital => (
                            <div key={hospital.id} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #eee', transition: 'box-shadow 0.2s', display: 'flex', flexDirection: 'column', height: '100%' }}
                                onMouseOver={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'}
                                onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'}
                            >
                                <div style={{ height: "240px", background: "linear-gradient(135deg, #e0eafc, #cfdef3)", position: "relative", overflow: "hidden" }}>
                                    {hospital.image ? (
                                        <img src={hospital.image} alt={hospital.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <img src="/static/img/hospital_icon.png" alt="Hospital" style={{ width: "80px", opacity: 0.5 }} />
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{hospital.name}</h3>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hospital.location}</span>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '15px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: 'clamp(1.2rem, 4vw, 1.5rem)' }}>Top Doctors Near You</h2>
                    <a href={urls.doctorList || '/doctors/'} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>View All →</a>
                </div>
                {data.doctors.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>No doctors found for your location.</p>
                ) : (
                    <div className="grid-4-cols">
                        {data.doctors.map(doctor => (
                            <div key={doctor.id} style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 15px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9", textAlign: "center", transition: "all 0.25s", cursor: "pointer", display: "flex", flexDirection: "column", height: "100%" }}
                                onMouseOver={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'}
                                onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.06)'}
                            >
                                <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: "linear-gradient(135deg, #e0f2fe, #bfdbfe)", margin: "0 auto 1.2rem auto", overflow: "hidden", border: "4px solid #bae6fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {doctor.image ? (
                                        <img src={doctor.image} alt={doctor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <img src="/static/img/doctor_icon.png" alt="Doctor" style={{ width: "60px", opacity: 0.5 }} />
                                    )}
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem' }}>Dr. {doctor.name}</h3>
                                    <div style={{ color: 'var(--primary)', fontSize: '0.95rem', fontWeight: 600 }}>{doctor.specialty}</div>
                                </div>
                                <div style={{ marginTop: '15px', textAlign: 'left', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '5px' }}><strong>Hospital:</strong> <span style={{wordBreak: "break-word"}}>{typeof doctor.hospital === 'object' ? doctor.hospital?.name : doctor.hospital}</span></div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}><strong>Experience:</strong> {doctor.experience} years</div>
                                    <div style={{ marginTop: 'auto', paddingTop: '15px', display: 'flex', gap: '10px' }}>
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
                .btn-outline { border: 1px solid var(--primary); color: var(--primary); border-radius: 8px; font-weight: 500; transition: all 0.2s; }
                .btn-outline:hover { background: var(--primary); color: white; }
                .btn-solid { background: var(--primary); color: white; border-radius: 8px; font-weight: 500; transition: all 0.2s; }
                .btn-solid:hover { opacity: 0.9; }

                .grid-4-cols { display: grid; gap: 20px; grid-template-columns: repeat(1, 1fr); }
                @media (min-width: 640px) { .grid-4-cols { grid-template-columns: repeat(2, 1fr); } }
                @media (min-width: 1024px) { .grid-4-cols { grid-template-columns: repeat(4, 1fr); } }
                @media (max-width: 768px) { .search-input-group { border-right: none !important; border-bottom: 2px solid #f1f5f9; width: 100%; } }
            `}</style>
        </div>
    );
};

export default Home;
