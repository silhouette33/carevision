import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function DashboardPage({ user, onLogout, onSelectPatient, onGoNotifications }) {
  const [patients, setPatients] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', age: '', address: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const MOCK_PATIENTS = [
    { id: 1, name: '김순자', age: 78, address: '서울 노원구 공릉동', phone: '010-1234-5678' },
    { id: 2, name: '이복순', age: 82, address: '서울 도봉구 방학동', phone: '010-9876-5432' },
    { id: 3, name: '박명수', age: 75, address: '경기 의정부시 금오동', phone: '010-5555-1234' },
  ];

  const fetchData = async () => {
    try {
      const [patientsData, countData] = await Promise.all([
        api.getPatients(),
        api.getUnreadCount(),
      ]);
      setPatients(patientsData);
      setUnreadCount(countData.count);
    } catch (err) {
      // 목업 데이터로 대체 (API 미연결 시)
      setPatients(MOCK_PATIENTS);
      setUnreadCount(3);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      await api.createPatient({
        ...newPatient,
        age: newPatient.age ? Number(newPatient.age) : null,
      });
      setShowAddForm(false);
      setNewPatient({ name: '', age: '', address: '', phone: '' });
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePatient = async (id, name) => {
    if (!confirm(`${name} 환자를 삭제하시겠습니까?`)) return;
    try {
      await api.deletePatient(id);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={{ fontSize: '22px' }}>👁️</span>
          <h1 style={styles.headerTitle}>CareVision</h1>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.notifBtn} onClick={onGoNotifications}>
            🔔 알림
            {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
          </button>
          <span style={styles.userName}>{user.name}</span>
          <button style={styles.logoutBtn} onClick={onLogout}>로그아웃</button>
        </div>
      </div>

      {/* 본문 */}
      <div style={styles.content}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>담당 환자 목록</h2>
          <button style={styles.addBtn} onClick={() => setShowAddForm(true)}>+ 환자 추가</button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* 환자 추가 폼 */}
        {showAddForm && (
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>새 환자 등록</h3>
            <form onSubmit={handleAddPatient} style={styles.form}>
              <div style={styles.formRow}>
                <input style={styles.input} placeholder="이름 *" value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} required />
                <input style={styles.input} placeholder="나이" type="number" value={newPatient.age}
                  onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })} />
              </div>
              <input style={styles.input} placeholder="주소" value={newPatient.address}
                onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })} />
              <input style={styles.input} placeholder="전화번호" value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} />
              <div style={styles.formActions}>
                <button style={styles.cancelBtn} type="button" onClick={() => setShowAddForm(false)}>취소</button>
                <button style={styles.submitBtn} type="submit">등록</button>
              </div>
            </form>
          </div>
        )}

        {/* 환자 목록 */}
        {loading ? (
          <p style={styles.loading}>불러오는 중...</p>
        ) : patients.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>👴</p>
            <p style={styles.emptyText}>등록된 환자가 없습니다.</p>
            <p style={styles.emptySubText}>위 버튼을 눌러 환자를 추가해보세요.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {patients.map((p) => (
              <div key={p.id} style={styles.patientCard} onClick={() => onSelectPatient(p)}>
                <div style={styles.patientAvatar}>{p.name[0]}</div>
                <div style={styles.patientInfo}>
                  <h3 style={styles.patientName}>{p.name}</h3>
                  {p.age && <p style={styles.patientDetail}>{p.age}세</p>}
                  {p.address && <p style={styles.patientDetail}>📍 {p.address}</p>}
                  {p.phone && <p style={styles.patientDetail}>📞 {p.phone}</p>}
                </div>
                <div style={styles.patientActions}>
                  <button
                    style={styles.detailBtn}
                    onClick={(e) => { e.stopPropagation(); onSelectPatient(p); }}
                  >
                    상세 보기
                  </button>
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => { e.stopPropagation(); handleDeletePatient(p.id, p.name); }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#f1f5f9' },
  header: { background: '#fff', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  headerTitle: { fontSize: '20px', fontWeight: '700', color: '#1e40af', margin: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  notifBtn: { position: 'relative', padding: '7px 14px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  badge: { position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', borderRadius: '50%', fontSize: '11px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: '14px', color: '#374151', fontWeight: '500' },
  logoutBtn: { padding: '7px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#6b7280' },
  content: { maxWidth: '960px', margin: '0 auto', padding: '32px 24px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  sectionTitle: { fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 },
  addBtn: { padding: '9px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  error: { color: '#dc2626', fontSize: '14px', marginBottom: '12px' },
  formCard: { background: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  formTitle: { fontSize: '16px', fontWeight: '600', margin: '0 0 16px', color: '#111827' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  formRow: { display: 'flex', gap: '10px' },
  input: { flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
  formActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' },
  cancelBtn: { padding: '9px 18px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  submitBtn: { padding: '9px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  loading: { color: '#6b7280', textAlign: 'center', padding: '40px' },
  emptyState: { textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px' },
  emptyIcon: { fontSize: '48px', margin: '0 0 12px' },
  emptyText: { fontSize: '18px', fontWeight: '600', color: '#374151', margin: '0 0 6px' },
  emptySubText: { fontSize: '14px', color: '#9ca3af', margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  patientCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'transform 0.1s', display: 'flex', flexDirection: 'column', gap: '12px' },
  patientAvatar: { width: '48px', height: '48px', borderRadius: '50%', background: '#1e40af', color: '#fff', fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: '17px', fontWeight: '700', color: '#111827', margin: '0 0 4px' },
  patientDetail: { fontSize: '13px', color: '#6b7280', margin: '2px 0' },
  patientActions: { display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f3f4f6' },
  detailBtn: { flex: 1, padding: '7px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  deleteBtn: { padding: '7px 12px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
};
