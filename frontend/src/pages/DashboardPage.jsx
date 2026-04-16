import { useState, useEffect } from 'react';
import { api } from '../api/client';
import logo from '../assets/CareVision.png';

export default function DashboardPage({ user, onSelectPatient, onEmergency, onPatientsLoaded }) {
    const [patients, setPatients] = useState([]);
    const [medSummary, setMedSummary] = useState({});
    const [detectionStatus, setDetectionStatus] = useState({}); // ✅ 추가
    const [showForm, setShowForm] = useState(false);
    const [newPatient, setNewPatient] = useState({
        name: '', age: '', address: '', phone: '', cameraId: '',
    });

    useEffect(() => { fetchPatients(); }, []);

    const fetchPatients = async () => {
        const data = await api.getPatients();
        const extra = [
            { id: 3, name: '박명수', age: 75, address: '서울 강남구', phone: '010-1111-2222', cameraId: 'cam-3' },
            { id: 4, name: '최영희', age: 80, address: '서울 송파구', phone: '010-3333-4444', cameraId: 'cam-4' },
            { id: 5, name: '정미자', age: 77, address: '서울 서초구', phone: '010-5555-6666', cameraId: 'cam-5' },
            { id: 6, name: '한상철', age: 83, address: '서울 마포구', phone: '010-7777-8888', cameraId: 'cam-6' },
            { id: 7, name: '윤복례', age: 79, address: '서울 은평구', phone: '010-9999-0000', cameraId: 'cam-7' },
            { id: 8, name: '강대식', age: 81, address: '서울 중랑구', phone: '010-2222-3333', cameraId: 'cam-8' },
        ];
        const all = [...data, ...extra];
        setPatients(all);
        onPatientsLoaded?.(all);
        fetchMedSummaries(all);
        fetchDetectionStatuses(all); // ✅ 추가
    };

    const EXTRA_MED_MOCK = {
        3: { total: 3, taken: 3, missed: 0 },
        4: { total: 2, taken: 1, missed: 1 },
        5: { total: 4, taken: 2, missed: 0 },
        6: { total: 3, taken: 0, missed: 2 },
        7: { total: 2, taken: 2, missed: 0 },
        8: { total: 3, taken: 1, missed: 1 },
    };

    // ✅ 추가: 환자별 mock 위험 감지 데이터
    const EXTRA_DETECTION_MOCK = {
        3: 'NORMAL',
        4: 'MEDICATION',
        5: 'NORMAL',
        6: 'FALL',
        7: 'NORMAL',
        8: 'MEDICATION',
    };

    const fetchMedSummaries = async (patientList) => {
        const summaries = {};
        await Promise.all(patientList.map(async (p) => {
            try {
                const meds = await api.getMedications(p.id);
                const logs = await api.getMedicationLogs(p.id);
                const total = meds.length;
                const taken = logs.filter(l => l.status === 'TAKEN').length;
                const missed = logs.filter(l => l.status === 'MISSED').length;
                summaries[p.id] = total > 0
                    ? { total, taken, missed }
                    : (EXTRA_MED_MOCK[p.id] || { total: 0, taken: 0, missed: 0 });
            } catch {
                summaries[p.id] = EXTRA_MED_MOCK[p.id] || { total: 0, taken: 0, missed: 0 };
            }
        }));
        setMedSummary(summaries);
    };

    // ✅ 추가: 환자별 최근 위험 감지 상태 fetch
    const fetchDetectionStatuses = async (patientList) => {
        const statuses = {};
        await Promise.all(patientList.map(async (p) => {
            try {
                const detections = await api.getDetections(p.id);
                if (!detections || detections.length === 0) {
                    statuses[p.id] = 'NORMAL';
                    return;
                }
                // 가장 최근 감지 기준
                const latest = detections[0];
                statuses[p.id] = latest.type; // 'FALL' | 'MEDICATION' | 'NORMAL'
            } catch {
                statuses[p.id] = EXTRA_DETECTION_MOCK[p.id] || 'NORMAL';
            }
        }));
        setDetectionStatus(statuses);
    };

    const handleAddPatient = (e) => {
        e.preventDefault();
        const all = [{ id: Date.now(), ...newPatient }, ...patients];
        setPatients(all);
        onPatientsLoaded?.(all);
        setNewPatient({ name: '', age: '', address: '', phone: '', cameraId: '' });
        setShowForm(false);
    };

    const handleDelete = (id) => {
        const all = patients.filter(p => p.id !== id);
        setPatients(all);
        onPatientsLoaded?.(all);
    };

    const getMedStatus = (id) => {
        const s = medSummary[id];
        if (!s || s.total === 0) return null;
        return { ...s, unconfirmed: s.total - s.taken - s.missed };
    };

    // ✅ 추가: 위험 배지 렌더 함수
    const getRiskBadge = (id) => {
        const status = detectionStatus[id];
        if (status === 'FALL') {
            return (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                    🔴 낙상감지
                </span>
            );
        }
        if (status === 'MEDICATION') {
            return (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">
                    🟡 복약미감지
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 border border-green-200">
                🟢 정상
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-100 max-w-[480px] mx-auto font-sans">
            <div className="p-3">

                {/* 헤더 */}
                <div className="flex justify-between items-center mb-2.5">
                    <div className="flex items-center gap-1.5">
                        <img src={logo} alt="logo" className="h-7" />
                        <span className="font-bold text-blue-600 text-sm">CareVision</span>
                    </div>
                    <button
                        className="bg-red-600 text-white border-none rounded-lg px-2.5 py-1 font-semibold cursor-pointer text-xs"
                        onClick={() => patients.length > 0 && onEmergency(patients[0])}
                    >
                        🚨 긴급
                    </button>
                </div>

                {/* 타이틀 + 추가 버튼 */}
                <div className="flex justify-between items-center mb-2.5">
                    <span className="text-sm font-bold text-gray-900">환자 목록</span>
                    <button
                        className="px-3 py-1 bg-blue-600 text-white border-none rounded-md cursor-pointer text-xs font-semibold"
                        onClick={() => setShowForm(!showForm)}
                    >
                        + 추가
                    </button>
                </div>

                {/* 추가 폼 */}
                {showForm && (
                    <div className="bg-white p-3.5 rounded-xl mb-2.5 shadow-md">
                        <h3 className="text-sm font-bold mb-2.5">환자 추가</h3>
                        <form onSubmit={handleAddPatient} className="flex flex-col gap-2">
                            <input className="px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none" placeholder="이름" value={newPatient.name} onChange={e => setNewPatient({ ...newPatient, name: e.target.value })} required />
                            <input className="px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none" placeholder="나이" type="number" value={newPatient.age} onChange={e => setNewPatient({ ...newPatient, age: e.target.value })} />
                            <input className="px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none" placeholder="주소" value={newPatient.address} onChange={e => setNewPatient({ ...newPatient, address: e.target.value })} />
                            <input className="px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none" placeholder="전화번호" value={newPatient.phone} onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })} />
                            <input className="px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none" placeholder="카메라 ID" value={newPatient.cameraId} onChange={e => setNewPatient({ ...newPatient, cameraId: e.target.value })} />
                            <div className="flex gap-2">
                                <button className="flex-1 py-2 bg-blue-600 text-white border-none rounded-lg cursor-pointer font-semibold text-sm" type="submit">추가</button>
                                <button className="flex-1 py-2 bg-gray-100 border-none rounded-lg cursor-pointer font-semibold text-sm" type="button" onClick={() => setShowForm(false)}>취소</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 환자 카드 그리드 */}
                <div className="grid grid-cols-2 gap-2.5">
                    {patients.map(p => {
                        const med = getMedStatus(p.id);
                        const takenPct = med && med.total > 0 ? (med.taken / med.total) * 100 : 0;
                        return (
                            <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm text-center flex flex-col gap-0.5">
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-1 text-base font-bold">
                                    {p.name?.[0]}
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 m-0">{p.name}</h3>
                                <p className="text-[10px] text-gray-500 m-0">{p.age && `${p.age}세`}</p>
                                <p className="text-[10px] text-gray-500 m-0">{p.address}</p>

                                {/* ✅ 위험 감지 배지 */}
                                <div className="flex justify-center mt-0.5">
                                    {getRiskBadge(p.id)}
                                </div>

                                {med ? (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5 my-1">
                                        <div className="text-[10px] font-semibold text-gray-700 mb-1">💊 오늘 복약</div>
                                        <div className="flex gap-0.5 justify-center mb-1">
                                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">✅ {med.taken}</span>
                                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">❌ {med.missed}</span>
                                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">⏳ {med.unconfirmed}</span>
                                        </div>
                                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-0.5">
                                            <div
                                                className="h-full rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${takenPct}%`,
                                                    background: med.missed > 0 ? '#f87171' : '#4ade80',
                                                }}
                                            />
                                        </div>
                                        <div className="text-[9px] text-gray-500">{med.taken}/{med.total} 완료</div>
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-gray-400 bg-gray-50 rounded-md p-1.5 my-1">💊 정보 없음</div>
                                )}

                                <div className="flex gap-1.5 mt-1">
                                    <button className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-md py-1 cursor-pointer text-[11px]" onClick={() => onSelectPatient(p)}>상세</button>
                                    <button className="flex-1 bg-white text-red-500 border border-red-200 rounded-md py-1 cursor-pointer text-[11px]" onClick={() => handleDelete(p.id)}>삭제</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}