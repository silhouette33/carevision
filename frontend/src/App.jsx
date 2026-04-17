import { useState, useEffect } from 'react';
import { api } from './api/client';
import HomePage from './pages/HomePage';
import MedicationPage from './pages/MedicationPage';
import NotificationsPage from './pages/NotificationsPage';
import HistoryPage from './pages/HistoryPage';
import MyPage from './pages/MyPage';
import LoginPage from './pages/LoginPage';
import CameraPage from './camera/CameraPage';

const NAV_ITEMS = [
    { id: 'home', icon: 'home', label: '홈' },
    { id: 'medication', icon: 'pill', label: '복약' },
    { id: 'notifications', icon: 'bell', label: '알림' },
    { id: 'history', icon: 'clipboard', label: '이력' },
    { id: 'my', icon: 'user', label: '내 정보' },
];

function NavIcon({ name, active }) {
    const color = active ? '#FF6B3D' : '#9CA3AF';
    switch (name) {
        case 'home':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z"
                          stroke={color} strokeWidth="2" strokeLinejoin="round"
                          fill={active ? '#FFE5DB' : 'none'}/>
                </svg>
            );
        case 'pill':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="8" width="20" height="8" rx="4"
                          stroke={color} strokeWidth="2"
                          fill={active ? '#FFE5DB' : 'none'}/>
                    <line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth="2"/>
                </svg>
            );
        case 'bell':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"
                          stroke={color} strokeWidth="2" strokeLinejoin="round"
                          fill={active ? '#FFE5DB' : 'none'}/>
                    <path d="M10 19a2 2 0 0 0 4 0" stroke={color} strokeWidth="2" strokeLinecap="round"/>
                </svg>
            );
        case 'clipboard':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="4" width="14" height="17" rx="2"
                          stroke={color} strokeWidth="2"
                          fill={active ? '#FFE5DB' : 'none'}/>
                    <rect x="9" y="2" width="6" height="4" rx="1" stroke={color} strokeWidth="2" fill="white"/>
                    <line x1="9" y1="11" x2="15" y2="11" stroke={color} strokeWidth="2" strokeLinecap="round"/>
                    <line x1="9" y1="15" x2="13" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round"/>
                </svg>
            );
        case 'user':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2"
                            fill={active ? '#FFE5DB' : 'none'}/>
                    <path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke={color} strokeWidth="2" strokeLinecap="round"
                          fill={active ? '#FFE5DB' : 'none'}/>
                </svg>
            );
        default:
            return null;
    }
}

export default function App() {
    const [user, setUser] = useState(null);
    const [page, setPage] = useState('home');
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [cameraMode, setCameraMode] = useState(false);
    const [historyFocus, setHistoryFocus] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user) {
            api.getPatients().then((list) => {
                const extra = [
                    { id: 3, name: '박명수', age: 75, address: '서울 강남구', phone: '010-1111-2222', cameraId: 'cam-3' },
                ];
                const all = [...list, ...extra];
                setPatients(all);
                if (!selectedPatient) setSelectedPatient(all[0] || null);
            });
            api.getUnreadCount().then((r) => setUnreadCount(r.count || 0));
        }
    }, [user]);

    if (!user) return <LoginPage onLogin={setUser} />;

    if (cameraMode) {
        return (
            <CameraPage
                patient={selectedPatient}
                patients={patients}
                onSelectPatient={setSelectedPatient}
                onClose={() => setCameraMode(false)}
            />
        );
    }

    const renderPage = () => {
        if (page === 'medication') {
            return (
                <MedicationPage
                    patient={selectedPatient}
                    patients={patients}
                    onSelectPatient={setSelectedPatient}
                />
            );
        }
        if (page === 'notifications') {
            return (
                <NotificationsPage
                    onUnreadChange={setUnreadCount}
                    onOpenEmergency={(n) => { setHistoryFocus(n); setPage('history'); }}
                />
            );
        }
        if (page === 'history') {
            return (
                <HistoryPage
                    patient={selectedPatient}
                    focus={historyFocus}
                    onClearFocus={() => setHistoryFocus(null)}
                    onOpenCamera={() => setCameraMode(true)}
                />
            );
        }
        if (page === 'my') {
            return (
                <MyPage
                    user={user}
                    patients={patients}
                    onLogout={() => { setUser(null); setPage('home'); }}
                />
            );
        }
        return (
            <HomePage
                user={user}
                patients={patients}
                selectedPatient={selectedPatient}
                onSelectPatient={setSelectedPatient}
                onGoNotifications={() => setPage('notifications')}
                onGoMedication={() => setPage('medication')}
                onOpenCamera={() => setCameraMode(true)}
                unreadCount={unreadCount}
            />
        );
    };

    return (
        <div className="min-h-screen bg-[#F7F7F7] max-w-[480px] mx-auto relative font-sans">
            <div className="pb-[72px]">{renderPage()}</div>

            {/* 하단 고정 네비 */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 flex justify-around items-stretch pt-2 pb-2 shadow-[0_-2px_12px_rgba(0,0,0,0.05)] z-40">
                {NAV_ITEMS.map((tab) => {
                    const active = page === tab.id;
                    return (
                        <button
                            key={tab.id}
                            className="flex flex-col items-center justify-end bg-transparent border-none cursor-pointer px-2 py-1 gap-0.5 relative flex-1"
                            onClick={() => { setPage(tab.id); setHistoryFocus(null); }}
                        >
                            <div className="relative">
                                <NavIcon name={tab.icon} active={active} />
                                {tab.id === 'notifications' && unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-2 bg-[#FF6B3D] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[11px] font-medium mt-0.5 ${active ? 'text-[#FF6B3D]' : 'text-gray-400'}`}>
                                {tab.label}
                            </span>
                            {active && (
                                <span className="absolute bottom-0 w-6 h-0.5 bg-[#FF6B3D] rounded-full" />
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
