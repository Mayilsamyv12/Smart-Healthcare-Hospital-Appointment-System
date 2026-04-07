import React, { useState, useEffect } from 'react';

const BookAppointment = ({ slots, selectedDate, doctorFee, csrfToken, userDetails }) => {
    const [selectedTime, setSelectedTime] = useState('');
    const [patientDetails, setPatientDetails] = useState({
        patient_name: userDetails.name || '',
        patient_age: userDetails.age || '',
        patient_contact: userDetails.contact || '',
        patient_location: userDetails.location || '',
        patient_problem: ''
    });
    const [paymentMode, setPaymentMode] = useState('Cash on hand');

    const handleInputChange = (e) => {
        setPatientDetails({ ...patientDetails, [e.target.name]: e.target.value });
    };

    const handlePayment = (e) => {
        e.preventDefault();

        // Form validation is done by the native browser if we use a form ref, but here we enforce required
        if (!selectedTime) {
            alert('Please select a time slot.');
            return;
        }
        if (!patientDetails.patient_name || !patientDetails.patient_contact) {
            alert('Patient name and contact are required.');
            return;
        }

        const submitForm = () => {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '';
            
            const createInput = (name, value) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.value = value;
                return input;
            };

            form.appendChild(createInput('csrfmiddlewaretoken', csrfToken));
            form.appendChild(createInput('date', selectedDate));
            form.appendChild(createInput('time', selectedTime));
            form.appendChild(createInput('patient_name', patientDetails.patient_name));
            form.appendChild(createInput('patient_age', patientDetails.patient_age));
            form.appendChild(createInput('patient_contact', patientDetails.patient_contact));
            form.appendChild(createInput('patient_location', patientDetails.patient_location));
            form.appendChild(createInput('patient_problem', patientDetails.patient_problem));
            form.appendChild(createInput('payment_mode', paymentMode));

            document.body.appendChild(form);
            form.submit();
        };

        if (paymentMode === 'Razorpay') {
            const options = {
                "key": "rzp_test_mock_key_only",
                "amount": parseFloat(doctorFee) * 100,
                "currency": "INR",
                "name": "Health App",
                "description": "Consultation Fee",
                "handler": function (response) {
                    submitForm();
                },
                "prefill": {
                    "name": patientDetails.patient_name,
                    "contact": patientDetails.patient_contact
                },
                "theme": { "color": "#2563eb" }
            };

            // Temporary mock bypass
            setTimeout(() => {
                if(window.confirm(`This is a simulated Razorpay Modal for test keys.\nAmount: ₹${doctorFee}\nConfirm payment?`)) {
                    submitForm();
                }
            }, 500);

            // In real scenario:
            // const rzp = new window.Razorpay(options);
            // rzp.on('payment.failed', function (response) {
            //     alert('Payment failed. Please try again or choose Cash on Hand.');
            // });
            // rzp.open();
        } else {
            submitForm();
        }
    };

    return (
        <form id="bookingForm" onSubmit={handlePayment}>
            <label className="form-label" style={{marginTop: '2rem'}}>Select Time Slot:</label>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', marginBottom: '2.5rem'}}>
                {slots.map((slot, idx) => (
                    slot.is_booked ? (
                        <button key={idx} type="button" disabled
                            style={{padding: '12px', border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#cbd5e1', borderRadius: '8px', cursor: 'not-allowed', fontWeight: 500}}>
                            {slot.label}
                        </button>
                    ) : (
                        <button key={idx} type="button" 
                            onClick={() => setSelectedTime(slot.time)}
                            style={{
                                padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500,
                                background: selectedTime === slot.time ? 'var(--primary)' : 'white',
                                color: selectedTime === slot.time ? 'white' : 'var(--text-main)',
                                border: '1px solid ' + (selectedTime === slot.time ? 'var(--primary)' : '#e2e8f0'),
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                            {slot.label}
                        </button>
                    )
                ))}
            </div>

            <div style={{marginTop: '1.5rem', background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left'}}>
                <h3 style={{marginBottom: '1rem', color: '#333', fontSize: '1.1rem'}}>Patient Details</h3>
                
                <div className="form-group">
                    <label className="form-label">Patient Name:</label>
                    <input type="text" name="patient_name" value={patientDetails.patient_name} onChange={handleInputChange} className="form-input" required />
                </div>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                    <div className="form-group">
                        <label className="form-label">Age:</label>
                        <input type="number" name="patient_age" value={patientDetails.patient_age} onChange={handleInputChange} className="form-input" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Contact:</label>
                        <input type="text" name="patient_contact" value={patientDetails.patient_contact} onChange={handleInputChange} className="form-input" required />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Location:</label>
                    <input type="text" name="patient_location" value={patientDetails.patient_location} onChange={handleInputChange} className="form-input" />
                </div>

                <div className="form-group">
                    <label className="form-label">Problem Description:</label>
                    <textarea name="patient_problem" value={patientDetails.patient_problem} onChange={handleInputChange} className="form-input" rows="3" placeholder="Describe your health issue"></textarea>
                </div>
                
                <hr style={{border: 0, borderTop: '1px solid #e2e8f0', margin: '1.5rem 0'}} />
                
                <h3 style={{marginBottom: '1rem', color: '#333', fontSize: '1.1rem'}}>Payment Options</h3>
                <div className="form-group" style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <input type="radio" name="payment_mode" value="Cash on hand" checked={paymentMode === 'Cash on hand'} onChange={() => setPaymentMode('Cash on hand')} />
                        <span>Cash on Hand</span>
                    </label>
                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <input type="radio" name="payment_mode" value="Razorpay" checked={paymentMode === 'Razorpay'} onChange={() => setPaymentMode('Razorpay')} />
                        <span style={{display: 'flex', alignItems: 'center', gap: '0.3rem'}}>
                            Razorpay
                            <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" alt="Razorpay" style={{height: '16px'}} />
                        </span>
                    </label>
                </div>
            </div>

            <div style={{marginTop: '1.5rem', marginBottom: '2rem', padding: '1.5rem', background: '#f0f9ff', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{color: '#0c4a6e', fontWeight: 600}}>Consultation Fee</span>
                <span style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)'}}>₹{doctorFee}</span>
            </div>

            <button type="submit" id="confirmBtn" className="btn btn-primary"
                style={{width: '100%', padding: '1rem', fontSize: '1.1rem', opacity: selectedTime ? 1 : 0.5, pointerEvents: selectedTime ? 'auto' : 'none', transition: 'all 0.3s'}}>
                Confirm Booking
            </button>
        </form>
    );
};

export default BookAppointment;
