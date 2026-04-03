export default function Spinner({ message = '불러오는 중...' }) {
    return (
        <div style={styles.wrapper}>
            <div style={styles.spinner} />
            <p style={styles.text}>{message}</p>
            <style>{`
                @keyframes spin {
                    0%   { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

const styles = {
    wrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 0',
        gap: '12px',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #2563eb',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    text: {
        margin: 0,
        fontSize: '14px',
        color: '#6b7280',
    },
};
