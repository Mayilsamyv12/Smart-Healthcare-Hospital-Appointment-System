import React, { useEffect } from 'react';

const GlobalInteractions = () => {
    useEffect(() => {
        // --- Password Toggle ---
        window.togglePassword = (fieldId, icon) => {
            const input = document.getElementById(fieldId);
            if (!input) return;
            const openPath = icon.querySelector(".eye-open-path");
            const closedPath = icon.querySelector(".eye-closed-path");
            if (input.type === "password") {
                input.type = "text";
                if (openPath) openPath.style.display = "none";
                if (closedPath) closedPath.style.display = "block";
            } else {
                input.type = "password";
                if (openPath) openPath.style.display = "block";
                if (closedPath) closedPath.style.display = "none";
            }
        };

        // --- Kebabs & Modals (Reviews) ---
        window.toggleKebab = (btn) => {
            const menu = btn.nextElementSibling;
            const isOpen = menu.style.display === 'block';
            window.closeKebabs();
            if (!isOpen) {
                menu.style.display = 'block';
                btn.style.background = '#e2e8f0';
            }
        };

        window.closeKebabs = () => {
            document.querySelectorAll('.kebab-menu').forEach(m => m.style.display = 'none');
            document.querySelectorAll('.kebab-btn').forEach(b => b.style.background = '#f1f5f9');
        };

        const handleOutsideClick = (e) => {
            if (!e.target.closest('.kebab-wrap')) window.closeKebabs();
            
            // Close Modals on click outside
            ['callbackModal', 'editReviewModal'].forEach(id => {
                const modal = document.getElementById(id);
                if (modal && e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        };
        document.addEventListener('click', handleOutsideClick);

        window.openEditModal = (reviewId, rating, comment) => {
            const modal = document.getElementById('editReviewModal');
            if (modal) {
                const idInput = modal.querySelector('#editReviewId');
                const commentInput = modal.querySelector('#editComment');
                const form = modal.querySelector('form');
                if (idInput) idInput.value = reviewId;
                if (commentInput) commentInput.value = comment;
                if (form) form.action = '/reviews/' + reviewId + '/edit/';
                
                const stars = modal.querySelectorAll('.edit-star');
                const inputs = modal.querySelectorAll('input[name=rating]');
                stars.forEach((s, i) => { s.style.color = i < rating ? '#fbbf24' : '#d1d5db'; });
                if (inputs[rating - 1]) inputs[rating - 1].checked = true;
                
                modal.style.display = 'flex';
            }
        };

        // --- Star Rating Hover ---
        const handleStarMouseOver = (stars, idx) => {
            stars.forEach((s, i) => { s.style.color = i <= idx ? '#fbbf24' : '#d1d5db'; });
        };
        const handleStarClick = (stars, inputs, idx) => {
            if (inputs[idx]) inputs[idx].checked = true;
            stars.forEach((s, i) => { s.style.color = i <= idx ? '#fbbf24' : '#d1d5db'; });
        };
        const handleStarMouseLeave = (container, stars) => {
            const checked = container.querySelector('input:checked');
            if (checked) {
                const val = parseInt(checked.value);
                stars.forEach((s, i) => { s.style.color = i < val ? '#fbbf24' : '#d1d5db'; });
            } else {
                stars.forEach(s => { s.style.color = '#d1d5db'; });
            }
        };

        const setupStars = (selector) => {
            document.querySelectorAll(selector).forEach(container => {
                const stars = container.querySelectorAll('.star, .edit-star');
                const inputs = container.querySelectorAll('input[type=radio]');
                stars.forEach((star, idx) => {
                    star.addEventListener('mouseover', () => handleStarMouseOver(stars, idx));
                    star.addEventListener('click', () => handleStarClick(stars, inputs, idx));
                });
                container.addEventListener('mouseleave', () => handleStarMouseLeave(container, stars));
            });
        };
        setupStars('.star-rating');
        setupStars('.edit-star-container');

        // --- Generic Tab Switching ---
        window.switchTab = (tab) => {
            const panels = {
                'doctor': document.getElementById('panel-doctor'),
                'lab': document.getElementById('panel-lab')
            };
            const btns = {
                'doctor': document.getElementById('tab-doctor'),
                'lab': document.getElementById('tab-lab')
            };
            
            Object.keys(panels).forEach(k => {
                if (panels[k]) panels[k].style.display = k === tab ? 'block' : 'none';
                if (btns[k]) {
                    if (k === tab) btns[k].classList.add('active');
                    else btns[k].classList.remove('active');
                }
            });
        };

        // --- Home Page Voice Search ---
        window.handleVoiceSearch = () => {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                alert("Your browser does not support voice search.");
                return;
            }
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.start();
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const form = document.getElementById('home-search-form');
                if(form) {
                    const input = form.querySelector('input[name="q"]');
                    if(input) input.value = transcript;
                    form.submit();
                }
            };
            recognition.onerror = (event) => { console.error("Speech recognition error", event.error); };
        };

        // --- Payment Fields Toggle ---
        window.togglePaymentFields = (method) => {
            const upiField = document.getElementById('upi-field');
            const cardField = document.getElementById('card-field');
            if(upiField) upiField.style.display = 'none';
            if(cardField) cardField.style.display = 'none';

            if (method === 'upi' && upiField) {
                upiField.style.display = 'block';
            } else if (method === 'card' && cardField) {
                cardField.style.display = 'block';
            }
        };

        // --- Base template functions ---
        window.openLocationModal = () => {
            window.dispatchEvent(new Event('openLocationModal'));
        };
        window.toggleSidebar = () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('active');
        };

        // --- Custom Callbacks cleanup ---
        return () => {
            document.removeEventListener('click', handleOutsideClick);
        };
    }, []);

    return null;
};

export default GlobalInteractions;
