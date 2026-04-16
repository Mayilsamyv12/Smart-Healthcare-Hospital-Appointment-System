import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = ({ urls, context }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isListening, setIsListening] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const toggleSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('active');
    };

    // Navigate to Django search page without React Router (it's a Django-rendered page)
    const goToSearch = (query) => {
        if (query && query.trim()) {
            const searchUrl = urls.search || '/search/';
            window.location.href = `${searchUrl}?q=${encodeURIComponent(query.trim())}`;
        }
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
            if (event.error === 'not-allowed') {
                alert('Microphone access denied. Please allow microphone permissions.');
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        goToSearch(searchQuery);
    };

    const openLocationModal = () => {
        window.dispatchEvent(new Event('openLocationModal'));
    };

    const handleReminderClick = (e) => {
        e.preventDefault();
        window.location.href = urls.reminderList || '/reminders/';
    };

    return (
        <nav className="navbar">
            {/* Left: Hamburger + Brand */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                    className="hamburger"
                    onClick={toggleSidebar}
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginRight: '1.2rem', width: '24px', cursor: 'pointer' }}
                    title="Open menu"
                >
                    <span style={{ background: 'var(--text-main)', height: '2px', width: '100%', borderRadius: '2px' }}></span>
                    <span style={{ background: 'var(--text-main)', height: '2px', width: '100%', borderRadius: '2px' }}></span>
                    <span style={{ background: 'var(--text-main)', height: '2px', width: '100%', borderRadius: '2px' }}></span>
                </div>
                {/* Brand uses Link for / (React), falls back to href */}
                <Link to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
                    <span className="brand-highlight">One</span>Meds
                </Link>
            </div>

            {/* Right: Search, Location, Links */}
            <div className="nav-links" style={{ gap: '1.5rem', position: 'relative', alignItems: 'center' }}>

                {/* Search Form */}
                <form
                    id="nav-search-form"
                    onSubmit={handleSearchSubmit}
                    style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '6px', padding: '4px 10px', border: `2px solid ${isListening ? '#ef4444' : '#94a3b8'}`, width: '220px', height: '36px', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                >
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={isListening ? 'Listening...' : 'Location, doctors...'}
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.9rem', color: '#334155', padding: 0, margin: 0 }}
                    />
                    {/* Voice search button */}
                    <button
                        type="button"
                        onClick={handleVoiceSearch}
                        style={{
                            background: 'none', border: 'none', outline: 'none', cursor: 'pointer',
                            marginLeft: '0.3rem', padding: 0, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: isListening ? '#ef4444' : '#64748b',
                            transition: 'color 0.2s'
                        }}
                        title={isListening ? 'Listening...' : 'Search by voice'}
                    >
                        {isListening ? (
                            /* Animated mic icon when listening */
                            <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16" style={{ animation: 'pulse 1s infinite' }}>
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path>
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
                            </svg>
                        ) : (
                            <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path>
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
                            </svg>
                        )}
                    </button>
                    {/* Search submit button */}
                    <button
                        type="submit"
                        style={{ background: 'none', border: 'none', outline: 'none', cursor: 'pointer', marginLeft: '0.2rem', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}
                        title="Search"
                    >
                        <svg fill="none" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                    </button>
                </form>

                {/* Location Selector */}
                <div
                    onClick={openLocationModal}
                    className="location-selector"
                    style={{ color: '#475569', fontWeight: 500, fontSize: '0.95rem', display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.4rem', background: '#f8fafc', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}
                    title="Set your location"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {context.userLocation || 'Select Location'}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px', opacity: 0.6 }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>

                {/* Authenticated Links */}
                {context.isAuthenticated && (
                    <>
                        {/* Profile - Django page, use <a> */}
                        <a
                            href={urls.profile || '/profile/'}
                            style={{ color: '#475569', fontWeight: 500, fontSize: '0.95rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Profile
                        </a>

                        {/* Cart - Django page, use <a> */}
                        <a
                            href={urls.cart || '/cart/'}
                            style={{ color: '#475569', fontWeight: 500, fontSize: '0.95rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            Cart {context.cartCount > 0 && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '999px', padding: '0 6px', fontSize: '0.75rem', marginLeft: '2px' }}>{context.cartCount}</span>}
                        </a>
                    </>
                )}

                <div
                    className="nav-icon-link"
                    style={{ color: '#475569', fontWeight: 500, fontSize: '0.95rem', display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', gap: '0.3rem' }}
                    onClick={handleReminderClick}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <span>Reminder</span>
                </div>

                {/* Login / Register (shown when NOT authenticated) */}
                {!context.isAuthenticated && (
                    <>
                        <a href="/users/login/" className="btn-nav-outline" style={{ textDecoration: 'none' }}>Login</a>
                        <a href="/users/register/" className="btn-nav-solid" style={{ textDecoration: 'none' }}>Register</a>
                    </>
                )}
            </div>

            {/* Pulse animation style for voice search */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.2); }
                }
            `}</style>
        </nav>
    );
};

export default Navbar;
