import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';

const HospitalList = () => {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState('');
    
    // Parse URL params
    const searchParams = new URLSearchParams(useLocation().search);
    const clearLocation = searchParams.get('clear_location');

    useEffect(() => {
        // If clear_location=true is in URL, we could dispatch a request to clear session, but since it's Django session, 
        // a post to /set-location/ with empty value clears it. For simplicity in React, we'll just fetch assuming state is handled.
        
        axios.get('/api/hospitals/')
            .then(res => {
                setHospitals(res.data.hospitals || []);
                setCurrentLocation(res.data.current_location || '');
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch hospitals", err);
                setLoading(false);
            });
    }, [clearLocation]);

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
                    <div key={hospital.id} style={{ background: "white", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0", padding: "1.5rem", marginBottom: 0, display: "flex", flexDirection: "column" }}>
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
                                    Verified Facility &bull; Rating: {hospital.avg_rating || 'N/A'} ({hospital.review_count || 0} Reviews)
                                </div>
                            </div>
                            
                            {/* Info */}
                            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.4rem", color: "#111", lineHeight: 1.25 }}>{hospital.name}</h2>
                                {hospital.about && (
                                    <p style={{ color: "#4b5563", fontSize: "0.95rem", marginBottom: "0.8rem", lineHeight: 1.4 }}>
                                        {hospital.about.substring(0, 80)}{hospital.about.length > 80 ? '...' : ''}
                                    </p>
                                )}
                                
                                <div style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.95rem", marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ display: "inline-block", width: "10px", height: "10px", background: "#16a34a", borderRadius: "50%" }}></span> Open Now
                                </div>
                                
                                <h4 style={{ margin: "0 0 0.6rem 0", fontSize: "1rem", color: "#111", fontWeight: 500 }}>Specialties</h4>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                                    {hospital.specialties && hospital.specialties.length > 0 ? hospital.specialties.slice(0,3).map((spec, idx) => (
                                        <span key={idx} style={idx === 0 ? { background: "#2d56dfff", color: "white", border: "1px solid #2563eb", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase" } : { background: "white", color: "#374151", border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase" }}>
                                            {spec}
                                        </span>
                                    )) : (
                                        <span style={{ background: "white", color: "#374151", border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase" }}>General</span>
                                    )}
                                </div>
                                
                                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                                    <div style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start" }}>
                                        <div style={{ width: "32px", height: "32px", background: "#f3f4f6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                        </div>
                                        <div style={{ fontSize: "0.9rem", color: "#111", lineHeight: 1.4 }}>{hospital.location}</div>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start" }}>
                                        <div style={{ width: "32px", height: "32px", background: "#f3f4f6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        </div>
                                        <div style={{ fontSize: "0.9rem", color: "#111" }}>{hospital.contact_no}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr style={{ border: 0, borderTop: "1px solid #e5e7eb", margin: "0.5rem 0 1.2rem 0" }} />

                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: "0.8rem", alignItems: "stretch", flexWrap: "wrap", marginTop: "auto" }}>
                            <a href={`/hospital/${hospital.id}#doctors`} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2563eb", color: "white", padding: "0.8rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none", border: "1px solid #2563eb", transition: "0.3s" }}>
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
