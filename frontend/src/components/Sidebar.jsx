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
                <Link to="/" className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }} onClick={toggleSidebar}>Home</Link>

                <Link to={urls.hospitalList || '/hospitals/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }} onClick={toggleSidebar}>Hospitals</Link>

                <Link to={urls.doctorList || '/doctors/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }} onClick={toggleSidebar}>Doctors</Link>

                <Link to={urls.labTestList || '/lab-tests/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }} onClick={toggleSidebar}>Labs</Link>

                <Link to={urls.medicineList || '/medicines/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem', marginTop: '0.5rem' }} onClick={toggleSidebar}>Medicine Orders</Link>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0.8rem 0' }} />

                {context.isAuthenticated ? (
                    <>
                        <Link to="/patient/profile" className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }} onClick={toggleSidebar}>My Profile</Link>
                        <Link to={urls.reminderList || '/reminders/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }} onClick={toggleSidebar}>Reminder</Link>
                        <Link to={urls.cart || '/commerce/cart/'} className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }} onClick={toggleSidebar}>
                            Cart
                        </Link>
                    </>
                ) : (
                    <>
                        <Link to="/users/login/" className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }} onClick={toggleSidebar}>Login</Link>
                        <Link to="/users/register/" className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }} onClick={toggleSidebar}>Register</Link>
                    </>
                )}
                {context.isStaff && (
                    <>
                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0.8rem 0' }} />
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Admin Portals</div>
                        <Link to="/doctor-panel/" className="nav-item" style={{ display: 'block', marginBottom: '0.5rem' }} onClick={toggleSidebar}>Doctor Dashboard</Link>
                        <Link to="/lab-panel/" className="nav-item" style={{ display: 'block', marginBottom: '1.5rem' }} onClick={toggleSidebar}>Lab Dashboard</Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
