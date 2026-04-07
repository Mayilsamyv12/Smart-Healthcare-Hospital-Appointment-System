import React from 'react';

const Footer = ({ urls }) => {
    return (
        <footer style={{ background: 'white', borderTop: '1px solid #eee', padding: '2rem 0', marginTop: '4rem' }}>
            <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                <div>
                    <h3 style={{ color: 'var(--primary)', margin: 0 }}>OneMeds</h3>
                    <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>Making healthcare accessible and efficient for everyone.</p>
                </div>
                <div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Quick Links</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        <li>
                            {/* About Us - Django page, use regular <a href> */}
                            <a href={urls.about || '/about/'} style={{ textDecoration: 'none', color: '#666', display: 'block', marginBottom: '0.5rem' }}>About Us</a>
                        </li>
                        <li>
                            <a href={urls.contact || '/contact/'} style={{ textDecoration: 'none', color: '#666', display: 'block', marginBottom: '0.5rem' }}>Contact Us</a>
                        </li>
                        <li>
                            <a href={urls.help || '/help/'} style={{ textDecoration: 'none', color: '#666', display: 'block', marginBottom: '0.5rem' }}>Help Center</a>
                        </li>
                    </ul>
                </div>
                <div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Legal</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        <li>
                            <a href={urls.terms || '/terms/'} style={{ textDecoration: 'none', color: '#666', display: 'block', marginBottom: '0.5rem' }}>Terms &amp; Conditions</a>
                        </li>
                        <li>
                            <a href={urls.privacy || '/privacy/'} style={{ textDecoration: 'none', color: '#666', display: 'block', marginBottom: '0.5rem' }}>Privacy Policy</a>
                        </li>
                    </ul>
                </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #eee', color: '#999', fontSize: '0.9rem' }}>
                &copy; 2026 OneMeds. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;
