import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Bell,
  AlertTriangle,
  Pill,
  ShieldCheck,
  X,
  Video,
  Phone
} from 'lucide-react';
import { api } from '../api/client';

const TYPE_CONFIG = {
  FALL: {
    text: '응급',
    icon: <AlertTriangle size={18} className="text-red-600" />,
    bg: 'bg-red-50',
    badge: 'bg-red-100 text-red-600'
  },
  MEDICATION: {
    text: '복약',
    icon: <Pill size={18} className="text-blue-600" />,
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-600'
  },
  NORMAL: {
    text: '시스템',
    icon: <ShieldCheck size={18} className="text-green-600" />,
    bg: 'bg-green-50',
    badge: 'bg-green-100 text-green-600'
  },
};

const TABS = ['전체', '응급', '복약', '시스템'];

export default function NotificationsPage({ onBack, onNavigate }) {

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('전체');

  // 초기 false → 자동 모달 안 뜸
  const [showEmergencyBanner, setShowEmergencyBanner] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

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
      setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true }))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await api.markAsRead(id);

      setNotifications(prev =>
          prev.map(n =>
              n.id === id
                  ? { ...n, isRead: true }
                  : n
          )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = notifications.filter(n => {
    if (activeTab === '전체') return true;
    if (activeTab === '응급') return n.type === 'FALL';
    if (activeTab === '복약') return n.type === 'MEDICATION';
    if (activeTab === '시스템') return n.type === 'NORMAL';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const hasEmergency = notifications.some(
      n => n.type === 'FALL' && !n.isRead
  );

  return (
      <div className="min-h-screen bg-gray-50 max-w-[480px] mx-auto pb-24 relative font-sans">

        {/* 헤더 */}
        <div className="bg-white px-4 pt-6 pb-4 sticky top-0 z-30 shadow-sm border-b border-gray-100">

          <div className="flex items-center justify-between mb-4">

            <button
                onClick={onBack}
                className="p-2 -ml-2 bg-transparent border-none cursor-pointer text-gray-600"
            >
              <ChevronLeft size={24}/>
            </button>

            <h1 className="text-lg font-bold text-gray-900">
              알림 센터
            </h1>

            {unreadCount > 0 ? (
                <button
                    onClick={handleMarkAll}
                    className="text-[11px] font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border-none cursor-pointer"
                >
                  모두 읽음
                </button>
            ) : (
                <div className="w-10"/>
            )}
          </div>

          {/* 탭 메뉴 */}
          <div className="flex bg-gray-100/80 rounded-xl p-1">

            {TABS.map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border-none cursor-pointer transition-all ${
                        activeTab === tab
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-400'
                    }`}
                >
                  {tab}
                </button>
            ))}

          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-4">

          {/* 에러 */}
          {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
                <AlertTriangle size={14}/>
                {error}
              </div>
          )}

          {/* 로딩 */}
          {loading ? (
              <div className="text-center py-20 text-gray-400 text-sm font-bold animate-pulse">
                알림 불러오는 중...
              </div>
          ) : filtered.length === 0 ? (

              /* 빈 상태 */
              <div className="text-center py-24 bg-white rounded-[32px] border border-dashed border-gray-200">

                <Bell
                    size={40}
                    className="mx-auto text-gray-200 mb-4"
                />

                <p className="text-gray-400 font-bold text-sm">
                  최근 도착한 알림이 없습니다.
                </p>
              </div>

          ) : (

              /* 알림 리스트 */
              <div className="space-y-3">

                {filtered.map(n => {

                  const config =
                      TYPE_CONFIG[n.type] ||
                      TYPE_CONFIG['NORMAL'];

                  return (
                      <div
                          key={n.id}

                          onClick={() => {

                            // 읽음 처리
                            if (!n.isRead) {
                              handleMarkOne(n.id);
                            }

                            // 응급 알림 → CameraPage
                            if (n.type === 'FALL') {
                              onNavigate &&
                              onNavigate('camera', n.patient);
                            }

                            // 복약 알림 → MedicationPage
                            if (n.type === 'MEDICATION') {
                              onNavigate &&
                              onNavigate('medication', n.patient);
                            }
                          }}

                          className={`relative flex gap-4 p-4 rounded-[24px] bg-white border border-gray-100 transition-all shadow-sm ${
                              n.isRead
                                  ? 'opacity-60'
                                  : 'hover:shadow-md'
                          }`}

                          style={{ cursor: 'pointer' }}
                      >

                        {/* 아이콘 */}
                        <div
                            className={`w-12 h-12 rounded-2xl ${config.bg} flex items-center justify-center flex-shrink-0`}
                        >
                          {config.icon}
                        </div>

                        {/* 텍스트 */}
                        <div className="flex-1 min-w-0">

                          <div className="flex items-center gap-2 mb-1">

                            <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${config.badge}`}
                            >
                              {config.text}
                            </span>

                            {n.patient && (
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                  {n.patient.name} 환자
                                </span>
                            )}

                            {!n.isRead && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse ml-auto"/>
                            )}
                          </div>

                          <p className="text-[13px] font-bold text-gray-800 leading-snug mb-1">
                            {n.message}
                          </p>

                          <p className="text-[10px] text-gray-400 font-medium">
                            {new Date(n.sentAt).toLocaleString(
                                'ko-KR',
                                {
                                  hour12: true,
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  month: 'short',
                                  day: 'numeric'
                                }
                            )}
                          </p>

                        </div>
                      </div>
                  );
                })}

              </div>
          )}
        </div>

        {/* 응급 플로팅 배너 */}
        {hasEmergency && showEmergencyBanner && (
            <div className="fixed bottom-6 left-4 right-4 max-w-[448px] mx-auto z-50 animate-in slide-in-from-bottom-10 duration-500">

              <div className="bg-red-600 rounded-[28px] p-5 shadow-2xl shadow-red-200 border border-red-500">

                <div className="flex justify-between items-start mb-3">

                  <div className="flex items-center gap-2 text-white">

                    <div className="bg-white/20 p-1.5 rounded-lg animate-bounce">
                      <AlertTriangle size={20}/>
                    </div>

                    <div>
                      <h4 className="text-[14px] font-black">
                        긴급 상황 발생
                      </h4>

                      <p className="text-[11px] text-red-100 opacity-90 font-bold">
                        낙상이 감지되었습니다. 즉시 확인하세요!
                      </p>
                    </div>
                  </div>

                  <button
                      onClick={() => setShowEmergencyBanner(false)}
                      className="p-1 bg-red-700 text-red-200 rounded-full border-none cursor-pointer"
                  >
                    <X size={16}/>
                  </button>
                </div>

                <div className="flex gap-2">

                  <button
                      onClick={() =>
                          onNavigate &&
                          onNavigate('camera')
                      }
                      className="flex-1 py-3 bg-white text-red-600 rounded-xl font-black text-[13px] border-none cursor-pointer flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <Video size={16}/>
                    실시간 영상 확인
                  </button>

                  <button
                      className="flex-1 py-3 bg-red-800 text-white rounded-xl font-black text-[13px] border-none cursor-pointer flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <Phone size={16}/>
                    119 긴급전화
                  </button>

                </div>
              </div>
            </div>
        )}
      </div>
  );
}