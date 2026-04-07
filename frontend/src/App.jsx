import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

import Home from './pages/Home';

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
            <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar urls={urls} context={context} />
                <Sidebar urls={urls} context={context} />

                <main className="container" style={{ flex: 1 }}>
                    <Routes>
                        <Route path="/" element={<Home context={context} />} />
                        {/* Fallback: Django-rendered pages */}
                        <Route path="*" element={<DjangoPage />} />
                    </Routes>
                </main>

                <Footer urls={urls} />
            </div>
        </Router>
    );
};

export default App;
