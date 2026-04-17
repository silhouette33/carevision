import { useEffect, useState } from 'react';
import { api } from '../api/client';

const MEAL = (t) => {
    const h = parseInt(t?.split(':')[0] || '0', 10);
    if (h < 11) return '아침';
    if (h < 16) return '점심';
    if (h < 19) return '저녁';
    return '밤';
};

export default function MedicationPage({ patient, patients, onSelectPatient }) {
    const [tab, setTab] = useState('today');
    const [meds, setMeds] = useState([]);
    const [logs, setLogs] = useState([]);
    const [showPatientList, setShowPatientList] = useState(false);

    useEffect(() => {
        if (!patient) return;
        api.getMedications(patient.id).then(setMeds);
        api.getMedicationLogs(patient.id).then(setLogs);
    }, [patient]);

    const sorted = [...meds].sort((a, b) => a.scheduleTime.localeCompare(b.scheduleTime));
    const taken = logs.filter((l) => l.status === 'TAKEN').length;
    const total = meds.length || 3;
    const pct = total > 0 ? (taken / total) * 100 : 0;

    const getStatus = (m, idx) => {
        const log = logs.find((l) => l.medicationId === m.id);
        if (log?.status === 'TAKEN') {
            return { label: idx === 0 ? 'AI 감지' : '수동 체크', tone: idx === 0 ? 'bg-[#E8F8F0] text-[#10B981]' : 'bg-[#EEF4FF] text-[#4F7CFF]', line: `${m.scheduleTime} 예정 · ${idx === 0 ? '08:03' : '12:17'} ${idx === 0 ? '감지됨' : '기록'}`, dotColor: 'bg-[#10B981]' };
        }
        if (log?.status === 'MISSED') {
            return { label: '누락', tone: 'bg-red-50 text-red-600', line: `${m.scheduleTime} 예정`, dotColor: 'bg-red-500' };
        }
        return { label: '대기중', tone: 'bg-[#FFE5DB] text-[#FF6B3D]', line: `${m.scheduleTime} 예정`, dotColor: 'bg-gray-300' };
    };

    return (
        <div className="min-h-screen">
            {/* 헤더 */}
            <div className="bg-[#FF6B3D] text-white px-5 pt-6 pb-7 rounded-b-3xl">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold m-0">복약 관리</h1>
                        <button
                            onClick={() => setShowPatientList(!showPatientList)}
                            className="bg-transparent border-none text-white text-sm opacity-90 mt-1 p-0 cursor-pointer"
                        >
                            {patient?.name} 님 ▾
                        </button>
                    </div>
                    <button className="bg-white/25 border-none text-white text-sm font-semibold rounded-full px-4 py-1.5 cursor-pointer">
                        + 추가
                    </button>
                </div>
                {showPatientList && (
                    <div className="bg-white rounded-xl mt-3 p-2 shadow-lg">
                        {patients.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => { onSelectPatient(p); setShowPatientList(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                                    patient?.id === p.id ? 'bg-[#FFE5DB] text-[#FF6B3D] font-bold' : 'text-gray-700'
                                }`}
                            >
                                {p.name} ({p.age}세)
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 탭 */}
            <div className="px-4 -mt-5 mb-4">
                <div className="bg-white rounded-full p-1 shadow-sm inline-flex">
                    <button
                        onClick={() => setTab('today')}
                        className={`px-5 py-1.5 rounded-full text-sm font-semibold border-none cursor-pointer ${
                            tab === 'today' ? 'bg-[#FF6B3D] text-white' : 'bg-transparent text-gray-500'
                        }`}
                    >
                        오늘
                    </button>
                    <button
                        onClick={() => setTab('all')}
                        className={`px-5 py-1.5 rounded-full text-sm font-semibold border-none cursor-pointer ${
                            tab === 'all' ? 'bg-[#FF6B3D] text-white' : 'bg-transparent text-gray-500'
                        }`}
                    >
                        전체 스케줄
                    </button>
                </div>
            </div>

            {/* 오늘 복약 현황 */}
            <div className="px-4 mb-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-base font-bold text-gray-900 m-0">오늘 복약 현황</h3>
                        <span className="text-[#FF6B3D] text-base font-bold">{taken}/{total}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div
                            className="h-full bg-[#FF6B3D] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-[#10B981] font-semibold">완료 {taken}회</span>
                        <span className="text-gray-400">잔여 {total - taken}회</span>
                    </div>
                </div>
            </div>

            {/* 복약 타임라인 */}
            <div className="px-4 mb-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="text-base font-bold text-gray-900 mb-3">복약 타임라인</h3>
                    <div className="flex flex-col">
                        {sorted.length === 0 && (
                            <p className="text-sm text-gray-400 py-4 text-center">등록된 복약 스케줄이 없습니다</p>
                        )}
                        {sorted.map((m, i) => {
                            const s = getStatus(m, i);
                            return (
                                <div key={m.id} className="flex items-start gap-3 py-3 border-b last:border-0 border-gray-100">
                                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${s.dotColor}`} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-gray-900 m-0">
                                                {MEAL(m.scheduleTime)} {m.name}
                                            </p>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${s.tone}`}>
                                                {s.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 m-0 mt-1">{s.line}</p>
                                        {s.label === '대기중' && (
                                            <button className="mt-2 text-xs text-[#FF6B3D] font-semibold bg-transparent border-none cursor-pointer">
                                                수동으로 완료 처리 체크 ›
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* AI 복약 감지 배너 */}
            <div className="px-4 mb-6">
                <div className="bg-[#FFF4ED] rounded-2xl p-4 flex items-center gap-3 border border-[#FFDCC8]">
                    <div className="w-10 h-10 rounded-full bg-[#FF6B3D] flex items-center justify-center shrink-0">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="8" width="20" height="8" rx="4" stroke="white" strokeWidth="2"/>
                            <line x1="12" y1="8" x2="12" y2="16" stroke="white" strokeWidth="2"/>
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 m-0">AI 복약 감지 활성화됨</p>
                        <p className="text-xs text-gray-500 m-0 mt-0.5">19:50~20:10 카메라 모니터링 예정</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
