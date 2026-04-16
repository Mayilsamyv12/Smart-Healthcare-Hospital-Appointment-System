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

                {/* Django-rendered pages: use <a href> */}
                <a href={urls.hospitalList || '/hospitals/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }}>Hospitals</a>

                <a href={urls.doctorList || '/doctors/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }}>Doctors</a>

                <a href={urls.labTestList || '/lab-tests/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }}>Lab Tests</a>

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
