import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

// Capture the true initial path before React Router performs any navigation
window.initialDjangoPath = window.location.pathname + window.location.search;
window.initialDjangoLoadHandled = false;

// Lazy load pages for performance and transition control
const Home = lazy(() => import('./pages/Home'));
const HospitalList = lazy(() => import('./pages/HospitalList'));
const DoctorList = lazy(() => import('./pages/DoctorList'));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
const PatientProfile = lazy(() => import('./pages/PatientProfile'));
const DoctorLogin = lazy(() => import('./pages/DoctorLogin'));
const DoctorAdminPanel = lazy(() => import('./pages/DoctorAdminPanel'));
const LabAdminPanel = lazy(() => import('./pages/LabAdminPanel'));
const LabLogin = lazy(() => import('./pages/LabLogin'));

// ScrollToTop component to reset viewport on navigation
const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

// Error Boundary for ultimate crash protection
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { 
        console.group("🔴 SPA Runtime Exception");
        console.error("Error:", error);
        console.error("Info:", errorInfo);
        console.groupEnd();
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px', textAlign: 'center', background: '#f8fafc', position: 'fixed', inset: 0, zIndex: 9999 }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🩹</div>
                    <h2 style={{ color: '#1e293b', fontWeight: 800 }}>Application Crashed</h2>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 24px' }}>Something unexpected happened. We've captured the error and are working to fix it.</p>
                    <button onClick={() => window.location.reload()} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 36px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 15px rgba(37,99,235,0.2)' }}>Reload Application</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const AppLoader = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', background: '#fff' }}>
        <div style={{ width: '50px', height: '50px', border: '5px solid #f3f3f3', borderTop: '5px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#1e293b', fontWeight: 600, fontSize: '1.1rem' }}>OneMeds Loading...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
);

// DjangoPage: renders server-side Django content for non-React routes via SPA fetches
const DjangoPage = ({ context, setContext }) => {
    const containerRef = React.useRef(null);
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(false);

    React.useEffect(() => {
        let active = true;
        setFetchError(false);

        const loadDjangoContent = async () => {
            if (!containerRef.current) return;

            const currentPath = location.pathname + location.search;
            
            // Handle initial load from server-rendered HTML
            if (!window.initialDjangoLoadHandled) {
                window.initialDjangoLoadHandled = true;
                const initialPath = window.initialDjangoPath || (window.location.pathname + window.location.search);
                
                if (currentPath === initialPath && document.getElementById('django-server-content')) {
                    const d = document.getElementById('django-server-content');
                    d.style.display = 'block';
                    containerRef.current.innerHTML = '';
                    containerRef.current.appendChild(d);
                    return;
                }
            }

            // SPA navigation branch
            setLoading(true);
            try {
                const res = await fetch(currentPath, { 
                    credentials: 'include',
                    headers: { 'X-SPA-Request': 'true' } 
                });
                
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                
                const htmlText = await res.text();
                if (!active) return;

                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
                const newServerContent = doc.getElementById('django-server-content');

                if (newServerContent && containerRef.current) {
                    newServerContent.style.display = 'block';
                    // We don't clear the previous content immediately to avoid "flashing" blank screens
                    const temp = document.createElement('div');
                    temp.innerHTML = newServerContent.innerHTML;
                    
                    // Cleanup and inject
                    containerRef.current.innerHTML = '';
                    containerRef.current.appendChild(temp);

                    // Execute scripts (crucial for Django interactive elements)
                    const scripts = containerRef.current.querySelectorAll('script');
                    scripts.forEach(oldScript => {
                        const newScript = document.createElement('script');
                        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                        newScript.textContent = oldScript.textContent;
                        oldScript.parentNode.replaceChild(newScript, oldScript);
                    });

                    // Sync metadata and context
                    if (doc.title) document.title = doc.title;
                    syncContext(doc);
                } else {
                    throw new Error("SPA target element missing");
                }
            } catch (err) {
                console.warn("SPA navigation failed, performing emergency reload", err);
                if (active) setFetchError(true);
                window.location.reload();
            } finally {
                if (active) setLoading(false);
            }
        };

        const syncContext = (doc) => {
            const docScripts = doc.querySelectorAll('script');
            docScripts.forEach(script => {
                const content = script.textContent;
                if (content.includes('window.DjangoContext = {')) {
                    const cartMatch = content.match(/cartCount:\s*parseInt\("(\d+)"/);
                    const reminderMatch = content.match(/reminderCount:\s*parseInt\("(\d+)"/);
                    const locationMatch = content.match(/userLocation:\s*"([^"]*)"/);

                    if (cartMatch || reminderMatch || locationMatch) {
                        setContext(prev => ({
                            ...prev,
                            cartCount: cartMatch ? parseInt(cartMatch[1], 10) : prev.cartCount,
                            reminderCount: reminderMatch ? parseInt(reminderMatch[1], 10) : prev.reminderCount,
                            userLocation: locationMatch ? decodeURIComponent(locationMatch[1]) : prev.userLocation,
                        }));
                    }
                }
            });
        };

        loadDjangoContent();
        return () => { active = false; };
    }, [location.pathname, location.search, setContext]);

    if (fetchError) return <AppLoader />;

    return (
        <>
            {loading && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', background: '#2563eb', zIndex: 9999, animation: 'loading-bar 2s ease-in-out infinite' }}>
                    <style>{`@keyframes loading-bar { 0% { left: -100%; width: 30%; } 100% { left: 100%; width: 10%; } }`}</style>
                </div>
            )}
            <div ref={containerRef} style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}></div>
        </>
    );
};

