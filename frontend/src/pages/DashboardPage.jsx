import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function DashboardPage({ onSelectPatient, onEmergency, onPatientsLoaded }) {
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
                    total: meds.length,
                    taken: logs.filter(l => l.status === 'TAKEN').length,
                    missed: logs.filter(l => l.status === 'MISSED').length,
                };
            } catch {
                result[p.id] = { total: 3, taken: 2, missed: 1 };
            }
        }));
        setMedSummary(result);
    };

    const fetchDetectionStatuses = async (list) => {
        const result = {};
        await Promise.all(list.map(async (p) => {
            try {
                const d = await api.getDetections(p.id);
                result[p.id] = d?.[0]?.type || 'NORMAL';
            } catch {
                result[p.id] = 'NORMAL';
            }
        }));
        setDetectionStatus(result);
    };

    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    const getStatusUI = (type) => {
        if (type === 'FALL') return { text: '낙상 감지', color: 'bg-red-100 text-red-600' };
        if (type === 'MEDICATION') return { text: '복약 미이행', color: 'bg-yellow-100 text-yellow-700' };
        return { text: '정상', color: 'bg-green-100 text-green-600' };
    };

    return (
        <div className="max-w-[390px] mx-auto min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">

            {/* HEADER */}
            <div className="bg-blue-600 text-white p-4 shadow-md">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-lg font-bold tracking-tight">CareVision</div>
                        <div className="text-xs opacity-80">보호자 모니터링</div>
                    </div>
                    <button className="relative w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 transition">
                        🔔
                        <span className="absolute top-1 right-1 text-[10px] bg-red-500 w-4 h-4 rounded-full flex items-center justify-center">
                            2
                        </span>
                    </button>
                </div>
            </div>


            <div className="flex overflow-x-auto bg-blue-600 px-2 pb-1 gap-2">
                {patients.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setSelectedPatientId(p.id)}
                        className={`px-3 py-1 text-xs rounded-t-lg whitespace-nowrap transition
                        ${selectedPatientId === p.id
                            ? 'bg-white text-blue-600 font-semibold shadow'
                            : 'text-white/70'}
                    `}
                    >
                        {p.name}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="p-3">
                {selectedPatient && (() => {
                    const p = selectedPatient;
                    const med = medSummary[p.id] || {};
                    const total = med.total || 0;
                    const taken = med.taken || 0;
                    const missed = med.missed || 0;
                    const percent = total ? (taken / total) * 100 : 0;

                    const status = getStatusUI(detectionStatus[p.id]);

                    return (
                        <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-4">

                            {/* 프로필 */}
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                                    {p.name[0]}
                                </div>

                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">{p.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {p.age}세 · {p.address}
                                    </div>
                                </div>

                                <div className={`text-[11px] px-2 py-1 rounded-full ${status.color}`}>
                                    {status.text}
                                </div>
                            </div>

                            {/* 안전 상태 */}
                            <div>
                                <div className="text-xs font-semibold text-gray-500 mb-2">안전 상태</div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="bg-green-50 text-green-600 rounded-lg p-2 text-center">
                                        낙상<br /><b>정상</b>
                                    </div>
                                    <div className="bg-blue-50 text-blue-600 rounded-lg p-2 text-center">
                                        활동<br /><b>정상</b>
                                    </div>
                                    <div className="bg-yellow-50 text-yellow-700 rounded-lg p-2 text-center">
                                        복약<br /><b>{taken}/{total}</b>
                                    </div>
                                </div>
                            </div>

                            {/* 복약 상세 */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold mb-2">
                                    <span>오늘 복약</span>
                                    <span className="text-blue-600">{taken}/{total} 완료</span>
                                </div>

                                <div className="flex flex-col gap-1 text-xs mb-2">
                                    <div className="flex justify-between">
                                        <span>복용 완료</span>
                                        <span className="text-green-600">{taken}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>미복용</span>
                                        <span className="text-red-500">{missed}</span>
                                    </div>
                                </div>

                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 rounded-full transition-all"
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                            </div>

                            {/* 카메라 */}
                            <div>
                                <div className="text-xs font-semibold text-gray-500 mb-2">실시간 모니터링</div>
                                <div className="bg-black rounded-lg h-20 flex items-center justify-center text-white text-xs relative">
                                    <div className="absolute top-2 left-2 flex items-center gap-1">
                                        <span className="bg-blue-600 px-1.5 py-0.5 rounded text-[9px]">LIVE</span>
                                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                    </div>
                                    {p.cameraId}
                                </div>
                            </div>

                            {/* 버튼 */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSelectPatient(p)}
                                    className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700 transition"
                                >
                                    상세 보기
                                </button>

                                <button
                                    onClick={() => onEmergency(p)}
                                    className="flex-1 py-2 rounded-lg bg-red-100 text-red-600 text-sm font-semibold hover:bg-red-200 transition"
                                >
                                    긴급 호출
                                </button>
                            </div>

                        </div>
                    );
                })()}
            </div>
        </div>
    );
}