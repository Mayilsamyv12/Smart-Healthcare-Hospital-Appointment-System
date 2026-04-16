import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

import Home from './pages/Home';
import HospitalList from './pages/HospitalList';
import DoctorList from './pages/DoctorList';
import PatientDashboard from './pages/PatientDashboard';
import PatientProfile from './pages/PatientProfile';
import DoctorLogin from './pages/DoctorLogin';
import DoctorAdminPanel from './pages/DoctorAdminPanel';

// DjangoPage: renders server-side Django content for non-React routes
const DjangoPage = () => {
    const containerRef = React.useRef(null);
    React.useEffect(() => {
        const djangoHtml = document.getElementById('django-server-content');
        if (djangoHtml && containerRef.current) {
            djangoHtml.style.display = 'block';
            containerRef.current.appendChild(djangoHtml);
        }
        return () => {
            if (djangoHtml) {
                djangoHtml.style.display = 'none';
                document.body.appendChild(djangoHtml);
            }
        };
    }, []);
    return <div ref={containerRef}></div>;
};

// Layout wrapper — wraps standard pages with Navbar/Sidebar/Footer
const PageLayout = ({ children, urls, context }) => (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar urls={urls} context={context} />
        <Sidebar urls={urls} context={context} />
        <main className="container" style={{ flex: 1 }}>
            {children}
        </main>
        <Footer urls={urls} />
    </div>
);

const App = () => {
    const [context] = useState({
        isAuthenticated: window.DjangoContext?.isAuthenticated || false,
        userLocation: window.DjangoContext?.userLocation || '',
        cartCount: window.DjangoContext?.cartCount || 0,
        hospitalSpecialties: window.DjangoContext?.hospitalSpecialties || [],
        doctorSpecialties: window.DjangoContext?.doctorSpecialties || [],
        labCategories: window.DjangoContext?.labCategories || [],
    });

    const urls = window.DjangoUrls || {};

    return (
        <Router>
            <Routes>
                {/* Doctor Login — full-screen, NO navbar/sidebar */}
                <Route path="/doctor-login" element={<DoctorLogin />} />
                <Route path="/doctor-login/" element={<DoctorLogin />} />

                {/* Doctor Admin Panel — full-screen, isolated from patient layout */}
                <Route path="/doctor-panel" element={<DoctorAdminPanel context={context} />} />
                <Route path="/doctor-panel/" element={<DoctorAdminPanel context={context} />} />

                {/* Standard pages WITH Navbar + Sidebar + Footer */}
                <Route path="/*" element={
                    <PageLayout urls={urls} context={context}>
                        <Routes>
                            <Route path="/" element={<Home context={context} />} />
                            <Route path="/hospitals" element={<HospitalList context={context} />} />
                            <Route path="/doctors" element={<DoctorList context={context} />} />

                            {/* Patient Dashboard (detailed view) */}
                            <Route path="/patient/dashboard" element={<PatientDashboard context={context} />} />
                            <Route path="/patient/dashboard/" element={<PatientDashboard context={context} />} />

                            {/* Patient Profile (profile + completed appts + medicine orders + logout) */}
                            <Route path="/patient/profile" element={<PatientProfile context={context} />} />
                            <Route path="/patient/profile/" element={<PatientProfile context={context} />} />

                            {/* Fallback: Django-rendered pages */}
                            <Route path="*" element={<DjangoPage />} />
                        </Routes>
                    </PageLayout>
                } />
            </Routes>
        </Router>
    );
};

export default App;
