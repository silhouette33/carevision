import { useState, useEffect } from 'react';
import { api } from '../api/client';

const DAYS_KR = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' };
const ALL_DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

const STATUS = {
  TAKEN: { text: '복약 완료', color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: '✅' },
  MISSED: { text: '복약 누락', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: '❌' },
  UNCONFIRMED: { text: '미확인', color: '#d97706', bg: '#fef3c7', border: '#fcd34d', icon: '⏳' },
};

export default function PatientDetailPage({ patient, onBack }) {
  const [tab, setTab] = useState('medication');
  const [medications, setMedications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [detections, setDetections] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10));
  const [showForm, setShowForm] = useState(false);
  const [newMed, setNewMed] = useState({ name:'', dosage:'', scheduleTime:'08:00', days:[] });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const meds = await api.getMedications(patient.id);
    const dets = await api.getDetections(patient.id);
    const logsData = await api.getMedicationLogs(patient.id);
    setMedications(meds);
    setDetections(dets);
    setLogs(logsData);
  };

  const toggleDay = (day) => {
    setNewMed(prev => ({
      ...prev,
      days: prev.days.includes(day)
          ? prev.days.filter(d => d !== day)
          : [...prev.days, day]
    }));
  };

  const getStatus = (medId) => {
    const log = logs.find(l => l.medicationId === medId);
    return log ? STATUS[log.status] : STATUS.UNCONFIRMED;
  };

  const handleAddMed = async () => {
    if (!newMed.name || !newMed.dosage || newMed.days.length === 0) {
      alert('약 이름, 용량, 요일을 모두 입력해주세요.');
      return;
    }
    const created = {
      id: Date.now(),
      patientId: patient.id,
      name: newMed.name,
      dosage: newMed.dosage,
      scheduleTime: newMed.scheduleTime,
      days: newMed.days.join(','),
      isActive: true,
    };
    try { await api.createMedication(created); } catch {}
    setMedications(prev =>
        [...prev, created].sort((a, b) => a.scheduleTime.localeCompare(b.scheduleTime))
    );
    setShowForm(false);
    setNewMed({ name:'', dosage:'', scheduleTime:'08:00', days:[] });
  };

  const handleDeleteMed = async (id) => {
    try { await api.deleteMedication(id); } catch {}
    setMedications(prev => prev.filter(m => m.id !== id));
  };

  return (
      <div style={s.page}>
        {/* 헤더 */}
        <div style={s.header}>
          <button style={s.backBtn} onClick={onBack}>← 뒤로</button>
          <div style={s.profile}>
            <div style={s.avatar}>{patient.name[0]}</div>
            <div>
              <h2 style={s.name}>{patient.name}</h2>
              <p style={s.sub}>{patient.age}세 · {patient.address}{patient.phone ? ` · ${patient.phone}` : ''}</p>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div style={s.tabBar}>
          <button style={tab==='medication' ? s.tabActive : s.tab} onClick={()=>setTab('medication')}>
            💊 복약 관리
          </button>
          <button style={tab==='detection' ? s.tabActive : s.tab} onClick={()=>setTab('detection')}>
            🚨 감지 이력
          </button>
        </div>

        {tab === 'medication' && (
            <>
              {/* 복약 스케줄 */}
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <h3 style={s.cardTitle}>복약 스케줄</h3>
                  <button style={s.addBtn} onClick={()=>setShowForm(!showForm)}>
                    {showForm ? '✕ 닫기' : '+ 스케줄 추가'}
                  </button>
                </div>

                {showForm && (
                    <div style={s.form}>
                      <input
                          style={s.input}
                          placeholder="약 이름"
                          value={newMed.name}
                          onChange={e=>setNewMed({...newMed, name:e.target.value})}
                      />
                      <input
                          style={s.input}
                          placeholder="용량 (예: 1정)"
                          value={newMed.dosage}
                          onChange={e=>setNewMed({...newMed, dosage:e.target.value})}
                      />
                      <input
                          style={s.input}
                          type="time"
                          value={newMed.scheduleTime}
                          onChange={e=>setNewMed({...newMed, scheduleTime:e.target.value})}
                      />
                      <div>
                        <p style={s.dayLabel}>복약 요일 선택</p>
                        <div style={s.dayRow}>
                          {ALL_DAYS.map(d => (
                              <button
                                  key={d}
                                  onClick={()=>toggleDay(d)}
                                  style={newMed.days.includes(d) ? s.dayBtnActive : s.dayBtn}
                              >
                                {DAYS_KR[d]}
                              </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                        <button style={s.saveBtn} onClick={handleAddMed}>추가</button>
                        <button style={s.cancelBtn} onClick={()=>{ setShowForm(false); setNewMed({ name:'', dosage:'', scheduleTime:'08:00', days:[] }); }}>
                          취소
                        </button>
                      </div>
                    </div>
                )}

                <div style={s.medList}>
                  {medications.length === 0 && (
                      <p style={s.empty}>등록된 복약 스케줄이 없습니다.</p>
                  )}
                  {medications.map(m => (
                      <div key={m.id} style={s.medItem}>
                        <div style={s.medTime}>{m.scheduleTime}</div>
                        <div style={s.medInfo}>
                          <div style={s.medName}>
                            {m.name}
                            <span style={s.dosageBadge}>{m.dosage}</span>
                          </div>
                          <div style={s.medDays}>
                            {m.days && m.days.split(',').map(d => DAYS_KR[d]).join(' ')}
                          </div>
                        </div>
                        <button style={s.deleteBtn} onClick={()=>handleDeleteMed(m.id)}>삭제</button>
                      </div>
                  ))}
                </div>
              </div>

              {/* 복약 현황 */}
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <h3 style={s.cardTitle}>복약 현황</h3>
                  <input
                      type="date"
                      style={s.dateInput}
                      value={selectedDate}
                      onChange={e=>setSelectedDate(e.target.value)}
                  />
                </div>
                <div style={s.statusList}>
                  {medications.length === 0 && (
                      <p style={s.empty}>복약 스케줄을 먼저 등록해주세요.</p>
                  )}
                  {medications.map(m => {
                    const st = getStatus(m.id);
                    return (
                        <div key={m.id} style={{...s.statusItem, background: st.bg, borderColor: st.border}}>
                          <span style={s.statusIcon}>{st.icon}</span>
                          <div>
                            <div style={{...s.statusName, color: st.color}}>{m.name}</div>
                            <div style={s.statusText}>{st.text}</div>
                          </div>
                        </div>
                    );
                  })}
                </div>
              </div>
            </>
        )}

        {/* 감지 이력 */}
        {tab === 'detection' && (
            <div style={s.card}>
              <h3 style={s.cardTitle}>감지 이력</h3>
              {detections.length === 0 && <p style={s.empty}>감지 이력이 없습니다.</p>}
              {detections.map(d => (
                  <div key={d.id} style={s.detectItem}>
                    <span style={s.detectIcon}>🚨</span>
                    <div>
                      <div style={s.detectType}>{d.type}</div>
                      <div style={s.detectMeta}>
                        신뢰도 {Math.round(d.confidence * 100)}% · {new Date(d.detectedAt).toLocaleString('ko-KR')}
                      </div>
                    </div>
                  </div>
              ))}
            </div>
        )}
      </div>
  );
}

const s = {
  page: { padding: '20px', background: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' },

  header: { marginBottom: '20px' },
  backBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#2563eb', fontWeight: '600', fontSize: '15px',
    marginBottom: '14px', padding: '0',
  },
  profile: { display: 'flex', gap: '14px', alignItems: 'center' },
  avatar: {
    width: '52px', height: '52px', borderRadius: '50%',
    background: '#1e40af', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '20px', fontWeight: '700', flexShrink: 0,
  },
  name: { margin: '0 0 4px', fontSize: '22px', fontWeight: '700', color: '#111' },
  sub: { margin: 0, fontSize: '13px', color: '#6b7280' },

  tabBar: {
    display: 'flex', borderBottom: '2px solid #e5e7eb',
    marginBottom: '20px',
  },
  tab: {
    padding: '10px 20px', border: 'none', background: 'none',
    cursor: 'pointer', fontSize: '14px', fontWeight: '500',
    color: '#6b7280', borderBottom: '3px solid transparent',
    marginBottom: '-2px',
  },
  tabActive: {
    padding: '10px 20px', border: 'none', background: 'none',
    cursor: 'pointer', fontSize: '14px', fontWeight: '700',
    color: '#1e40af', borderBottom: '3px solid #1e40af',
    marginBottom: '-2px',
  },

  card: {
    background: '#fff', borderRadius: '14px',
    padding: '20px', marginBottom: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cardTitle: { margin: 0, fontSize: '16px', fontWeight: '700', color: '#111' },
  addBtn: {
    padding: '8px 16px', background: '#1e40af', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600',
  },

  form: {
    background: '#f8faff', border: '1px solid #dbeafe',
    borderRadius: '10px', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '10px',
    marginBottom: '16px',
  },
  input: {
    padding: '10px 12px', border: '1px solid #d1d5db',
    borderRadius: '8px', fontSize: '14px', outline: 'none',
    background: '#fff',
  },
  dayLabel: { margin: '0 0 8px', fontSize: '13px', color: '#6b7280', fontWeight: '500' },
  dayRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  dayBtn: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '1px solid #d1d5db', background: '#fff',
    cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#374151',
  },
  dayBtnActive: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '1px solid #1e40af', background: '#1e40af',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#fff',
  },
  saveBtn: {
    flex: 1, padding: '10px', background: '#1e40af', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
  },
  cancelBtn: {
    flex: 1, padding: '10px', background: '#f3f4f6', color: '#374151',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
  },

  medList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  medItem: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px', border: '1px solid #e5e7eb',
    borderRadius: '10px', background: '#fafafa',
  },
  medTime: { fontSize: '17px', fontWeight: '700', color: '#1e40af', minWidth: '54px' },
  medInfo: { flex: 1 },
  medName: { fontSize: '15px', fontWeight: '600', color: '#111', display: 'flex', alignItems: 'center', gap: '8px' },
  dosageBadge: {
    background: '#e5e7eb', color: '#374151',
    borderRadius: '12px', padding: '2px 8px', fontSize: '12px', fontWeight: '500',
  },
  medDays: { fontSize: '12px', color: '#6b7280', marginTop: '3px' },
  deleteBtn: {
    padding: '6px 14px', background: '#fff', color: '#dc2626',
    border: '1px solid #fca5a5', borderRadius: '8px',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600', flexShrink: 0,
  },

  dateInput: {
    padding: '7px 12px', border: '1px solid #d1d5db',
    borderRadius: '8px', fontSize: '13px', color: '#374151', outline: 'none',
  },
  statusList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  statusItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px', borderRadius: '10px', border: '1px solid',
  },
  statusIcon: { fontSize: '22px' },
  statusName: { fontSize: '15px', fontWeight: '600' },
  statusText: { fontSize: '12px', color: '#6b7280', marginTop: '2px' },

  detectItem: {
    display: 'flex', gap: '12px', alignItems: 'flex-start',
    padding: '12px 0', borderBottom: '1px solid #f3f4f6',
  },
  detectIcon: { fontSize: '20px', marginTop: '2px' },
  detectType: { fontSize: '14px', fontWeight: '600', color: '#111' },
  detectMeta: { fontSize: '12px', color: '#6b7280', marginTop: '3px' },

  empty: { color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0', margin: 0 },
};
