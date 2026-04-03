import { useState, useEffect } from 'react';
import { api } from '../api/client';
import logo from '../assets/CareVision.png';
import { colors, layout, button } from '../styles/common';

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
    const [activeTab, setActiveTab] = useState('home');
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
                summaries[p.id] = EXTRA_MED_MOCK[p.id] || { total: 0, taken: 0, missed: 0 };
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
        return { ...s, unconfirmed: s.total - s.taken - s.missed };
    };

    return (
        <div style={styles.pageWrapper}>

            <div style={styles.scrollArea}>

                {/* 헤더 */}
                <div style={styles.header}>
                    <div style={styles.logo}>
                        <img src={logo} alt="logo" style={styles.logoImg} />
                        <span style={styles.logoText}>CareVision</span>
                    </div>
                    <button style={styles.emergencyBtn}
                            onClick={() => { if (patients.length > 0) onEmergency(patients[0]); }}>
                        🚨 긴급
                    </button>
                </div>

                {/* 타이틀 + 추가 버튼 */}
                <div style={styles.topBar}>
                    <span style={styles.title}>환자 목록</span>
                    <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
                        + 추가
                    </button>
                </div>

                {/* 추가 폼 */}
                {showForm && (
                    <div style={styles.formCard}>
                        <h3 style={styles.formTitle}>환자 추가</h3>
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
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button style={{ ...button.primary, flex: 1 }} type="submit">추가</button>
                                <button type="button" style={styles.cancelBtn}
                                        onClick={() => setShowForm(false)}>취소</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 환자 카드 그리드 */}
                <div style={styles.grid}>
                    {patients.map(p => {
                        const med = getMedStatus(p.id);
                        return (
                            <div key={p.id} style={styles.card}>
                                <div style={styles.avatar}>{p.name?.[0]}</div>
                                <h3 style={styles.patientName}>{p.name}</h3>
                                <p style={styles.patientInfo}>{p.age && `${p.age}세`}</p>
                                <p style={styles.patientInfo}>{p.address}</p>

                                {med ? (
                                    <div style={styles.medSummary}>
                                        <div style={styles.medSummaryTitle}>💊 오늘 복약</div>
                                        <div style={styles.medBadgeRow}>
                                            <div style={{ ...styles.medBadge, background: '#dcfce7', color: '#16a34a' }}>✅ {med.taken}</div>
                                            <div style={{ ...styles.medBadge, background: '#fee2e2', color: '#dc2626' }}>❌ {med.missed}</div>
                                            <div style={{ ...styles.medBadge, background: '#fef3c7', color: '#d97706' }}>⏳ {med.unconfirmed}</div>
                                        </div>
                                        <div style={styles.progressBar}>
                                            <div style={{
                                                ...styles.progressFill,
                                                width: `${med.total > 0 ? (med.taken / med.total) * 100 : 0}%`,
                                                background: med.missed > 0 ? '#f87171' : '#4ade80',
                                            }} />
                                        </div>
                                        <div style={styles.progressText}>{med.taken}/{med.total} 완료</div>
                                    </div>
                                ) : (
                                    <div style={styles.medEmpty}>💊 정보 없음</div>
                                )}

                                <div style={styles.cardButtons}>
                                    <button style={styles.detailBtn} onClick={() => onSelectPatient(p)}>상세</button>
                                    <button style={styles.deleteBtn} onClick={() => handleDelete(p.id)}>삭제</button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ height: '72px' }} />
            </div>

            {/* 하단 네비게이션 바 */}
            <div style={styles.bottomNav}>
                <button style={styles.navBtn} onClick={() => setActiveTab('home')}>
                    <span style={styles.navIcon}>🏠</span>
                    <span style={{ ...styles.navLabel, color: activeTab === 'home' ? '#2563eb' : '#6b7280' }}>홈</span>
                </button>
                <button style={styles.navBtn} onClick={() => { setActiveTab('notification'); onGoNotifications(); }}>
                    <span style={styles.navIcon}>🔔</span>
                    <span style={{ ...styles.navLabel, color: activeTab === 'notification' ? '#2563eb' : '#6b7280' }}>알림</span>
                </button>
                <button style={styles.navBtn} onClick={() => { setActiveTab('emergency'); if (patients.length > 0) onEmergency(patients[0]); }}>
                    <span style={styles.navIcon}>🚨</span>
                    <span style={{ ...styles.navLabel, color: activeTab === 'emergency' ? '#2563eb' : '#6b7280' }}>긴급</span>
                </button>
                <button style={styles.navBtn} onClick={() => { setActiveTab('mypage'); onLogout(); }}>
                    <span style={styles.navIcon}>👤</span>
                    <span style={{ ...styles.navLabel, color: activeTab === 'mypage' ? '#2563eb' : '#6b7280' }}>마이</span>
                </button>
            </div>
        </div>
    );
}

const styles = {
    pageWrapper: {
        minHeight: '100vh',
        background: '#f1f5f9',
        maxWidth: '480px',
        margin: '0 auto',
        position: 'relative',
        fontFamily: 'sans-serif',
    },
    scrollArea: { padding: '12px', paddingBottom: '0' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    logo: { display: 'flex', alignItems: 'center', gap: '5px' },
    logoImg: { height: '28px' },
    logoText: { fontWeight: '700', color: '#2563eb', fontSize: '15px' },
    emergencyBtn: {
        background: '#dc2626', color: '#fff', border: 'none',
        borderRadius: '7px', padding: '5px 10px', fontWeight: '600', cursor: 'pointer', fontSize: '12px',
    },
    topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    title: { fontSize: '13px', fontWeight: '700', color: '#111' },
    addBtn: {
        padding: '5px 11px', background: '#2563eb', color: '#fff',
        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600',
    },
    formCard: {
        background: '#fff', padding: '14px', borderRadius: '12px',
        marginBottom: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    },
    formTitle: { margin: '0 0 10px', fontSize: '13px', fontWeight: '700' },
    form: { display: 'flex', flexDirection: 'column', gap: '7px' },
    input: { padding: '8px 11px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' },
    cancelBtn: {
        flex: 1, background: '#f3f4f6', border: 'none', padding: '10px',
        borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' },
    card: {
        background: '#fff', borderRadius: '12px', padding: '11px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)', textAlign: 'center',
        display: 'flex', flexDirection: 'column', gap: '2px',
    },
    avatar: {
        width: '38px', height: '38px', borderRadius: '50%',
        background: colors.primary, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 5px', fontSize: '15px', fontWeight: '700',
    },
    patientName: { margin: '0 0 1px', fontSize: '13px', fontWeight: '700', color: '#111' },
    patientInfo: { margin: 0, fontSize: '10px', color: '#6b7280' },
    medSummary: {
        background: '#f8faff', border: '1px solid #dbeafe',
        borderRadius: '8px', padding: '6px', margin: '5px 0',
    },
    medSummaryTitle: { fontSize: '10px', fontWeight: '600', color: '#374151', marginBottom: '4px' },
    medBadgeRow: { display: 'flex', gap: '2px', justifyContent: 'center', marginBottom: '4px' },
    medBadge: { fontSize: '9px', fontWeight: '600', padding: '2px 4px', borderRadius: '20px' },
    progressBar: { height: '4px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden', marginBottom: '3px' },
    progressFill: { height: '100%', borderRadius: '99px', transition: 'width 0.3s ease' },
    progressText: { fontSize: '9px', color: '#6b7280' },
    medEmpty: { fontSize: '10px', color: '#9ca3af', background: '#f9fafb', borderRadius: '6px', padding: '5px', margin: '5px 0' },
    cardButtons: { display: 'flex', gap: '5px', marginTop: '4px' },
    detailBtn: {
        flex: 1, background: '#eff6ff', color: '#2563eb',
        border: '1px solid #bfdbfe', borderRadius: '5px', padding: '5px 0', cursor: 'pointer', fontSize: '11px',
    },
    deleteBtn: {
        flex: 1, background: '#fff', color: '#dc2626',
        border: '1px solid #fecaca', borderRadius: '5px', padding: '5px 0', cursor: 'pointer', fontSize: '11px',
    },
    bottomNav: {
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        background: '#fff',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '6px 0 10px',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        zIndex: 100,
    },
    navBtn: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px 20px', gap: '2px',
    },
    navIcon: { fontSize: '20px' },
    navLabel: { fontSize: '10px', fontWeight: '500' },
};