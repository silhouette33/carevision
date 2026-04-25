import { useEffect, useState } from 'react';
import { useStore } from '../store';

function OrangeHeader({ title, subtitle, rightSlot }) {
    return (
        <div className="bg-[#FF6B3D] text-white px-5 pt-6 pb-7 rounded-b-3xl relative">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold m-0">{title}</h1>
                    {subtitle && <p className="text-xs opacity-90 m-0 mt-1">{subtitle}</p>}
                </div>
                {rightSlot}
            </div>
        </div>
    );
}

function PatientChip({ patient, active, onClick }) {
    const initial = patient.name?.[0] || '?';
    return (
        <button
            onClick={onClick}
            className={`shrink-0 flex items-center gap-2 pl-1 pr-4 py-1 rounded-full border transition-colors ${
                active
                    ? 'bg-[#FF6B3D] text-white border-[#FF6B3D]'
                    : 'bg-white text-gray-700 border-gray-200'
            }`}
        >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                active ? 'bg-white text-[#FF6B3D]' : 'bg-[#FFE5DB] text-[#FF6B3D]'
            }`}>
                {initial}
            </span>
            <span className="text-sm font-semibold">{patient.name}</span>
        </button>
    );
}

export default function HomePage({
    user,
    patients,
    selectedPatient,
    onSelectPatient,
    onGoNotifications,
    onGoMedication,
    onOpenCamera,
    unreadCount,
}) {
    const meds = useStore((s) => (selectedPatient ? s.medications[selectedPatient.id] || [] : []));
    const logs = useStore((s) => (selectedPatient ? s.logs[selectedPatient.id] || [] : []));
    const detections = useStore((s) => s.detections);

    const recentFall = detections.find(
        (d) => d.type === 'FALL' && Date.now() - new Date(d.detectedAt).getTime() < 30 * 60 * 1000
    );

    const sortedMeds = [...meds].sort((a, b) => a.scheduleTime.localeCompare(b.scheduleTime));

    const todayStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    const taken = logs.filter((l) => l.status === 'TAKEN' && l.loggedAt?.slice(0, 10) === todayStr).length;
    const total = meds.length;

    const getMedStatus = (m) => {
        const log = [...logs]
            .filter((l) => l.medicationId === m.id && l.loggedAt?.slice(0, 10) === todayStr)
            .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt))[0];
        if (log?.status === 'TAKEN') return { label: '완료', color: 'text-[#10B981] bg-[#E8F8F0]' };
        if (log?.status === 'MISSED') return { label: '누락', color: 'text-red-600 bg-red-50' };
        return { label: '대기', color: 'text-[#FF6B3D] bg-[#FFE5DB]' };
    };

    const mealLabel = (t) => {
        const h = parseInt(t?.split(':')[0] || '0', 10);
        if (h < 11) return '아침';
        if (h < 16) return '점심';
        if (h < 19) return '저녁';
        return '밤';
    };

    return (
        <div className="min-h-screen">
            <OrangeHeader
                title="CareVision"
                subtitle="보호자 모니터링"
                rightSlot={
                    <button
                        onClick={onGoNotifications}
                        className="relative bg-white/20 rounded-full p-2 border-none cursor-pointer"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"
                                  stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                            <path d="M10 19a2 2 0 0 0 4 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 bg-white text-[#FF6B3D] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                }
            />

            {/* 환자 칩 가로 스크롤 */}
            <div className="px-4 -mt-4 mb-4">
                <div className="bg-white rounded-2xl p-3 shadow-sm">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {patients.map((p) => (
                            <PatientChip
                                key={p.id}
                                patient={p}
                                active={selectedPatient?.id === p.id}
                                onClick={() => onSelectPatient(p)}
                            />
                        ))}
                        <button className="shrink-0 w-9 h-9 rounded-full bg-gray-100 text-gray-500 text-lg font-bold">+</button>
                    </div>
                </div>
            </div>

            {/* 안전 상태 */}
            <div className="px-4 mb-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="text-base font-bold text-gray-900 m-0">안전 상태</h3>
                        {recentFall ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E53935]">
                                <span className="w-2 h-2 rounded-full bg-[#E53935] animate-pulse" />
                                위급
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
                                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                                정상
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        {recentFall ? `${Math.floor((Date.now() - new Date(recentFall.detectedAt).getTime()) / 60000)}분 전 낙상 의심 감지` : '3분 전 정상 움직임 감지'}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        <div className={`${recentFall ? 'bg-[#FFE5DB]' : 'bg-[#FFF4ED]'} rounded-xl py-2.5 text-center`}>
                            <p className="text-[11px] text-gray-500 m-0">낙상</p>
                            <p className={`text-sm font-semibold m-0 ${recentFall ? 'text-[#E53935]' : 'text-[#10B981]'}`}>
                                {recentFall ? '감지' : '미감지'}
                            </p>
                        </div>
                        <div className="bg-[#FFF7E8] rounded-xl py-2.5 text-center">
                            <p className="text-[11px] text-gray-500 m-0">무동작</p>
                            <p className="text-sm font-semibold text-[#10B981] m-0">정상</p>
                        </div>
                        <div className="bg-[#EEF4FF] rounded-xl py-2.5 text-center">
                            <p className="text-[11px] text-gray-500 m-0">복약</p>
                            <p className="text-sm font-semibold text-[#4F7CFF] m-0">완료 {taken}/{total || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 오늘 복약 */}
            <div className="px-4 mb-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-base font-bold text-gray-900 m-0">오늘 복약</h3>
                        <button
                            onClick={onGoMedication}
                            className="text-xs font-semibold text-[#FF6B3D] bg-transparent border-none cursor-pointer"
                        >
                            전체보기
                        </button>
                    </div>
                    <div className="flex flex-col">
                        {sortedMeds.length === 0 && (
                            <p className="text-sm text-gray-400 py-4 text-center">등록된 복약이 없습니다</p>
                        )}
                        {sortedMeds.map((m, i) => {
                            const st = getMedStatus(m);
                            return (
                                <div key={m.id} className="flex items-center gap-3 py-2.5 border-b last:border-0 border-gray-100">
                                    <span className={`w-2 h-2 rounded-full ${st.label === '완료' ? 'bg-[#10B981]' : st.label === '누락' ? 'bg-red-500' : 'bg-[#FF6B3D]'}`} />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900 m-0">{mealLabel(m.scheduleTime)} {m.name}</p>
                                        <p className="text-xs text-gray-400 m-0 mt-0.5">{m.scheduleTime} · {m.dosage}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${st.color}`}>
                                        {st.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 실시간 모니터링 */}
            <div className="px-4 mb-6">
                <h3 className="text-base font-bold text-gray-900 mb-2">실시간 모니터링</h3>
                <button
                    onClick={onOpenCamera}
                    className="w-full bg-[#1F1E2E] rounded-2xl aspect-[16/9] relative overflow-hidden border-none cursor-pointer"
                >
                    <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">LIVE</span>
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                                <path d="M8 5v14l11-7z" fill="white"/>
                            </svg>
                        </div>
                    </div>
                    <span className="absolute bottom-3 left-3 text-white text-xs font-semibold">거실 카메라</span>
                </button>
            </div>
        </div>
    );
}
