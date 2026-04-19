import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import LocationModal from './components/LocationModal';
import GlobalInteractions from './components/GlobalInteractions';
import BookAppointment from './components/BookAppointment';
import LabBooking from './components/LabBooking';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DoctorLogin from './pages/DoctorLogin';
import { AuthProvider } from './context/AuthContext';

const initReactApp = () => {
    const urls = window.DjangoUrls || {};
    const context = window.DjangoContext || {};

    // ── 0. Main SPA shell (home page) ──────────────────────────
    const appRoot = document.getElementById('react-app-root');
    if (appRoot) {
        createRoot(appRoot).render(
            <AuthProvider>
                <App />
            </AuthProvider>
        );
    }

    // ── 1. OTP Login page ───────────────────────────────────────
    const loginRoot = document.getElementById('react-login-root');
    if (loginRoot) {
        createRoot(loginRoot).render(
            <AuthProvider>
                <LoginPage />
            </AuthProvider>
        );
    }

    // ── 2. OTP Register page ────────────────────────────────────
    const registerRoot = document.getElementById('react-register-root');
    if (registerRoot) {
        createRoot(registerRoot).render(
            <AuthProvider>
                <RegisterPage />
            </AuthProvider>
        );
    }

    // ── 2b. Doctor Login (2-step: credentials + Doctor ID) ──────
    const doctorLoginRoot = document.getElementById('react-doctor-login-root');
    if (doctorLoginRoot) {
        createRoot(doctorLoginRoot).render(<DoctorLogin />);
    }

    // ── 3. Location Modal ───────────────────────────────────────
    const modalRoot = document.getElementById('react-location-modal-root');
    if (modalRoot) {
        const isMandatory = modalRoot.dataset.isMandatory === 'true';
        const hasLocation = modalRoot.dataset.hasLocation === 'true';
        const currentLocation = modalRoot.dataset.currentLocation || '';
        const csrfToken = modalRoot.dataset.csrfToken || '';
        const setLocationUrl = modalRoot.dataset.setLocationUrl || '';
        createRoot(modalRoot).render(
            <LocationModal
                isMandatory={isMandatory}
                hasLocation={hasLocation}
                currentLocation={currentLocation}
                csrfToken={csrfToken}
                setLocationUrl={setLocationUrl}
            />
        );
    }

    // ── 4. Global interactions (modals, stars, tabs, etc.) ──────
    const navRoot = document.getElementById('react-nav-handler-root');
    if (navRoot) {
        createRoot(navRoot).render(<GlobalInteractions />);
    }

    // ── 5. Book Appointment component ───────────────────────────
    const bookingRoot = document.getElementById('react-booking-root');
    if (bookingRoot) {
        try {
            const slots = JSON.parse(bookingRoot.dataset.slots || '[]');
            const selectedDate = bookingRoot.dataset.selectedDate || '';
            const doctorFee = bookingRoot.dataset.doctorFee || '0';
            const csrfToken = bookingRoot.dataset.csrfToken || '';
            const userDetails = JSON.parse(bookingRoot.dataset.userDetails || '{}');
            createRoot(bookingRoot).render(
                <BookAppointment
                    slots={slots}
                    selectedDate={selectedDate}
                    doctorFee={doctorFee}
                    csrfToken={csrfToken}
                    userDetails={userDetails}
                />
            );
        } catch (e) {
            console.error('Error parsing booking root data:', e);
        }
    }

    // ── 6. Lab Booking component ───────────────────────────
    const labBookingRoot = document.getElementById('react-lab-booking-root');
    if (labBookingRoot) {
        try {
            const slots = JSON.parse(labBookingRoot.dataset.slots || '[]');
            const selectedDate = labBookingRoot.dataset.selectedDate || '';
            const labFee = labBookingRoot.dataset.labFee || '0';
            const csrfToken = labBookingRoot.dataset.csrfToken || '';
            const userDetails = JSON.parse(labBookingRoot.dataset.userDetails || '{}');
            createRoot(labBookingRoot).render(
                <LabBooking
                    slots={slots}
                    selectedDate={selectedDate}
                    labFee={labFee}
                    csrfToken={csrfToken}
                    userDetails={userDetails}
                />
            );
        } catch (e) {
            console.error('Error parsing lab booking root data:', e);
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReactApp);
} else {
    initReactApp();
}
