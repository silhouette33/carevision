import { useState, useEffect } from 'react';
import { Bell, ShieldCheck, Pill, Activity, ZapOff, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import logo from '../assets/Logo.png';

export default function DashboardPage({ onSelectPatient, onEmergency, onPatientsLoaded, onNavigate }) {
    const [patients, setPatients] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [medSummary, setMedSummary] = useState({});
    const [detectionStatus, setDetectionStatus] = useState({});

    useEffect(() => { fetchPatients(); }, []);

    const fetchPatients = async () => {
        const data = await api.getPatients();
        const extra = [
            { id: 3, name: '박명수', age: 75, address: '서울 강남구', cameraId: 'cam-3' },
            { id: 4, name: '최영희', age: 80, address: '서울 송파구', cameraId: 'cam-4' },
        ];
        const all = [...data, ...extra];
        setPatients(all);
        onPatientsLoaded?.(all);
        if (all.length > 0) setSelectedPatientId(all[0].id);
        fetchMedSummaries(all);
        fetchDetectionStatuses(all);
    };

    const fetchMedSummaries = async (list) => {
        const result = {};
        await Promise.all(list.map(async (p) => {
            try {
                const meds = await api.getMedications(p.id);
                const logs = await api.getMedicationLogs(p.id);
                result[p.id] = {
                    total: meds.length || 3,
                    taken: logs.filter(l => l.status === 'TAKEN').length || 2,
                };
            } catch {
                result[p.id] = { total: 3, taken: 2 };
            }
        }));
        setMedSummary(result);
    };

    const fetchDetectionStatuses = async (list) => {
        const result = {};
        list.forEach((p) => {
            if (p.id === 3) {
                result[p.id] = 'FALL';
            } else if (p.id === 4) {
                result[p.id] = 'INACTIVITY';
            } else {
                result[p.id] = 'NORMAL';
            }
        });
        setDetectionStatus(result);
    };

    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    const getSafetyMessage = (type) => {
        if (type === 'FALL') return { prefix: '낙상이 감지되었습니다', highlight: '확인이 필요해요', accent: 'text-red-300' };
        if (type === 'INACTIVITY') return { prefix: '장시간 움직임이 없습니다', highlight: '체크해 주세요', accent: 'text-orange-300' };
        return { prefix: '오늘도 안전하게', highlight: '잘 계세요', accent: 'text-yellow-300' };
    };

    const getStatusBadge = (type) => {
        if (type === 'FALL') return { text: '위험: 낙상', color: 'bg-red-100 text-red-600' };
        if (type === 'INACTIVITY') return { text: '무동작 감지', color: 'bg-orange-100 text-orange-600' };
        return { text: '안전함', color: 'bg-yellow-100 text-yellow-700' };
    };

    return (
        <div className="max-w-[480px] mx-auto min-h-screen bg-gray-50 pb-6">

            {/* ── 헤더 + 인사 ── */}
            <div className="bg-blue-600 px-5 pt-5 pb-10">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <img src={logo} alt="CareVision" className="w-9 h-9 object-contain" />
                        </div>
                        <div>
                            <div className="text-white text-xl font-bold">CareVision</div>
                            <div className="text-white/60 text-[10px] uppercase tracking-wider">Guardian Mode</div>
                        </div>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border-none">
                        <Bell size={20} className="text-white" />
                    </button>
                </div>

                {/* 환자 탭 */}
                <div className="flex overflow-x-auto gap-2 mb-6 no-scrollbar">
                    {patients.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPatientId(p.id)}
                            className={`px-5 py-2 text-xs rounded-full whitespace-nowrap transition-all border-none font-semibold
                            ${selectedPatientId === p.id ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 text-white/70'}`}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>

                {/* 메인 상태 문구 */}
                {selectedPatient && (() => {
                    const safety = getSafetyMessage(detectionStatus[selectedPatient.id]);
                    return (
                        <div className="animate-in fade-in duration-500">
                            <p className="text-white/80 text-sm font-medium mb-1">상태 모니터링 정상 작동 중</p>
                            <p className="text-white text-[24px] font-bold leading-tight">
                                {selectedPatient.name}님은<br />
                                <span className={safety.accent}>{safety.prefix}</span>
                            </p>
                            <p className={`text-[24px] font-bold ${safety.accent}`}>{safety.highlight}</p>
                        </div>
                    );
                })()}
            </div>

            {/* ── 카드 섹션 ── */}
            {selectedPatient && (() => {
                const p = selectedPatient;
                const det = detectionStatus[p.id] || 'NORMAL';
                const med = medSummary[p.id] || { total: 3, taken: 2 };
                const percent = Math.round((med.taken / med.total) * 100);

                const ArrowIcon = ({ isWhite }) => (
                    <ChevronRight
                        size={16}
                        className={`absolute top-4 right-4 ${isWhite ? 'text-white/50' : 'text-gray-300'}`}
                    />
                );

                return (
                    <div className="px-4 -mt-6">
                        <div className="grid grid-cols-2 gap-3 mb-4">

                            {/* 1. 낙상 감지 카드 — 상태에 따라 onEmergency에 detectionStatus 전달 */}
                            <div
                                onClick={() => onEmergency?.(p, det)}
                                className={`relative p-4 rounded-3xl shadow-sm border transition-all cursor-pointer active:scale-95 ${
                                    det === 'FALL' ? 'bg-red-500 border-red-400 text-white animate-pulse' : 'bg-white border-transparent'
                                }`}
                            >
                                <ArrowIcon isWhite={det === 'FALL'} />
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${det === 'FALL' ? 'bg-white/20' : 'bg-red-50'}`}>
                                    <ShieldCheck size={22} className={det === 'FALL' ? 'text-white' : 'text-red-500'} />
                                </div>
                                <p className={`text-[11px] font-bold ${det === 'FALL' ? 'text-white/70' : 'text-gray-400'}`}>낙상 감지</p>
                                <p className="text-lg font-black">{det === 'FALL' ? '위험 감지' : '안전'}</p>
                            </div>

                            {/* 2. 복약 상태 카드 */}
                            <div
                                onClick={() => onNavigate?.('medication')}
                                className="relative p-4 rounded-3xl bg-white shadow-sm border border-transparent hover:border-violet-200 cursor-pointer transition-all active:scale-95"
                            >
                                <ArrowIcon isWhite={false} />
                                <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
                                    <Pill size={22} className="text-violet-500" />
                                </div>
                                <p className="text-[11px] font-bold text-gray-400">오늘 복약</p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-lg font-black text-gray-900">{med.taken}/{med.total}</p>
                                    <p className="text-[10px] text-violet-500 font-bold">{percent}%</p>
                                </div>
                                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${percent}%` }} />
                                </div>
                            </div>

                            {/* 3. 활동 상태 카드 */}
                            <div className="p-4 rounded-3xl bg-white shadow-sm border border-transparent">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                                    <Activity size={22} className="text-emerald-500" />
                                </div>
                                <p className="text-[11px] font-bold text-gray-400">활동 상태</p>
                                <p className="text-lg font-black text-gray-900">양호</p>
                                <p className="text-[10px] text-emerald-500 font-bold mt-1">정상 움직임</p>
                            </div>

                            {/* 4. 무동작 감지 카드 */}
                            <div
                                onClick={() => onEmergency?.(p, det)}
                                className={`relative p-4 rounded-3xl shadow-sm border transition-all cursor-pointer active:scale-95 ${
                                    det === 'INACTIVITY' ? 'bg-orange-500 border-orange-400 text-white animate-pulse' : 'bg-white border-transparent'
                                }`}
                            >
                                <ArrowIcon isWhite={det === 'INACTIVITY'} />
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${det === 'INACTIVITY' ? 'bg-white/20' : 'bg-orange-50'}`}>
                                    <ZapOff size={22} className={det === 'INACTIVITY' ? 'text-white' : 'text-orange-500'} />
                                </div>
                                <p className={`text-[11px] font-bold ${det === 'INACTIVITY' ? 'text-white/70' : 'text-gray-400'}`}>무동작 감지</p>
                                <p className="text-lg font-black">{det === 'INACTIVITY' ? '이상 발생' : '정상'}</p>
                            </div>
                        </div>

                        {/* 프로필 카드 */}
                        <div className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl">
                                    {p.name[0]}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-black text-gray-900">{p.name} 보호대상자</p>
                                    <p className="text-xs text-gray-400 font-medium">{p.age}세 · {p.address}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[11px] font-bold ${getStatusBadge(det).color}`}>
                                    {getStatusBadge(det).text}
                                </div>
                            </div>

                            {/* 실시간 영상 뷰어 */}
                            <div className="relative aspect-video bg-gray-900 rounded-[24px] overflow-hidden mb-5">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                </div>
                                <div className="absolute top-4 left-4 flex items-center gap-2">
                                    <div className="px-2 py-0.5 bg-red-600 rounded text-[9px] font-bold text-white tracking-tighter">LIVE</div>
                                    <div className="text-white/50 text-[10px] font-mono">{p.cameraId}</div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSelectPatient(p)}
                                    className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all active:scale-95"
                                >
                                    상세 리포트 보기
                                </button>
                                <button
                                    onClick={() => onEmergency(p, det)}
                                    className="flex-1 bg-red-50 text-red-500 py-4 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all active:scale-95"
                                >
                                    긴급 호출
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
