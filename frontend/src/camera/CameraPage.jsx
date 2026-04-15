import { useState, useEffect, useRef, useCallback } from 'react';

const AI_URL = 'http://localhost:8000';
const FRAME_INTERVAL_MS = 500; // 2 fps 정도로 전송 (MVP 가시성 확인 용)

export default function CameraPage({ patient, patients = [], onSelectPatient, onClose }) {
    const [selectedLocal, setSelectedLocal] = useState(patient);

    useEffect(() => {
        setSelectedLocal(patient);
    }, [patient]);

    // ─────────────── 환자 미선택 → 선택 목록 ───────────────
    if (!selectedLocal) {
        return (
            <div className="min-h-screen bg-slate-100 max-w-[480px] mx-auto font-sans">
                <div className="bg-red-600 px-4 pt-5 pb-4">
                    <span className="text-white font-bold text-[17px]">🚨 긴급 모니터링</span>
                </div>
                <div className="p-3">
                    <p className="text-sm font-semibold text-gray-600 mb-3">
                        모니터링할 환자를 선택해주세요
                    </p>
                    <div className="flex flex-col gap-2">
                        {patients.map((p) => (
                            <div
                                key={p.id}
                                className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 border border-gray-200 shadow-sm cursor-pointer"
                                onClick={() => {
                                    onSelectPatient?.(p);
                                    setSelectedLocal(p);
                                }}
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0">
                                    {p.name?.[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 m-0">{p.name}</p>
                                    <p className="text-[11px] text-gray-500 m-0">
                                        {p.age}세 · {p.address}
                                    </p>
                                </div>
                                <span className="ml-auto text-gray-400">›</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────── 환자 선택 후 → 웹캠 + 실시간 감지 ───────────────
    return (
        <LiveDetectionView
            patient={selectedLocal}
            onChangePatient={() => setSelectedLocal(null)}
        />
    );
}

function LiveDetectionView({ patient, onChangePatient }) {
    const videoRef = useRef(null);
    const overlayRef = useRef(null);
    const captureCanvasRef = useRef(null);
    const intervalRef = useRef(null);
    const inflightRef = useRef(false);

    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState(null);
    const [medObjects, setMedObjects] = useState([]);
    const [fall, setFall] = useState({ status: 'idle', confidence: 0 });
    const [modelType, setModelType] = useState('-');
    const [lastLatency, setLastLatency] = useState(0);
    const [alerts, setAlerts] = useState([]); // 상단 토스트 알림
    const [medScore, setMedScore] = useState(null);     // {taken, score, status, signals, window}
    const [handMouth, setHandMouth] = useState(null);   // {confidence, status}
    const prevFallStatus = useRef('idle');
    const prevMedCount = useRef(0);
    const prevTaken = useRef(false);

    const pushAlert = useCallback((type, text) => {
        const id = Date.now() + Math.random();
        setAlerts((prev) => [...prev, { id, type, text }]);
        setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.id !== id));
        }, 4000);
    }, []);

    const startCamera = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false,
            });
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setStreaming(true);
        } catch (e) {
            setError('웹캠 접근 실패: ' + e.message);
        }
    };

    const stopCamera = () => {
        const stream = videoRef.current?.srcObject;
        if (stream) stream.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        setStreaming(false);
        setMedObjects([]);
        setFall({ status: 'idle', confidence: 0 });
        setMedScore(null);
        setHandMouth(null);
        clearOverlay();
    };

    const resetScorer = async () => {
        try {
            await fetch(`${AI_URL}/detect/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cameraId: `patient-${patient.id}` }),
            });
            prevTaken.current = false;
            setMedScore(null);
            pushAlert('info', '🔄 스코어러 리셋 완료');
        } catch (e) {
            pushAlert('warn', '리셋 실패: ' + e.message);
        }
    };

    const clearOverlay = () => {
        const cv = overlayRef.current;
        if (!cv) return;
        cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    };

    const drawOverlay = (objects, vw, vh) => {
        const cv = overlayRef.current;
        if (!cv) return;
        cv.width = vw;
        cv.height = vh;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, vw, vh);
        ctx.lineWidth = 3;
        ctx.font = 'bold 16px sans-serif';
        objects.forEach((d) => {
            const { x1, y1, x2, y2 } = d.bbox;
            ctx.strokeStyle = '#22c55e';
            ctx.fillStyle = '#22c55e';
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            const label = `${d.label} ${(d.confidence * 100).toFixed(0)}%`;
            const tw = ctx.measureText(label).width + 8;
            ctx.fillRect(x1, Math.max(0, y1 - 20), tw, 20);
            ctx.fillStyle = '#0f172a';
            ctx.fillText(label, x1 + 4, Math.max(14, y1 - 5));
        });
    };

    const captureAndDetect = async () => {
        if (inflightRef.current) return;
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;

        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return;

        const canvas = captureCanvasRef.current;
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

        inflightRef.current = true;
        const t0 = performance.now();
        try {
            const res = await fetch(`${AI_URL}/detect/live`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataUrl, cameraId: `patient-${patient.id}` }),
            });
            const json = await res.json();
            if (json.success) {
                const objs = json.medication?.objects || [];
                setMedObjects(objs);
                setFall(json.fall || { status: 'unknown', confidence: 0 });
                setModelType(json.model_type);
                setMedScore(json.medication_score || null);
                setHandMouth(json.hand_to_mouth || null);
                drawOverlay(objs, w, h);
                setLastLatency(Math.round(performance.now() - t0));

                // 낙상 상태 변화 시 알림
                const newStatus = json.fall?.status;
                if (newStatus && newStatus !== prevFallStatus.current) {
                    if (newStatus === 'emergency') {
                        pushAlert('danger', '🚨 낙상 감지! 위급 상황');
                    } else if (newStatus === 'suspected') {
                        pushAlert('warn', '⚠️ 낙상 의심 자세');
                    }
                    prevFallStatus.current = newStatus;
                }
                // 약 처음 감지되거나 개수가 늘어났을 때 알림
                if (objs.length > prevMedCount.current) {
                    pushAlert('info', `💊 약 ${objs.length}개 감지`);
                }
                prevMedCount.current = objs.length;

                // 복약 완료 판정 순간 한 번만 토스트
                const takenNow = !!json.medication_score?.taken;
                if (takenNow && !prevTaken.current) {
                    pushAlert('info', '✅ 복약 완료 확정!');
                }
                prevTaken.current = takenNow;
            }
        } catch (e) {
            // 서버 죽어있는 경우 조용히 pass
        } finally {
            inflightRef.current = false;
        }
    };

    useEffect(() => {
        if (!streaming) return;
        intervalRef.current = setInterval(captureAndDetect, FRAME_INTERVAL_MS);
        return () => clearInterval(intervalRef.current);
        // eslint-disable-next-line
    }, [streaming]);

    useEffect(() => () => stopCamera(), []);

    // 낙상 상태별 색상/텍스트
    const fallMeta = {
        emergency: { color: 'bg-red-600 text-white', label: '🚨 위급 (낙상 확정)' },
        suspected: { color: 'bg-orange-500 text-white', label: '⚠️ 낙상 의심' },
        caution: { color: 'bg-yellow-400 text-gray-900', label: '주의' },
        normal: { color: 'bg-green-500 text-white', label: '정상' },
        no_person: { color: 'bg-gray-300 text-gray-700', label: '사람 없음' },
        idle: { color: 'bg-gray-200 text-gray-600', label: '대기 중' },
    }[fall.status] || { color: 'bg-gray-200 text-gray-600', label: fall.status };

    return (
        <div className="min-h-screen bg-slate-100 max-w-[480px] mx-auto font-sans relative">
            {/* 헤더 */}
            <div className="bg-red-600 px-4 pt-5 pb-4 flex justify-between items-center">
                <span className="text-white font-bold text-[17px]">🚨 실시간 모니터링</span>
                <button
                    className="bg-white text-red-600 border-none rounded-lg px-3 py-1.5 font-semibold cursor-pointer text-sm"
                    onClick={onChangePatient}
                >
                    환자 변경
                </button>
            </div>

            {/* 환자 정보 */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {patient.name?.[0]}
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-900 m-0">{patient.name} 님 실시간 영상</p>
                    <p className="text-[11px] text-gray-500 m-0">
                        {patient.age}세 · {patient.address}
                    </p>
                </div>
            </div>

            {/* 토스트 알림 영역 */}
            {alerts.length > 0 && (
                <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90%] max-w-[440px]">
                    {alerts.map((a) => (
                        <div
                            key={a.id}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold shadow-lg animate-pulse ${
                                a.type === 'danger'
                                    ? 'bg-red-600 text-white'
                                    : a.type === 'warn'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-blue-600 text-white'
                            }`}
                        >
                            {a.text}
                        </div>
                    ))}
                </div>
            )}

            {/* 웹캠 + 오버레이 */}
            <div className="p-3">
                <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3]">
                    <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-contain"
                        muted
                        playsInline
                    />
                    <canvas
                        ref={overlayRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                    <canvas ref={captureCanvasRef} className="hidden" />

                    {!streaming && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                            카메라 꺼짐 — 아래 버튼으로 시작
                        </div>
                    )}

                    {/* 상단 상태 배지 */}
                    {streaming && (
                        <div className="absolute top-2 left-2 flex gap-2">
                            <span className={`text-[11px] font-bold rounded-md px-2 py-1 ${fallMeta.color}`}>
                                {fallMeta.label}
                            </span>
                            {medObjects.length > 0 && (
                                <span className="text-[11px] font-bold rounded-md px-2 py-1 bg-green-600 text-white">
                                    💊 {medObjects.length}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* 제어 버튼 */}
                <div className="mt-3 flex gap-2">
                    {!streaming ? (
                        <button
                            onClick={startCamera}
                            className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-bold text-sm border-none cursor-pointer"
                        >
                            ▶ 카메라 시작
                        </button>
                    ) : (
                        <button
                            onClick={stopCamera}
                            className="flex-1 bg-red-500 text-white rounded-xl py-3 font-bold text-sm border-none cursor-pointer"
                        >
                            ■ 카메라 정지
                        </button>
                    )}
                    <button
                        onClick={resetScorer}
                        className="bg-gray-200 text-gray-800 rounded-xl py-3 px-4 font-bold text-sm border-none cursor-pointer"
                    >
                        🔄 리셋
                    </button>
                </div>

                {/* 복약 완료 큰 배너 */}
                {medScore?.taken && (
                    <div className="mt-3 bg-green-600 text-white rounded-xl p-4 text-center shadow-lg">
                        <p className="text-[11px] m-0 opacity-90">MEDICATION TAKEN</p>
                        <p className="text-lg font-bold m-0 mt-1">✅ 복약 완료</p>
                        <p className="text-[10px] m-0 mt-1 opacity-90">
                            score {(medScore.score ?? 0).toFixed(2)} · status {medScore.status}
                        </p>
                    </div>
                )}

                {/* 복약 스코어 상세 카드 */}
                {medScore && (
                    <div className="mt-3 bg-white rounded-xl p-3 border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[12px] font-bold text-gray-800 m-0">📊 복약 스코어</p>
                            <span
                                className={`text-[10px] font-bold rounded px-2 py-0.5 ${
                                    medScore.status === 'taken'
                                        ? 'bg-green-100 text-green-700'
                                        : medScore.status === 'preparing'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : medScore.status === 'eating_unknown'
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                {medScore.status}
                            </span>
                        </div>

                        {/* 총점 게이지 */}
                        <div className="mb-2">
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                <span>score</span>
                                <span className="font-mono">{(medScore.score ?? 0).toFixed(3)}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded">
                                <div
                                    className="h-2 rounded bg-green-500 transition-all"
                                    style={{ width: `${Math.min(100, (medScore.score ?? 0) * 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* 박스 프레임 진행도 */}
                        <div className="mb-2">
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                <span>약통 감지 프레임</span>
                                <span className="font-mono">
                                    {medScore.window.box_frames} / {medScore.window.total_frames}
                                    {'  (min '}{medScore.window.box_min}{')'}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded">
                                <div
                                    className={`h-1.5 rounded transition-all ${
                                        medScore.window.box_frames >= medScore.window.box_min
                                            ? 'bg-green-500'
                                            : 'bg-blue-400'
                                    }`}
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            (medScore.window.box_frames /
                                                Math.max(1, medScore.window.box_min)) *
                                                100
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* 모션 프레임 진행도 */}
                        <div className="mb-2">
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                <span>손→입 동작 프레임</span>
                                <span className="font-mono">
                                    {medScore.window.motion_frames} / {medScore.window.total_frames}
                                    {'  (min '}{medScore.window.motion_min}{')'}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded">
                                <div
                                    className={`h-1.5 rounded transition-all ${
                                        medScore.window.motion_frames >= medScore.window.motion_min
                                            ? 'bg-green-500'
                                            : 'bg-purple-400'
                                    }`}
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            (medScore.window.motion_frames /
                                                Math.max(1, medScore.window.motion_min)) *
                                                100
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <p className="text-[10px] text-gray-400 m-0 mt-1">
                            시간창 {medScore.window.seconds}s · 박스 최고 conf{' '}
                            {((medScore.signals?.box_top_confidence ?? 0) * 100).toFixed(0)}%
                        </p>
                    </div>
                )}

                {/* 손→입 LSTM 카드 */}
                {handMouth && (
                    <div className="mt-3 bg-white rounded-xl p-3 border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[12px] font-bold text-gray-800 m-0">✋ 손→입 동작 (LSTM)</p>
                            <span
                                className={`text-[10px] font-bold rounded px-2 py-0.5 ${
                                    handMouth.detected
                                        ? 'bg-red-100 text-red-700'
                                        : (handMouth.status || '').includes('suspect')
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                {handMouth.status || '-'}
                            </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>확률</span>
                            <span className="font-mono">
                                {((handMouth.confidence ?? 0) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded">
                            <div
                                className={`h-2 rounded transition-all ${
                                    (handMouth.confidence ?? 0) >= 0.5 ? 'bg-red-500' : 'bg-purple-400'
                                }`}
                                style={{
                                    width: `${Math.min(100, (handMouth.confidence ?? 0) * 100)}%`,
                                }}
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-3 bg-red-100 text-red-700 text-xs p-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* 감지 상태 패널 */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                        <p className="text-[11px] text-gray-500 m-0 mb-1">💊 복약 감지</p>
                        <p className="text-lg font-bold text-gray-900 m-0">
                            {medObjects.length}개
                        </p>
                        <p className="text-[10px] text-gray-400 m-0 mt-1">
                            모델: {modelType}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                        <p className="text-[11px] text-gray-500 m-0 mb-1">🚨 자세/낙상</p>
                        <p className="text-lg font-bold text-gray-900 m-0">
                            {fallMeta.label}
                        </p>
                        <p className="text-[10px] text-gray-400 m-0 mt-1">
                            신뢰도 {((fall.confidence || 0) * 100).toFixed(0)}%
                        </p>
                    </div>
                </div>

                {/* 복약 객체 리스트 */}
                {medObjects.length > 0 && (
                    <div className="mt-3 bg-white rounded-xl p-3 border border-gray-200">
                        <p className="text-[11px] font-semibold text-gray-500 m-0 mb-2">감지 객체</p>
                        <div className="flex flex-col gap-1">
                            {medObjects.map((d, i) => (
                                <div
                                    key={i}
                                    className="flex justify-between text-xs bg-slate-50 rounded px-2 py-1"
                                >
                                    <span className="font-semibold text-green-700">{d.label}</span>
                                    <span className="text-gray-500">
                                        {(d.confidence * 100).toFixed(0)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {streaming && (
                    <p className="text-center text-[10px] text-gray-400 mt-2">
                        전송 주기 {FRAME_INTERVAL_MS}ms · 응답 {lastLatency}ms
                    </p>
                )}
            </div>
        </div>
    );
}
