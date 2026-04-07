import React, { useState, useEffect } from 'react';

const LocationModal = ({ isMandatory, hasLocation, currentLocation, csrfToken, setLocationUrl }) => {
    const [isActive, setIsActive] = useState(false);
    const [detecting, setDetecting] = useState(false);

    useEffect(() => {
        // Auto-open if location is mandatory but not set
        if (isMandatory && !hasLocation) {
            setIsActive(true);
        }

        // Listen for open events triggered from outside React
        const handleOpenLocationModal = () => setIsActive(true);
        window.addEventListener('openLocationModal', handleOpenLocationModal);

        return () => {
            window.removeEventListener('openLocationModal', handleOpenLocationModal);
        };
    }, [isMandatory, hasLocation]);

    const handleClose = () => {
        if (isMandatory && !hasLocation) {
            return; // Cannot close if mandatory and not set
        }
        setIsActive(false);
    };

    const handleBackdropClick = (e) => {
        if (e.target.id === 'universalLocationModal') {
            handleClose();
        }
    };

    const detectLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setDetecting(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                    .then(res => res.json())
                    .then(data => {
                        const addr = data.address;
                        const city = addr.city || addr.town || addr.village || addr.suburb || addr.state_district || addr.county || addr.state;
                        
                        if (city) {
                            const form = document.getElementById('reactLocationForm');
                            if (form) {
                                form.querySelector('input[name="location"]').value = city;
                                form.submit();
                            }
                        } else {
                            alert("Could not determine city name from your location.");
                            setDetecting(false);
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        alert("Error retrieving location name from server.");
                        setDetecting(false);
                    });
            },
            (error) => {
                console.error(error);
                let msg = "Unable to retrieve your location.";
                if (error.code === 1) msg = "Location permission denied.";
                if (error.code === 2) msg = "Location unavailable.";
                if (error.code === 3) msg = "Location request timed out.";
                alert(msg + " Please ensure permission is granted.");
                setDetecting(false);
            },
            { timeout: 10000 }
        );
    };

    if (!isActive) return null;

    return (
        <div id="universalLocationModal" className={`modal-overlay active`} onClick={handleBackdropClick}>
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Select Location</h3>
                    <button id="closeModalBtn" onClick={handleClose} className="modal-close-btn">&times;</button>
                </div>

                <div className="modal-body">
                    <form id="reactLocationForm" action={setLocationUrl} method="post">
                        <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />
                        <div className="location-input-group">
                            <span className="search-icon"></span>
                            <input type="text" name="location" id="universalLocationInput"
                                placeholder="Search for city, area..." required autoComplete="off" autoFocus />
                        </div>
                    </form>

                    <div className="detect-location-btn" onClick={detectLocation}>
                        <div style={{fontSize: '1.4rem'}}></div>
                        <div>
                            {detecting ? (
                                <div style={{padding: '10px'}}>Detecting...</div>
                            ) : (
                                <>
                                    <div style={{lineHeight: 1.2}}>Use Current Location</div>
                                    <div style={{fontSize: '0.8rem', fontWeight: 400, color: '#666', marginTop: '2px'}}>Using GPS</div>
                                </>
                            )}
                        </div>
                    </div>

                    {currentLocation && (
                        <div className="saved-location">
                            <div style={{fontSize: '1.2rem', color: '#999'}}>✓</div>
                            <div>
                                <div style={{fontWeight: 500}}>{currentLocation}</div>
                                <div style={{fontSize: '0.8rem', color: '#999'}}>Selected Location</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LocationModal;
