import { useState } from 'react';
import {
    ChevronLeft,
    Maximize2,
    Phone,
    Users,
    X,
    ShieldCheck,
    AlertTriangle
} from 'lucide-react';

const MOCK_HISTORY = [
    {
        id: 1,
        type: 'FALL',
        label: '낙상 감지',
        location: '거실',
        resolvedAt: '2026.05.10 14:32',
        result: '오탐지'
    },
    {
        id: 2,
        type: 'INACTIVITY',
        label: '무동작 감지',
        location: '침실',
        resolvedAt: '2026.05.08 09:17',
        result: '확인완료'
    },
];

export default function CameraPage({
                                       patient,
                                       patients = [],
                                       onSelectPatient,
                                       onClose,
                                       detectionStatus
                                   }) {

    const [selectedLocal, setSelectedLocal] = useState(
        patient || patients[0]
    );

    const [view, setView] = useState('main');

    // 테스트용 상태
    const currentStatus =
        selectedLocal?.id === 3
            ? 'FALL'
            : selectedLocal?.id === 4
                ? 'INACTIVITY'
                : 'NORMAL';

    const isAlert =
        currentStatus === 'FALL' ||
        currentStatus === 'INACTIVITY';

    // 전체화면
    if (view === 'fullscreen') {
        return (
            <div className="fixed inset-0 bg-black z-[200] flex flex-col">

                <div className="p-5 flex justify-between items-center text-white">
                    <span className="text-xs font-bold uppercase tracking-widest">
                        {selectedLocal?.name} - LIVE
                    </span>

                    <button
                        onClick={() => setView('main')}
                        className="bg-white/10 p-2 rounded-full border-none"
                    >
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[480px] mx-auto min-h-screen bg-gray-50 pb-10 shadow-2xl overflow-x-hidden">

            {/* 헤더 */}
            <div className="px-5 pt-6 pb-12 rounded-b-[40px] shadow-lg bg-blue-600">

                <div className="flex justify-between items-center mb-6">

                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center border-none"
                    >
                        <ChevronLeft
                            size={20}
                            className="text-white"
                        />
                    </button>

                    <div className="px-3 py-1 bg-white/20 rounded-full text-white text-[11px] font-bold">
                        {isAlert ? '위험 감지됨' : '모니터링 중'}
                    </div>
                </div>

                {/* 환자 선택 */}
                <div className="flex overflow-x-auto gap-2.5 mb-8 no-scrollbar p-1">
                    {patients.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedLocal(p)}
                            className={`px-6 py-2.5 text-[13px] rounded-full whitespace-nowrap font-bold border-none transition-all
                            ${
                                selectedLocal?.id === p.id
                                    ? 'bg-white text-blue-600 shadow-md scale-105'
                                    : 'bg-white/15 text-white/60'
                            }`}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>

                {/* 상태 텍스트 */}
                <div className="animate-in fade-in slide-in-from-left-4">

                    <p className="text-white/70 text-xs font-bold mb-1">
                        Emergency Monitoring
                    </p>

                    <h2 className="text-white text-2xl font-black leading-tight">
                        {selectedLocal?.name}님은 현재
                        <br />

                        <span className={isAlert ? 'text-red-200' : 'text-blue-200'}>
                            {
                                isAlert
                                    ? (
                                        currentStatus === 'FALL'
                                            ? '낙상 발생 의심'
                                            : '장시간 무동작'
                                    )
                                    : '안전한 상태'
                            }
                        </span>
                    </h2>
                </div>
            </div>

            {/* 메인 영역 */}
            <div className="px-5 -mt-6 space-y-5">

                {/* 카메라 카드 */}
                <div className="bg-white rounded-[35px] p-6 shadow-md">

                    <div className="flex justify-between items-center mb-4">

                        <h3 className="text-sm font-black flex items-center gap-2">

                            <div
                                className={`w-2 h-2 rounded-full ${
                                    isAlert
                                        ? 'bg-red-500 animate-ping'
                                        : 'bg-emerald-500'
                                }`}
                            />

                            현장 카메라
                        </h3>

                        {isAlert && (
                            <button
                                onClick={() => setView('fullscreen')}
                                className="text-[11px] font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full border-none"
                            >
                                <Maximize2 size={12}/>
                                크게 보기
                            </button>
                        )}
                    </div>

                    {/* 응급 상황일 때만 카메라 표시 */}
                    {isAlert ? (
                        <>
                            {/* 영상 */}
                            <div className="relative aspect-video rounded-[28px] overflow-hidden bg-gray-900 flex items-center justify-center">

                                <div className="text-center">
                                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />

                                    <p className="text-white/30 text-[9px] font-black italic">
                                        CONNECTING...
                                    </p>
                                </div>
                            </div>

                            {/* 응급 버튼 */}
                            <div className="grid grid-cols-2 gap-2 mt-4">

                                <a
                                    href="tel:119"
                                    className="flex flex-col items-center justify-center gap-1 bg-red-600 text-white py-2.5 rounded-2xl font-black no-underline shadow-md shadow-red-100"
                                >
                                    <Phone
                                        size={16}
                                        fill="white"
                                    />

                                    <span className="text-xs">
                                        119 신고
                                    </span>
                                </a>

                                <button className="flex flex-col items-center justify-center gap-1 bg-gray-900 text-white py-2.5 rounded-2xl font-black border-none">

                                    <Users size={16}/>

                                    <span className="text-xs">
                                        보호자 연락
                                    </span>
                                </button>
                            </div>
                        </>
                    ) : (

                        /* 안전 상태 UI */
                        <div className="mt-2 p-6 bg-gray-50 rounded-[28px] border border-gray-100 text-center">

                            <ShieldCheck
                                className="text-emerald-500 mx-auto mb-3"
                                size={28}
                            />

                            <p className="text-sm font-black text-gray-800 mb-1">
                                현재 응급 상황이 아닙니다
                            </p>

                            <p className="text-[11px] text-gray-400 font-bold">
                                응급 감지 시 실시간 카메라가 활성화됩니다
                            </p>
                        </div>
                    )}
                </div>

                {/* 기록 섹션 */}
                <div className="space-y-3">

                    <h3 className="text-sm font-black px-1">
                        최근 응급 기록
                    </h3>

                    {MOCK_HISTORY.map((rec) => (
                        <div
                            key={rec.id}
                            className="bg-white rounded-3xl p-5 shadow-sm flex items-center gap-4"
                        >

                            <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    rec.type === 'FALL'
                                        ? 'bg-red-50 text-red-500'
                                        : 'bg-orange-50 text-orange-500'
                                }`}
                            >
                                <AlertTriangle size={20}/>
                            </div>

                            <div className="flex-1">
                                <p className="text-sm font-black">
                                    {rec.label}
                                </p>

                                <p className="text-[11px] text-gray-400 font-bold">
                                    {rec.location} · {rec.resolvedAt}
                                </p>
                            </div>

                            <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded-md text-gray-500">
                                {rec.result}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}