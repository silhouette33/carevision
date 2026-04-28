import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function MedicationPage() {
    const [patients, setPatients] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState(null);

    const [meds, setMeds] = useState([]);
    const [logs, setLogs] = useState([]);
    const [activeTab, setActiveTab] = useState('today');

    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    useEffect(() => {
        fetchPatients();
    }, []);

    useEffect(() => {
        if (selectedPatientId) {
            fetchMedData(selectedPatientId);
        }
    }, [selectedPatientId]);

    const fetchPatients = async () => {
        const data = await api.getPatients();
        setPatients(data);

        if (data.length > 0) {
            setSelectedPatientId(data[0].id); // ✅ 기본 선택
        }
    };

    const fetchMedData = async (patientId) => {
        try {
            const m = await api.getMedications(patientId);
            const l = await api.getMedicationLogs(patientId);
            setMeds(m);
            setLogs(l);
        } catch {
            setMeds([]);
            setLogs([]);
        }
    };

    const getStatus = (id) => {
        const log = logs.find(l => l.medicationId === id);
        return log?.status || 'PENDING';
    };

    const taken = logs.filter(l => l.status === 'TAKEN').length;
    const total = meds.length;

    const getBadge = (status) => {
        if (status === 'TAKEN')
            return <span className="text-[11px] text-blue-600 font-semibold">완료</span>;
        if (status === 'MISSED')
            return <span className="text-[11px] text-red-500 font-semibold">미복용</span>;
        return <span className="text-[11px] text-gray-400">대기중</span>;
    };

    return (
        <div className="min-h-screen bg-gray-50 max-w-[390px] mx-auto">

            {/* HEADER */}
            <div className="bg-blue-600 text-white p-5 pb-6 rounded-b-3xl">

                <div className="flex justify-between items-center mb-3">
                    <div>
                        <div className="text-xl font-bold">복약 관리</div>
                        <div className="text-sm opacity-80">
                            {selectedPatient?.name} 님
                        </div>
                    </div>

                    <button className="bg-white/20 px-3 py-1.5 rounded-xl text-sm">
                        + 추가
                    </button>
                </div>

                {/* 환자 탭 */}
                <div className="flex gap-2 overflow-x-auto">
                    {patients.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPatientId(p.id)}
                            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition
                                ${selectedPatientId === p.id
                                ? 'bg-white text-blue-600 font-semibold'
                                : 'bg-white/20 text-white'}
                            `}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 -mt-4">

                {/*  TAB */}
                <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
                    <button
                        onClick={() => setActiveTab('today')}
                        className={`flex-1 py-2 text-sm rounded-lg ${
                            activeTab === 'today'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-500'
                        }`}
                    >
                        오늘
                    </button>

                    <button
                        onClick={() => setActiveTab('week')}
                        className={`flex-1 py-2 text-sm rounded-lg ${
                            activeTab === 'week'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-500'
                        }`}
                    >
                        전체 스케줄
                    </button>
                </div>

                {/* TODAY */}
                {activeTab === 'today' && (
                    <div className="flex flex-col gap-6">

                        {/* 진행률 */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-semibold">오늘 복약 현황</span>
                                <span className="text-blue-600 font-bold">{taken}/{total}</span>
                            </div>

                            <div className="h-2.5 bg-gray-200 rounded-full">
                                <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: `${total ? (taken / total) * 100 : 0}%` }}
                                />
                            </div>

                            <div className="flex justify-between text-xs mt-1 text-gray-500">
                                <span className="text-blue-600">완료 {taken}회</span>
                                <span>잔여 {Math.max(total - taken, 0)}회</span>
                            </div>
                        </div>

                        {/* 타임라인 */}
                        <div>
                            <div className="text-sm font-semibold mb-3">복약 타임라인</div>

                            <div className="flex flex-col gap-4">
                                {meds.map(m => {
                                    const status = getStatus(m.id);

                                    return (
                                        <div key={m.id} className="flex gap-3">
                                            <div className={`w-2.5 h-2.5 mt-1 rounded-full ${
                                                status === 'TAKEN'
                                                    ? 'bg-blue-600'
                                                    : status === 'MISSED'
                                                        ? 'bg-red-400'
                                                        : 'bg-gray-300'
                                            }`} />

                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <span className="text-sm font-medium">
                                                        {m.name}
                                                    </span>
                                                    {getBadge(status)}
                                                </div>

                                                <div className="text-xs text-gray-500">
                                                    {m.time || '시간 없음'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* AI */}
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-sm text-blue-600">
                            🤖 AI 복약 감지 활성화됨
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}