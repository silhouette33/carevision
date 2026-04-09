import { useState, useEffect } from 'react';
import { api } from '../api/client';

const TYPE_LABEL = {
  FALL:       { text: '낙상 감지', icon: '🚨', badgeBg: 'bg-red-100',   badgeText: 'text-red-600',   iconBg: 'bg-red-100' },
  MEDICATION: { text: '복약 알림', icon: '💊', badgeBg: 'bg-amber-100', badgeText: 'text-amber-600', iconBg: 'bg-amber-100' },
  NORMAL:     { text: '정상',     icon: '✅', badgeBg: 'bg-green-100', badgeText: 'text-green-600', iconBg: 'bg-green-100' },
};

export default function NotificationsPage({ onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await api.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      setError(err.message);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
      <div className="min-h-screen bg-slate-100 max-w-[480px] mx-auto font-sans">

        {/* 헤더 */}
        <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-200 shadow-sm">


          <div className="flex justify-between items-center">
            <span className="text-[17px] font-bold text-gray-900">🔔 알림</span>
            {unreadCount > 0 && (
                <button
                    className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-md text-[11px] text-gray-700 font-semibold cursor-pointer"
                    onClick={handleMarkAll}
                >
                  전체 읽음 ({unreadCount})
                </button>
            )}
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-3">
          {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

          {loading ? (
              <p className="text-gray-400 text-sm text-center pt-10">불러오는 중...</p>
          ) : notifications.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <p className="text-4xl mb-2">🔕</p>
                <p className="text-sm font-semibold text-gray-500">알림이 없습니다.</p>
              </div>
          ) : (
              <div className="flex flex-col gap-2">
                {notifications.map(n => {
                  const type = TYPE_LABEL[n.type] || TYPE_LABEL['NORMAL'];
                  return (
                      <div
                          key={n.id}
                          className={`flex gap-3 p-3 rounded-xl border shadow-sm transition-opacity
                                        ${n.isRead
                              ? 'bg-gray-50 border-gray-100 opacity-60 cursor-default'
                              : 'bg-white border-gray-200 cursor-pointer'
                          }`}
                          onClick={() => !n.isRead && handleMarkOne(n.id)}
                      >
                        {/* 타입 아이콘 */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${type.iconBg}`}>
                          <span className="text-lg">{type.icon}</span>
                        </div>

                        {/* 본문 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${type.badgeBg} ${type.badgeText}`}>
                                                {type.text}
                                            </span>
                            {n.patient && (
                                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                    {n.patient.name}
                                                </span>
                            )}
                            {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 ml-auto shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-700 mb-0.5 leading-snug">{n.message}</p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(n.sentAt).toLocaleString('ko-KR')}
                          </p>
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