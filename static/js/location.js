
document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('universalLocationModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const locationInput = document.getElementById('universalLocationInput');
    const detectBtn = document.querySelector('.location-option[onclick="detectLocationUniversal()"]');

    // Open Modal Function
    window.openLocationModal = function () {
        modal.classList.add('active');
        locationInput.focus();
    }

    // Close Modal Function
    window.closeLocationModal = function () {
        // Check if mandatory (logic passed from template)
        if (window.isLocationMandatory && !window.hasLocationSet) {
            return; // Cannot close if mandatory and not set
        }
        modal.classList.remove('active');
    }

    // Close on outside click
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            window.closeLocationModal();
        }
    });

    // Detect Location Function
    window.detectLocationUniversal = function () {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        const originalText = detectBtn.innerHTML;
        detectBtn.innerHTML = '<div style="padding:1rem;">Detecting...</div>';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                // Use default Nominatim for demo
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                    .then(response => response.json())
                    .then(data => {
                        const city = data.address.city || data.address.town || data.address.village || data.address.county;
                        if (city) {
                            locationInput.value = city;
                            // Auto-submit the form
                            locationInput.form.submit();
                        } else {
                            alert("City not found in location data.");
                            detectBtn.innerHTML = originalText;
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        alert("Error retrieving location name.");
                        detectBtn.innerHTML = originalText;
                    });
            },
            (error) => {
                console.error(error);
                alert("Unable to retrieve your location. Please ensure permission is granted.");
                detectBtn.innerHTML = originalText;
            }
        );
    }
});
