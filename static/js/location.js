
document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('universalLocationModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const locationInput = document.getElementById('universalLocationInput');
    // const detectBtn = document.querySelector('.detect-location-btn'); // Moved inside function

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
        console.log("Detect location clicked");
        // alert("Starting location detection..."); // Uncomment for debug if needed

        const btn = document.querySelector('.detect-location-btn');
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        const originalText = btn ? btn.innerHTML : 'Use Current Location';
        if (btn) btn.innerHTML = '<div style="padding:10px;">Detecting...</div>';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                // alert("Got coordinates!");
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                // Use default Nominatim for demo
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                    .then(response => response.json())
                    .then(data => {
                        console.log("Location Data:", data);
                        const addr = data.address;
                        const city = addr.city || addr.town || addr.village || addr.suburb || addr.state_district || addr.county || addr.state;

                        if (city) {
                            // alert("Found city: " + city);
                            if (locationInput) {
                                locationInput.value = city;
                                locationInput.form.submit();
                            } else {
                                alert("Error: Input field not found.");
                            }
                        } else {
                            alert("Could not determine city name from your location.");
                            if (btn) btn.innerHTML = originalText;
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        alert("Error retrieving location name from server.");
                        if (btn) btn.innerHTML = originalText;
                    });
            },
            (error) => {
                console.error(error);
                let msg = "Unable to retrieve your location.";
                if (error.code === 1) msg = "Location permission denied.";
                if (error.code === 2) msg = "Location unavailable.";
                if (error.code === 3) msg = "Location request timed out.";
                alert(msg + " Please ensure permission is granted.");
                if (btn) btn.innerHTML = originalText;
            },
            { timeout: 10000 }
        );
    }
});
