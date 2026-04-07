import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Sidebar = ({ urls, context }) => {
    const [openDropdowns, setOpenDropdowns] = useState({});

    const toggleSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('active');
    };

    const toggleDropdown = (dropdownId) => {
        setOpenDropdowns(prev => ({
            ...prev,
            [dropdownId]: !prev[dropdownId]
        }));
    };

    return (
        <div className="sidebar" id="sidebar" style={{ overflowY: 'auto' }}>
            <div style={{ position: 'absolute', top: '20px', right: '20px', padding: '5px', cursor: 'pointer' }} onClick={toggleSidebar}>
                <span style={{ fontSize: '2rem', color: '#000', lineHeight: 1 }}>&times;</span>
            </div>

            <div style={{ padding: '1rem' }}>
                {/* Home - React SPA route, use Link (no reload) */}
                <Link to="/" className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }} onClick={toggleSidebar}>Home</Link>

                {/* Hospitals Dropdown */}
                <div className="nav-item-dropdown" onClick={() => toggleDropdown('hospitals')}>
                    <span>Hospitals</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: '6px', transition: 'transform 0.2s', transform: openDropdowns.hospitals ? 'rotate(180deg)' : 'rotate(0)' }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
                {openDropdowns.hospitals && (
                    <div className="sidebar-dropdown-content active" style={{ display: 'block' }}>
                        {/* Django-rendered pages: use <a href> */}
                        <a href={urls.hospitalList || '/hospitals/'} className="sidebar-subitem">All Hospitals</a>
                        {context.hospitalSpecialties?.map?.(specialty => (
                            <a
                                key={specialty.name}
                                href={`${urls.hospitalList || '/hospitals/'}?specialty=${encodeURIComponent(specialty.name)}`}
                                className="sidebar-subitem"
                                style={{ display: 'flex', alignItems: 'center' }}
                            >
                                {specialty.iconUrl && (
                                    <img src={specialty.iconUrl} alt="" style={{ width: '20px', height: '20px', marginRight: '8px', objectFit: 'contain' }} />
                                )}
                                {specialty.name}
                            </a>
                        ))}
                    </div>
                )}

                {/* Doctors Dropdown */}
                <div className="nav-item-dropdown" onClick={() => toggleDropdown('doctors')}>
                    <span>Doctors</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: '6px', transition: 'transform 0.2s', transform: openDropdowns.doctors ? 'rotate(180deg)' : 'rotate(0)' }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
                {openDropdowns.doctors && (
                    <div className="sidebar-dropdown-content active" style={{ display: 'block' }}>
                        <a href={urls.doctorList || '/doctors/'} className="sidebar-subitem">All Doctors</a>
                        {context.doctorSpecialties?.map?.(specialty => (
                            <a
                                key={specialty.name}
                                href={`${urls.doctorList || '/doctors/'}?specialty=${encodeURIComponent(specialty.name)}`}
                                className="sidebar-subitem"
                                style={{ display: 'flex', alignItems: 'center' }}
                            >
                                {specialty.iconUrl && (
                                    <img src={specialty.iconUrl} alt="" style={{ width: '20px', height: '20px', marginRight: '8px', objectFit: 'contain' }} />
                                )}
                                {specialty.name}
                            </a>
                        ))}
                    </div>
                )}

                {/* Lab Tests Dropdown */}
                <div className="nav-item-dropdown" onClick={() => toggleDropdown('labTests')}>
                    <span>Lab Tests</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: '6px', transition: 'transform 0.2s', transform: openDropdowns.labTests ? 'rotate(180deg)' : 'rotate(0)' }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
                {openDropdowns.labTests && (
                    <div className="sidebar-dropdown-content active" style={{ display: 'block' }}>
                        <a href={urls.labTestList || '/lab-tests/'} className="sidebar-subitem">All Lab Tests</a>
                        {context.labCategories?.map?.(category => (
                            <a
                                key={category.name}
                                href={`${urls.labTestList || '/lab-tests/'}?category=${encodeURIComponent(category.name)}`}
                                className="sidebar-subitem"
                                style={{ display: 'flex', alignItems: 'center' }}
                            >
                                {category.iconUrl && (
                                    <img src={category.iconUrl} alt="" style={{ width: '20px', height: '20px', marginRight: '8px', objectFit: 'contain' }} />
                                )}
                                {category.name}
                            </a>
                        ))}
                    </div>
                )}

                {/* Medicine Orders - Django page */}
                <a href={urls.medicineList || '/medicines/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem', marginTop: '0.5rem' }}>Medicine Orders</a>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0.8rem 0' }} />

                {/* Auth links in sidebar */}
                {context.isAuthenticated ? (
                    <>
                        <a href={urls.profile || '/profile/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }}>My Profile</a>
                        <a href={urls.reminderList || '/reminders/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }}>My Appointments</a>
                        <a href={urls.cart || '/cart/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }}>
                            Cart {context.cartCount > 0 && `(${context.cartCount})`}
                        </a>
                    </>
                ) : (
                    <>
                        <a href="/users/login/" className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }}>Login</a>
                        <a href="/users/register/" className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }}>Register</a>
                    </>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
