import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Maximize2, Phone, Users, X, ChevronRight, ShieldCheck, Clock, MapPin, AlertTriangle } from 'lucide-react';

// ── 더미 응급 내역 ──────────────────────────────────────────────
const MOCK_HISTORY = [
    { id: 1, type: 'FALL',       label: '낙상 감지',    location: '거실',   confidence: 91.2, resolvedAt: '2025.06.10 14:32', result: '오탐지' },
    { id: 2, type: 'INACTIVITY', label: '무동작 감지',  location: '침실',   confidence: 78.5, resolvedAt: '2025.06.08 09:17', result: '보호자 확인' },
    { id: 3, type: 'FALL',       label: '낙상 감지',    location: '욕실',   confidence: 95.8, resolvedAt: '2025.06.05 21:04', result: '119 출동' },
    { id: 4, type: 'INACTIVITY', label: '무동작 감지',  location: '거실',   confidence: 83.1, resolvedAt: '2025.06.01 11:45', result: '보호자 확인' },
    { id: 5, type: 'FALL',       label: '낙상 감지',    location: '주방',   confidence: 88.7, resolvedAt: '2025.05.28 18:22', result: '오탐지' },
];

// ── 결과 배지 색상 ───────────────────────────────────────────────
const resultBadge = (result) => {
    if (result === '오탐지')     return { bg: '#f3f4f6', color: '#6b7280' };
    if (result === '119 출동')   return { bg: '#fee2e2', color: '#dc2626' };
    return { bg: '#dbeafe', color: '#2563eb' };
};

// ── 감지 타입 아이콘 색 ──────────────────────────────────────────
const typeColor = (type) => type === 'FALL' ? '#ef4444' : '#f97316';


