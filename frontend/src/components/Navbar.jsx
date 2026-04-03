export default function Navbar({ onHome, onNotifications, current }) {
    return (
        <div style={styles.nav}>
            <button
                style={{
                    ...styles.tab,
                    color: current === 'dashboard' ? '#2563eb' : '#6b7280',
                }}
                onClick={onHome}
            >
                🏠 홈
            </button>

            <button
                style={{
                    ...styles.tab,
                    color: current === 'notifications' ? '#2563eb' : '#6b7280',
                }}
                onClick={onNotifications}
            >
                🔔 알림
            </button>
        </div>
    );
}

const styles = {
    nav: {
        position: 'fixed',
        bottom: 0,
        width: '100%',
        background: '#fff',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px 0',
        borderTop: '1px solid #e5e7eb',
    },

    tab: {
        border: 'none',
        background: 'none',
        fontSize: '14px',
        cursor: 'pointer',
    },
};