import { useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import PatientDetailPage from './pages/PatientDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import LoginPage from './pages/LoginPage';
import CameraPage from './camera/CameraPage';

const NAV_ITEMS = [
    { id: 'dashboard', icon: '🏠', label: '홈' },
    { id: 'notifications', icon: '🔔', label: '알림' },
    { id: 'camera', icon: '🚨', label: '긴급' },
    { id: 'mypage', icon: '👤', label: '마이' },
];

export default function App() {
    const [user, setUser] = useState(null);
    const [page, setPage] = useState('dashboard');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [patients, setPatients] = useState([]);

    if (!user) return <LoginPage onLogin={setUser} />;

    const handleNav = (id) => {
        if (id === 'mypage') { setUser(null); return; }
        if (id === 'camera') {
            setActiveTab('camera');
            setPage('camera');
            return;
        }
        setActiveTab(id);
        setPage(id);
    };

    const renderPage = () => {
        if (page === 'detail') {
            return (
                <PatientDetailPage
                    patient={selectedPatient}
                    onBack={() => setPage('dashboard')}
                />
            );
        }
        if (page === 'notifications') {
            return <NotificationsPage />;
        }
        if (page === 'camera') {
            return (
                <CameraPage
                    patient={selectedPatient ?? null}
                    patients={patients}
                    onSelectPatient={(p) => setSelectedPatient(p)}
                    onClose={() => { setPage('dashboard'); setActiveTab('dashboard'); }}
                />
            );
        }
        return (
            <DashboardPage
                user={user}
                onPatientsLoaded={(list) => setPatients(list)}
                onSelectPatient={(p) => {
                    setSelectedPatient(p);
                    setPage('detail');
                }}
                onEmergency={(p) => {
                    setSelectedPatient(p);
                    setPage('camera');
                    setActiveTab('camera');
                }}
            />
        );
    };

    return (
        <div className="min-h-screen bg-slate-100 max-w-[480px] mx-auto relative font-sans">
            <div className="pb-[60px]">
                {renderPage()}
            </div>

            {/* 전역 고정 네비게이션 바 */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 flex justify-around items-center py-1.5 pb-2.5 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] z-50">
                {NAV_ITEMS.map(tab => (
                    <button
                        key={tab.id}
                        className="flex flex-col items-center bg-transparent border-none cursor-pointer px-5 py-1 gap-0.5"
                        onClick={() => handleNav(tab.id)}
                    >
                        <span className="text-xl">{tab.icon}</span>
                        <span className={`text-[10px] font-medium ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'}`}>
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}