// Layout wrapper — wraps standard pages with Navbar/Sidebar/Footer
const PageLayout = ({ children, urls, context }) => (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar urls={urls} context={context} />
        <Sidebar urls={urls} context={context} />
        <main className="container" style={{ flex: 1 }}>
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </main>
        <Footer urls={urls} />
    </div>
);

const AppRoutes = () => {
    const navigate = useNavigate();
    const [context, setContext] = useState({
        isAuthenticated: window.DjangoContext?.isAuthenticated || false,
        isStaff: window.DjangoContext?.isStaff || false,
        userLocation: window.DjangoContext?.userLocation || '',
        cartCount: window.DjangoContext?.cartCount || 0,
        reminderCount: window.DjangoContext?.reminderCount || 0,
    });

    const urls = window.DjangoUrls || {};

    // Global Link Interceptor: Intercepts traditional <a> clicks for SPA navigation
    useEffect(() => {
        const handleAnchorClick = (e) => {
            const anchor = e.target.closest('a');
            if (!anchor || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            
            const href = anchor.getAttribute('href');
            // Allow external links and special protocols to bypass SPA logic
            if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
            
            // Allow Django admin to bypass SPA logic
            if (href.startsWith('/admin/') || href.startsWith('/doctor-admin/')) return;
            
            // Bypass SPA for action links that require native 302 redirects
            if (href.includes('/add-to-cart/') || href.includes('/remove-from-cart/') || href.includes('/cart-update/')) return;

            e.preventDefault();
            navigate(href);
        };

        document.addEventListener('click', handleAnchorClick);
        return () => document.removeEventListener('click', handleAnchorClick);
    }, [navigate]);

    return (
        <Suspense fallback={<AppLoader />}>
            <Routes>
                {/* Full-screen routes */}
                <Route path="/doctor-login/*" element={<DoctorLogin />} />
                <Route path="/doctor-panel/*" element={<DoctorAdminPanel context={context} />} />
                <Route path="/lab-login/*" element={<LabLogin />} />
                <Route path="/lab-panel/*" element={<LabAdminPanel />} />

                {/* Main Layout routes */}
                <Route path="/*" element={
                    <PageLayout urls={urls} context={context}>
                        <Routes>
                            <Route path="/" element={<Home context={context} />} />
                            <Route path="/home/*" element={<Navigate to="/" replace />} />
                            <Route path="/hospitals/*" element={<HospitalList context={context} />} />
                            <Route path="/doctors/*" element={<DoctorList context={context} />} />
                            <Route path="/patient/dashboard/*" element={<PatientDashboard context={context} />} />
                            <Route path="/patient/profile/*" element={<PatientProfile context={context} />} />
                            <Route path="*" element={<DjangoPage context={context} setContext={setContext} />} />
                        </Routes>
                    </PageLayout>
                } />
            </Routes>
        </Suspense>
    );
};

const App = () => (
    <Router>
        <ScrollToTop />
        <ErrorBoundary>
            <AppRoutes />
        </ErrorBoundary>
    </Router>
);

export default App;
