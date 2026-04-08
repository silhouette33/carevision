import { useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import PatientDetailPage from './pages/PatientDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import LoginPage from './pages/LoginPage';
import CameraPage from './camera/CameraPage';

export default function App() {
    const [user, setUser] = useState(null);
    const [page, setPage] = useState('dashboard');
    const [selectedPatient, setSelectedPatient] = useState(null);

    if (!user) {
        return <LoginPage onLogin={setUser} />;
    }

    if (page === 'detail') {
        return (
            <PatientDetailPage
                patient={selectedPatient}
                onBack={() => setPage('dashboard')}
            />
        );
    }

    if (page === 'notifications') {
        return (
            <NotificationsPage onBack={() => setPage('dashboard')} />
        );
    }

    if (page === 'camera') {
        return (
            <CameraPage
                patient={selectedPatient}
                onClose={() => setPage('dashboard')}
            />
        );
    }

    return (
        <DashboardPage
            user={user}
            onLogout={() => setUser(null)}
            onGoNotifications={() => setPage('notifications')}
            onSelectPatient={(p) => {
                setSelectedPatient(p);
                setPage('detail');
            }}
            onEmergency={(p) => {
                setSelectedPatient(p);
                setPage('camera');
            }}
        />
    );
}
