import { useState, useEffect } from 'react';
import { api } from '../api/client';

const TYPE_LABEL = {
  FALL: { text: '낙상 감지', icon: '🚨', color: '#dc2626', bg: '#fee2e2' },
  MEDICATION: { text: '복약 알림', icon: '💊', color: '#d97706', bg: '#fef3c7' },
  NORMAL: { text: '정상', icon: '✅', color: '#16a34a', bg: '#dcfce7' },
};

export default function NotificationsPage({ onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const MOCK_NOTIFICATIONS = [
    { id: 1, type: 'FALL', message: '김순자 어르신의 낙상이 감지되었습니다. 즉시 확인해주세요.', isRead: false, sentAt: new Date(Date.now() - 600000).toISOString(), patient: { name: '김순자' } },
    { id: 2, type: 'MEDICATION', message: '이복순 어르신의 점심 복약(당뇨약)이 누락되었습니다.', isRead: false, sentAt: new Date(Date.now() - 3600000).toISOString(), patient: { name: '이복순' } },
    { id: 3, type: 'MEDICATION', message: '김순자 어르신의 아침 복약(혈압약)이 완료되었습니다.', isRead: true, sentAt: new Date(Date.now() - 21600000).toISOString(), patient: { name: '김순자' } },
    { id: 4, type: 'FALL', message: '박명수 어르신의 낙상 의심 동작이 감지되었습니다.', isRead: true, sentAt: new Date(Date.now() - 86400000).toISOString(), patient: { name: '박명수' } },
  ];

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      // 목업 데이터로 대체 (API 미연결 시)
      setNotifications(MOCK_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await api.markAsRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      setError(err.message);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← 뒤로</button>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>🔔 알림</h1>
          {unreadCount > 0 && (
            <button style={styles.markAllBtn} onClick={handleMarkAll}>
              전체 읽음 처리 ({unreadCount})
            </button>
          )}
        </div>
      </div>

      <div style={styles.content}>
        {error && <p style={styles.error}>{error}</p>}

        {loading ? (
          <p style={styles.loading}>불러오는 중...</p>
        ) : notifications.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>🔕</p>
            <p style={styles.emptyText}>알림이 없습니다.</p>
          </div>
        ) : (
          <div style={styles.list}>
            {notifications.map((n) => {
              const type = TYPE_LABEL[n.type] || TYPE_LABEL['NORMAL'];
              return (
                <div
                  key={n.id}
                  style={{ ...styles.card, ...(n.isRead ? styles.cardRead : styles.cardUnread) }}
                  onClick={() => !n.isRead && handleMarkOne(n.id)}
                >
                  <div style={{ ...styles.iconBox, background: type.bg }}>
                    <span style={styles.icon}>{type.icon}</span>
                  </div>
                  <div style={styles.body}>
                    <div style={styles.cardTop}>
                      <span style={{ ...styles.typeLabel, color: type.color }}>{type.text}</span>
                      {n.patient && <span style={styles.patientName}>{n.patient.name}</span>}
                      {!n.isRead && <span style={styles.unreadDot} />}
                    </div>
                    <p style={styles.message}>{n.message}</p>
                    <p style={styles.time}>{new Date(n.sentAt).toLocaleString('ko-KR')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#f1f5f9' },
  header: { background: '#fff', padding: '16px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  backBtn: { background: 'none', border: 'none', color: '#1e40af', fontSize: '15px', cursor: 'pointer', fontWeight: '600', marginBottom: '8px', padding: 0 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 },
  markAllBtn: { padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151', fontWeight: '500' },
  content: { maxWidth: '720px', margin: '0 auto', padding: '28px 24px' },
  error: { color: '#dc2626', fontSize: '14px', marginBottom: '12px' },
  loading: { color: '#6b7280', textAlign: 'center', padding: '40px' },
  emptyState: { textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px' },
  emptyIcon: { fontSize: '48px', margin: '0 0 12px' },
  emptyText: { fontSize: '17px', fontWeight: '600', color: '#6b7280', margin: 0 },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  card: { display: 'flex', gap: '14px', padding: '16px', borderRadius: '12px', cursor: 'pointer', transition: 'opacity 0.1s' },
  cardUnread: { background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' },
  cardRead: { background: '#f9fafb', border: '1px solid #f3f4f6', opacity: 0.75 },
  iconBox: { width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon: { fontSize: '20px' },
  body: { flex: 1 },
  cardTop: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  typeLabel: { fontSize: '13px', fontWeight: '700' },
  patientName: { fontSize: '13px', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px' },
  unreadDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', marginLeft: 'auto' },
  message: { fontSize: '14px', color: '#374151', margin: '0 0 4px' },
  time: { fontSize: '12px', color: '#9ca3af', margin: 0 },
};
