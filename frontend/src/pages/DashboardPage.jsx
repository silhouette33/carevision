import { useState, useEffect } from 'react';
import { api } from '../api/client';
import logo from '../assets/CareVision.png';
import { colors, layout, card, button } from '../styles/common';

export default function DashboardPage({
                                          user,
                                          onLogout,
                                          onSelectPatient,
                                          onGoNotifications,
                                          onEmergency,
                                      }) {
    const [patients, setPatients] = useState([]);
    const [medSummary, setMedSummary] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [newPatient, setNewPatient] = useState({
        name: '', age: '', address: '', phone: '', cameraId: '',
    });

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        const data = await api.getPatients();
        const extra = [
            { id: 3, name: '박명수', age: 75, address: '서울 강남구', phone: '010-1111-2222', cameraId: 'cam-3' },
            { id: 4, name: '최영희', age: 80, address: '서울 송파구', phone: '010-3333-4444', cameraId: 'cam-4' },
            { id: 5, name: '정미자', age: 77, address: '서울 서초구', phone: '010-5555-6666', cameraId: 'cam-5' },
            { id: 6, name: '한상철', age: 83, address: '서울 마포구', phone: '010-7777-8888', cameraId: 'cam-6' },
            { id: 7, name: '윤복례', age: 79, address: '서울 은평구', phone: '010-9999-0000', cameraId: 'cam-7' },
            { id: 8, name: '강대식', age: 81, address: '서울 중랑구', phone: '010-2222-3333', cameraId: 'cam-8' },
        ];
        const all = [...data, ...extra];
        setPatients(all);
        fetchMedSummaries(all);
    };

    // id 3~8 환자용 mock 복약 데이터
    const EXTRA_MED_MOCK = {
        3: { total: 3, taken: 3, missed: 0 },
        4: { total: 2, taken: 1, missed: 1 },
        5: { total: 4, taken: 2, missed: 0 },
        6: { total: 3, taken: 0, missed: 2 },
        7: { total: 2, taken: 2, missed: 0 },
        8: { total: 3, taken: 1, missed: 1 },
    };

    const fetchMedSummaries = async (patientList) => {
        const summaries = {};
        await Promise.all(patientList.map(async (p) => {
            try {
                const meds = await api.getMedications(p.id);
                const logs = await api.getMedicationLogs(p.id);
                const total = meds.length;
                const taken = logs.filter(l => l.status === 'TAKEN').length;
                const missed = logs.filter(l => l.status === 'MISSED').length;
                if (total > 0) {
                    summaries[p.id] = { total, taken, missed };
                } else if (EXTRA_MED_MOCK[p.id]) {
                    summaries[p.id] = EXTRA_MED_MOCK[p.id];
                } else {
                    summaries[p.id] = { total: 0, taken: 0, missed: 0 };
                }
            } catch {
                if (EXTRA_MED_MOCK[p.id]) {
                    summaries[p.id] = EXTRA_MED_MOCK[p.id];
                } else {
                    summaries[p.id] = { total: 0, taken: 0, missed: 0 };
                }
            }
        }));
        setMedSummary(summaries);
    };

    const handleAddPatient = (e) => {
        e.preventDefault();
        const newData = { id: Date.now(), ...newPatient };
        setPatients(prev => [newData, ...prev]);
        setNewPatient({ name: '', age: '', address: '', phone: '', cameraId: '' });
        setShowForm(false);
    };

    const handleDelete = (id) => {
        setPatients(prev => prev.filter(p => p.id !== id));
    };

    const getMedStatus = (id) => {
        const s = medSummary[id];
        if (!s || s.total === 0) return null;
        const unconfirmed = s.total - s.taken - s.missed;
        return { ...s, unconfirmed };
    };

    return (
        <div style={layout.container}>

            {/* 헤더 */}
            <div style={styles.header}>
                <div style={styles.logo}>
                    <img src={logo} alt="logo" style={styles.logoImg} />
                    <span style={styles.logoText}>CareVision</span>
                </div>
                <div style={styles.headerRight}>
                    <button style={styles.notiBtn} onClick={onGoNotifications}>🔔</button>
                    <button
                        style={styles.emergencyBtn}
                        onClick={() => { if (patients.length > 0) onEmergency(patients[0]); }}
                    >
                        🚨
                    </button>
                    <span>{user.name}</span>
                    <button style={styles.logout} onClick={onLogout}>로그아웃</button>
                </div>
            </div>

            {/* 상단 */}
            <div style={styles.topBar}>
                <h2>환자 목록</h2>
                <button style={button.primary} onClick={() => setShowForm(!showForm)}>
                    + 환자 추가
                </button>
            </div>

            {/* 추가 폼 */}
            {showForm && (
                <div style={styles.formCard}>
                    <h3>환자 추가</h3>
                    <form onSubmit={handleAddPatient} style={styles.form}>
                        <input placeholder="이름" value={newPatient.name}
                               onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                               style={styles.input} required />
                        <input placeholder="나이" type="number" value={newPatient.age}
                               onChange={e => setNewPatient({ ...newPatient, age: e.target.value })}
                               style={styles.input} />
                        <input placeholder="주소" value={newPatient.address}
                               onChange={e => setNewPatient({ ...newPatient, address: e.target.value })}
                               style={styles.input} />
                        <input placeholder="전화번호" value={newPatient.phone}
                               onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })}
                               style={styles.input} />
                        <input placeholder="카메라 ID" value={newPatient.cameraId}
                               onChange={e => setNewPatient({ ...newPatient, cameraId: e.target.value })}
                               style={styles.input} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button style={button.primary}>추가</button>
                            <button type="button" style={styles.cancelBtn} onClick={() => setShowForm(false)}>취소</button>
                        </div>
                    </form>
                </div>
            )}

            {/* 환자 카드 */}
            <div style={styles.grid}>
                {patients.map(p => {
                    const med = getMedStatus(p.id);
                    return (
                        <div key={p.id} style={styles.card}>
                            <div style={styles.avatar}>{p.name?.[0]}</div>
                            <h3 style={styles.patientName}>{p.name}</h3>
                            <p style={styles.patientInfo}>{p.age && `${p.age}세`} {p.address && `· ${p.address}`}</p>
                            <p style={styles.patientInfo}>{p.phone}</p>

                            {/* 복약 요약 */}
                            {med ? (
                                <div style={styles.medSummary}>
                                    <div style={styles.medSummaryTitle}>💊 오늘 복약 현황</div>
                                    <div style={styles.medBadgeRow}>
                                        <div style={{ ...styles.medBadge, background: '#dcfce7', color: '#16a34a' }}>
                                            ✅ 완료 {med.taken}
                                        </div>
                                        <div style={{ ...styles.medBadge, background: '#fee2e2', color: '#dc2626' }}>
                                            ❌ 누락 {med.missed}
                                        </div>
                                        <div style={{ ...styles.medBadge, background: '#fef3c7', color: '#d97706' }}>
                                            ⏳ 미확인 {med.unconfirmed}
                                        </div>
                                    </div>
                                    {/* 진행 바 */}
                                    <div style={styles.progressBar}>
                                        <div style={{
                                            ...styles.progressFill,
                                            width: `${med.total > 0 ? (med.taken / med.total) * 100 : 0}%`,
                                            background: med.missed > 0 ? '#f87171' : '#4ade80',
                                        }} />
                                    </div>
                                    <div style={styles.progressText}>
                                        {med.total > 0 ? `${med.taken}/${med.total} 복약 완료` : '복약 없음'}
                                    </div>
                                </div>
                            ) : (
                                <div style={styles.medEmpty}>💊 복약 정보 없음</div>
                            )}

                            <div style={styles.cardButtons}>
                                <button style={styles.detailBtn} onClick={() => onSelectPatient(p)}>상세</button>
                                <button style={styles.deleteBtn} onClick={() => handleDelete(p.id)}>삭제</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const styles = {
    header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
    logo: { display: 'flex', alignItems: 'center', gap: '6px' },
    logoImg: { height: '45px' },
    logoText: { fontWeight: '700', color: '#2563eb', fontSize: '20px' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
    notiBtn: { background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 10px' },
    emergencyBtn: {
        background: '#dc2626', color: '#fff', border: 'none',
        borderRadius: '8px', padding: '6px 10px', fontWeight: '600', cursor: 'pointer',
    },
    logout: { background: '#eee', border: 'none', padding: '6px 10px', borderRadius: '8px' },
    topBar: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
    formCard: {
        background: '#fff', padding: '20px', borderRadius: '12px',
        marginBottom: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    },
    form: { display: 'flex', flexDirection: 'column', gap: '10px' },
    input: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd' },
    cancelBtn: { background: '#ddd', border: 'none', padding: '10px', borderRadius: '8px' },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '15px',
    },
    card: {
        background: '#fff', borderRadius: '14px', padding: '18px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)', textAlign: 'center',
        display: 'flex', flexDirection: 'column', gap: '4px',
    },
    avatar: {
        width: '50px', height: '50px', borderRadius: '50%',
        background: colors.primary, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 8px', fontSize: '20px', fontWeight: '700',
    },
    patientName: { margin: '0 0 2px', fontSize: '16px', fontWeight: '700', color: '#111' },
    patientInfo: { margin: '0', fontSize: '12px', color: '#6b7280' },

    // 복약 요약
    medSummary: {
        background: '#f8faff', border: '1px solid #dbeafe',
        borderRadius: '10px', padding: '10px', margin: '8px 0',
    },
    medSummaryTitle: { fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' },
    medBadgeRow: { display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '8px' },
    medBadge: {
        fontSize: '11px', fontWeight: '600',
        padding: '3px 7px', borderRadius: '20px',
    },
    progressBar: {
        height: '6px', background: '#e5e7eb', borderRadius: '99px',
        overflow: 'hidden', marginBottom: '4px',
    },
    progressFill: {
        height: '100%', borderRadius: '99px',
        transition: 'width 0.3s ease',
    },
    progressText: { fontSize: '11px', color: '#6b7280' },
    medEmpty: {
        fontSize: '12px', color: '#9ca3af',
        background: '#f9fafb', borderRadius: '8px',
        padding: '8px', margin: '8px 0',
    },

    cardButtons: { display: 'flex', gap: '8px', marginTop: '4px' },
    detailBtn: {
        flex: 1, background: '#eff6ff', color: '#2563eb',
        border: '1px solid #bfdbfe', borderRadius: '6px', padding: '7px 0', cursor: 'pointer',
    },
    deleteBtn: {
        flex: 1, background: '#fff', color: '#dc2626',
        border: '1px solid #fecaca', borderRadius: '6px', padding: '7px 0', cursor: 'pointer',
    },
};
