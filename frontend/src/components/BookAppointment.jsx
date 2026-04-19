import React, { useState } from 'react';

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
        if (!selectedTime) { return; }

        const createInput = (name, value) => {
            const input = document.createElement('input');
            input.type = 'hidden'; input.name = name; input.value = value;
            return input;
        };

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '';
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

    return (
        <form onSubmit={handlePayment} style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2.5rem', alignItems: 'start' }}>
            <div>
                <div className="form-card" style={{ padding: '2rem', border: '1px solid #eef2f6', marginBottom: '2.5rem' }}>
                    <h3 style={{ margin: '0 0 1.5rem', fontWeight: 800 }}>2. Available Time Slots</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '14px' }}>
                        {slots.map((slot, idx) => {
                            const available = slot.max_patients - slot.booked_count;
                            const isFull = available <= 0;
                            const isSel = selectedTime === slot.time;
                            return (
                                <button key={idx} type="button" disabled={isFull} onClick={() => setSelectedTime(slot.time)}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        padding: '14px', borderRadius: '16px', 
                                        border: `2px solid ${isSel ? '#2563eb' : (isFull ? '#f1f5f9' : '#e2e8f0')}`,
                                        background: isSel ? '#eff6ff' : (isFull ? '#f8fafc' : 'white'), 
                                        cursor: isFull ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        transform: isSel ? 'scale(1.02)' : 'scale(1)',
                                        boxShadow: isSel ? '0 8px 20px rgba(37, 99, 235, 0.15)' : 'none'
                                    }}>
                                    <span style={{ fontWeight: 800, fontSize: '1rem', color: isSel ? '#1e40af' : (isFull ? '#94a3b8' : '#1e293b') }}>{slot.label}</span>
                                    <span style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: 600, color: isFull ? '#fda4af' : (isSel ? '#2563eb' : '#16a34a') }}>
                                        {isFull ? 'Booked' : `${available} slots left`}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="form-card" style={{ padding: '2.5rem', border: '1px solid #eef2f6', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                    <h3 style={{ margin: '0 0 1.5rem', fontWeight: 800, fontSize: '1.25rem' }}>3. Patient Information</h3>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>Full Name</label>
                        <input type="text" name="patient_name" value={patientDetails.patient_name} onChange={handleInputChange} className="form-input" required style={{ borderRadius: '12px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>Age</label>
                            <input type="number" name="patient_age" value={patientDetails.patient_age} onChange={handleInputChange} className="form-input" style={{ borderRadius: '12px' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>Contact Number</label>
                            <input type="text" name="patient_contact" value={patientDetails.patient_contact} onChange={handleInputChange} className="form-input" required style={{ borderRadius: '12px' }} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>Current Location</label>
                        <input type="text" name="patient_location" value={patientDetails.patient_location} onChange={handleInputChange} className="form-input" style={{ borderRadius: '12px' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>Reason for Visit</label>
                        <textarea name="patient_problem" value={patientDetails.patient_problem} onChange={handleInputChange} className="form-input" rows="4" style={{ borderRadius: '12px', resize: 'none' }} placeholder="Describe symptoms or medical history..."></textarea>
                    </div>
                </div>
            </div>

            <div style={{ position: 'sticky', top: '100px' }}>
                <div style={{ background: '#fff', borderRadius: '24px', padding: '2.5rem', border: '1px solid #eef2f6', boxShadow: '0 20px 50px rgba(0,0,0,0.08)' }}>
                    <h4 style={{ margin: '0 0 1.5rem', fontWeight: 800, fontSize: '1.2rem' }}>Summary</h4>
                    <div style={{ paddingBottom: '1.5rem', borderBottom: '1px dashed #e2e8f0', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.95rem' }}>
                            <span style={{ color: '#64748b' }}>Consultation</span>
                            <span style={{ fontWeight: 700 }}>₹{doctorFee}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                            <span style={{ color: '#64748b' }}>Booking Fee</span>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>₹0</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Total</span>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: '#2563eb' }}>₹{doctorFee}</span>
                    </div>
                    <button type="submit" disabled={!selectedTime}
                        style={{ 
                            width: '100%', padding: '16px', 
                            background: selectedTime ? 'linear-gradient(135deg, #2563eb, #1e40af)' : '#e2e8f0', 
                            color: 'white', border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '1.1rem',
                            cursor: selectedTime ? 'pointer' : 'not-allowed',
                            boxShadow: selectedTime ? '0 10px 25px rgba(37, 99, 235, 0.3)' : 'none',
                            transition: 'all 0.3s'
                         }}>
                        Confirm Booking
                    </button>
                    {!selectedTime && <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#ef4444', marginTop: '12px', fontWeight: 600 }}>Please select a time slot</p>}
                </div>
            </div>
        </form>
    );
};

export default BookAppointment;
