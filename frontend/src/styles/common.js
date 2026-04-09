export const colors = {
    primary: '#2563eb',
    secondary: '#3b82f6',
    bg: '#f1f5f9',
    text: '#1f2937',
    subText: '#6b7280',
    danger: '#dc2626',
};

export const layout = {
    container: {
        minHeight: '100vh',
        background: colors.bg,
        padding: '12px',
        fontFamily: 'Pretendard, sans-serif',
        maxWidth: '480px',   // 모바일 우선
        margin: '0 auto',    // PC에서 중앙 정렬
        boxSizing: 'border-box',
    },
};

export const text = {
    title: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1f2937',
    },
    sub: {
        fontSize: '14px',
        color: '#6b7280',
    },
};

export const card = {
    base: {
        background: '#fff',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        boxSizing: 'border-box',
        width: '100%',
    },
};

export const button = {
    primary: {
        background: colors.primary,
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        padding: '12px 16px',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '14px',
        width: '100%',
        boxSizing: 'border-box',
    },
};