import React, { useEffect } from 'react';

const NavigationHandler = () => {
    useEffect(() => {
        // Toggle Sidebar
        const handleSidebarToggle = () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('active');
        };

        const hamburgerLinks = document.querySelectorAll('.hamburger, .sidebar-close-btn');
        hamburgerLinks.forEach(link => {
            link.addEventListener('click', handleSidebarToggle);
        });

        // Dropdowns in Navbar
        const handleNavbarDropdown = (event) => {
            const currentLink = event.target.closest('.nav-icon-link');
            if (!currentLink) return;

            const dropdownId = currentLink.dataset.dropdownId;
            const dropdownDataUrl = currentLink.dataset.url;
            
            document.querySelectorAll('.navbar-dropdown-content').forEach(d => {
                if (d.id !== dropdownId) d.classList.remove('show');
            });
            const d = document.getElementById(dropdownId);
            if (!d) return;

            d.classList.toggle('show');

            if (d.classList.contains('show') && dropdownDataUrl) {
                fetch(dropdownDataUrl)
                    .then(res => {
                        if (res.status === 401) {
                            if (dropdownId === 'reminderDropdownNav') {
                                document.getElementById('liveReminderContent').innerHTML = 
                                    '<div style="color:var(--accent);">Please <a href="/login/">login</a> to see live reminders.</div>';
                            }
                            return null;
                        }
                        return res.json();
                    })
                    .then(data => {
                        if (!data) return;

                        if (dropdownId === 'reminderDropdownNav') {
                            let content = '';
                            if (data.appointments.length > 0) {
                                content += '<strong style="color:var(--primary);">Next Appointments</strong><ul style="padding-left:15px; margin-bottom:10px;">';
                                data.appointments.slice(0, 3).forEach(a => {
                                    content += `<li>${a.doctor} on ${a.date} at ${a.time}</li>`;
                                });
                                content += '</ul>';
                            } else {
                                content += '<div style="margin-bottom:10px;">No upcoming appointments.</div>';
                            }

                            if (data.orders.length > 0) {
                                content += '<strong style="color:var(--secondary);">Recent Orders</strong><ul style="padding-left:15px;">';
                                data.orders.slice(0, 3).forEach(o => {
                                    content += `<li>Order #${o.id} - ${o.status}</li>`;
                                });
                                content += '</ul>';
                            } else {
                                content += '<div>No active medicine orders.</div>';
                            }

                            const navContentNode = document.getElementById('liveReminderContent');
                            if (navContentNode) navContentNode.innerHTML = content;
                        }
                    })
                    .catch(err => {
                        console.error('Failed to fetch live data', err);
                    });
            }
        };

        document.querySelectorAll('.nav-icon-link').forEach(link => {
            link.addEventListener('click', handleNavbarDropdown);
        });

        // Close dropdown when clicking outside
        const handleOutsideClick = (event) => {
            if (!event.target.closest('.nav-item-dropdown') && !event.target.closest('.nav-icon-link')) {
                document.querySelectorAll('.navbar-dropdown-content').forEach(d => {
                    d.classList.remove('show');
                });
            }
        };
        document.addEventListener('click', handleOutsideClick);

        // Sidebar dropdown toggles
        const handleSidebarDropdown = (event) => {
            const dropdownLink = event.currentTarget;
            const targetId = dropdownLink.dataset.targetId;
            const content = document.getElementById(targetId);
            if (content) {
                content.classList.toggle('active');
            }
        };
        document.querySelectorAll('.nav-item-dropdown').forEach(d => {
            d.addEventListener('click', handleSidebarDropdown);
        });

        // Voice Search wrapper globally available
        window.startNavVoiceSearch = () => {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                alert("Your browser does not support voice search.");
                return;
            }
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.start();
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                const form = document.getElementById('nav-search-form');
                if (form) {
                    const input = form.querySelector('input[name="q"]');
                    input.value = transcript;
                    form.submit();
                }
            };
            
            recognition.onerror = function(event) {
                console.error("Speech recognition error", event.error);
            };
        };

        return () => {
            hamburgerLinks.forEach(link => link.removeEventListener('click', handleSidebarToggle));
            document.querySelectorAll('.nav-icon-link').forEach(link => link.removeEventListener('click', handleNavbarDropdown));
            document.removeEventListener('click', handleOutsideClick);
            document.querySelectorAll('.nav-item-dropdown').forEach(d => d.removeEventListener('click', handleSidebarDropdown));
        };
    }, []);

    return null; // This component handles vanilla JS event replacements
};

export default NavigationHandler;
