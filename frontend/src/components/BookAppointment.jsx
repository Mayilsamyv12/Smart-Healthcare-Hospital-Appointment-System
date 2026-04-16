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
            document.body.appendChild(form);
            form.submit();
        };

        submitForm();
    };

    return (
        <form id="bookingForm" onSubmit={handlePayment}>
            <label className="form-label" style={{marginTop: '2rem'}}>Select Time Slot:</label>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', marginBottom: '2.5rem'}}>
                {slots.map((slot, idx) => {
                    const available = slot.max_patients - slot.booked_count;
                    const isFullyBooked = available <= 0;
                    const fillingUp = available > 0 && available < slot.max_patients;
                    
                    if (isFullyBooked) {
                        return (
                            <div key={idx} style={{display: 'flex', flexDirection: 'column'}}>
                                <button type="button" disabled
                                    style={{padding: '10px', border: '1px solid #fecdd3', background: '#fff1f2', color: '#fda4af', borderRadius: '8px', cursor: 'not-allowed', fontWeight: 600}}>
                                    {slot.label}
                                </button>
                                <span style={{fontSize: '0.7rem', color: '#be123c', textAlign: 'center', marginTop: '4px'}}>Full</span>
                            </div>
                        );
                    }

                    return (
                        <div key={idx} style={{display: 'flex', flexDirection: 'column'}}>
                            <button type="button" 
                                onClick={() => setSelectedTime(slot.time)}
                                style={{
                                    padding: '10px', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer', 
                                    transition: 'all 0.2s', 
                                    fontWeight: 600,
                                    background: selectedTime === slot.time ? 'var(--primary)' : 'white',
                                    color: selectedTime === slot.time ? 'white' : 'var(--text-main)',
                                    border: '1px solid ' + (selectedTime === slot.time ? 'var(--primary)' : (fillingUp ? '#fdba74' : '#86efac')),
                                    boxShadow: selectedTime === slot.time ? '0 4px 10px rgba(x,x,x,0.1)' : '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                {slot.label}
                            </button>
                            <span style={{fontSize: '0.7rem', color: fillingUp ? '#ea580c' : '#16a34a', textAlign: 'center', marginTop: '4px', fontWeight: 600}}>
                                {available} {available === 1 ? 'slot' : 'slots'} left
                            </span>
                        </div>
                    );
                })}
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
