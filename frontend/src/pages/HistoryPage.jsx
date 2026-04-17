import { useEffect, useState } from 'react';
import { api } from '../api/client';

function EmergencyDetail({ detection, patient, onBack, onOpenCamera }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(t);
    }, []);

    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    const confidence = Math.round((detection?.confidence ?? 0.874) * 100 * 10) / 10;
    const time = new Date(detection?.detectedAt ?? Date.now()).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="min-h-screen">
            {/* 빨간 헤더 */}
            <div className="bg-[#E53935] text-white px-5 pt-6 pb-7 rounded-b-3xl">
                <button
                    onClick={onBack}
                    className="bg-transparent border-none text-white/90 text-xs font-semibold p-0 mb-2 cursor-pointer"
                >
                    ← 이력으로
                </button>
                <p className="text-xs opacity-90 m-0">응급 감지</p>
                <h1 className="text-2xl font-bold m-0 mt-1">낙상 의심 상황</h1>
                <p className="text-xs opacity-90 m-0 mt-1">위험도 3/5 · 발생 {4 + min}분 {37 + sec}초 경과</p>
                {/* 위험도 바 */}
                <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <span
                            key={i}
                            className={`flex-1 h-1.5 rounded-full ${i <= 3 ? 'bg-white' : 'bg-white/30'}`}
                        />
                    ))}
                </div>
            </div>

            {/* 영상 미리보기 */}
            <div className="px-4 -mt-4 mb-4">
                <button
                    onClick={onOpenCamera}
                    className="w-full bg-[#1F1E2E] rounded-2xl aspect-[16/10] relative overflow-hidden border-none cursor-pointer"
                >
                    <span className="absolute top-3 left-3 bg-[#E53935] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">LIVE</span>
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#E53935] animate-pulse" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <svg width="40" height="60" viewBox="0 0 40 60" fill="none">
                            <circle cx="20" cy="10" r="6" stroke="white" strokeWidth="2"/>
                            <line x1="20" y1="16" x2="20" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="20" y1="22" x2="8" y2="30" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="20" y1="22" x2="32" y2="30" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="20" y1="36" x2="12" y2="52" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="20" y1="36" x2="28" y2="52" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span className="text-white text-xs">실시간 카메라 스트림</span>
                    </div>
                </button>
            </div>

            {/* 감지 정보 */}
            <div className="px-4 mb-4">
                <h3 className="text-base font-bold text-gray-900 mb-2">감지 정보</h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-[#FFE5DB] rounded-xl p-3">
                        <p className="text-[11px] text-gray-500 m-0">감지 종류</p>
                        <p className="text-sm font-bold text-[#C73F10] m-0 mt-0.5">낙상</p>
                    </div>
                    <div className="bg-[#FFE5DB] rounded-xl p-3">
                        <p className="text-[11px] text-gray-500 m-0">발생 위치</p>
                        <p className="text-sm font-bold text-gray-900 m-0 mt-0.5">거실</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <p className="text-[11px] text-gray-400 m-0">LSTM 신뢰도</p>
                        <p className="text-sm font-bold text-gray-900 m-0 mt-0.5">{confidence}%</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-400 m-0">감지 시각</p>
                        <p className="text-sm font-bold text-gray-900 m-0 mt-0.5">{time}</p>
                    </div>
                </div>
            </div>

            {/* 액션 버튼 */}
            <div className="px-4 mb-2">
                <button className="w-full bg-white text-gray-900 rounded-2xl py-3.5 font-bold text-sm border border-gray-200 cursor-pointer flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                              stroke="#E53935" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                    119 바로 전화
                </button>
            </div>
            <div className="px-4 mb-3">
                <button className="w-full bg-[#FF6B3D] text-white rounded-2xl py-3.5 font-bold text-sm border-none cursor-pointer">
                    다른 보호자에게 알리기
                </button>
            </div>
            <div className="px-4 mb-6 text-center">
                <button className="bg-transparent border-none text-gray-500 text-xs underline cursor-pointer">
                    오탐지로 표시
                </button>
            </div>
        </div>
    );
}

export default function HistoryPage({ patient, focus, onClearFocus, onOpenCamera }) {
    const [detections, setDetections] = useState([]);
    const [view, setView] = useState(focus ? 'detail' : 'list');
    const [current, setCurrent] = useState(focus || null);

    useEffect(() => {
        if (!patient) return;
        api.getDetections(patient.id).then(setDetections);
    }, [patient]);

    useEffect(() => {
        if (focus) {
            setCurrent(focus);
            setView('detail');
        }
    }, [focus]);

    if (view === 'detail') {
        return (
            <EmergencyDetail
                detection={current}
                patient={patient}
                onBack={() => { setView('list'); onClearFocus?.(); }}
                onOpenCamera={onOpenCamera}
            />
        );
    }

    const typeLabel = (t) => {
        if (t === 'FALL') return { label: '낙상', tone: 'text-[#C73F10] bg-[#FFE5DB]' };
        if (t === 'MEDICATION') return { label: '복약', tone: 'text-[#10B981] bg-[#E8F8F0]' };
        return { label: '정상', tone: 'text-[#4F7CFF] bg-[#EEF4FF]' };
    };

    return (
        <div className="min-h-screen">
            <div className="bg-[#FF6B3D] text-white px-5 pt-6 pb-7 rounded-b-3xl">
                <h1 className="text-2xl font-bold m-0">감지 이력</h1>
                <p className="text-xs opacity-90 m-0 mt-1">{patient?.name} 님 · 최근 7일</p>
            </div>

            <div className="px-4 -mt-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    {detections.length === 0 && (
                        <p className="text-center text-sm text-gray-400 py-8">감지 이력이 없습니다</p>
                    )}
                    {detections.map((d) => {
                        const t = typeLabel(d.type);
                        return (
                            <button
                                key={d.id}
                                onClick={() => { setCurrent(d); setView('detail'); }}
                                className="w-full text-left bg-transparent border-none cursor-pointer py-3 border-b last:border-0 border-gray-100 flex items-center gap-3"
                            >
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${t.tone}`}>
                                    {t.label}
                                </span>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 m-0">
                                        {d.type === 'FALL' ? '낙상 의심 상황' : d.type === 'MEDICATION' ? '복약 감지됨' : '정상 동작'}
                                    </p>
                                    <p className="text-xs text-gray-400 m-0 mt-0.5">
                                        신뢰도 {Math.round(d.confidence * 100)}% · {new Date(d.detectedAt).toLocaleString('ko-KR')}
                                    </p>
                                </div>
                                <span className="text-gray-300">›</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
