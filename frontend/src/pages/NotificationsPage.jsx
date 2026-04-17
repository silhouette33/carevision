import { useEffect, useState } from 'react';
import { api } from '../api/client';

const CATEGORIES = [
    { id: 'all', label: '전체' },
    { id: 'emergency', label: '응급' },
    { id: 'medication', label: '복약' },
    { id: 'system', label: '시스템' },
];

const TYPE_META = {
    FALL: {
        category: 'emergency',
        title: '낙상 의심 감지됨',
        iconBg: 'bg-[#FFE5DB]',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 22h20L12 2z" stroke="#FF6B3D" strokeWidth="2" strokeLinejoin="round" fill="#FFE5DB"/>
                <line x1="12" y1="10" x2="12" y2="15" stroke="#FF6B3D" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="18" r="1" fill="#FF6B3D"/>
            </svg>
        ),
    },
    MEDICATION: {
        category: 'medication',
        title: '복약 완료 확인',
        iconBg: 'bg-[#FFE5DB]',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="8" width="20" height="8" rx="4" stroke="#FF6B3D" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="16" stroke="#FF6B3D" strokeWidth="2"/>
            </svg>
        ),
    },
    NORMAL: {
        category: 'system',
        title: '정상 동작',
        iconBg: 'bg-[#E8F8F0]',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#10B981" strokeWidth="2" fill="#E8F8F0"/>
                <path d="M8 12l3 3 5-6" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        ),
    },
    SYSTEM: {
        category: 'system',
        title: '시스템',
        iconBg: 'bg-[#EEF4FF]',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="12" rx="2" stroke="#4F7CFF" strokeWidth="2" fill="#EEF4FF"/>
                <circle cx="18" cy="11" r="1" fill="#4F7CFF"/>
            </svg>
        ),
    },
};

function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금 전';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    return `${d}일 전`;
}

export default function NotificationsPage({ onUnreadChange, onOpenEmergency }) {
    const [cat, setCat] = useState('all');
    const [items, setItems] = useState([]);

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        try {
            const data = await api.getNotifications();
            setItems(data);
        } catch {
            setItems([]);
        }
    };

    useEffect(() => {
        onUnreadChange?.(items.filter((n) => !n.isRead).length);
    }, [items]);

    const markAll = async () => {
        try { await api.markAllAsRead(); } catch {}
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    const markOne = async (id) => {
        try { await api.markAsRead(id); } catch {}
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    };

    const normalizedType = (n) => {
        const t = (n.type || 'NORMAL').toUpperCase();
        return TYPE_META[t] ? t : 'NORMAL';
    };

    const filtered = cat === 'all'
        ? items
        : items.filter((n) => TYPE_META[normalizedType(n)].category === cat);

    const unreadEmergency = items.find((n) => !n.isRead && normalizedType(n) === 'FALL');

    const formatMessage = (n) => {
        const t = normalizedType(n);
        const patient = n.patient?.name;
        if (t === 'FALL') return `${patient ?? ''} 님 거실에서 낙상 패턴이 감지되었습니다. 즉시 확인해주세요.`;
        if (t === 'MEDICATION') return n.message || `${patient ?? ''} 님 복약이 완료되었습니다.`;
        return n.message || '알림';
    };

    return (
        <div className="min-h-screen">
            {/* 헤더 */}
            <div className="bg-[#FF6B3D] text-white px-5 pt-6 pb-7 rounded-b-3xl">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold m-0">알림</h1>
                    <button
                        onClick={markAll}
                        className="bg-transparent border-none text-white text-sm font-semibold cursor-pointer"
                    >
                        모두 읽음
                    </button>
                </div>
            </div>

            {/* 카테고리 탭 */}
            <div className="px-4 -mt-4 mb-3">
                <div className="bg-white rounded-full p-1 shadow-sm flex">
                    {CATEGORIES.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setCat(c.id)}
                            className={`flex-1 py-1.5 rounded-full text-xs font-semibold border-none cursor-pointer transition-colors ${
                                cat === c.id ? 'bg-[#FF6B3D] text-white' : 'bg-transparent text-gray-500'
                            }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 리스트 */}
            <div className="px-4 flex flex-col">
                {filtered.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-10">알림이 없습니다</p>
                )}
                {filtered.map((n) => {
                    const t = normalizedType(n);
                    const meta = TYPE_META[t];
                    const title = t === 'FALL'
                        ? '낙상 의심 감지됨'
                        : t === 'MEDICATION'
                            ? (n.message?.includes('완료') ? '복약 완료 확인' : '복약 누락 알림')
                            : meta.title;

                    return (
                        <button
                            key={n.id}
                            onClick={() => { markOne(n.id); }}
                            className="text-left bg-transparent border-none cursor-pointer py-3 border-b border-gray-100 last:border-0 flex gap-3"
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                                {meta.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <p className="text-sm font-bold text-gray-900 m-0">{title}</p>
                                    {!n.isRead && (
                                        <span className="w-2 h-2 rounded-full bg-[#FF6B3D] mt-1.5 shrink-0" />
                                    )}
                                </div>
                                <p className="text-xs text-gray-600 m-0 mt-0.5 leading-snug">
                                    {formatMessage(n)}
                                </p>
                                <p className="text-[11px] text-gray-400 m-0 mt-1">{timeAgo(n.sentAt)}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* 응급 알림 CTA */}
            {unreadEmergency && (
                <div className="px-4 my-4">
                    <div className="bg-[#FFE5DB] rounded-2xl p-4 border border-[#FFCDB5]">
                        <div className="flex items-center gap-2 mb-1">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L2 22h20L12 2z" stroke="#E8552B" strokeWidth="2" strokeLinejoin="round"/>
                                <line x1="12" y1="10" x2="12" y2="15" stroke="#E8552B" strokeWidth="2" strokeLinecap="round"/>
                                <circle cx="12" cy="18" r="1" fill="#E8552B"/>
                            </svg>
                            <p className="text-sm font-bold text-[#C73F10] m-0">응급 알림 확인 필요</p>
                        </div>
                        <p className="text-xs text-[#C73F10]/80 mb-3">낙상 감지 후 3분 경과. 지금 확인하세요.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onOpenEmergency?.(unreadEmergency)}
                                className="flex-1 bg-[#FF6B3D] text-white rounded-xl py-2.5 font-bold text-sm border-none cursor-pointer"
                            >
                                영상 확인
                            </button>
                            <button className="flex-1 bg-white text-[#FF6B3D] rounded-xl py-2.5 font-bold text-sm border border-[#FF6B3D] cursor-pointer">
                                119 통화
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
