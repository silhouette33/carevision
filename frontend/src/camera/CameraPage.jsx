import { layout, colors, button } from '../styles/common';

export default function CameraPage({ patient, onClose }) {

    // MJPEG 스트림 주소 (AI 서버)
    const streamUrl = `http://localhost:5000/stream/${patient.id}`;

    return (
        <div style={layout.container}>

            {/* 헤더 */}
            <div style={styles.header}>
                <h2>🚨 실시간 모니터링</h2>
                <button style={styles.closeBtn} onClick={onClose}>
                    종료
                </button>
            </div>

            {/* 환자 정보 */}
            <div style={styles.patientInfo}>
                <strong>{patient.name}</strong> 님 실시간 영상
            </div>

            {/* 스트리밍 영역 */}
            <div style={styles.videoWrapper}>
                <img
                    src={streamUrl}
                    alt="camera stream"
                    style={styles.video}
                />
            </div>

        </div>
    );
}

const styles = {
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },

    closeBtn: {
        background: colors.danger,
        color: '#fff',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
    },

    patientInfo: {
        marginBottom: '15px',
        fontSize: '18px',
    },

    videoWrapper: {
        background: '#000',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
    },

    video: {
        width: '100%',
        maxHeight: '70vh',
        objectFit: 'cover',
    },
};