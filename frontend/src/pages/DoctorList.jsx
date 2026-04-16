import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';

const DoctorList = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState('');
    
    useEffect(() => {
        axios.get('/api/doctors/')
            .then(res => {
                setDoctors(res.data.doctors || []);
                setCurrentLocation(res.data.current_location || '');
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch doctors", err);
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ marginTop: '80px', padding: '0 15px' }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                <h1 style={{ fontSize: "3rem", color: "var(--primary)", marginBottom: "1rem" }}>Doctors</h1>
                <p style={{ color: "#666", fontSize: "1.2rem" }}>Expert consultation from top professionals.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "2.5rem", marginBottom: "3rem", maxWidth: "1400px", margin: "0 auto", paddingBottom: "3rem" }}>
                {doctors.length > 0 ? doctors.map(doctor => (
                    <div key={doctor.id} style={{ background: "white", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", overflow: "hidden", position: "relative", transition: "transform 0.3s", display: "flex", flexDirection: "column" }}>
                        {/* Top Gray Banner */}
                        <div style={{ height: "100px", background: "#f8fafc" }}></div>
                        
                        {/* Avatar */}
                        <div style={{ width: "160px", height: "160px", margin: "-80px auto 0 auto", position: "relative", zIndex: 2, borderRadius: "50%", border: "4px solid #45b0a3", padding: "4px", background: "white", boxShadow: "0 4px 10px rgba(0,0,0,0.05)", flexShrink: 0 }}>
                            {doctor.image ? (
                                <img src={doctor.image} alt={doctor.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "100%", height: "100%", background: "#e2e8f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <img src="/static/img/doctor_icon.png" alt="Doctor" style={{ width: "70px", opacity: 0.5 }} />
                                </div>
                            )}
                            {/* Verified Badge */}
                            <div style={{ position: "absolute", bottom: "5px", right: "12px", background: "#2563eb", width: "32px", height: "32px", borderRadius: "50%", border: "3px solid white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                        </div>
                        
                        {/* Title & Meta */}
                        <div style={{ textAlign: "center", marginTop: "1.2rem", padding: "0 1.5rem" }}>
                            <h3 style={{ color: "#0f4a56", fontSize: "1.6rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>Dr. {doctor.name}</h3>
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.6rem", color: "#64748b", fontSize: "0.95rem", flexWrap: "wrap" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    {doctor.hospital ? (doctor.hospital.length > 20 ? doctor.hospital.substring(0, 20) + '...' : doctor.hospital) : ''}
                                </span>
                                <span style={{ color: "#cbd5e1" }}>|</span>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ color: "#fbbf24", fontSize: "1.1rem" }}>⭐</span>
                                    {doctor.avg_rating ? (
                                        <>{doctor.avg_rating} <span style={{ fontSize: "0.85rem" }}>({doctor.review_count})</span></>
                                    ) : (
                                        <span style={{ fontSize: "0.85rem" }}>No reviews</span>
                                    )}
                                </span>
                            </div>
                        </div>
                        
                        {/* Left-aligned info */}
                        <div style={{ padding: "1.5rem 1.5rem 0.5rem 1.5rem", flex: 1 }}>
                            {/* Specialty */}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1.5rem" }}>
                                <span style={{ background: "#eef2ff", color: "#4338ca", padding: "6px 16px", borderRadius: "20px", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                                    {doctor.specialty ? (doctor.specialty.length > 18 ? doctor.specialty.substring(0, 18) + '...' : doctor.specialty) : "GENERAL"}
                                </span>
                                <span style={{ border: "1px solid #c7d2fe", borderRadius: "50%", width: "34px", height: "34px", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#4338ca", flexShrink: 0 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                                </span>
                            </div>
                            
                            {/* Details List */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", color: "#1e293b", fontSize: "1.05rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                                    <span>{doctor.experience}+ years of Experience</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
                                    <span>Consultation Fee: ₹{doctor.consultation_fee}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    <span>Available: Mon, Wed, Fri</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Actions */}
                        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "auto" }}>
                            <a href={`/doctor/${doctor.id}`} style={{ background: "#f0f9ff", color: "#0369a1", borderRadius: "8px", padding: "0.75rem", textAlign: "center", fontWeight: 600, fontSize: "0.95rem", textDecoration: "none", display: "block", border: "1px solid #bae6fd", transition: "background 0.2s" }}>
                                View Profile &amp; Reviews
                            </a>
                            <a href={`/book/${doctor.id}`} style={{ background: "#2f2ff5ff", color: "white", borderRadius: "8px", padding: "0.9rem", textAlign: "center", fontWeight: 600, fontSize: "1.05rem", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "background 0.2s" }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                Book Appointment
                            </a>
                        </div>
                    </div>
                )) : (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "4rem" }}>
                        <img src="/static/img/doctor_icon.png" style={{ width: "100px", opacity: 0.5, marginBottom: "1rem" }} alt="No doctors" />
                        <p style={{ fontSize: "1.2rem", color: "#888" }}>
                            {currentLocation ? (
                                <>No doctors available in "<strong>{currentLocation}</strong>".</>
                            ) : (
                                "No doctors available at the moment."
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DoctorList;
