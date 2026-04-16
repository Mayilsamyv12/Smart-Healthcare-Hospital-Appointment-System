import React, { useState, useEffect, useRef } from 'react';
import './DoctorAdminPanel.css';

/* ─── Helper ─────────────────────────────────────────── */
const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
};

const apiFetch = (url, opts = {}) => {
    const token = localStorage.getItem('access_token');
    const csrfToken = getCookie('csrftoken');
    const headers = { 
        ...(opts.headers || {}), 
        Authorization: token ? `Bearer ${token}` : undefined,
    };
    if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
    }
    return fetch(url, { ...opts, headers, credentials: 'include' });
};

/* ─── Sub-components ──────────────────────────────────── */
const StatusBadge = ({ s }) => {
    const colors = {
        Pending:   { bg: '#fff7ed', c: '#c2410c' },
        Completed: { bg: '#f0fdf4', c: '#15803d' },
        Cancelled: { bg: '#f8fafc', c: '#64748b' },
    };
    const st = colors[s] || colors.Cancelled;
    return (
        <span style={{ background: st.bg, color: st.c, borderRadius: '20px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
            {s}
        </span>
    );
};

/* ═══════════════════════════════════════════════════════
   PRESCRIPTION MODAL
═══════════════════════════════════════════════════════ */
const PrescriptionModal = ({ appt, templates, onClose, onSaved, onTemplatesSaved }) => {
    // 'template' | 'upload'
    const [mode, setMode] = useState('template');
    const [step, setStep] = useState('form'); // 'form' | 'save-template'
    const [saving, setSaving] = useState(false);

    /* Template form state */
    const [templateName, setTemplateName] = useState('');
    const [symptoms, setSymptoms] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [medicines, setMedicines] = useState([{ name: '', dosage: '', duration: '' }]);
    const [instructions, setInstructions] = useState('Drink plenty of water\nTake rest\nFollow diet instructions');
    const [labTests, setLabTests] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    /* Upload mode */
    const [rxFile, setRxFile] = useState(null);
    const [rxFilePreview, setRxFilePreview] = useState(null);
    const rxFileRef = useRef();

    /* Load template into form */
    const loadTemplate = (tId) => {
        setSelectedTemplateId(tId);
        const t = templates.find(t => String(t.id) === String(tId));
        if (!t) return;
        setDiagnosis(t.diagnosis || '');
        setMedicines(t.medicines?.length ? t.medicines : [{ name: '', dosage: '', duration: '' }]);
        setInstructions(t.instructions || '');
        setLabTests(t.lab_tests || '');
    };

    const addMed = () => setMedicines(prev => [...prev, { name: '', dosage: '', duration: '' }]);
    const removeMed = idx => setMedicines(prev => prev.filter((_, i) => i !== idx));
    const updateMed = (idx, field, val) => {
        setMedicines(prev => {
            const n = [...prev];
            n[idx] = { ...n[idx], [field]: val };
            return n;
        });
    };

    /* Pre-fill if editing existing prescription */
    useEffect(() => {
        if (appt?.prescription) {
            const rx = appt.prescription;
            setMode(rx.generate_method || 'template');
            setSymptoms(rx.symptoms || '');
            setDiagnosis(rx.diagnosis || '');
            setMedicines(rx.medicines?.length ? rx.medicines : [{ name: '', dosage: '', duration: '' }]);
            setInstructions(rx.instructions || '');
            setLabTests(rx.lab_tests || '');
            setFollowUpDate(rx.follow_up_date || '');
        }
    }, [appt]);

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setRxFile(f);
        if (f.type.startsWith('image/')) {
            setRxFilePreview(URL.createObjectURL(f));
        } else {
            setRxFilePreview(null);
        }
    };

    /* ── Save prescription (complete appointment) ── */
    const handleSave = async () => {
        if (mode === 'template' && !diagnosis.trim()) {
            alert('Diagnosis is required to generate a prescription.');
            return;
        }
        if (mode === 'upload' && !rxFile) {
            alert('Please upload a prescription file (image or PDF).');
            return;
        }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('generate_method', mode);
            fd.append('symptoms', symptoms);
            fd.append('diagnosis', diagnosis);
            fd.append('instructions', instructions);
            fd.append('lab_tests', labTests);
            if (followUpDate) fd.append('follow_up_date', followUpDate);
            if (mode === 'template') {
                fd.append('medicines', JSON.stringify(medicines));
            } else if (rxFile) {
                fd.append('prescription_file', rxFile);
            }

            const res = await apiFetch(`/api/appointments/${appt.id}/complete/`, {
                method: 'POST',
                body: fd,
            });
            if (res.ok) {
                onSaved();
                onClose();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save prescription.');
            }
        } catch (e) {
            alert('Network error.');
        } finally {
            setSaving(false);
        }
    };

    /* ── Save template ── */
    const saveTemplate = async () => {
        if (!templateName.trim()) { alert('Enter a template name.'); return; }
        if (!diagnosis.trim()) { alert('Diagnosis is required to save a template.'); return; }
        setSaving(true);
        try {
            const body = JSON.stringify({ name: templateName, diagnosis, medicines, instructions, lab_tests: labTests });
            const res = await apiFetch('/api/prescription-templates/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            });
            if (res.ok) {
                const tpl = await res.json();
                onTemplatesSaved(tpl);
                setStep('form');
                setTemplateName('');
                alert('Template saved!');
            } else {
                alert('Failed to save template.');
            }
        } catch { alert('Network error.'); } finally { setSaving(false); }
    };

    /* ── AI suggest ── */
    const aiSuggest = () => {
        const p = (appt?.patient_problem || '').toLowerCase();
        if (p.includes('fever') || p.includes('headache')) {
            setDiagnosis('Viral Fever / Migraine');
            setMedicines([
                { name: 'Paracetamol 650mg', dosage: '1-0-1', duration: '3 Days' },
                { name: 'Pantoprazole 40mg', dosage: '1-0-0 (Before Food)', duration: '5 Days' },
            ]);
            setInstructions('Drink plenty of fluids. Bed rest for 3 days.');
        } else if (p.includes('cough') || p.includes('cold')) {
            setDiagnosis('Upper Respiratory Infection');
            setMedicines([
                { name: 'Cetirizine 10mg', dosage: '0-0-1', duration: '5 Days' },
                { name: 'Ascoril LS Syrup', dosage: '5ml × 3/day', duration: '5 Days' },
            ]);
            setInstructions('Avoid cold drinks. Steam inhalation twice daily.');
        } else {
            setDiagnosis('General Health Assessment');
            setMedicines([{ name: 'Multivitamin', dosage: '0-1-0', duration: '30 Days' }]);
            setInstructions('Maintain balanced diet and regular exercise.');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.35rem' }}>📋 Generate Prescription</h3>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                            Patient: <strong>{appt?.patient_name || appt?.user?.username}</strong>
                            {appt?.patient_age ? ` · ${appt.patient_age} yrs` : ''}
                            {appt?.patient_problem ? ` · ${appt.patient_problem}` : ''}
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {/* Mode Toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                    {[['template', 'Create / Use Template'], ['upload', '📎 Upload File (Image / PDF)']].map(([m, lbl]) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            style={{
                                padding: '8px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem',
                                cursor: 'pointer', transition: 'all 0.2s', border: '1.5px solid',
                                background: mode === m ? 'linear-gradient(135deg, #6366f1, #a855f7)' : '#f8fafc',
                                color: mode === m ? '#fff' : '#475569',
                                borderColor: mode === m ? '#6366f1' : '#e2e8f0',
                            }}
                        >{lbl}</button>
                    ))}
                </div>

                {/* ─── TEMPLATE MODE ─── */}
                {mode === 'template' && (
                    <>
                        {/* Load from saved template */}
                        {templates.length > 0 && (
                            <div className="form-section" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
                                <label className="form-label">Load Saved Template</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <select
                                        className="premium-input"
                                        style={{ flex: 1 }}
                                        value={selectedTemplateId}
                                        onChange={e => loadTemplate(e.target.value)}
                                    >
                                        <option value="">— Select a template —</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Symptoms */}
                        <div className="form-section">
                            <label className="form-label">Symptoms / Chief Complaints</label>
                            <textarea className="premium-textarea" rows={2}
                                placeholder="Describe patient symptoms…"
                                value={symptoms} onChange={e => setSymptoms(e.target.value)} />
                        </div>

                        {/* Diagnosis */}
                        <div className="form-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label className="form-label" style={{ margin: 0 }}>Diagnosis <span style={{ color: '#ef4444' }}>*</span></label>
                                <span className="ai-hint" onClick={aiSuggest}>AI Suggest</span>
                            </div>
                            <input className="premium-input" type="text"
                                placeholder="e.g. Acute Bronchitis"
                                value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                        </div>

                        {/* Medicines */}
                        <div className="form-section">
                            <label className="form-label">Medicines &amp; Dosage</label>
                            {medicines.map((med, idx) => (
                                <div key={idx} className="medicine-row">
                                    <input className="premium-input" placeholder="Medicine Name"
                                        value={med.name} onChange={e => updateMed(idx, 'name', e.target.value)} />
                                    <input className="premium-input" placeholder="Dosage (1-0-1)"
                                        value={med.dosage} onChange={e => updateMed(idx, 'dosage', e.target.value)} />
                                    <input className="premium-input" placeholder="Duration"
                                        value={med.duration} onChange={e => updateMed(idx, 'duration', e.target.value)} />
                                    <button className="close-btn" style={{ color: '#ef4444' }} onClick={() => removeMed(idx)}>×</button>
                                </div>
                            ))}
                            <button className="action-btn outline" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }} onClick={addMed}>
                                + Add Medicine
                            </button>
                        </div>

                        <div className="form-section">
                            <label className="form-label">Investigations / Lab Tests</label>
                            <textarea className="premium-textarea" rows={2}
                                placeholder="e.g. CBC, Blood Sugar, Chest X-Ray..."
                                value={labTests} onChange={e => setLabTests(e.target.value)} />
                        </div>

                        <div className="form-section">
                            <label className="form-label">Special Instructions / Advice</label>
                            <textarea className="premium-textarea" rows={2}
                                placeholder="Diet, follow-up, precautions…"
                                value={instructions} onChange={e => setInstructions(e.target.value)} />
                        </div>

                        <div className="form-section">
                            <label className="form-label">Follow-up Visit Date</label>
                            <input className="premium-input" type="date"
                                value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                        </div>

                        {/* Save Template Option */}
                        {step === 'save-template' && (
                            <div className="form-section" style={{ border: '1.5px dashed #6366f1', background: '#faf5ff' }}>
                                <label className="form-label">Save as Template</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input className="premium-input" placeholder="Template name (e.g. Viral Fever Protocol)"
                                        value={templateName} onChange={e => setTemplateName(e.target.value)} />
                                    <button className="action-btn prescribe" style={{ whiteSpace: 'nowrap' }} onClick={saveTemplate} disabled={saving}>
                                        {saving ? 'Saving…' : 'Save Template'}
                                    </button>
                                    <button className="action-btn outline" onClick={() => setStep('form')}>Cancel</button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ─── UPLOAD MODE ─── */}
                {mode === 'upload' && (
                    <div className="form-section" style={{ textAlign: 'center', padding: '2rem' }}>
                        <div
                            onClick={() => rxFileRef.current.click()}
                            style={{
                                border: '2px dashed #6366f1', borderRadius: '12px', padding: '2rem',
                                cursor: 'pointer', background: '#faf5ff', marginBottom: '1rem',
                                transition: 'all 0.2s',
                            }}
                        >
                            {rxFilePreview ? (
                                <img src={rxFilePreview} alt="Preview" style={{ maxHeight: '200px', borderRadius: '8px' }} />
                            ) : rxFile ? (
                                <div>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📄</div>
                                    <div style={{ fontWeight: 600, color: '#6366f1' }}>{rxFile.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{(rxFile.size / 1024).toFixed(1)} KB</div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📎</div>
                                    <div style={{ fontWeight: 600, color: '#6366f1' }}>Click to Upload Prescription</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Supports JPG, PNG, PDF</div>
                                </div>
                            )}
                        </div>
                        <input ref={rxFileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                        {rxFile && (
                            <button className="action-btn outline" onClick={() => { setRxFile(null); setRxFilePreview(null); }}>
                                ✕ Remove File
                            </button>
                        )}
                        <div className="form-section" style={{ textAlign: 'left', marginTop: '1rem', padding: '1rem' }}>
                            <label className="form-label">Additional Notes (Optional)</label>
                            <textarea className="premium-textarea" rows={2}
                                placeholder="Any notes about this prescription…"
                                value={instructions} onChange={e => setInstructions(e.target.value)} />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        {mode === 'template' && step === 'form' && (
                            <button className="action-btn outline" style={{ fontSize: '0.82rem' }} onClick={() => setStep('save-template')}>
                                Save as Template
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="action-btn outline" onClick={onClose}>Cancel</button>
                        <button className="action-btn prescribe" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : '✅ Complete & Save Prescription'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════
   RECORDS UPLOAD MODAL (optional, for completed appointments)
═══════════════════════════════════════════════════════ */
const RecordsUploadModal = ({ appt, onClose, onUploaded }) => {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [recordType, setRecordType] = useState('Lab Report');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const fileRef = useRef();
    const [preview, setPreview] = useState(null);

    const handleFile = e => {
        const f = e.target.files[0];
        setFile(f);
        if (f?.type?.startsWith('image/')) setPreview(URL.createObjectURL(f));
        else setPreview(null);
    };

    const handleUpload = async () => {
        if (!file) { alert('Please select a file.'); return; }
        if (!title.trim()) { alert('Please enter a title for this record.'); return; }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('appointment_id', appt.id);
            fd.append('title', title);
            fd.append('record_type', recordType);
            fd.append('notes', notes);
            fd.append('file', file);
            const res = await apiFetch('/api/medical-records/upload-for-appointment/', { method: 'POST', body: fd });
            if (res.ok) {
                onUploaded();
                onClose();
            } else {
                const err = await res.json();
                alert(err.error || 'Upload failed');
            }
        } catch { alert('Network error.'); } finally { setSaving(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 style={{ margin: 0 }}>Upload Medical Record</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    For: <strong>{appt?.patient_name || appt?.user?.username}</strong> · Appointment {appt?.date}
                </p>

                {/* File drop zone */}
                <div
                    onClick={() => fileRef.current.click()}
                    style={{
                        border: '2px dashed #0ea5e9', borderRadius: '12px', padding: '1.75rem',
                        textAlign: 'center', cursor: 'pointer', background: '#f0f9ff', marginBottom: '1.25rem',
                    }}
                >
                    {preview ? (
                        <img src={preview} alt="preview" style={{ maxHeight: '150px', borderRadius: '8px' }} />
                    ) : file ? (
                        <>
                            <div style={{ fontSize: '2rem' }}>📄</div>
                            <div style={{ fontWeight: 700, color: '#0ea5e9' }}>{file.name}</div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '2.5rem' }}>📎</div>
                            <div style={{ color: '#0ea5e9', fontWeight: 600 }}>Click to select file</div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>JPG, PNG, PDF accepted</div>
                        </>
                    )}
                </div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />

                <div className="form-section">
                    <label className="form-label">Record Title <span style={{ color: '#ef4444' }}>*</span></label>
                    <input className="premium-input" placeholder="e.g. CBC Report 14-Apr-2026"
                        value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="form-section">
                    <label className="form-label">Record Type</label>
                    <select className="premium-input" value={recordType} onChange={e => setRecordType(e.target.value)}>
                        {['Lab Report', 'X-Ray', 'Scan', 'Prescription', 'Other'].map(r => (
                            <option key={r}>{r}</option>
                        ))}
                    </select>
                </div>
                <div className="form-section">
                    <label className="form-label">Notes (Optional)</label>
                    <textarea className="premium-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button className="action-btn outline" onClick={onClose}>Cancel</button>
                    <button className="action-btn prescribe" onClick={handleUpload} disabled={saving}
                        style={{ background: 'linear-gradient(135deg,#0ea5e9,#2563eb)' }}>
                        {saving ? 'Uploading…' : '⬆ Upload Record'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════
   TEMPLATE MANAGER PANEL
═══════════════════════════════════════════════════════ */
const TemplateManager = ({ templates, onRefresh }) => {
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', diagnosis: '', medicines: [], instructions: '' });

    const handleCreateNew = () => {
        setCreating(true);
        setEditing(null);
        setForm({ name: '', diagnosis: '', medicines: [{ name: '', dosage: '', duration: '' }], instructions: '' });
    };

    const startEdit = t => {
        setEditing(t.id);
        setCreating(false);
        setForm({ name: t.name, diagnosis: t.diagnosis || '', medicines: t.medicines || [], instructions: t.instructions || '' });
    };

    const handleSaveNew = async () => {
        if (!form.name.trim() || !form.diagnosis.trim()) { alert('Name and diagnosis required.'); return; }
        setSaving(true);
        try {
            const res = await apiFetch('/api/prescription-templates/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) { onRefresh(); setCreating(false); }
            else alert('Creation failed.');
        } catch { alert('Network error.'); } finally { setSaving(false); }
    };

    const handleUpdate = async () => {
        if (!form.name.trim() || !form.diagnosis.trim()) { alert('Name and diagnosis required.'); return; }
        setSaving(true);
        try {
            const res = await apiFetch(`/api/prescription-templates/${editing}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) { onRefresh(); setEditing(null); }
            else alert('Update failed.');
        } catch { alert('Network error.'); } finally { setSaving(false); }
    };

    const handleDelete = async id => {
        if (!window.confirm('Delete this template?')) return;
        await apiFetch(`/api/prescription-templates/${id}/`, { method: 'DELETE' });
        onRefresh();
    };

    const addMed = () => setForm(f => ({ ...f, medicines: [...f.medicines, { name: '', dosage: '', duration: '' }] }));
    const updateMed = (idx, field, val) => {
        setForm(f => {
            const meds = [...f.medicines];
            meds[idx] = { ...meds[idx], [field]: val };
            return { ...f, medicines: meds };
        });
    };
    const removeMed = idx => setForm(f => ({ ...f, medicines: f.medicines.filter((_, i) => i !== idx) }));

    return (
        <div className="admin-content-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: 0 }}>My Prescription Protocols</h4>
                <button className="action-btn prescribe" onClick={handleCreateNew}>
                    + Create New Template
                </button>
            </div>

            {templates.length === 0 && !creating && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', background: '#fff', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
                    <p>No saved templates yet. Create your first clinical protocol to reuse in future prescriptions.</p>
                </div>
            )}

            {creating && (
                <div className="patient-card" style={{ marginBottom: '2rem', border: '2px solid var(--accent-color)' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Create New Protocol</h4>
                    <div className="form-section" style={{ background: '#fff' }}>
                        <label className="form-label">Template Title</label>
                        <input className="premium-input" placeholder="e.g. Chronic Hypertension Protocol"
                            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="form-section" style={{ background: '#fff' }}>
                        <label className="form-label">Diagnosis</label>
                        <input className="premium-input" placeholder="e.g. Essential Hypertension"
                            value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} />
                    </div>
                    <div className="form-section" style={{ background: '#fff' }}>
                        <label className="form-label">Medicines</label>
                        {form.medicines.map((m, idx) => (
                            <div key={idx} className="medicine-row">
                                <input className="premium-input" placeholder="Medicine" value={m.name} onChange={e => updateMed(idx, 'name', e.target.value)} />
                                <input className="premium-input" placeholder="Dosage" value={m.dosage} onChange={e => updateMed(idx, 'dosage', e.target.value)} />
                                <input className="premium-input" placeholder="Duration" value={m.duration} onChange={e => updateMed(idx, 'duration', e.target.value)} />
                                <button className="close-btn" style={{ color: '#ef4444' }} onClick={() => removeMed(idx)}>×</button>
                            </div>
                        ))}
                        <button className="action-btn outline" style={{ fontSize: '0.8rem' }} onClick={addMed}>+ Add Medicine</button>
                    </div>
                    <div className="form-section" style={{ background: '#fff' }}>
                        <label className="form-label">Instructions</label>
                        <textarea className="premium-textarea" rows={2} value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button className="action-btn prescribe" onClick={handleSaveNew} disabled={saving}>{saving ? 'Saving...' : '💾 Save Template'}</button>
                        <button className="action-btn outline" onClick={() => setCreating(false)}>Cancel</button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))' }}>
            {templates.map(t => (
                <div key={t.id} className="patient-card">
                    {editing === t.id ? (
                        <div>
                            <input className="premium-input" style={{ marginBottom: '0.5rem' }} placeholder="Template name"
                                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            <input className="premium-input" style={{ marginBottom: '0.5rem' }} placeholder="Diagnosis"
                                value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} />
                            {form.medicines.map((m, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '6px', marginBottom: '6px' }}>
                                    <input className="premium-input" placeholder="Medicine" value={m.name} onChange={e => updateMed(idx, 'name', e.target.value)} />
                                    <input className="premium-input" placeholder="Dosage" value={m.dosage} onChange={e => updateMed(idx, 'dosage', e.target.value)} />
                                    <input className="premium-input" placeholder="Duration" value={m.duration} onChange={e => updateMed(idx, 'duration', e.target.value)} />
                                    <button className="close-btn" style={{ color: '#ef4444' }} onClick={() => removeMed(idx)}>×</button>
                                </div>
                            ))}
                            <button className="action-btn outline" style={{ fontSize: '0.78rem', marginBottom: '0.5rem' }} onClick={addMed}>+ Medicine</button>
                            <textarea className="premium-textarea" rows={2} placeholder="Instructions"
                                value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                                <button className="action-btn prescribe" style={{ flex: 1, fontSize: '0.82rem' }} onClick={handleUpdate} disabled={saving}>
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </button>
                                <button className="action-btn outline" onClick={() => setEditing(null)}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>{t.name}</div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '8px' }}>{t.diagnosis}</div>
                            {t.medicines?.map((m, i) => (
                                <div key={i} style={{ background: '#f8fafc', borderRadius: '6px', padding: '5px 10px', marginBottom: '4px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                                    <span style={{ color: '#64748b' }}>{m.dosage} · {m.duration}</span>
                                </div>
                            ))}
                            {t.instructions && <div style={{ fontSize: '0.78rem', color: '#7c3aed', marginTop: '6px' }}>{t.instructions}</div>}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <button className="action-btn outline" style={{ flex: 1, fontSize: '0.82rem' }} onClick={() => startEdit(t)}>✏️ Edit</button>
                                <button className="action-btn outline" style={{ color: '#ef4444', borderColor: '#fee2e2', fontSize: '0.82rem' }} onClick={() => handleDelete(t.id)}>🗑</button>
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    </div>
    );
};


/* ═══════════════════════════════════════════════════════
   SCHEDULE & AVAILABILITY MANAGER
═══════════════════════════════════════════════════════ */
const ScheduleManager = ({ doctor, onUpdate }) => {
    const [form, setForm] = useState({
        shift_start_time: doctor?.shift_start_time || '09:00:00',
        shift_end_time: doctor?.shift_end_time || '12:00:00',
        slot_duration_minutes: doctor?.slot_duration_minutes || 15,
        patients_per_slot: doctor?.patients_per_slot || 3,
        available_days: (doctor?.available_days || '').split(',').map(d => d.trim()),
        unavailable_dates: doctor?.unavailable_dates || '',
        experience: doctor?.experience || 0,
        consultation_fee: doctor?.consultation_fee || 0,
    });
    const [saving, setSaving] = useState(false);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const toggleDay = (d) => {
        setForm(prev => ({
            ...prev,
            available_days: prev.available_days.includes(d)
                ? prev.available_days.filter(x => x !== d)
                : [...prev.available_days, d]
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        const payload = {
            ...form,
            available_days: form.available_days.join(', '),
            fallback_doctor_id: doctor.doctor_id
        };
        try {
            const res = await apiFetch('/api/doctor/profile/', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            setSaving(false);
            if (res.ok) {
                alert('Schedule updated! Changes are now live on the main website.');
                onUpdate();
            } else {
                const errMsg = data.error || data.detail || JSON.stringify(data);
                alert('Failed to update: ' + errMsg);
            }
        } catch (e) {
            setSaving(false);
            alert('Network error or invalid response.');
        }
    };

    return (
        <div className="admin-content-fade">
            <div className="schedule-grid">
                {/* Working Days */}
                <div className="patient-card" style={{ flex: 1 }}>
                    <h3 className="rx-subtitle">Weekly Working Days</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                        Select the days you are available for consultations on the main website.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {days.map(d => (
                            <button key={d}
                                onClick={() => toggleDay(d)}
                                className={`day-chip ${form.available_days.includes(d) ? 'active' : ''}`}>
                                {d}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Shift Hours */}
                <div className="patient-card" style={{ flex: 1 }}>
                    <h3 className="rx-subtitle">Shift & Capacity</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                        Configure your exact daily shift limits.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="form-section">
                            <label className="form-label">Shift Start Time</label>
                            <input type="time" className="premium-input"
                                value={form.shift_start_time.substring(0, 5)}
                                onChange={e => setForm({ ...form, shift_start_time: e.target.value + ':00' })} />
                        </div>
                        <div className="form-section">
                            <label className="form-label">Shift End Time</label>
                            <input type="time" className="premium-input"
                                value={form.shift_end_time.substring(0, 5)}
                                onChange={e => setForm({ ...form, shift_end_time: e.target.value + ':00' })} />
                        </div>
                        <div className="form-section">
                            <label className="form-label">Slot Duration (Mins)</label>
                            <input type="number" className="premium-input"
                                value={form.slot_duration_minutes}
                                onChange={e => setForm({ ...form, slot_duration_minutes: parseInt(e.target.value) || 15 })} />
                        </div>
                        <div className="form-section">
                            <label className="form-label">Patients Per Slot</label>
                            <input type="number" className="premium-input"
                                value={form.patients_per_slot}
                                onChange={e => setForm({ ...form, patients_per_slot: parseInt(e.target.value) || 1 })} />
                        </div>
                    </div>
                </div>

                {/* Vacation / Off Days */}
                <div className="patient-card" style={{ flex: 1 }}>
                    <h3 className="rx-subtitle">Leave / Unavailable Dates</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                        Add dates where you will be unavailable (e.g., 2026-04-15, 2026-04-18)
                    </p>
                    <textarea className="premium-textarea" rows={2}
                        placeholder="Comma-separated dates (YYYY-MM-DD)"
                        value={form.unavailable_dates}
                        onChange={e => setForm({ ...form, unavailable_dates: e.target.value })} />
                </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="action-btn prescribe" style={{ padding: '12px 30px' }}
                    onClick={handleSave} disabled={saving}>
                    {saving ? 'Syncing...' : 'Update & Sync with Website'}
                </button>
            </div>
        </div>
    );
};
const DoctorAdminPanel = ({ context }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [appointments, setAppointments] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [doctorInfo, setDoctorInfo] = useState(null);

    // Modals
    const [prescribeAppt, setPrescribeAppt] = useState(null);
    const [uploadRecordAppt, setUploadRecordAppt] = useState(null);

    // Appointment detail view (in-panel)
    const [viewingAppt, setViewingAppt] = useState(null);
    const [apptDetail, setApptDetail] = useState(null);
    
    // Printing
    const [printingAppt, setPrintingAppt] = useState(null);

    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await apiFetch('/users/logout/', { method: 'POST' });
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/doctor-login/';
        } catch (e) {
            window.location.href = '/doctor-login/';
        }
    };

    useEffect(() => { 
        fetchAll(true); 
        
        // Auto-refresh interval for real-time updates fallback
        const intervalId = setInterval(() => {
            fetchAll(false); // fetch quietly
        }, 10000);
        return () => clearInterval(intervalId);
    }, []);

    const fetchAll = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [dashRes, apptRes, tplRes, profRes] = await Promise.all([
                apiFetch('/api/doctor/dashboard/'),
                apiFetch('/api/appointments/'),
                apiFetch('/api/prescription-templates/'),
                apiFetch('/api/doctor/profile/'),
            ]);

            if (dashRes.ok) {
                const d = await dashRes.json();
                setDoctorInfo(d.doctor);
                setIsAdmin(d.is_admin || false);
            }
            if (apptRes.ok) {
                const d = await apptRes.json();
                const newAppts = Array.isArray(d) ? d : (d.results || []);
                
                // Show toast if status changed
                if (!showLoading && appointments.length > 0) {
                    newAppts.forEach(newAppt => {
                        const oldAppt = appointments.find(a => a.id === newAppt.id);
                        if (oldAppt && oldAppt.status !== newAppt.status && oldAppt.last_updated_by !== 'Doctor') {
                            showToast(`Appointment #${newAppt.id} for ${newAppt.patient_name || newAppt.user?.username} is now ${newAppt.status}`);
                        }
                    });
                }
                
                setAppointments(newAppts);
            }
            if (tplRes.ok) {
                const d = await tplRes.json();
                setTemplates(Array.isArray(d) ? d : (d.results || []));
            }
            if (profRes.ok) {
                setDoctorProfile(await profRes.json());
            }
        } catch (e) { console.error(e); }
        finally { if (showLoading) setLoading(false); }
    };

    // Toast Notification System
    const [toastMsg, setToastMsg] = useState('');
    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 5000);
    };

    const [doctorProfile, setDoctorProfile] = useState(null);

    const fetchTemplates = async () => {
        const res = await apiFetch('/api/prescription-templates/');
        if (res.ok) {
            const d = await res.json();
            setTemplates(Array.isArray(d) ? d : (d.results || []));
        }
    };

    const viewApptDetail = async (appt) => {
        setViewingAppt(appt);
        setApptDetail(null);
        const res = await apiFetch(`/api/appointments/${appt.id}/detail/`);
        if (res.ok) setApptDetail(await res.json());
    };

    const handlePrint = (appt) => {
        setPrintingAppt(appt);
        setTimeout(() => {
            window.print();
            setPrintingAppt(null);
        }, 300);
    };

    const updateStatus = async (apptId, newStatus) => {
        // Optimistically update local UI
        setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: newStatus } : a));
        
        const res = await apiFetch(`/api/appointments/${apptId}/update_status/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        
        if (!res.ok) {
            alert('Failed to update status.');
            fetchAll(); // Revert back
        }
    };

    /* ─────── Stats ─────── */
    const pending = appointments.filter(a => a.status === 'Pending').length;
    const completed = appointments.filter(a => a.status === 'Completed').length;
    const cancelled = appointments.filter(a => a.status === 'Cancelled').length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = appointments.filter(a => a.date === today && a.status !== 'Cancelled').length;

    /* ─────── Render sections ─────── */
    const renderDashboard = () => (
        <div className="admin-content-fade">
            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                {[
                    ['📅', 'Today\'s Patients', todayCount],
                    ['⏳', 'Pending', pending, '#fff7ed'],
                    ['✅', 'Completed', completed, '#eff6ff'],
                    ['❌', 'Cancelled', cancelled, '#fef2f2']
                ].map(([icon, label, val, bg]) => (
                    <div key={label} className="stat-card" style={{ background: bg || '#fff' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
                        <div className="stat-number">{val}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>{label}</div>
                    </div>
                ))}
            </div>
            {renderAppointmentTable(appointments.filter(a => a.status !== 'Cancelled').slice(0, 8))}
        </div>
    );

    const renderAppointments = () => (
        <div className="admin-content-fade">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {['All', 'Pending', 'Completed', 'Cancelled'].map(f => (
                    <button key={f}
                        onClick={() => setApptFilter(f)}
                        style={{
                            padding: '6px 14px', borderRadius: '20px', border: '1.5px solid', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                            background: apptFilter === f ? '#6366f1' : '#f8fafc',
                            color: apptFilter === f ? '#fff' : '#475569',
                            borderColor: apptFilter === f ? '#6366f1' : '#e2e8f0',
                        }}>{f}</button>
                ))}
            </div>
            {renderAppointmentTable(filteredAppts)}
        </div>
    );

    const [apptFilter, setApptFilter] = useState('All');
    const filteredAppts = apptFilter === 'All' ? appointments : appointments.filter(a => a.status === apptFilter);

    const renderAppointmentTable = (list) => (
        <>
            <h3 className="section-title">Patient Consultations</h3>
            <div className="custom-table-container">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Patient</th>
                            {isAdmin && <th>Doctor</th>}
                            <th>Slot</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.length === 0 && (
                            <tr><td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No appointments found.</td></tr>
                        )}
                        {list.map(appt => (
                            <tr key={appt.id}>
                                <td className="patient-cell">
                                    <div className="avatar-circle">{(appt.patient_name || appt.user?.username || 'P')[0].toUpperCase()}</div>
                                    <div>
                                        <strong>{appt.patient_name || appt.user?.username}</strong>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Age: {appt.patient_age || '—'}</div>
                                    </div>
                                </td>
                                {isAdmin && (
                                    <td>
                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{appt.doctor?.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{appt.doctor?.hospital?.name}</div>
                                    </td>
                                )}
                                <td>
                                    <span style={{ fontWeight: 600 }}>{appt.time}</span>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{appt.date}</div>
                                </td>

                                <td>
                                    <select 
                                        value={appt.status} 
                                        onChange={(e) => updateStatus(appt.id, e.target.value)}
                                        style={{ 
                                            padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1', 
                                            fontSize: '0.78rem', fontWeight: 600, background: '#fff', color: '#334155', cursor: 'pointer', outline: 'none'
                                        }}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {appt.status === 'Pending' && (
                                            <button className="action-btn prescribe" onClick={() => setPrescribeAppt(appt)}>
                                                📋 Prescribe & Complete
                                            </button>
                                        )}
                                        {appt.status === 'Completed' && (
                                            <>
                                                <button className="action-btn outline" style={{ fontSize: '0.78rem' }}
                                                    onClick={() => { viewApptDetail(appt); setActiveTab('view-appt'); }}>
                                                    👁 View Rx
                                                </button>
                                                <button className="action-btn outline" style={{ fontSize: '0.78rem', color: '#6366f1', borderColor: '#6366f1' }}
                                                    onClick={() => setPrescribeAppt(appt)}>
                                                    ✏️ Edit Rx
                                                </button>
                                                <button className="action-btn outline" style={{ fontSize: '0.78rem', color: '#10b981', borderColor: '#10b981' }}
                                                    onClick={() => handlePrint(appt)}>
                                                    🖨️ Print Rx
                                                </button>
                                                <button className="action-btn outline" style={{ fontSize: '0.78rem', color: '#0ea5e9', borderColor: '#0ea5e9' }}
                                                    onClick={() => setUploadRecordAppt(appt)}>
                                                    📁 Upload Report
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );

    /* Appointment Detail View */
    const renderApptDetail = () => {
        if (!viewingAppt) return null;
        const rx = apptDetail?.prescription;
        const recs = apptDetail?.medical_records || [];
        return (
            <div className="admin-content-fade">
                <button className="action-btn outline" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}
                    onClick={() => { setViewingAppt(null); setActiveTab('appointments'); }}>
                    ← Back to Appointments
                </button>
                <h3 className="section-title">Appointment Details</h3>
                <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '16px' }}>
                        {[
                            ['Patient', viewingAppt.patient_name || viewingAppt.user?.username],
                            ['Age', viewingAppt.patient_age || '—'],
                            ['Date', viewingAppt.date],
                            ['Time', viewingAppt.time],
                            ['Status', viewingAppt.status],
                        ].map(([l, v]) => (
                            <div key={l}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{l}</div>
                                <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>{v}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Prescription Card */}
                {!apptDetail && <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading…</p>}
                {apptDetail && !rx && (
                    <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '20px', border: '1.5px dashed #fbbf24', marginBottom: '1rem', textAlign: 'center', color: '#92400e' }}>
                        ⚠️ No prescription found for this appointment.
                    </div>
                )}
                {rx && (
                    <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', padding: '16px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>📋 Prescription</div>
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Generated: {new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            </div>
                            <span style={{ background: rx.generate_method === 'upload' ? '#0ea5e9' : '#6366f1', color: '#fff', borderRadius: '999px', padding: '3px 10px', fontSize: '0.73rem', fontWeight: 700 }}>
                                {rx.generate_method === 'upload' ? '📎 Uploaded File' : '📝 Template'}
                            </span>
                        </div>
                        <div style={{ padding: '20px' }}>
                            {rx.generate_method === 'upload' && rx.prescription_file ? (
                                <div style={{ textAlign: 'center' }}>
                                    {rx.prescription_file.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                        <img src={rx.prescription_file} alt="Prescription" style={{ maxWidth: '100%', borderRadius: '10px', border: '1px solid #f1f5f9' }} />
                                    ) : (
                                        <a href={rx.prescription_file} target="_blank" rel="noreferrer"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#eff6ff', color: '#2563eb', borderRadius: '10px', padding: '12px 24px', textDecoration: 'none', fontWeight: 700 }}>
                                            📄 View / Download Prescription PDF
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {rx.symptoms && <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Symptoms</div><div>{rx.symptoms}</div></div>}
                                    <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Diagnosis</div><div style={{ fontWeight: 600, color: '#1e293b' }}>{rx.diagnosis}</div></div>
                                    {rx.medicines?.length > 0 && (
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Medicines</div>
                                            {rx.medicines.map((m, i) => (
                                                <div key={i} style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px 12px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                    <strong>{m.name}</strong>
                                                    <span style={{ color: '#64748b' }}>{m.dosage} · {m.duration}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {rx.instructions && <div style={{ background: '#faf5ff', borderRadius: '8px', padding: '10px 12px', borderLeft: '3px solid #7c3aed' }}><div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', marginBottom: '4px' }}>INSTRUCTIONS</div>{rx.instructions}</div>}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Medical Records */}
                <h3 className="section-title">Other Medical Records</h3>
                {recs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px', background: '#f8fafc', borderRadius: '12px' }}>
                        No additional records uploaded for this appointment.
                        <div style={{ marginTop: '12px' }}>
                            <button className="action-btn outline" style={{ color: '#0ea5e9', borderColor: '#0ea5e9' }}
                                onClick={() => setUploadRecordAppt(viewingAppt)}>📁 Upload Report</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <table className="custom-table">
                            <thead>
                                <tr><th>Title</th><th>Type</th><th>Date</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {recs.map(r => (
                                    <tr key={r.id}>
                                        <td style={{ fontWeight: 600 }}>{r.title}</td>
                                        <td><span style={{ background: '#eff6ff', color: '#2563eb', borderRadius: '6px', padding: '2px 8px', fontSize: '0.78rem', fontWeight: 600 }}>{r.record_type}</span></td>
                                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{new Date(r.uploaded_at).toLocaleDateString('en-IN')}</td>
                                        <td>
                                            <a href={r.file} target="_blank" rel="noreferrer"
                                                style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '6px', padding: '5px 12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                                                ⬇ View
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
                            <button className="action-btn outline" style={{ color: '#0ea5e9', borderColor: '#0ea5e9', fontSize: '0.82rem' }}
                                onClick={() => setUploadRecordAppt(viewingAppt)}>⬆ Upload Another Record</button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    /* ─── Sidebar nav items ─── */
    const navItems = [
        { key: 'dashboard', label: 'Overview' },
        { key: 'appointments', label: 'Appointments' },
        { key: 'patients', label: 'Patient Records' },
        { key: 'templates', label: 'Rx Templates' },
        { key: 'scheduling', label: 'Scheduling' },
    ];

    return (
        <div className="doctor-admin-wrapper">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-brand"><span className="brand-accent">Doc</span>Admin</div>
                {doctorInfo && (
                    <div className="sidebar-profile">
                        <div className="sidebar-avatar">
                            {doctorInfo.name?.[0]?.toUpperCase() || 'D'}
                        </div>
                        <div className="sidebar-info">
                            <div className="doctor-name">Dr. {doctorInfo.name}</div>
                            <div className="doctor-specialty">{doctorInfo.specialty_name}</div>
                        </div>
                    </div>
                )}
                <nav className="admin-nav">
                    {navItems.map(n => (
                        <button key={n.key}
                            className={`nav-item ${activeTab === n.key || (activeTab === 'view-appt' && n.key === 'appointments') ? 'active' : ''}`}
                            onClick={() => { setActiveTab(n.key); setViewingAppt(null); }}>
                            <span className="icon">{n.icon}</span>{n.label}
                        </button>
                    ))}
                </nav>
                <div className="admin-sidebar-footer">
                    <button className="nav-item text-danger" onClick={() => window.location.href = '/'}>
                        <span className="icon"></span>Exit Portal
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="admin-main-area">
                <header className="admin-topbar">
                    <div className="greeting">
                        <h2>{activeTab === 'view-appt' ? 'Appointment Record' : navItems.find(n => n.key === activeTab)?.label || 'Overview'}</h2>
                        <p>Manage consultations, prescriptions &amp; medical records.</p>
                    </div>
                    <div className="topbar-actions">
                        
                        
                        <div className="profile-menu-container" ref={profileMenuRef}>
                            <div className="doctor-avatar" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                                {doctorInfo?.name?.[0]?.toUpperCase() || 'DR'}
                            </div>
                            
                            {showProfileMenu && (
                                <div className="profile-dropdown">
                                    <div className="dropdown-header">
                                        <div className="doctor-name">Dr. {doctorInfo?.name}</div>
                                        <div className="doctor-email">{doctorInfo?.specialty_name}</div>
                                    </div>
                                    <ul className="dropdown-list">
                                        <li onClick={() => { setActiveTab('dashboard'); setShowProfileMenu(false); }}>
                                            <span className="icon"></span> My Dashboard
                                        </li>
                                        <li onClick={() => { setActiveTab('patients'); setShowProfileMenu(false); }}>
                                            <span className="icon"></span> Patient Records
                                        </li>
                                        <li className="logout-item" onClick={handleLogout}>
                                            <span className="icon"></span> Logout
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="admin-dynamic-content">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                            <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
                            Loading your workspace…
                        </div>
                    ) : (
                        <>
                            {activeTab === 'dashboard' && renderDashboard()}
                            {activeTab === 'appointments' && !viewingAppt && renderAppointments()}
                            {activeTab === 'view-appt' && renderApptDetail()}
                            {activeTab === 'patients' && (
                                <div className="admin-content-fade">
                                    <h3 className="section-title">Patient Records</h3>
                                    <div className="patient-grid">
                                        {[...new Map(appointments.map(a => [a.user?.id, a])).values()].map(appt => (
                                            <div key={appt.user?.id} className="patient-card">
                                                <div className="patient-card-header">
                                                    <div className="avatar-circle large">{(appt.user?.username || 'P')[0].toUpperCase()}</div>
                                                    <div>
                                                        <h4 style={{ margin: 0 }}>{appt.patient_name || appt.user?.username}</h4>
                                                        <span className="patient-email">{appt.user?.email}</span>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                                                    Last Visit: <strong>{appt.date}</strong><br />
                                                    Visits: {appointments.filter(a => a.user?.id === appt.user?.id).length}
                                                </div>
                                                <div className="patient-card-actions">
                                                    {appointments.filter(a => a.user?.id === appt.user?.id && a.status === 'Completed').map(ca => (
                                                        <button key={ca.id} className="action-btn outline btn-full" style={{ fontSize: '0.82rem', textAlign: 'left' }}
                                                            onClick={() => { viewApptDetail(ca); setActiveTab('view-appt'); }}>
                                                            {ca.date} — View Rx
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {appointments.length === 0 && <div style={{ color: '#94a3b8', padding: '40px', textAlign: 'center' }}>No patient records yet.</div>}
                                    </div>
                                </div>
                            )}
                            {activeTab === 'templates' && (
                                <div className="admin-content-fade">
                                    <h3 className="section-title">My Prescription Templates</h3>
                                    <TemplateManager templates={templates} onRefresh={fetchTemplates} />
                                </div>
                            )}
                            {activeTab === 'scheduling' && (
                                <div className="admin-content-fade">
                                    <h3 className="section-title">Schedule & Availability</h3>
                                    <ScheduleManager doctor={doctorProfile} onUpdate={fetchAll} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Modals */}
            {prescribeAppt && (
                <PrescriptionModal
                    appt={prescribeAppt}
                    templates={templates}
                    onClose={() => setPrescribeAppt(null)}
                    onSaved={fetchAll}
                    onTemplatesSaved={tpl => setTemplates(prev => [tpl, ...prev])}
                />
            )}
            {uploadRecordAppt && (
                <RecordsUploadModal
                    appt={uploadRecordAppt}
                    onClose={() => setUploadRecordAppt(null)}
                    onUploaded={() => {
                        if (viewingAppt?.id === uploadRecordAppt.id) viewApptDetail(uploadRecordAppt);
                        fetchAll();
                    }}
                />
            )}

            {/* Print Template (Hidden unless printing) */}
            {printingAppt && (
                <div id="prescription-print-container">
                    <PrintTemplate appt={printingAppt} doctor={doctorInfo} />
                </div>
            )}
            
            {/* Real-time Toast Notification */}
            {toastMsg && (
                <div style={{
                    position: 'fixed', bottom: '20px', left: '20px', background: '#1e293b', color: '#fff',
                    padding: '16px 24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600,
                    animation: 'slideInLeft 0.3s ease-out'
                }}>
                    <span style={{ fontSize: '1.4rem' }}></span>
                    {toastMsg}
                    <button onClick={() => setToastMsg('')} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', marginLeft: '10px', fontSize: '1.2rem' }}>×</button>
                    <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
                </div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════
   PRINT TEMPLATE COMPONENT
═══════════════════════════════════════════════════════ */
const PrintTemplate = ({ appt, doctor }) => {
    const rx = appt.prescription || {};
    const qrUrl = encodeURIComponent(`https://${window.location.host}/verify/${appt.id}`);
    
    return (
        <div className="professional-prescription">
            <header className="rx-header">
                <div className="doc-section">
                    <div className="dr-name" style={{ color: '#fff', fontSize: '1.8rem' }}>DR. {doctor?.name?.toUpperCase()}</div>
                    <div className="dr-qual" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem' }}>{doctor?.specialty?.toUpperCase() || "MEDICAL PRACTITIONER"}</div>
                    <div className="dr-reg" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>REG NO: {doctor?.doctor_id}</div>
                </div>
                <div className="rx-logo-plus">+</div>
            </header>

            <div className="rx-label-side">Rx</div>

            <section className="rx-patient-details">
                <div className="rx-patient-grid">
                    <div>Patient Name: <strong>{appt.patient_name || appt.user?.username}</strong></div>
                    <div>Date: <strong>{appt.date}</strong></div>
                    <div>Age: <strong>{appt.patient_age || "—"} Y</strong></div>
                    <div>Gender: <strong>{appt.user?.gender || "—"}</strong></div>
                    <div style={{ gridColumn: 'span 2' }}>Diagnosis: <strong>{rx.diagnosis || "General Consultation"}</strong></div>
                </div>
            </section>

            <section className="rx-clinical">
                <div className="rx-column">
                    <div className="rx-subtitle">Prescription (Rx)</div>
                    <div className="rx-text-box">
                        {(rx.medicines || []).map((m, i) => (
                            <div key={i} style={{ marginBottom: '8px', fontSize: '1.1rem' }}>
                                💊 <strong>{m.name}</strong> – {m.dosage} – {m.duration}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rx-split-section" style={{ marginTop: '20px' }}>
                <div className="rx-half">
                    <div className="rx-subtitle">Advice</div>
                    <div className="rx-text-box" style={{ whiteSpace: 'pre-line' }}>
                        {rx.instructions || "Standard precautions."}
                    </div>
                </div>
                <div className="rx-half">
                    {rx.lab_tests && (
                        <>
                            <div className="rx-subtitle">Investigations</div>
                            <div className="rx-text-box">{rx.lab_tests}</div>
                        </>
                    )}
                </div>
            </section>

            <footer className="rx-footer">
                <div className="hospital-info" style={{ color: '#475569' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0ea5e9', textTransform: 'uppercase' }}>{doctor?.hospital?.name || "Clinic Name"}</div>
                    <div style={{ fontSize: '0.8rem' }}>{doctor?.hospital?.location || "Address Details"}</div>
                    <div style={{ fontSize: '0.8rem' }}>Ph: {doctor?.hospital?.contact_no || "Contact"}</div>
                </div>
                
                <div className="rx-verified">
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Next Visit: <strong>{rx.follow_up_date || "As Advised"}</strong></p>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${qrUrl}`} alt="Verify Rx" />
                    <span>Scan to Verify Online</span>
                </div>

                <div className="rx-signature">
                    <div className="sig-line">
                        <span className="sig-name" style={{ fontSize: '1.4rem' }}>{doctor?.name}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>Doctor Signature & Stamp</div>
                </div>
            </footer>
        </div>
    );
};

export default DoctorAdminPanel;
