import React, { useState, useEffect } from 'react';

const DoctorDashboard = ({ context }) => {
    const [appointments, setAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [isPrescribing, setIsPrescribing] = useState(false);
    const [diagnosis, setDiagnosis] = useState('');
    const [medicines, setMedicines] = useState([]);
    const [instructions, setInstructions] = useState('');

    useEffect(() => {
        // Fetch appointments using API (Placeholder for now)
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch('/api/appointments/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAppointments(data);
            }
        } catch (e) {
            console.error('Error fetching appointments', e);
        }
    };

    const updateStatus = async (apptId, newStatus) => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/appointments/${apptId}/update_status/`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                fetchAppointments(); // Refresh list to reflect changes
            } else {
                alert('Failed to update appointment status.');
            }
        } catch (e) {
            console.error('Error updating status', e);
        }
    };

    const handlePrescribe = (appt) => {
        setSelectedAppointment(appt);
        setIsPrescribing(true);
        setMedicines([]);
        setDiagnosis('');
        setInstructions('');
    };

    const handleAIGenerate = async () => {
        // Mock AI Generation based on symptom
        setDiagnosis('Common Cold / Viral Infection');
        setMedicines([
            { name: 'Paracetamol 500mg', dosage: '1-0-1', duration: '3 days' },
            { name: 'Cetirizine 10mg', dosage: '0-0-1', duration: '5 days' }
        ]);
        setInstructions('Drink plenty of warm water. Rest well.');
    };

    const savePrescription = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/appointments/${selectedAppointment.id}/complete_appointment/`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                }
            });
            if (res.ok) {
                alert('Appointment completed and prescription saved successfully!');
                setIsPrescribing(false);
                fetchAppointments(); // Refresh list
            }
        } catch (e) {
            console.error('Error saving prescription', e);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Doctor Dashboard</h2>
            <div className="appointments-list">
                <h3>Today's Appointments</h3>
                {appointments.length === 0 ? <p>No appointments found.</p> : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Time</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map(appt => (
                                <tr key={appt.id}>
                                    <td>{appt.patient_name || appt.user.username}</td>
                                    <td>{appt.time}</td>
                                    <td>
                                        <select 
                                            value={appt.status} 
                                            onChange={(e) => updateStatus(appt.id, e.target.value)}
                                            style={{ padding: '5px', borderRadius: '4px' }}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                    <td>
                                        {appt.status === 'Pending' && (
                                            <button className="btn btn-primary" onClick={() => handlePrescribe(appt)}>Complete & Prescribe</button>
                                        )}
                                        {appt.status === 'Completed' && (
                                            <span className="badge bg-success">Completed</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isPrescribing && (
                <div className="prescription-modal" style={{ 
                    position: 'fixed', top: '10%', left: '25%', width: '50%', 
                    background: '#fff', padding: '20px', boxShadow: '0 0 10px rgba(0,0,0,0.3)', zIndex: 1000 
                }}>
                    <h3>Generate Prescription for {selectedAppointment.patient_name || selectedAppointment.user.username}</h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <button className="btn btn-warning" onClick={handleAIGenerate}>✨ Smart AI Suggestion</button>
                    </div>

                    <div className="form-group">
                        <label>Diagnosis</label>
                        <input type="text" className="form-control" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label>Medicines</label>
                        {medicines.map((med, i) => (
                            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                                <input type="text" value={med.name} readOnly className="form-control" />
                                <input type="text" value={med.dosage} readOnly className="form-control" style={{ width: '100px' }} />
                                <input type="text" value={med.duration} readOnly className="form-control" style={{ width: '100px' }} />
                                <button className="btn btn-danger btn-sm" onClick={() => {
                                    setMedicines(medicines.filter((_, idx) => idx !== i));
                                }}>X</button>
                            </div>
                        ))}
                        <button className="btn btn-secondary btn-sm" onClick={() => setMedicines([...medicines, { name: 'New Med', dosage: '1-0-0', duration: '1 day' }])}>+ Add Medicine</button>
                    </div>

                    <div className="form-group">
                        <label>Instructions</label>
                        <textarea className="form-control" value={instructions} onChange={e => setInstructions(e.target.value)}></textarea>
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button className="btn btn-secondary" onClick={() => setIsPrescribing(false)}>Cancel</button>
                        <button className="btn btn-success" onClick={savePrescription}>Save Prescription</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard;
