import { useState } from 'react';
import { Home, Bell, AlertTriangle, User, Pill } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import PatientDetailPage from './pages/PatientDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import LoginPage from './pages/LoginPage';
import CameraPage from './camera/CameraPage';
import MyPage from "./pages/MyPage.jsx";
import MedicationPage from './pages/MedicationPage';
import { api } from './api/client';

const NAV_ITEMS = [
    { id: 'dashboard', icon: Home, label: '홈' },
    { id: 'medication', icon: Pill, label: '복약' },
    { id: 'camera', icon: AlertTriangle, label: '응급' },
    { id: 'notifications', icon: Bell, label: '알림' },
    { id: 'mypage', icon: User, label: '마이' },
];

export default function App() {
    const [user, setUser] = useState(() => {
        try {
            const token = localStorage.getItem('token');
            const saved = localStorage.getItem('user');
            if (token && saved) return JSON.parse(saved);
        } catch {}
        return null;
    });

    const [page, setPage] = useState('dashboard');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [patients, setPatients] = useState([]);

    const handleLogin = async (form, mode) => {
        if (mode === 'register') {
            await api.register(form);
            throw new Error('회원가입 완료! 로그인해주세요.');
        }
        const result = await api.login(form);
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setPage('dashboard');
        setActiveTab('dashboard');
    };

    if (!user) return <LoginPage onLogin={handleLogin} />;

    // 공통 네비게이션 핸들러
    const handleNav = (id) => {
        if (id === 'camera') {
            setActiveTab('camera');
            if (!selectedPatient && patients.length > 0) {
                setSelectedPatient(patients[0]);
            }
            setPage('camera');
            return;
        }
        setActiveTab(id);
        setPage(id);
    };

    const renderPage = () => {
        switch (page) {
            case 'detail':
                return (
                    <PatientDetailPage
                        patient={selectedPatient}
                        onBack={() => {
                            setPage('dashboard');
                            setActiveTab('dashboard');
                        }}
                    />
                );

            case 'mypage':
                return <MyPage user={user} onLogout={handleLogout} />;


            case 'camera':
                return (
                    <CameraPage
                        patient={selectedPatient ?? null}
                        patients={patients}
                        onSelectPatient={(p) => setSelectedPatient(p)}
                        onClose={() => {
                            setPage('dashboard');
                            setActiveTab('dashboard');
                        }}
                    />
                );


            case 'notifications':
                return (
                    <NotificationsPage
                        onBack={() => {
                            setPage('dashboard');
                            setActiveTab('dashboard');
                        }}
                        onNavigate={handleNav}
                    />
                );

            case 'medication':
                return (
                    <MedicationPage
                        onBack={() => {
                            setPage('dashboard');
                            setActiveTab('dashboard');
                        }}
                        // 대시보드에서 선택된 환자가 있다면 해당 환자를 기본값으로 전달
                        defaultPatientId={selectedPatient?.id}
                    />
                );

            case 'dashboard':
            default:
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
                        // 대시보드 내의 복약 카드 클릭 시 handleNav를 통해 'medication'으로 이동
                        onNavigate={handleNav}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 max-w-[480px] mx-auto relative font-sans shadow-2xl">
            {/* 페이지 렌더링 영역 (하단 바 높이만큼 여백 확보) */}
            <div className="pb-[70px]">
                {renderPage()}
            </div>

            {/* 하단 고정 네비게이션 바 */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 flex justify-around items-center py-2 pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 rounded-t-3xl">
                {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
                    const isActive = activeTab === id;
                    const isEmergency = id === 'camera';

                    return (
                        <button
                            key={id}
                            className="flex flex-col items-center bg-transparent border-none cursor-pointer px-4 py-1 gap-1 transition-all active:scale-90"
                            onClick={() => handleNav(id)}
                        >
                            <div className={`p-1 rounded-xl transition-colors ${isActive && !isEmergency ? 'bg-blue-50' : ''}`}>
                                <Icon
                                    size={22}
                                    className={
                                        isEmergency
                                            ? isActive ? 'text-red-500' : 'text-gray-400'
                                            : isActive ? 'text-blue-600' : 'text-gray-400'
                                    }
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                            </div>
                            <span className={`text-[10px] font-bold tracking-tight ${
                                isEmergency
                                    ? isActive ? 'text-red-500' : 'text-gray-400'
                                    : isActive ? 'text-blue-600' : 'text-gray-400'
                            }`}>
                                {label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}