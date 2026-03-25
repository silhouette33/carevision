import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientDetailPage from './pages/PatientDetailPage';
import NotificationsPage from './pages/NotificationsPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard'); // 'dashboard' | 'patient' | 'notifications'
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    // 개발 테스트용 — 로그인 건너뜀
    setUser({ id: 1, name: '테스트 보호자', email: 'test@test.com' });
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPage('dashboard');
    setSelectedPatient(null);
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setPage('patient');
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (page === 'patient' && selectedPatient) {
    return (
      <PatientDetailPage
        patient={selectedPatient}
        onBack={() => setPage('dashboard')}
      />
    );
  }

  if (page === 'notifications') {
    return <NotificationsPage onBack={() => setPage('dashboard')} />;
  }

  return (
    <DashboardPage
      user={user}
      onLogout={handleLogout}
      onSelectPatient={handleSelectPatient}
      onGoNotifications={() => setPage('notifications')}
    />
  );
}