// ════════════════════════════════════════════════════════════════
//  서브 화면: 응급 내역 상세
// ════════════════════════════════════════════════════════════════
function HistoryDetail({ record, patient, onBack }) {
    const badge = resultBadge(record.result);
    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            {/* 헤더 */}
            <div style={{ background: '#fff', padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={22} color="#374151" />
                </button>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#111' }}>응급 내역 상세</span>
            </div>

            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 상태 뱃지 + 타입 */}
                <div style={{ background: '#fff', borderRadius: '20px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: record.type === 'FALL' ? '#fee2e2' : '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AlertTriangle size={20} color={typeColor(record.type)} />
                            </div>
                            <div>
                                <p style={{ fontSize: '16px', fontWeight: '800', color: '#111', margin: 0 }}>{record.label}</p>
                                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{record.resolvedAt}</p>
                            </div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', padding: '5px 12px', borderRadius: '99px', background: badge.bg, color: badge.color }}>{record.result}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                        <div>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={10} /> 발생 위치
                            </p>
                            <p style={{ fontSize: '15px', fontWeight: '700', color: '#111', margin: 0 }}>{record.location}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 4px' }}>LSTM 신뢰도</p>
                            <p style={{ fontSize: '15px', fontWeight: '700', color: '#2563eb', margin: 0 }}>{record.confidence}%</p>
                        </div>
                    </div>
                </div>

                {/* 환자 정보 */}
                <div style={{ background: '#fff', borderRadius: '20px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px', flexShrink: 0 }}>
                        {patient?.name?.[0]}
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: '#111', margin: 0 }}>{patient?.name} 님</p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{patient?.age}세 · {patient?.address}</p>
                    </div>
                </div>

                {/* 당시 녹화 영상 (더미) */}
                <div>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151', margin: '4px 0 10px' }}>당시 녹화 영상</p>
                    <div style={{ background: '#111', borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ marginBottom: '8px' }}>
                                <circle cx="22" cy="22" r="22" fill="rgba(255,255,255,0.08)" />
                                <polygon points="18,14 32,22 18,30" fill="rgba(255,255,255,0.6)" />
                            </svg>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', margin: 0 }}>녹화 영상 재생</p>
                        </div>
                        <div style={{ position: 'absolute', top: '10px', right: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>REC</div>
                    </div>
                </div>
            </div>
        </div>
    );
}


// ════════════════════════════════════════════════════════════════
//  서브 화면: 카메라 크게 보기
// ════════════════════════════════════════════════════════════════
function FullscreenCamera({ patient, onBack }) {
    return (
        <div style={{ minHeight: '100vh', background: '#000', maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>LIVE</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontFamily: 'monospace' }}>{patient?.cameraId}</span>
                </div>
                <button onClick={onBack} style={{ border: 'none', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <X size={14} color="rgba(255,255,255,0.7)" />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>닫기</span>
                </button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <div style={{ width: '52px', height: '52px', border: '2px solid rgba(37,99,235,0.3)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>실시간 카메라 스트림</p>
                <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px' }}>{patient?.name} · {patient?.address}</p>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}


// ════════════════════════════════════════════════════════════════
//  메인: CameraPage
// ════════════════════════════════════════════════════════════════
export default function CameraPage({ patient, detectionStatus, patients = [], onSelectPatient, onClose }) {
    const [selectedLocal, setSelectedLocal] = useState(patient);
    const [elapsed, setElapsed] = useState(0);
    const [view, setView] = useState('main'); // 'main' | 'fullscreen' | 'historyDetail'
    const [selectedRecord, setSelectedRecord] = useState(null);
    const riskLevel = 3;

    const det = detectionStatus || 'NORMAL';
    const isAlert = det === 'FALL' || det === 'INACTIVITY';

    useEffect(() => { setSelectedLocal(patient); }, [patient]);

    useEffect(() => {
        if (!isAlert) return;
        const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }, [isAlert]);

    const formatElapsed = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}분 ${String(s).padStart(2, '0')}초 경과`;
    };

    // ── 환자 미선택 → 목록 ──────────────────────────────────────
    if (!selectedLocal) {
        return (
            <div style={{ minHeight: '100vh', background: '#f1f5f9', maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif' }}>
                <div style={{ background: '#2563eb', padding: '24px 20px 20px' }}>
                    <p style={{ color: '#bfdbfe', fontSize: '12px', fontWeight: '600', margin: '0 0 4px' }}>응급 감지</p>
                    <span style={{ color: '#fff', fontWeight: '700', fontSize: '20px' }}>🚨 긴급 모니터링</span>
                </div>
                <div style={{ padding: '16px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '12px' }}>모니터링할 환자를 선택해주세요</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {patients.map(p => (
                            <div key={p.id}
                                 style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}
                                 onClick={() => { onSelectPatient?.(p); setSelectedLocal(p); }}
                            >
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px', flexShrink: 0 }}>
                                    {p.name?.[0]}
                                </div>
                                <div>
                                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#111', margin: 0 }}>{p.name}</p>
                                    <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{p.age}세 · {p.address}</p>
                                </div>
                                <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: '20px' }}>›</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── 서브 뷰: 전체화면 카메라 ──────────────────────────────────
    if (view === 'fullscreen') {
        return <FullscreenCamera patient={selectedLocal} onBack={() => setView('main')} />;
    }

    // ── 서브 뷰: 내역 상세 ───────────────────────────────────────
    if (view === 'historyDetail' && selectedRecord) {
        return <HistoryDetail record={selectedRecord} patient={selectedLocal} onBack={() => setView('main')} />;
    }

    // ════════════════════════════════════════════════════════════
    //  SAFE 상태: 응급 내역 목록
    // ════════════════════════════════════════════════════════════
    if (!isAlert) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif' }}>

                {/* 헤더 */}
                <div style={{ background: '#2563eb', padding: '24px 20px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <button onClick={onClose} style={{ border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', borderRadius: '10px', padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
                            <ChevronLeft size={18} color="#fff" />
                        </button>
                        <span style={{ color: '#fff', fontWeight: '700', fontSize: '16px' }}>응급 내역</span>
                    </div>

                    {/* 환자 인포 */}
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px', flexShrink: 0 }}>
                            {selectedLocal.name?.[0]}
                        </div>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: 0 }}>{selectedLocal.name} 님</p>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>{selectedLocal.age}세 · {selectedLocal.address}</p>
                        </div>
                        <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', borderRadius: '99px', padding: '4px 12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#fff' }}>✓ 안전함</span>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    {/* 섹션 타이틀 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: '#374151', margin: 0 }}>최근 응급 내역</p>
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>{MOCK_HISTORY.length}건</span>
                    </div>

                    {MOCK_HISTORY.map((rec) => {
                        const badge = resultBadge(rec.result);
                        return (
                            <div
                                key={rec.id}
                                onClick={() => { setSelectedRecord(rec); setView('historyDetail'); }}
                                style={{ background: '#fff', borderRadius: '18px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #f1f5f9', transition: 'all 0.15s' }}
                            >
                                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: rec.type === 'FALL' ? '#fee2e2' : '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <AlertTriangle size={18} color={typeColor(rec.type)} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#111', margin: 0 }}>{rec.label}</p>
                                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px', background: badge.bg, color: badge.color }}>{rec.result}</span>
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
                                        <span style={{ marginRight: '8px' }}>{rec.location}</span>
                                        <span>{rec.resolvedAt}</span>
                                    </p>
                                </div>
                                <ChevronRight size={14} color="#d1d5db" />
                            </div>
                        );
                    })}

                    {MOCK_HISTORY.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <ShieldCheck size={36} color="#d1d5db" style={{ marginBottom: '10px' }} />
                            <p style={{ fontSize: '14px', color: '#9ca3af', fontWeight: '600' }}>응급 내역이 없습니다</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════
    //  ALERT 상태: 실시간 응급 모니터링
    // ════════════════════════════════════════════════════════════
    const alertLabel  = det === 'FALL' ? '낙상 의심 상황' : '장시간 무동작 감지';
    const alertColor  = det === 'FALL' ? '#dc2626' : '#ea580c';
    const alertBg     = det === 'FALL' ? '#ef4444' : '#f97316';

    return (
        <div style={{ minHeight: '100vh', background: '#f3f4f6', maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif' }}>

            {/* 헤더 */}
            <div style={{ background: alertBg, padding: '24px 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <button onClick={onClose} style={{ border: 'none', background: 'rgba(255,255,255,0.2)', cursor: 'pointer', borderRadius: '10px', padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={18} color="#fff" />
                    </button>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: '600' }}>응급 감지</span>
                </div>
                <h1 style={{ color: '#fff', fontWeight: '800', fontSize: '22px', margin: '0 0 14px', lineHeight: 1.2 }}>{alertLabel}</h1>

                {/* 위험도 바 */}
                <div style={{ display: 'flex', gap: '5px', marginBottom: '6px' }}>
                    {[1,2,3,4,5].map(i => (
                        <div key={i} style={{ height: '7px', flex: 1, borderRadius: '99px', background: i <= riskLevel ? '#fff' : 'rgba(255,255,255,0.25)' }} />
                    ))}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', margin: 0 }}>
                    위험도 {riskLevel}/5 · 발생 {formatElapsed(elapsed)}
                </p>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* 카메라 스트림 */}
                <div style={{ background: '#000', borderRadius: '18px', overflow: 'hidden', position: 'relative', minHeight: '200px' }}>
                    {/* 크게 보기 버튼 */}
                    <button
                        onClick={() => setView('fullscreen')}
                        style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', backdropFilter: 'blur(4px)' }}
                    >
                        <Maximize2 size={13} color="rgba(255,255,255,0.8)" />
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>크게 보기</span>
                    </button>

                    <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: '#2563eb', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>LIVE</span>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '10px' }}>
                        <svg width="48" height="68" viewBox="0 0 52 72" fill="none">
                            <circle cx="26" cy="10" r="8" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5"/>
                            <line x1="26" y1="18" x2="26" y2="44" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5"/>
                            <line x1="26" y1="28" x2="10" y2="20" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5"/>
                            <line x1="26" y1="28" x2="42" y2="20" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5"/>
                            <line x1="26" y1="44" x2="14" y2="62" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5"/>
                            <line x1="26" y1="44" x2="38" y2="62" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5"/>
                        </svg>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>실시간 카메라 스트림</span>
                    </div>
                </div>

                {/* 감지 정보 */}
                <div style={{ background: '#fff', borderRadius: '18px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', margin: '0 0 14px' }}>감지 정보</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 3px' }}>감지 종류</p>
                            <p style={{ fontSize: '15px', fontWeight: '700', color: '#111', margin: 0 }}>{det === 'FALL' ? '낙상' : '무동작'}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 3px' }}>발생 위치</p>
                            <p style={{ fontSize: '15px', fontWeight: '700', color: '#111', margin: 0 }}>거실</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 3px' }}>LSTM 신뢰도</p>
                            <p style={{ fontSize: '15px', fontWeight: '700', color: '#2563eb', margin: 0 }}>87.4%</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 3px' }}>감지 시각</p>
                            <p style={{ fontSize: '15px', fontWeight: '700', color: '#111', margin: 0 }}>
                                {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 환자 정보 */}
                <div style={{ background: '#fff', borderRadius: '18px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px', flexShrink: 0 }}>
                        {selectedLocal.name?.[0]}
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#111', margin: 0 }}>{selectedLocal.name} 님</p>
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{selectedLocal.age}세 · {selectedLocal.address}</p>
                    </div>
                    <button
                        style={{ marginLeft: 'auto', fontSize: '11px', color: '#2563eb', border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontWeight: '600' }}
                        onClick={() => setSelectedLocal(null)}
                    >
                        변경
                    </button>
                </div>

                {/* ── 액션 버튼 3종 ── */}
                {/* 119 바로 전화 */}
                <a
                    href="tel:119"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', background: alertBg, color: '#fff', border: 'none', borderRadius: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: `0 4px 14px ${det === 'FALL' ? 'rgba(239,68,68,0.35)' : 'rgba(249,115,22,0.35)'}`, textDecoration: 'none', boxSizing: 'border-box' }}
                >
                    <Phone size={18} fill="#fff" color="#fff" />
                    119 바로 전화
                </a>

                {/* 보호자 연락 */}
                <button
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
                    onClick={() => window.alert('보호자에게 알림을 전송했습니다.')}
                >
                    <Users size={18} color="#374151" />
                    보호자에게 연락하기
                </button>

                {/* 카메라 크게 보기 */}
                <button
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
                    onClick={() => setView('fullscreen')}
                >
                    <Maximize2 size={18} color="#fff" />
                    카메라 크게 보기
                </button>

                {/* 오탐지 */}
                <button
                    style={{ width: '100%', padding: '12px', background: 'transparent', color: '#9ca3af', border: 'none', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}
                    onClick={onClose}
                >
                    오탐지로 표시하고 닫기
                </button>

                <div style={{ height: '16px' }} />
            </div>
        </div>
    );
}
