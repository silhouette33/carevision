export default function ErrorMessage({ message = '오류가 발생했습니다.', onRetry }) {
    return (
        <div style={styles.wrapper}>
            <span style={styles.icon}>⚠️</span>
            <p style={styles.message}>{message}</p>
            {onRetry && (
                <button style={styles.retryBtn} onClick={onRetry}>
                    다시 시도
                </button>
            )}
        </div>
    );
}

const styles = {
    wrapper: {
        background: '#fee2e2',
        border: '1px solid #fca5a5',
        borderRadius: '12px',
        padding: '20px 16px',
        textAlign: 'center',
        margin: '16px 0',
    },
    icon: {
        fontSize: '28px',
    },
    message: {
        color: '#dc2626',
        fontWeight: '600',
        fontSize: '14px',
        margin: '8px 0 12px',
    },
    retryBtn: {
        padding: '8px 20px',
        background: '#dc2626',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px',
    },
};
