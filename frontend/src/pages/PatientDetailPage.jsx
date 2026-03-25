import { useState, useEffect } from 'react';
import { api } from '../api/client';

const DAYS_KR = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' };
const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const STATUS_LABEL = {
  TAKEN: { text: '복약 완료', color: '#16a34a', bg: '#dcfce7', icon: '✅' },
  MISSED: { text: '복약 누락', color: '#dc2626', bg: '#fee2e2', icon: '❌' },
  UNCONFIRMED: { text: '미확인', color: '#d97706', bg: '#fef3c7', icon: '⏳' },
};

export default function PatientDetailPage({ patient, onBack }) {
  const [tab, setTab] = useState('medication'); // 'medication' | 'detection'
  const [medications, setMedications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [detections, setDetections] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddMed, setShowAddMed] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', scheduleTime: '08:00', days: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (tab === 'medication') fetchLogs();
  }, [selectedDate, tab]);

  const fetchAll = async () => {
    try {
      const [meds, dets] = await Promise.all([
        api.getMedications(patient.id),
        api.getDetections(patient.id),
      ]);
      setMedications(meds);
      setDetections(dets);
      await fetchLogs();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await api.getMedicationLogs(patient.id, selectedDate);
      setLogs(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMed = async (e) => {
    e.preventDefault();
    if (newMed.days.length === 0) return setError('복약 요일을 선택해주세요.');
    try {
      await api.createMedication({
        patientId: patient.id,
        name: newMed.name,
        dosage: newMed.dosage,
        scheduleTime: newMed.scheduleTime,
        days: newMed.days.join(','),
      });
      setShowAddMed(false);
      setNewMed({ name: '', dosage: '', scheduleTime: '08:00', days: [] });
      const meds = await api.getMedications(patient.id);
      setMedications(meds);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteMed = async (id) => {
    if (!confirm('이 복약 스케줄을 삭제하시겠습니까?')) return;
    try {
      await api.deleteMedication(id);
      const meds = await api.getMedications(patient.id);
      setMedications(meds);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleDay = (day) => {
    setNewMed((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  };

  // 오늘 날짜 복약 현황 계산
  const getMedStatus = (medId) => {
    const log = logs.find((l) => l.medicationId === medId);
    return log ? STATUS_LABEL[log.status] : STATUS_LABEL['UNCONFIRMED'];
  };

  const getDetectionTypeLabel = (type) => {
    const map = { FALL: { text: '낙상 감지', icon: '🚨', color: '#dc2626' }, MEDICATION: { text: '복약 감지', icon: '💊', color: '#16a34a' }, NORMAL: { text: '정상', icon: '✅', color: '#6b7280' } };
    return map[type] || { text: type, icon: '•', color: '#6b7280' };
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← 뒤로</button>
        <div style={styles.patientHeader}>
          <div style={styles.avatar}>{patient.name[0]}</div>
          <div>
            <h1 style={styles.patientName}>{patient.name}</h1>
            <p style={styles.patientSub}>
              {[patient.age && `${patient.age}세`, patient.address, patient.phone].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(tab === 'medication' ? styles.tabActive : {}) }} onClick={() => setTab('medication')}>💊 복약 관리</button>
        <button style={{ ...styles.tab, ...(tab === 'detection' ? styles.tabActive : {}) }} onClick={() => setTab('detection')}>🚨 감지 이력</button>
      </div>

      <div style={styles.content}>
        {error && <p style={styles.error}>{error}</p>}
        {loading ? <p style={styles.loading}>불러오는 중...</p> : (

          tab === 'medication' ? (
            <>
              {/* 복약 스케줄 */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>복약 스케줄</h2>
                  <button style={styles.addBtn} onClick={() => setShowAddMed(true)}>+ 스케줄 추가</button>
                </div>

                {showAddMed && (
                  <div style={styles.formCard}>
                    <h3 style={styles.formTitle}>새 복약 스케줄 등록</h3>
                    <form onSubmit={handleAddMed} style={styles.form}>
                      <div style={styles.formRow}>
                        <input style={styles.input} placeholder="약 이름 *" value={newMed.name}
                          onChange={(e) => setNewMed({ ...newMed, name: e.target.value })} required />
                        <input style={styles.input} placeholder="용량 (예: 1정)" value={newMed.dosage}
                          onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })} />
                      </div>
                      <div style={styles.formRow}>
                        <div style={{ flex: 1 }}>
                          <label style={styles.label}>복약 시간</label>
                          <input style={styles.input} type="time" value={newMed.scheduleTime}
                            onChange={(e) => setNewMed({ ...newMed, scheduleTime: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label style={styles.label}>복약 요일</label>
                        <div style={styles.daysRow}>
                          {ALL_DAYS.map((d) => (
                            <button key={d} type="button"
                              style={{ ...styles.dayBtn, ...(newMed.days.includes(d) ? styles.dayBtnActive : {}) }}
                              onClick={() => toggleDay(d)}>
                              {DAYS_KR[d]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={styles.formActions}>
                        <button style={styles.cancelBtn} type="button" onClick={() => setShowAddMed(false)}>취소</button>
                        <button style={styles.submitBtn} type="submit">등록</button>
                      </div>
                    </form>
                  </div>
                )}

                {medications.length === 0 ? (
                  <p style={styles.empty}>등록된 복약 스케줄이 없습니다.</p>
                ) : (
                  <div style={styles.medList}>
                    {medications.map((med) => (
                      <div key={med.id} style={styles.medCard}>
                        <div style={styles.medTime}>{med.scheduleTime}</div>
                        <div style={styles.medInfo}>
                          <span style={styles.medName}>{med.name}</span>
                          {med.dosage && <span style={styles.medDosage}>{med.dosage}</span>}
                          <span style={styles.medDays}>
                            {med.days.split(',').map((d) => DAYS_KR[d] || d).join(' ')}
                          </span>
                        </div>
                        <button style={styles.delBtn} onClick={() => handleDeleteMed(med.id)}>삭제</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 복약 현황 (O/X) */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>복약 현황</h2>
                  <input style={styles.dateInput} type="date" value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)} />
                </div>

                {medications.length === 0 ? (
                  <p style={styles.empty}>복약 스케줄을 먼저 등록해주세요.</p>
                ) : (
                  <div style={styles.statusGrid}>
                    {medications.map((med) => {
                      const st = getMedStatus(med.id);
                      return (
                        <div key={med.id} style={{ ...styles.statusCard, background: st.bg }}>
                          <span style={styles.statusIcon}>{st.icon}</span>
                          <div>
                            <p style={styles.statusName}>{med.name}</p>
                            <p style={styles.statusTime}>{med.scheduleTime}</p>
                          </div>
                          <span style={{ ...styles.statusBadge, color: st.color }}>{st.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* 감지 이력 */
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>감지 이력 (최근 100건)</h2>
              {detections.length === 0 ? (
                <p style={styles.empty}>감지 이력이 없습니다.</p>
              ) : (
                <div style={styles.detectionList}>
                  {detections.map((d) => {
                    const type = getDetectionTypeLabel(d.type);
                    return (
                      <div key={d.id} style={styles.detectionCard}>
                        <span style={styles.detectionIcon}>{type.icon}</span>
                        <div style={styles.detectionInfo}>
                          <span style={{ ...styles.detectionType, color: type.color }}>{type.text}</span>
                          <span style={styles.detectionConf}>신뢰도 {Math.round(d.confidence * 100)}%</span>
                        </div>
                        <span style={styles.detectionTime}>
                          {new Date(d.detectedAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#f1f5f9' },
  header: { background: '#fff', padding: '16px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  backBtn: { background: 'none', border: 'none', color: '#1e40af', fontSize: '15px', cursor: 'pointer', fontWeight: '600', marginBottom: '12px', padding: 0 },
  patientHeader: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatar: { width: '52px', height: '52px', borderRadius: '50%', background: '#1e40af', color: '#fff', fontSize: '22px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  patientName: { fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' },
  patientSub: { fontSize: '13px', color: '#6b7280', margin: 0 },
  tabs: { display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px' },
  tab: { padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#6b7280', borderBottom: '2px solid transparent' },
  tabActive: { color: '#1e40af', borderBottom: '2px solid #1e40af' },
  content: { maxWidth: '960px', margin: '0 auto', padding: '28px 24px' },
  error: { color: '#dc2626', fontSize: '14px', marginBottom: '12px' },
  loading: { color: '#6b7280', textAlign: 'center', padding: '40px' },
  section: { background: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  sectionTitle: { fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 },
  addBtn: { padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  formCard: { background: '#f8fafc', borderRadius: '10px', padding: '20px', marginBottom: '16px', border: '1px solid #e2e8f0' },
  formTitle: { fontSize: '15px', fontWeight: '600', margin: '0 0 14px', color: '#111827' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  formRow: { display: 'flex', gap: '10px' },
  input: { flex: 1, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
  label: { fontSize: '12px', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '4px' },
  daysRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  dayBtn: { width: '36px', height: '36px', border: '1px solid #d1d5db', borderRadius: '50%', cursor: 'pointer', fontSize: '13px', background: '#fff', color: '#374151' },
  dayBtnActive: { background: '#1e40af', color: '#fff', border: '1px solid #1e40af' },
  formActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  submitBtn: { padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  empty: { color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' },
  medList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  medCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' },
  medTime: { fontSize: '15px', fontWeight: '700', color: '#1e40af', minWidth: '52px' },
  medInfo: { flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
  medName: { fontSize: '14px', fontWeight: '600', color: '#111827' },
  medDosage: { fontSize: '12px', color: '#6b7280', background: '#e5e7eb', padding: '2px 8px', borderRadius: '12px' },
  medDays: { fontSize: '12px', color: '#6b7280' },
  delBtn: { padding: '5px 10px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  dateInput: { padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' },
  statusGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' },
  statusCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '10px' },
  statusIcon: { fontSize: '22px' },
  statusName: { fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 2px' },
  statusTime: { fontSize: '12px', color: '#6b7280', margin: 0 },
  statusBadge: { marginLeft: 'auto', fontSize: '12px', fontWeight: '600' },
  detectionList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  detectionCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' },
  detectionIcon: { fontSize: '20px' },
  detectionInfo: { flex: 1, display: 'flex', gap: '10px', alignItems: 'center' },
  detectionType: { fontSize: '14px', fontWeight: '600' },
  detectionConf: { fontSize: '12px', color: '#6b7280' },
  detectionTime: { fontSize: '12px', color: '#9ca3af' },
};
