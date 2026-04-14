import { useState } from 'react';
import { Home, Bell, AlertTriangle, User } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import PatientDetailPage from './pages/PatientDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import LoginPage from './pages/LoginPage';
import CameraPage from './camera/CameraPage';
import MyPage from "./pages/MyPage.jsx";
import { api } from './api/client';

const NAV_ITEMS = [
    { id: 'dashboard', icon: Home,          label: '홈' },
    { id: 'notifications', icon: Bell,      label: '알림' },
    { id: 'camera', icon: AlertTriangle,    label: '긴급' },
    { id: 'mypage', icon: User,             label: '마이' },
];

export default function App() {
    const [user, setUser] = useState(null);
    const [page, setPage] = useState('dashboard');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [patients, setPatients] = useState([]);

    const handleLogin = async (form, mode) => {
        const data = mode === 'register'
            ? await api.register(form)
            : await api.login(form);
        if (data?.token) localStorage.setItem('token', data.token);
        setUser(data?.user ?? { name: form.username });
    };

    if (!user) return <LoginPage onLogin={handleLogin} />;

    const handleNav = (id) => {
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

        if (page === 'mypage') {
            return <MyPage user={user} onLogout={() => setUser(null)} />;
        }
        if (page === 'notifications') return <NotificationsPage />;
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
                onSelectPatient={(p) => { setSelectedPatient(p); setPage('detail'); }}
                onEmergency={(p) => { setSelectedPatient(p); setPage('camera'); setActiveTab('camera'); }}
            />
        );
    };

    return (
        <div className="min-h-screen bg-slate-100 max-w-[480px] mx-auto relative font-sans">
            <div className="pb-[60px]">
                {renderPage()}
            </div>

            {/* 하단 네비게이션 바 */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 flex justify-around items-center py-1.5 pb-2.5 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] z-50">
                {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
                    const isActive = activeTab === id;
                    const isEmergency = id === 'camera';
                    return (
                        <button
                            key={id}
                            className="flex flex-col items-center bg-transparent border-none cursor-pointer px-5 py-1 gap-0.5"
                            onClick={() => handleNav(id)}
                        >
                            <Icon
                                size={22}
                                className={
                                    isEmergency
                                        ? isActive ? 'text-red-500' : 'text-gray-400'
                                        : isActive ? 'text-blue-600' : 'text-gray-400'
                                }
                                strokeWidth={isActive ? 2.5 : 1.8}
                            />
                            <span className={`text-[10px] font-medium ${
                                isEmergency
                                    ? isActive ? 'text-red-500' : 'text-gray-400'
                                    : isActive ? 'text-blue-600' : 'text-gray-400'
                            }`}>
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}