import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';

const HospitalList = () => {
    const [hospitals, setHospitals] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState('');
    
    // Parse URL params
    const searchParams = new URLSearchParams(useLocation().search);
    const clearLocation = searchParams.get('clear_location');

    const fetchHospitals = () => {
        setLoading(true);
        setError(null);
        axios.get('/api/hospitals/')
            .then(res => {
                const hospitalData = Array.isArray(res.data) ? res.data : (res.data.results ? res.data.results : (res.data.hospitals || []));
                setHospitals(hospitalData);
                setCurrentLocation(res.data.current_location || '');
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch hospitals", err);
                setError("Unable to load healthcare centers right now.");
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchHospitals();
    }, [clearLocation]);

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '100px 20px', marginTop: '40px' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid #f3f3f3', borderTop: '4px solid #0ea5e9', borderRadius: '50%', animation: 'spin-hospital 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#64748b', fontWeight: 500 }}>Locating clinics and hospitals near you...</p>
            <style>{`@keyframes spin-hospital { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (error) return (
        <div style={{ textAlign: 'center', padding: '100px 20px', marginTop: '40px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🏥</div>
            <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>Hospital Finder Unavailable</h2>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>{error}</p>
            <button onClick={fetchHospitals} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 32px', cursor: 'pointer', fontWeight: 700 }}>Try Again</button>
        </div>
    );

    return (
        <div style={{ marginTop: '80px', padding: '0 15px' }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                <h1 style={{ fontSize: "3rem", color: "var(--primary)", marginBottom: "1rem" }}>Hospitals</h1>
                <p style={{ color: "#666", fontSize: "1.2rem" }}>Find the best care centers near you.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "2rem", margin: "0 auto", maxWidth: "1400px", paddingBottom: "3rem" }}>
                {hospitals.length > 0 ? hospitals.map(hospital => (
                    <div key={hospital.id} style={{ background: "white", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0", padding: "1.5rem", marginBottom: 0, display: "flex", flexDirection: "column", height: "100%" }}>
                        {/* Top Section: Image + Info */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "1.5rem", flex: 1 }}>
                            {/* Image */}
                            <div style={{ width: "100%", position: "relative", borderRadius: "12px", overflow: "hidden", height: "260px", flexShrink: 0 }}>
                                {hospital.image ? (
                                    <img src={hospital.image} alt={hospital.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                ) : (
                                    <div style={{ width: "100%", height: "100%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                                        <img src="/static/img/hospital_icon.png" alt="Hospital" style={{ width: "60px", opacity: 0.5 }} />
                                    </div>
                                )}
                                {/* Overlay */}
                                <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)", padding: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "white", fontSize: "0.85rem", fontWeight: 500 }}>
                                    Verified Facility
                                </div>
                            </div>
                            
                            {/* Info */}
                            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.4rem", color: "#111", lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{hospital.name}</h2>
                                {hospital.about && (
                                    <p style={{ color: "#4b5563", fontSize: "0.95rem", marginBottom: "0.8rem", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                        {hospital.about}
                                    </p>
                                )}
                                
                                <div style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.95rem", marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ display: "inline-block", width: "10px", height: "10px", background: "#16a34a", borderRadius: "50%" }}></span> Open Now
                                </div>
                                
                                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                                    <div style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start" }}>
                                        <div style={{ width: "32px", height: "32px", background: "#f3f4f6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                        </div>
                                        <div style={{ fontSize: "0.9rem", color: "#111", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{hospital.location}</div>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start" }}>
                                        <div style={{ width: "32px", height: "32px", background: "#f3f4f6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        </div>
                                        <div style={{ fontSize: "0.9rem", color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hospital.contact_no}</div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <hr style={{ border: 0, borderTop: "1px solid #e5e7eb", margin: "0.5rem 0 1.2rem 0" }} />

                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: "0.8rem", alignItems: "stretch", marginTop: "auto" }}>
                            <a href={`/hospital/${hospital.id}/`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "white", color: "#2563eb", padding: "0.5rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", border: "1px solid #2563eb", transition: "0.3s", textAlign: "center" }}>
                                VIEW PROFILE
                            </a>
                            <a href={`/hospital/${hospital.id}#doctors`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#2563eb", color: "white", padding: "0.5rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", border: "1px solid #2563eb", transition: "0.3s", textAlign: "center" }}>
                                BOOK APPOINTMENT
                            </a>
                        </div>
                    </div>
                )) : (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "4rem" }}>
                        <img src="/static/img/hospital_icon.png" style={{ width: "100px", opacity: 0.5, marginBottom: "1rem" }} alt="No hospitals" />
                        <p style={{ fontSize: "1.2rem", color: "#888" }}>
                            {currentLocation ? (
                                <>No hospitals found in "<strong>{currentLocation}</strong>".</>
                            ) : (
                                "No hospitals available at the moment."
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalList;
